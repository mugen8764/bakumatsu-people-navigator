const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { parseOptions, prepareContent, updateAssetVersions } = require('../../scripts/prepare-content.cjs');
const { loadV2Documents } = require('../../scripts/lib/v2-files.cjs');

const root = path.resolve(__dirname, '../..');
const options = { version: '9.8.7', date: '2028-02-29' };
const outputs = ['data/manifest.json', 'data.json', 'data.js', 'SOURCES.md', 'README.md', 'sitemap.xml', 'index.html'];

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'content-prepare-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('content-prepare-'));
    fs.rmSync(directory, { recursive: true, force: true });
  });
  // Deliberately omit data.json/data.js: preparation must recreate them.
  for (const entry of ['data', 'src', 'README.md', 'SOURCES.md', 'sitemap.xml', 'index.html', 'map-data.js']) {
    fs.cpSync(path.join(root, entry), path.join(directory, entry), { recursive: true });
  }
  return directory;
}

function snapshot(directory, prefix = '') {
  const contents = {};
  for (const entry of fs.readdirSync(path.join(directory, prefix), { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) Object.assign(contents, snapshot(directory, relative));
    else contents[relative] = fs.readFileSync(path.join(directory, relative));
  }
  return contents;
}

test('preparation requires an explicit version and date and rejects ambiguous options', () => {
  assert.deepEqual(parseOptions(['--version=9.8.7', '--date', '2028-02-29', '--dry-run']), { ...options, dryRun: true });
  assert.deepEqual(parseOptions(['--help']), { help: true });
  for (const args of [[], ['--version', '9.8.7'], ['--date'], ['--dry-run=false'], ['--unknown'], ['toString=x'], ['--date=a', '--date=b']]) {
    assert.throws(() => parseOptions(args));
  }
});

test('preparation updates derived files, preserves editorial data and is repeatable', t => {
  const directory = fixture(t);
  const read = file => fs.readFileSync(path.join(directory, file), 'utf8');
  const documents = loadV2Documents(directory);
  const portraitOwner = documents.people.people.find(person => person.portrait);
  delete portraitOwner.portrait;
  fs.writeFileSync(path.join(directory, 'data/people.json'), JSON.stringify(documents.people, null, 2));
  documents.sources.sources.push({ id: 'test_preparation', title: '準備コマンドのテスト資料', url: 'https://example.com/test', note: 'テスト用の出典。' });
  fs.writeFileSync(path.join(directory, 'data/sources.json'), JSON.stringify(documents.sources, null, 2));
  const before = snapshot(directory);
  const preview = prepareContent(directory, { ...options, dryRun: true });
  assert.deepEqual(snapshot(directory), before);
  assert.deepEqual(new Set(preview.changed), new Set(outputs));

  const result = prepareContent(directory, options);
  assert.deepEqual(result, preview);
  const manifest = JSON.parse(read('data/manifest.json'));
  assert.equal(manifest.contentVersion, options.version);
  assert.equal(manifest.updated, options.date);
  assert.match(read('sitemap.xml'), /<lastmod>2028-02-29<\/lastmod>/);
  assert.ok(read('README.md').includes(`- 史料肖像: ${documents.people.people.filter(person => person.portrait).length}点`));
  assert.ok(read('README.md').includes('（医療・学問、暮らし・支援）'));
  assert.match(read('SOURCES.md'), /準備コマンドのテスト資料/);
  const runtime = JSON.parse(read('data.json'));
  assert.equal(runtime.sources.test_preparation.title, '準備コマンドのテスト資料');
  assert.equal(runtime.people.find(person => person.id === portraitOwner.id).portrait, undefined);
  const context = { window: {} };
  vm.runInNewContext(read('data.js'), context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.window.BM_DATA)), runtime);
  for (const [file, contents] of Object.entries(before)) {
    if (!outputs.includes(file.replaceAll(path.sep, '/'))) assert.deepEqual(fs.readFileSync(path.join(directory, file)), contents, file);
  }

  const after = snapshot(directory);
  assert.deepEqual(prepareContent(directory, options).changed, []);
  assert.deepEqual(snapshot(directory), after);
  fs.appendFileSync(path.join(directory, 'src/app.js'), '\n// Test a later script-only edit.\n');
  const next = prepareContent(directory, options);
  assert.deepEqual(next.changed, ['index.html']);
  assert.notEqual(next.assetVersion, result.assetVersion);
  assert.equal(JSON.parse(read('data/manifest.json')).contentVersion, options.version);
});

test('invalid metadata, references or document structure fail before any output is written', t => {
  const directory = fixture(t);
  const before = snapshot(directory);
  for (const invalid of [{ ...options, version: 'latest' }, { ...options, date: '2027-02-29' }]) {
    assert.throws(() => prepareContent(directory, invalid));
    assert.deepEqual(snapshot(directory), before);
  }
  const peoplePath = path.join(directory, 'data/people.json');
  const people = JSON.parse(fs.readFileSync(peoplePath, 'utf8'));
  people.people[0].evidence.sourceIds = ['missing_preparation_source'];
  fs.writeFileSync(peoplePath, JSON.stringify(people));
  const invalidData = snapshot(directory);
  assert.throws(() => prepareContent(directory, options), /source|出典/i);
  assert.deepEqual(snapshot(directory), invalidData);
  fs.writeFileSync(peoplePath, before[path.join('data', 'people.json')]);
  const sourcesPath = path.join(directory, 'data/sources.json');
  const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'));
  sources.sources[0].title = '   ';
  fs.writeFileSync(sourcesPath, JSON.stringify(sources));
  const invalidSource = snapshot(directory);
  assert.throws(() => prepareContent(directory, options), /non-empty/);
  assert.deepEqual(snapshot(directory), invalidSource);
  fs.writeFileSync(sourcesPath, before[path.join('data', 'sources.json')]);
  fs.writeFileSync(path.join(directory, 'README.md'), before['README.md'].toString().replace('- 人物:', '- 収録人物:'));
  const invalidDoc = snapshot(directory);
  assert.throws(() => prepareContent(directory, options), /README/);
  assert.deepEqual(snapshot(directory), invalidDoc);
});

test('asset identifiers ignore line endings, preserve other URL parts and react to content changes', () => {
  const html = '<link rel="stylesheet" href="style.css?v=old&theme=light#theme"><script src="app.js?v=old"></script><script src="https://example.com/external.js?v=external"></script>';
  const files = { 'style.css': 'body {}\n', 'app.js': 'const ready = true;\n' };
  const result = updateAssetVersions(html, file => files[file]);
  assert.match(result.html, /theme=light#theme/);
  assert.match(result.html, /external\.js\?v=external/);
  assert.equal([...result.html.matchAll(new RegExp(`v=${result.version}`, 'g'))].length, 2);
  assert.deepEqual(updateAssetVersions(result.html, file => files[file]), result);
  assert.deepEqual(updateAssetVersions(html, file => files[file].replaceAll('\n', '\r\n')), result);
  assert.notEqual(updateAssetVersions(html, file => files[file] + '\n// changed').version, result.version);
});

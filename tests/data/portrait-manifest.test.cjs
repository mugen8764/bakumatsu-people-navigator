const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const test = require('node:test');
const { loadV2Documents } = require('../../scripts/lib/v2-files.cjs');
const { portraitManifest, portraitManifestText } = require('../../scripts/lib/portrait-manifest.cjs');
const { expectedOutputs, checkOutputs } = require('../../scripts/build-data.cjs');
const root = path.resolve(__dirname, '../..');

test('every canonical portrait exposes actual file identity and source URLs', () => {
  const documents = loadV2Documents(root);
  const manifest = portraitManifest(documents, root);
  const people = documents.people.people.filter(person => person.portrait);
  assert.equal(manifest.portraits.length, people.length);
  assert.equal(manifest.manifestVersion, 1);
  assert.equal(manifest.contentVersion, documents.manifest.contentVersion);
  const sources = new Map(documents.sources.sources.map(source => [source.id, source]));
  for (const item of manifest.portraits) {
    const person = people.find(person => person.id === item.personId);
    const bytes = fs.readFileSync(path.join(root, item.src));
    assert.equal(item.sha256, crypto.createHash('sha256').update(bytes).digest('hex'));
    assert.equal(item.bytes, fs.statSync(path.join(root, item.src)).size);
    assert.ok(item.width > 0 && item.width <= 320 && item.height > 0 && item.height <= 320);
    assert.equal(item.sourceUrl, sources.get(person.portrait.sourceId).url);
    assert.equal(item.rightsUrl, sources.get(person.portrait.rightsSourceId).url);
    for (const [key, value] of Object.entries(person.portrait)) assert.deepEqual(item[key], value);
  }
  assert.equal(fs.readFileSync(path.join(root, 'portrait-manifest.json'), 'utf8'), portraitManifestText(documents, root));
});

test('source and canonical metadata changes make the generated manifest stale', () => {
  const documents = loadV2Documents(root);
  const portrait = documents.people.people.find(person => person.portrait).portrait;
  portrait.credit += ' changed';
  assert.throws(() => checkOutputs(expectedOutputs(documents)), /portrait-manifest.json/);
  const modified = loadV2Documents(root);
  const sourceId = modified.people.people.find(person => person.portrait).portrait.sourceId;
  modified.sources.sources.find(source => source.id === sourceId).url += '#changed';
  assert.throws(() => checkOutputs(expectedOutputs(modified)), /portrait-manifest.json/);
});

test('image replacements change SHA even when dimensions stay the same; incomplete inputs fail', () => {
  const documents = loadV2Documents(root);
  documents.people.people = [documents.people.people.find(person => person.portrait)];
  const person = documents.people.people[0];
  const staged = fs.mkdtempSync(path.join(os.tmpdir(), 'portrait-manifest-'));
  try {
    const image = path.join(staged, person.portrait.src);
    fs.mkdirSync(path.dirname(image), { recursive: true });
    fs.copyFileSync(path.join(root, person.portrait.src), image);
    const before = portraitManifest(documents, staged).portraits[0];
    fs.appendFileSync(image, Buffer.from([0]));
    const after = portraitManifest(documents, staged).portraits[0];
    assert.notEqual(before.sha256, after.sha256);
    assert.equal(after.bytes, before.bytes + 1);
    assert.equal(after.width, before.width);
    assert.equal(after.height, before.height);
    person.portrait.sourceId = 'missing_source';
    assert.throws(() => portraitManifest(documents, staged), /Unresolved portrait source/);
    person.portrait.sourceId = before.sourceId;
    delete person.portrait.identityNote;
    assert.throws(() => portraitManifest(documents, staged), /Invalid portrait/);
    person.portrait.identityNote = before.identityNote;
    fs.writeFileSync(image, Buffer.from([0]));
    assert.throws(() => portraitManifest(documents, staged), /Invalid portrait image/);
    fs.unlinkSync(image);
    assert.throws(() => portraitManifest(documents, staged), /ENOENT/);
  } finally {
    fs.rmSync(staged, { recursive: true, force: true });
  }
});

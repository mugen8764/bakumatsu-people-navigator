const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const script = path.join(root, 'scripts/check-release.cjs');

test('the release check reports missing files instead of crashing on them', () => {
  const emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'release-check-'));
  try {
    let status = 0;
    let output = '';
    try {
      execFileSync(process.execPath, [script, `--root=${emptyRoot}`], { cwd: root, encoding: 'utf8', stdio: 'pipe' });
    } catch (error) {
      status = error.status;
      output = `${error.stdout}${error.stderr}`;
    }
    assert.equal(status, 1);
    assert.match(output, /- Missing release file: index\.html/);
    assert.match(output, /- Missing release file: _headers/);
    assert.doesNotMatch(output, /ENOENT/);
  } finally {
    fs.rmSync(emptyRoot, { recursive: true, force: true });
  }
});

test('the release check still accepts the repository itself', () => {
  const output = execFileSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
  assert.match(output, /Release artifacts valid/);
});

const releaseEntries = [
  '404.html', 'LICENSE', 'README.md', 'SOURCES.md', '_headers', 'assets', 'data', 'data.js', 'data.json',
  'favicon.svg', 'index.html', 'map-data.js', 'og-image.png', 'robots.txt', 'schema', 'sitemap.xml', 'src'
];

function stageRelease() {
  const staged = fs.mkdtempSync(path.join(os.tmpdir(), 'release-stage-'));
  for (const entry of releaseEntries) {
    fs.cpSync(path.join(root, entry), path.join(staged, entry), { recursive: true });
  }
  return staged;
}

function runCheck(checkRoot) {
  try {
    return { status: 0, output: execFileSync(process.execPath, [script, `--root=${checkRoot}`], { cwd: root, encoding: 'utf8', stdio: 'pipe' }) };
  } catch (error) {
    return { status: error.status, output: `${error.stdout}${error.stderr}` };
  }
}

test('a half-updated asset version token fails the release check', () => {
  const staged = stageRelease();
  try {
    assert.equal(runCheck(staged).status, 0);

    const indexPath = path.join(staged, 'index.html');
    const html = fs.readFileSync(indexPath, 'utf8');
    const tampered = html.replace('src/app.js?v=', 'src/app.js?v=stale-');
    assert.notEqual(tampered, html);
    fs.writeFileSync(indexPath, tampered);

    const result = runCheck(staged);
    assert.equal(result.status, 1);
    assert.match(result.output, /must share one \?v= token/);
  } finally {
    fs.rmSync(staged, { recursive: true, force: true });
  }
});

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

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const entries = [
  '404.html',
  'LICENSE',
  'README.md',
  'SOURCES.md',
  '_headers',
  'data',
  'data.js',
  'data.json',
  'index.html',
  'map-data.js',
  'robots.txt',
  'schema',
  'src'
];

if (path.dirname(output) !== root || path.basename(output) !== 'dist') {
  throw new Error(`Refusing unsafe output path: ${output}`);
}

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
for (const entry of entries) {
  fs.cpSync(path.join(root, entry), path.join(output, entry), { recursive: true });
}

execFileSync(process.execPath, [path.join(__dirname, 'check-release.cjs'), '--root=dist'], {
  cwd: root,
  stdio: 'inherit'
});
console.log(`Static site built: dist/ (${entries.length} release entries).`);

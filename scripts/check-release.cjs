const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');

const rootOption = process.argv.find(argument => argument.startsWith('--root='));
const root = rootOption
  ? path.resolve(process.cwd(), rootOption.slice('--root='.length))
  : path.resolve(__dirname, '..');
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function requireFile(relativePath) {
  if (!fs.existsSync(path.join(root, relativePath))) failures.push(`Missing release file: ${relativePath}`);
}

const requiredFiles = [
  '404.html',
  'LICENSE',
  'README.md',
  'SOURCES.md',
  '_headers',
  'data/manifest.json',
  'data/sources.json',
  'data.js',
  'data.json',
  'index.html',
  'map-data.js',
  'robots.txt',
  'src/app.js',
  'src/styles.css'
];
requiredFiles.forEach(requireFile);

const html = read('index.html');
const assetReferences = [
  ...[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1]),
  ...[...html.matchAll(/<link[^>]+href="([^"]+)"/g)].map(match => match[1]),
  ...[...html.matchAll(/<a[^>]+href="([^"]+)"/g)].map(match => match[1])
].filter(reference => !/^(?:https?:|\/\/|#)/.test(reference));
assetReferences.forEach(reference => requireFile(reference.split(/[?#]/, 1)[0]));

if (rootOption) {
  for (const entry of ['.git', '.github', 'AGENTS.md', 'node_modules', 'package.json', 'scripts', 'tests']) {
    if (fs.existsSync(path.join(root, entry))) failures.push(`Development-only entry leaked into release: ${entry}`);
  }
}

const notFoundHtml = read('404.html');
const notFoundAssets = [
  ...[...notFoundHtml.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1]),
  ...[...notFoundHtml.matchAll(/<link[^>]+href="([^"]+)"/g)].map(match => match[1])
].filter(reference => !/^(?:https?:|\/\/|#)/.test(reference));
notFoundAssets.forEach(reference => requireFile(reference.replace(/^\/+/, '').split(/[?#]/, 1)[0]));

const headers = read('_headers');
for (const header of ['Content-Security-Policy', 'Permissions-Policy', 'Referrer-Policy', 'X-Content-Type-Options']) {
  if (!headers.includes(`${header}:`)) failures.push(`Missing security header: ${header}`);
}
const inlineScript = notFoundHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!inlineScript) failures.push('404.html must include its base-path recovery script.');
else {
  const hash = crypto.createHash('sha256').update(inlineScript).digest('base64');
  if (!headers.includes(`'sha256-${hash}'`)) failures.push('Content-Security-Policy does not allow the exact 404 recovery script.');
}

const manifest = JSON.parse(read('data/manifest.json'));
if (!/^\d{4}-\d{2}-\d{2}$/.test(manifest.updated)) failures.push('data/manifest.json updated must be YYYY-MM-DD.');
if (!/^\d+\.\d+\.\d+$/.test(manifest.contentVersion)) failures.push('data/manifest.json contentVersion must be semantic versioning.');

if (failures.length) {
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Release artifacts valid: ${requiredFiles.length} required files, ${assetReferences.length + notFoundAssets.length} local assets.`);
}

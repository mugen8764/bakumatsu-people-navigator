const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');

const rootOption = process.argv.find(argument => argument.startsWith('--root='));
const root = rootOption
  ? path.resolve(process.cwd(), rootOption.slice('--root='.length))
  : path.resolve(__dirname, '..');
const publicUrl = 'https://bakumatsu-people-navigator.pages.dev/';
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
  'favicon.svg',
  'index.html',
  'map-data.js',
  'og-image.png',
  'robots.txt',
  'sitemap.xml',
  'src/app.js',
  'src/styles.css'
];
requiredFiles.forEach(requireFile);

const html = read('index.html');
if (!html.includes(`<link rel="canonical" href="${publicUrl}">`)) failures.push('Canonical URL does not match the production URL.');
if (!html.includes(`<meta property="og:url" content="${publicUrl}">`)) failures.push('Open Graph URL does not match the production URL.');
if (!html.includes(`<meta property="og:image" content="${publicUrl}og-image.png">`)) failures.push('Open Graph image does not use the production URL.');
if (!html.includes('<meta name="twitter:card" content="summary_large_image">')) failures.push('Twitter card metadata is missing.');
const assetReferences = [
  ...[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1]),
  ...[...html.matchAll(/<link[^>]+href="([^"]+)"/g)].map(match => match[1]),
  ...[...html.matchAll(/<a[^>]+href="([^"]+)"/g)].map(match => match[1])
].filter(reference => !/^(?:https?:|\/\/|#)/.test(reference));
assetReferences.forEach(reference => requireFile(reference.split(/[?#]/, 1)[0]));

const socialImage = fs.readFileSync(path.join(root, 'og-image.png'));
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
if (!socialImage.subarray(0, 8).equals(pngSignature)) failures.push('og-image.png is not a PNG image.');
else if (socialImage.readUInt32BE(16) !== 1200 || socialImage.readUInt32BE(20) !== 630) {
  failures.push('og-image.png must be 1200x630.');
}

const robots = read('robots.txt');
if (!robots.includes(`Sitemap: ${publicUrl}sitemap.xml`)) failures.push('robots.txt does not advertise the production sitemap.');
const sitemap = read('sitemap.xml');
if (!sitemap.includes(`<loc>${publicUrl}</loc>`)) failures.push('sitemap.xml does not contain the production URL.');

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
for (const directive of ['/data.js', 'max-age=3600', '/og-image.png', 'max-age=86400']) {
  if (!headers.includes(directive)) failures.push(`Missing cache policy directive: ${directive}`);
}
const inlineScript = notFoundHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!inlineScript) failures.push('404.html must include its base-path recovery script.');
else {
  const normalizedScript = inlineScript.replace(/\r\n/g, '\n');
  const hash = crypto.createHash('sha256').update(normalizedScript).digest('base64');
  if (!headers.includes(`'sha256-${hash}'`)) failures.push('Content-Security-Policy does not allow the exact 404 recovery script.');
}

const manifest = JSON.parse(read('data/manifest.json'));
if (!/^\d{4}-\d{2}-\d{2}$/.test(manifest.updated)) failures.push('data/manifest.json updated must be YYYY-MM-DD.');
if (!/^\d+\.\d+\.\d+$/.test(manifest.contentVersion)) failures.push('data/manifest.json contentVersion must be semantic versioning.');
if (!sitemap.includes(`<lastmod>${manifest.updated}</lastmod>`)) failures.push('sitemap.xml lastmod does not match data/manifest.json updated.');

if (failures.length) {
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Release artifacts valid: ${requiredFiles.length} required files, ${assetReferences.length + notFoundAssets.length} local assets.`);
}

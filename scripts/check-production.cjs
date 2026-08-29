const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const publicUrl = new URL(process.env.PRODUCTION_URL || 'https://bakumatsu-people-navigator.pages.dev/');
const waitForDeployment = process.argv.includes('--wait');
const attempts = waitForDeployment ? 24 : 1;
const intervalMs = 10_000;
const files = [
  'index.html',
  'data/manifest.json',
  'data.js',
  'data.json',
  'og-image.png',
  'src/app.js',
  'src/domain.js',
  'src/renderers/people.js'
];
const requiredHeaders = [
  'content-security-policy',
  'permissions-policy',
  'referrer-policy',
  'x-content-type-options'
];
const requiredCacheControls = new Map([
  ['data.js', 'no-cache'],
  ['src/app.js', 'no-cache'],
  ['og-image.png', 'max-age=86400']
]);

function digest(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function comparableDigest(relativePath, value) {
  if (['.html', '.js', '.json'].includes(path.extname(relativePath))) {
    return digest(Buffer.from(value.toString('utf8').replace(/\r\n/g, '\n'), 'utf8'));
  }
  return digest(value);
}

async function fetchProduction(relativePath, attempt) {
  const url = new URL(relativePath, publicUrl);
  url.searchParams.set('release-check', `${Date.now()}-${attempt}`);
  const response = await fetch(url, {
    headers: {
      'cache-control': 'no-cache',
      pragma: 'no-cache'
    },
    redirect: 'follow'
  });
  if (!response.ok) throw new Error(`${relativePath}: HTTP ${response.status}`);
  return { response, body: Buffer.from(await response.arrayBuffer()) };
}

async function inspect(attempt) {
  const failures = [];
  for (const file of files) {
    try {
      const local = fs.readFileSync(path.join(root, file));
      const { response, body } = await fetchProduction(file, attempt);
      if (comparableDigest(file, local) !== comparableDigest(file, body)) {
        failures.push(`${file}: production content differs from this checkout`);
      }
      const expectedCacheControl = requiredCacheControls.get(file);
      if (expectedCacheControl && !response.headers.get('cache-control')?.includes(expectedCacheControl)) {
        failures.push(`${file}: production cache-control is missing ${expectedCacheControl}`);
      }
    } catch (error) {
      failures.push(error.message);
    }
  }

  try {
    const { response } = await fetchProduction('', attempt);
    requiredHeaders.forEach(header => {
      if (!response.headers.get(header)) failures.push(`Production response is missing ${header}.`);
    });
  } catch (error) {
    failures.push(error.message);
  }

  return failures;
}

(async () => {
  let lastFailures = [];
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    lastFailures = await inspect(attempt);
    if (!lastFailures.length) {
      const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data/manifest.json'), 'utf8'));
      console.log(`Production matches content ${manifest.contentVersion}: ${files.length} files, ${requiredHeaders.length} security headers, and ${requiredCacheControls.size} cache policies.`);
      return;
    }
    if (attempt < attempts) {
      console.log(`Production not current yet (${attempt}/${attempts}); retrying in ${intervalMs / 1000}s.`);
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
  lastFailures.forEach(failure => console.error(`- ${failure}`));
  process.exitCode = 1;
})().catch(error => {
  console.error(`- Production check failed: ${error.message}`);
  process.exitCode = 1;
});

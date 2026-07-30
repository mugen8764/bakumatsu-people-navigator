const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const { sources } = JSON.parse(fs.readFileSync(path.join(root, 'data/sources.json'), 'utf8'));

async function checkSource(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(source.url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'bakumatsu-people-navigator-link-check/1.0'
      },
      redirect: 'follow',
      signal: controller.signal
    });
    await response.body?.cancel();
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { id: source.id, status: response.status, url: response.url };
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const failures = [];
  for (const source of sources) {
    try {
      const result = await checkSource(source);
      console.log(`OK ${result.status} ${result.id} ${result.url}`);
    } catch (error) {
      failures.push(`${source.id}: ${error.message}`);
      console.error(`FAIL ${source.id} ${source.url}: ${error.message}`);
    }
  }
  if (failures.length) process.exitCode = 1;
}

main();

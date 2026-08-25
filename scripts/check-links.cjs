const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const definiteFailures = new Set([404, 410]);
const retryableStatuses = new Set([408, 425, 429]);

function classifyStatus(status) {
  if (status >= 200 && status < 400) return 'ok';
  if (definiteFailures.has(status)) return 'broken';
  return 'warning';
}

function shouldRetry(status) {
  return retryableStatuses.has(status) || status >= 500;
}

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function requestSource(source, fetchImpl = fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetchImpl(source.url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'bakumatsu-people-navigator-link-check/2.0'
      },
      redirect: 'follow',
      signal: controller.signal
    });
    await response.body?.cancel();
    return { status: response.status, url: response.url || source.url };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkSource(source, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const sleep = options.sleep || wait;
  const retries = options.retries ?? 1;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await requestSource(source, fetchImpl);
      if (attempt < retries && shouldRetry(response.status)) {
        await sleep(750 * (attempt + 1));
        continue;
      }
      return { ...source, ...response, outcome: classifyStatus(response.status) };
    } catch (error) {
      if (attempt < retries) {
        await sleep(750 * (attempt + 1));
        continue;
      }
      return {
        ...source,
        outcome: 'warning',
        status: null,
        message: error.name === 'AbortError' ? 'request timed out' : error.message
      };
    }
  }
  throw new Error('unreachable');
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

async function main() {
  const { sources } = JSON.parse(fs.readFileSync(path.join(root, 'data/sources.json'), 'utf8'));
  const results = await mapWithConcurrency(sources, 3, checkSource);
  for (const result of results) {
    const status = result.status || '-';
    const detail = result.message || result.url;
    const label = result.outcome === 'ok' ? 'OK' : result.outcome === 'broken' ? 'BROKEN' : 'WARN';
    const output = `${label} ${status} ${result.id} ${detail}`;
    if (result.outcome === 'ok') console.log(output);
    else if (result.outcome === 'broken') console.error(output);
    else console.warn(output);
  }

  const totals = results.reduce((counts, result) => {
    counts[result.outcome] += 1;
    return counts;
  }, { ok: 0, warning: 0, broken: 0 });
  console.log(`SUMMARY ok=${totals.ok} warning=${totals.warning} broken=${totals.broken}`);
  if (totals.broken) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { checkSource, classifyStatus, mapWithConcurrency, shouldRetry };

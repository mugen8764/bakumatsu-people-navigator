const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const definiteFailures = new Set([404, 410]);
const retryableStatuses = new Set([408, 425, 429]);
const usage = 'npm run check:links -- [--source SOURCE_ID ...] [--list]';

function parseOptions(args) {
  const options = { sourceIds: [], list: false, help: false };
  for (let index = 0; index < args.length; index += 1) {
    const [flag, inline] = args[index].split(/=(.*)/s);
    if (flag === '--source') {
      const id = inline ?? args[++index];
      if (!id || id.startsWith('--')) throw new Error('--source requires a source ID.');
      options.sourceIds.push(id);
    } else if ((flag === '--list' || flag === '--help') && inline === undefined) {
      options[flag.slice(2)] = true;
    } else {
      throw new Error(`Unknown option: ${args[index]}\n${usage}`);
    }
  }
  return options;
}

function selectSources(sources, sourceIds) {
  if (!sourceIds.length) return sources;
  const byId = new Map(sources.map(source => [source.id, source]));
  const ids = [...new Set(sourceIds)];
  const unknown = ids.filter(id => !byId.has(id));
  if (unknown.length) throw new Error(`Unknown source IDs: ${unknown.join(', ')}`);
  return ids.map(id => byId.get(id));
}

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

async function main(args = process.argv.slice(2), dependencies = {}) {
  const options = parseOptions(args);
  const logger = dependencies.logger || console;
  if (options.help) {
    logger.log(`${usage}\nOmit --source to check all sources. Repeat --source for multiple IDs.\n--list shows the selected IDs and URLs without making requests.`);
    return 0;
  }
  const sources = dependencies.sources || JSON.parse(fs.readFileSync(path.join(root, 'data/sources.json'), 'utf8')).sources;
  // Resolve every ID before making any request; typos must not expand the scope.
  const selected = selectSources(sources, options.sourceIds);
  if (options.list) {
    for (const source of selected) logger.log(`SOURCE ${source.id} ${source.url}`);
    logger.log(`Selected ${selected.length} sources. No requests made.`);
    return 0;
  }
  const results = await mapWithConcurrency(selected, 3, dependencies.checkSource || checkSource);
  for (const result of results) {
    const status = result.status || '-';
    const detail = result.message || result.url;
    const label = result.outcome === 'ok' ? 'OK' : result.outcome === 'broken' ? 'BROKEN' : 'WARN';
    const output = `${label} ${status} ${result.id} ${detail}`;
    if (result.outcome === 'ok') logger.log(output);
    else if (result.outcome === 'broken') logger.error(output);
    else logger.warn(output);
  }

  const totals = results.reduce((counts, result) => {
    counts[result.outcome] += 1;
    return counts;
  }, { ok: 0, warning: 0, broken: 0 });
  logger.log(`SUMMARY ok=${totals.ok} warning=${totals.warning} broken=${totals.broken}`);
  return totals.broken ? 1 : 0;
}

if (require.main === module) {
  main().then(code => { process.exitCode = code; }).catch(error => {
    console.error(`- ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { checkSource, classifyStatus, main, mapWithConcurrency, parseOptions, selectSources, shouldRetry };

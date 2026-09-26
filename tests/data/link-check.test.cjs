const assert = require('node:assert/strict');
const test = require('node:test');

const { checkSource, classifyStatus, main, mapWithConcurrency, shouldRetry } = require('../../scripts/check-links.cjs');

test('link status classification only fails definitive removals', () => {
  assert.equal(classifyStatus(200), 'ok');
  assert.equal(classifyStatus(301), 'ok');
  assert.equal(classifyStatus(403), 'warning');
  assert.equal(classifyStatus(429), 'warning');
  assert.equal(classifyStatus(500), 'warning');
  assert.equal(classifyStatus(404), 'broken');
  assert.equal(classifyStatus(410), 'broken');
});

test('transient statuses are retried', () => {
  assert.equal(shouldRetry(429), true);
  assert.equal(shouldRetry(503), true);
  assert.equal(shouldRetry(404), false);
});

test('source checking retries a transient response and preserves the final URL', async () => {
  const statuses = [429, 200];
  const result = await checkSource({ id: 'sample', url: 'https://example.com' }, {
    fetchImpl: async () => ({
      status: statuses.shift(),
      url: 'https://example.com/final',
      body: { cancel: async () => {} }
    }),
    sleep: async () => {}
  });
  assert.equal(result.outcome, 'ok');
  assert.equal(result.status, 200);
  assert.equal(result.url, 'https://example.com/final');
});

test('network errors remain warnings after retry', async () => {
  let calls = 0;
  const result = await checkSource({ id: 'sample', url: 'https://example.com' }, {
    fetchImpl: async () => {
      calls += 1;
      throw new Error('temporary DNS failure');
    },
    sleep: async () => {}
  });
  assert.equal(calls, 2);
  assert.equal(result.outcome, 'warning');
  assert.match(result.message, /DNS/);
});

test('concurrency mapper retains input order', async () => {
  const values = await mapWithConcurrency([3, 1, 2], 2, async value => value * 2);
  assert.deepEqual(values, [6, 2, 4]);
});

function linkCheckHarness() {
  const sources = ['first', 'second', 'third'].map(id => ({ id, url: `https://example.com/${id}` }));
  const requests = [];
  const messages = [];
  const dependencies = {
    sources,
    checkSource: async source => {
      requests.push(source.id);
      return { ...source, status: 200, outcome: 'ok' };
    },
    logger: Object.fromEntries(['log', 'warn', 'error'].map(level => [level, message => messages.push({ level, message })]))
  };
  return { sources, requests, messages, dependencies };
}

test('targeted link checks request only named sources, once each', async () => {
  const { requests, messages, dependencies } = linkCheckHarness();
  assert.equal(await main(['--source', 'third', '--source=first', '--source', 'third'], dependencies), 0);
  assert.deepEqual(requests, ['third', 'first']);
  assert.equal(messages.at(-1).message, 'SUMMARY ok=2 warning=0 broken=0');
});

test('the weekly no-argument check still requests the full source catalog', async () => {
  const { requests, dependencies } = linkCheckHarness();
  assert.equal(await main([], dependencies), 0);
  assert.deepEqual(requests, ['first', 'second', 'third']);
});

test('invalid selection fails before any source is requested', async () => {
  for (const args of [
    ['--source', 'first', '--source', 'missing'],
    ['--source'], ['--source='], ['--source', '--list'],
    ['--soruce', 'first'], ['first'], ['--list=true']
  ]) {
    const { requests, dependencies } = linkCheckHarness();
    await assert.rejects(main(args, dependencies), /Unknown|requires/);
    assert.deepEqual(requests, []);
  }
});

test('list and help modes make no requests or source metadata changes', async () => {
  const { sources, requests, messages, dependencies } = linkCheckHarness();
  const before = JSON.stringify(sources);
  assert.equal(await main(['--source', 'second', '--list'], dependencies), 0);
  assert.deepEqual(messages.map(entry => entry.message), [
    'SOURCE second https://example.com/second', 'Selected 1 sources. No requests made.'
  ]);
  assert.equal(await main(['--help'], dependencies), 0);
  assert.deepEqual(requests, []);
  assert.equal(JSON.stringify(sources), before);
});

test('targeted checks preserve warning and broken exit statuses', async () => {
  for (const [outcome, status, code, level] of [['warning', 403, 0, 'warn'], ['broken', 404, 1, 'error']]) {
    const { messages, dependencies } = linkCheckHarness();
    dependencies.checkSource = async source => ({ ...source, outcome, status });
    assert.equal(await main(['--source', 'first'], dependencies), code);
    assert.equal(messages[0].level, level);
    assert.match(messages[0].message, new RegExp(`${status} first`));
  }
});

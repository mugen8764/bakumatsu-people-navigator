const assert = require('node:assert/strict');
const test = require('node:test');

const { checkSource, classifyStatus, mapWithConcurrency, shouldRetry } = require('../../scripts/check-links.cjs');

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

const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const { browserWrapper } = require('../../scripts/build-data.cjs');

test('browser encoding preserves arrays, numbers, empty shapes and literal tag-like values', () => {
  const data = JSON.parse('{"array":[-1,-2,0,1.5,null,true,false,[],{},[0,"repeated long string"]],"other":"repeated long string","__proto__":{"safe":true},"nested":{"constructor":"literal"}}');
  const context = { window: {} };
  vm.runInNewContext(browserWrapper(data), context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.window.BM_DATA)), data);
  assert.ok(Object.hasOwn(context.window.BM_DATA, '__proto__'));
});

test('repeated object shapes do not share mutable values after decoding', () => {
  const item = { evidence: { sourceIds: ['shared_source'], reviewStatus: 'needs_review' }, notes: ['shared long text'] };
  const context = { window: {} };
  vm.runInNewContext(browserWrapper({ a: item, b: item }), context);
  const { a, b } = context.window.BM_DATA;
  a.evidence.sourceIds.push('changed');
  a.notes[0] = 'changed';
  assert.equal(b.evidence.sourceIds.length, 1);
  assert.equal(b.notes[0], 'shared long text');
  assert.equal(b.evidence.reviewStatus, 'needs_review');
});

test('UTF-8 browser scripts round-trip Unicode, line separators and lone surrogates', () => {
  let seed = 7;
  const text = Array.from({ length: 900000 }, () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return String.fromCharCode(32 + (seed >>> 24) % 95);
  }).join('');
  const data = { text, unicode: '幕末𠮷田😀e\u0301\u2028\u2029\ud800\udfff\u0000', repeated: 'あ'.repeat(10000) };
  const script = Buffer.from(browserWrapper(data), 'utf8').toString('utf8');
  assert.ok([...script].some(character => character.codePointAt(0) > 0xffff), 'astral characters stay literal in the script');
  const context = { window: {} };
  vm.runInNewContext(script, context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.window.BM_DATA)), data);
});

test('browser encoding handles small JSON values without external APIs', () => {
  for (const data of [null, true, 0, '', [], {}, 'ABABABA', 'ああああ']) {
    const context = { window: {} };
    vm.runInNewContext(browserWrapper(data), context);
    assert.deepEqual(JSON.parse(JSON.stringify(context.window.BM_DATA)), data);
  }
});

test('browser data is plain JSON text rather than a custom encoding', () => {
  const data = { title: '幕末', items: [1, 2, 3] };
  assert.equal(browserWrapper(data), `window.BM_DATA=JSON.parse(${JSON.stringify(JSON.stringify(data))});\n`);
});

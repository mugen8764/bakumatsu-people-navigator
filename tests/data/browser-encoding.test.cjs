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

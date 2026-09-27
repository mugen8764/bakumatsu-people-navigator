const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const { searchAll } = require('../../src/search.js');
const domain = createDomain(data);
const at = id => domain.sceneById.get(id).index;

test('Fujita father and son occupy separate periods and distinct incidents', () => {
  const toko = domain.getPerson('fujita-toko');
  const koshiro = domain.getPerson('fujita-koshiro');
  assert.equal(searchAll(data, '藤田誠之進').find(r => r.type === '人物').id, toko.id);
  assert.equal(searchAll(data, 'ふじたこしろう').find(r => r.type === '人物').id, koshiro.id);
  assert.ok(domain.statusAt(toko, at('1854-treaty')));
  assert.equal(domain.statusAt(toko, at('1858-ansei')), null);
  assert.equal(domain.statusAt(koshiro, at('1863-aug18')), null);
  assert.ok(domain.statusAt(koshiro, at('1864-kinmon')));
  assert.equal(domain.statusAt(koshiro, at('1865-choshu')), null);
  const coastal = data.incidents['mito-coastal-defense-1853'];
  assert.deepEqual(coastal.participants.map(p => [p.personId, p.involvement]), [['nariaki', 'decision'], [toko.id, 'context']]);
  const tenguto = data.incidents['tenguto-uprising-westward'];
  assert.match(tenguto.summary, /田丸.*11月.*武田を総裁/);
  assert.match(tenguto.date, /旧暦/);
  assert.deepEqual(tenguto.placeIds, ['tsukuba', 'tsuruga']);
  assert.match(data.places.tsuruga.note, /墓所/);
  assert.deepEqual(tenguto.participants.map(p => p.personId), [koshiro.id, 'takeda-kounsai']);
  assert.match(domain.statusAt(domain.getPerson('takeda-kounsai'), at('1865-choshu')).role, /処刑/);
});

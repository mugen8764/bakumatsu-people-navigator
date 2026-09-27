const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const { searchAll } = require('../../src/search.js');
const domain = createDomain(data);
const at = id => domain.sceneById.get(id).index;

test('Chojiro and Mutsu keep their names, activity field and documented boundaries', () => {
  for (const [id, scene, before, after, alias] of [
    ['kondo-chojiro', '1865-choshu', '1864-kinmon', '1866-satcho', '饅頭屋長次郎'],
    ['mutsu-munemitsu', '1867-taisei', '1866-expedition', '1868-toba', '陸奥陽之助']
  ]) {
    const person = domain.getPerson(id);
    assert.equal(domain.statusAt(person, at(before)), null);
    assert.equal(domain.statusAt(person, at(after)), null);
    assert.equal(domain.statusAt(person, at(scene)).faction, '航海・交易');
    assert.equal(searchAll(data, alias).find(result => result.type === '人物').id, id);
  }
  assert.equal(domain.statusAt(domain.getPerson('mutsu-munemitsu'), at('1867-taisei')).display, '陸奥陽之助');
  const procurement = data.incidents['kameyama-shachu-procurement'];
  assert.match(procurement.date, /1865.*1866.*旧暦1月/);
  assert.deepEqual(procurement.participants.map(p => p.personId), ['ryoma', 'kondo-chojiro', 'glover']);
  assert.equal(procurement.relations[0].aPersonId, 'kondo-chojiro');
  const kaientai = data.incidents['kaientai-activities-1867'];
  assert.equal(kaientai.participants.find(p => p.personId === 'mutsu-munemitsu').involvement, 'context');
  assert.ok(!kaientai.participants.some(p => p.personId === 'kondo-chojiro'));
  for (const event of [procurement, kaientai]) {
    assert.deepEqual(event.placeIds, ['nagasaki']);
    assert.ok(event.evidence.sourceIds.length > 0);
  }
  const canonical = require('../../data/factions.json');
  assert.equal(canonical.factions.find(f => f.id === 'navigation-trade').kind, 'field');
  assert.deepEqual(canonical.states.filter(s => s.factionId === 'navigation-trade').map(s => [s.startSceneId, s.endSceneId]), [
    ['1865-choshu', '1865-choshu'], ['1867-taisei', '1867-taisei']
  ]);
});

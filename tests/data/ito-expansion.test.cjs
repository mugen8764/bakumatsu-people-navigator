const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const { searchAll } = require('../../src/search.js');
const domain = createDomain(data);
const at = id => domain.sceneById.get(id).index;

test('Ito and Todo join the Goryo Eji formation without extending Ito beyond 1867', () => {
  const person = domain.getPerson('ito-kashitaro');
  assert.equal(searchAll(data, 'いとうかしたろう').find(r => r.type === '人物').id, person.id);
  assert.equal(domain.statusAt(person, at('1866-expedition')), null);
  assert.equal(domain.statusAt(person, at('1868-toba')), null);
  assert.equal(domain.statusAt(person, at('1867-taisei')).faction, '御陵衛士');
  assert.equal(domain.statusAt(domain.getPerson('todo-heisuke'), at('1867-taisei')).faction, '御陵衛士');
  const incident = data.incidents['goryo-eji-formation-1867'];
  assert.match(incident.date, /旧暦3月.*6月/);
  assert.deepEqual(incident.participants.map(p => [p.personId, p.involvement]), [
    ['ito-kashitaro', 'decision'], ['todo-heisuke', 'onsite']
  ]);
  assert.deepEqual(incident.placeIds, ['kyoto']);
  assert.equal(incident.relations.length, 0);
  assert.ok(!data.relations.some(r => r.a === person.id || r.b === person.id));
  const source = require('../../data/sources.json').sources.find(s => s.id === 'kyoto_ishibumi_goryo_ito');
  assert.equal(source.contentCheckedAt, '2026-09-27');
  assert.match(source.locator, /1835.*3月.*6月/);
});

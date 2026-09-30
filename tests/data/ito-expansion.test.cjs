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
  assert.equal(domain.statusAt(person, at('1864-kinmon')), null);
  assert.equal(domain.statusAt(person, at('1866-expedition')).role, '新選組参謀');
  assert.equal(domain.statusAt(person, at('1868-toba')), null);
  assert.equal(domain.statusAt(person, at('1867-taisei')).faction, '御陵衛士');
  assert.equal(domain.statusAt(domain.getPerson('todo-heisuke'), at('1867-taisei')).faction, '御陵衛士');
  const incident = data.incidents['goryo-eji-formation-1867'];
  assert.match(incident.date, /旧暦3月.*6月/);
  assert.deepEqual(incident.participants.map(p => [p.personId, p.involvement]), [
    ['ito-kashitaro', 'decision'], ['todo-heisuke', 'onsite'], ['kondo', 'context']
  ]);
  assert.deepEqual(incident.placeIds, ['kyoto']);
  assert.equal(incident.relations.length, 2);
  const source = require('../../data/sources.json').sources.find(s => s.id === 'kyoto_ishibumi_goryo_ito');
  assert.equal(source.contentCheckedAt, '2026-09-30');
  assert.match(source.locator, /1835.*3月.*6月/);
});

test('the split ends old organization ties and starts sourced Goryo Eji ties', () => {
  const partner = (r, id) => r.a === id ? r.b : r.a;
  for (const sceneId of ['1865-choshu', '1866-satcho', '1866-expedition']) {
    for (const id of ['ito-kashitaro', 'todo-heisuke']) {
      const status = domain.statusAt(domain.getPerson(id), at(sceneId));
      assert.equal(status.faction, '新選組');
      assert.ok(domain.relationsFor(id, at(sceneId)).some(r => partner(r, id) === 'kondo' && r.type === '組織'));
    }
  }
  const scene = at('1867-taisei');
  const todoRelations = domain.relationsFor('todo-heisuke', scene);
  assert.deepEqual(todoRelations.map(r => partner(r, 'todo-heisuke')), ['ito-kashitaro']);
  const itoRelations = domain.relationsFor('ito-kashitaro', scene);
  assert.ok(itoRelations.some(r => partner(r, 'ito-kashitaro') === 'kondo' && r.type === '対立'));
  assert.ok(!itoRelations.some(r => partner(r, 'ito-kashitaro') === 'kondo' && r.type === '組織'));
  for (const id of ['ito-kashitaro', 'todo-heisuke']) {
    assert.equal(domain.statusAt(domain.getPerson(id), scene).faction, '御陵衛士');
    assert.equal(domain.statusAt(domain.getPerson(id), at('1868-toba')), null);
    const changes = domain.relationChangesFor(id, scene);
    assert.ok(changes.ended.some(r => partner(r, id) === 'kondo' && r.type === '組織'));
    assert.ok(changes.started.some(r => r.a === 'ito-kashitaro' && r.b === 'todo-heisuke'));
  }
  assert.equal(domain.turningPointAt(domain.getPerson('ito-kashitaro'), scene).beforeStatus.role, '新選組参謀');
  assert.deepEqual(domain.eventPeerGroupsFor('ito-kashitaro', scene), []);
});

const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const { searchAll } = require('../../src/search.js');
const domain = createDomain(data);
const at = id => domain.sceneById.get(id).index;

test('Sakuma stays within his lifetime and the voyage incident separates teacher from participant', () => {
  const person = domain.getPerson('sakuma-shozan');
  assert.equal(domain.statusAt(person, at('1853-blackships')), null);
  assert.match(domain.statusAt(person, at('1854-treaty')).role, /蟄居中/);
  assert.match(domain.statusAt(person, at('1858-ansei')).stance, /1854年/);
  assert.match(domain.statusAt(person, at('1862-bunkyu')).stance, /赦免/);
  assert.match(domain.statusAt(person, at('1864-kinmon')).stance, /禁門の変が起きる前/);
  assert.equal(domain.statusAt(person, at('1865-choshu')), null);
  for (const alias of ['佐久間国忠', '佐久間啓', 'さくましょうざん']) {
    assert.equal(searchAll(data, alias).find(result => result.type === '人物').id, person.id);
  }
  const event = data.incidents['shoin-voyage-attempt-1854'];
  assert.equal(event.participants.find(p => p.personId === 'sakuma-shozan').involvement, 'context');
  assert.equal(event.participants.find(p => p.personId === 'sho-in').involvement, 'onsite');
  assert.equal(event.relations.length, 1);
  assert.deepEqual(event.placeIds, ['shimoda', 'hagi']);
  for (const id of ['ansei-purge', 'kinmon-conflict']) {
    assert.ok(!data.incidents[id].participants.some(p => p.personId === person.id));
  }
  assert.ok(!data.relations.some(r => r.a === person.id || r.b === person.id));
  const states = require('../../data/factions.json').states;
  const before = states.find(s => s.id === 'faction-state-medicine-learning-1854-treaty');
  const after = states.find(s => s.id === 'faction-state-medicine-learning-1865-choshu');
  assert.equal(before.endSceneId, '1864-kinmon');
  assert.match(before.position, /象山/);
  assert.equal(after.endSceneId, '1866-expedition');
  assert.ok(!after.position.includes('象山'));
});

const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const { searchAll } = require('../../src/search.js');
const domain = createDomain(data);
const at = id => domain.sceneById.get(id).index;

test('Sufu and Irie preserve period names and different roles at Kinmon', () => {
  for (const [id, alias, involvement] of [
    ['sufu-masanosuke', '麻田公輔', 'context'], ['irie-kuichi', '入江杉蔵', 'onsite']
  ]) {
    const person = domain.getPerson(id);
    assert.equal(searchAll(data, alias).find(r => r.type === '人物').id, id);
    assert.equal(domain.statusAt(person, at('1863-aug18')), null);
    assert.equal(domain.statusAt(person, at('1865-choshu')), null);
    assert.equal(domain.statusAt(person, at('1864-kinmon')).faction, '長州藩');
    assert.equal(data.incidents['kinmon-conflict'].participants.find(p => p.personId === id).involvement, involvement);
    assert.ok(!data.relations.some(r => r.a === id || r.b === id));
  }
  assert.equal(domain.statusAt(domain.getPerson('sufu-masanosuke'), at('1864-kinmon')).display, '麻田公輔');
  assert.equal(data.incidents['kinmon-conflict'].participants.length, 6);
});

const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const { searchAll } = require('../../src/search.js');
const domain = createDomain(data);
const at = id => domain.sceneById.get(id).index;

test('Sadaaki keeps Kuwana affiliation and consultation separate from treaty signing or port opening', () => {
  const person = domain.getPerson('matsudaira-sadaaki');
  assert.equal(searchAll(data, 'まつだいらさだあき').find(r => r.type === '人物').id, person.id);
  assert.equal(person.born, '1847–1908');
  assert.equal(domain.statusAt(person, at('1864-kinmon')), null);
  assert.equal(domain.statusAt(person, at('1866-satcho')), null);
  assert.equal(domain.statusAt(person, at('1865-choshu')).faction, '桑名藩');
  const event = data.incidents['treaty-imperial-approval-1865'];
  assert.deepEqual(event.participants.map(p => [p.personId, p.involvement]), [
    ['yoshinobu', 'decision'], ['katamori', 'decision'], ['matsudaira-sadaaki', 'decision']
  ]);
  assert.match(event.turningPoint, /条約のみ勅許.*先期開港は認められなかった/);
  assert.deepEqual(event.placeIds, ['kyoto']);
  assert.equal(event.relations[0].direction, 'none');
  const canonical = require('../../data/relations.json').personRelations.filter(r => r.aPersonId === person.id || r.bPersonId === person.id);
  assert.equal(canonical.length, 0);
  assert.match(require('../../data/people.json').people.find(p => p.id === person.id).oneLine, /容保の弟/);
  assert.ok(!domain.sceneChangesAt(at('1866-satcho')).relationsEnded.some(r => r.a === person.id || r.b === person.id));
});

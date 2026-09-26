const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const { searchAll } = require('../../src/search.js');
const domain = createDomain(data);
// Scenes are named by ID so inserting a scene does not shift the assertions.
const sceneAt = id => domain.sceneById.get(id).index;

test('Hokuetsu separates the Ojiya negotiators from the coastal army commanders', () => {
  const incident = domain.getIncident('hokuetsu-1868');
  assert.deepEqual(incident.participants.filter(p => p.involvement === 'onsite').map(p => p.personId), ['kawai-tsuginosuke', 'iwamura-takatoshi']);
  assert.deepEqual(incident.participants.filter(p => p.involvement === 'decision').map(p => p.personId), ['yamagata', 'kuroda']);
  assert.ok(incident.placeIds.includes('ojiya'));
  assert.match(data.places.ojiya.name, /慈眼寺/);
  assert.ok(data.places.ojiya.coord[1] < data.places.nagaoka.coord[1]);
  assert.match(incident.date, /旧暦/);
});

test('Iwamura’s alias and military role are limited to the researched 1868 scenes', () => {
  const person = domain.getPerson('iwamura-takatoshi');
  assert.equal(searchAll(data, '岩村精一郎').find(item => item.type === '人物').id, person.id);
  assert.equal(domain.statusAt(person, sceneAt('1868-toba')), null);
  for (const index of [13, 14]) {
    assert.equal(domain.statusAt(person, index).display, '岩村精一郎');
    assert.match(domain.statusAt(person, index).role, /山道軍/);
  }
  assert.equal(domain.statusAt(person, sceneAt('1869-hakodate')), null);
  assert.ok(!domain.activeRelations(sceneAt('1869-hakodate')).some(r => r.a === person.id || r.b === person.id));
});

test('Kawai’s comparison retains the failed negotiation and death before the Aizu siege', () => {
  const person = domain.getPerson('kawai-tsuginosuke');
  const point = domain.turningPointAt(person, sceneAt('1868-tohoku'));
  assert.equal(point.fromScene.index, 13);
  assert.match(point.before, /5月2日.*岩村/);
  assert.match(point.after, /8月16日.*死去/);
  assert.match(point.context, /会談より前から.*戦闘/);
  assert.match(point.context, /死去は若松城の籠城より前/);
  assert.ok(point.evidence.sourceIds.includes('ojiya_meeting'));
  assert.equal(domain.statusAt(person, sceneAt('1869-hakodate')), null);
  assert.equal(domain.turningPointAt(person, sceneAt('1868-edo')), null);
});

const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const domain = createDomain(data);

test('Tosa politics separates the victim, political leader and absent former lord', () => {
  const incident = domain.getIncident('tosa-politics-1862');
  assert.deepEqual(incident.participants.map(p => [p.personId, p.involvement]), [
    ['yoshida-toyo', 'onsite'], ['takechi', 'decision'], ['yodo', 'context']
  ]);
  assert.match(incident.participants[2].summary, /江戸在府中/);
  assert.match(incident.turningPoint, /那須信吾・安岡嘉助・大石団蔵/);
  const opposition = incident.relations.find(r => r.aPersonId === 'takechi');
  assert.equal(opposition.direction, 'none');
  assert.equal(opposition.label, '藩の方針で対立');
  assert.match(incident.date, /旧暦/);
  assert.ok(incident.placeIds.includes('kochi'));
  assert.ok(incident.placeIds.includes('edo'));
});

test('Toyo’s death ends his political relation while the party remains distinct from the domain', () => {
  const toyo = domain.getPerson('yoshida-toyo');
  assert.match(domain.statusAt(toyo, 4).role, /仕置役.*4月8日/);
  assert.equal(domain.statusAt(toyo, 5), null);
  assert.ok(domain.activeRelations(4).some(r => r.a === 'takechi' && r.b === toyo.id));
  assert.ok(!domain.activeRelations(5).some(r => r.a === toyo.id || r.b === toyo.id));
  assert.match(data.terms['tosa-kinno'].context, /土佐藩全体と同じ組織ではない/);
  const comrades = r => r.a === 'takechi' && r.b === 'ryoma';
  assert.ok(!domain.activeRelations(3).some(comrades));
  assert.ok(domain.activeRelations(4).some(comrades));
});

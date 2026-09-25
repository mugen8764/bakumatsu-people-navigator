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

test('Tosa repression separates imprisonment, court roles and later reform', () => {
  const incident = domain.getIncident('tosa-repression-1865');
  assert.equal(incident.sceneId, '1865-choshu');
  assert.deepEqual(incident.participants.map(p => p.personId), ['takechi', 'yodo', 'goto']);
  assert.match(incident.date, /1863年9月21日.*1865年閏5月11日.*旧暦/);
  assert.match(incident.participants.find(p => p.personId === 'goto').summary, /1865年.*大監察.*翌年/);
  assert.ok(!incident.relations.some(r => [r.aPersonId, r.bPersonId].includes('goto')));
  assert.deepEqual(incident.placeIds, ['kochi']);
  const yodo = domain.getPerson('yodo');
  assert.match(domain.statusAt(yodo, 8).stance, /1865年/);
  assert.equal(domain.statusAt(yodo, 9).role, '前土佐藩主');
  assert.match(domain.statusAt(domain.getPerson('goto'), 9).role, /開成館/);
  assert.ok(!data.events.choshu_reform.people.includes('takechi'));
});

test('Takechi’s comparison precedes his death and preserves the end of his active range', () => {
  const person = domain.getPerson('takechi');
  const point = domain.turningPointAt(person, 6);
  assert.equal(point.fromScene.index, 5);
  assert.match(point.before, /京都留守居加役.*4月4日/);
  assert.match(point.after, /9月21日.*投獄/);
  assert.match(point.context, /1865年閏5月11日/);
  assert.equal(domain.turningPointAt(person, 8), null);
  assert.match(domain.statusAt(person, 8).role, /切腹/);
  assert.equal(domain.statusAt(person, 9), null);
  assert.ok(!domain.activeRelations(9).some(r => r.a === 'takechi' || r.b === 'takechi'));
});

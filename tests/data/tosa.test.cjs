const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const domain = createDomain(data);
// Scenes are named by ID so inserting a scene does not shift the assertions.
const sceneAt = id => domain.sceneById.get(id).index;

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
  assert.match(domain.statusAt(toyo, sceneAt('1862-bunkyu')).role, /仕置役.*4月8日/);
  assert.equal(domain.statusAt(toyo, sceneAt('1863-joi')), null);
  assert.ok(domain.activeRelations(sceneAt('1862-bunkyu')).some(r => r.a === 'takechi' && r.b === toyo.id));
  assert.ok(!domain.activeRelations(sceneAt('1863-joi')).some(r => r.a === toyo.id || r.b === toyo.id));
  assert.match(data.terms['tosa-kinno'].context, /土佐藩全体と同じ組織ではない/);
  const comrades = r => r.a === 'takechi' && r.b === 'ryoma';
  assert.ok(!domain.activeRelations(sceneAt('1860-sakurada')).some(comrades));
  assert.ok(domain.activeRelations(sceneAt('1862-bunkyu')).some(comrades));
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
  assert.match(domain.statusAt(yodo, sceneAt('1865-choshu')).stance, /1865年/);
  assert.equal(domain.statusAt(yodo, sceneAt('1866-satcho')).role, '前土佐藩主');
  assert.match(domain.statusAt(domain.getPerson('goto'), 9).role, /開成館/);
  assert.ok(!data.events.choshu_reform.people.includes('takechi'));
});

test('Takechi’s comparison precedes his death and preserves the end of his active range', () => {
  const person = domain.getPerson('takechi');
  const point = domain.turningPointAt(person, sceneAt('1863-aug18'));
  assert.equal(point.fromScene.index, 5);
  assert.match(point.before, /京都留守居加役.*4月4日/);
  assert.match(point.after, /9月21日.*投獄/);
  assert.match(point.context, /1865年閏5月11日/);
  assert.equal(domain.turningPointAt(person, sceneAt('1865-choshu')), null);
  assert.match(domain.statusAt(person, sceneAt('1865-choshu')).role, /切腹/);
  assert.equal(domain.statusAt(person, sceneAt('1866-satcho')), null);
  assert.ok(!domain.activeRelations(sceneAt('1866-satcho')).some(r => r.a === 'takechi' || r.b === 'takechi'));
});

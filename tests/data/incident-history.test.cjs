const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const domain = createDomain(data);
test('history preserves participant values and zero/one/many cases', () => {
  for (const person of data.people) {
    const entries = domain.incidentHistoryFor(person.id);
    assert.equal(entries.length, Object.values(data.incidents).filter(i => i.participants.some(p => p.personId === person.id)).length);
    for (const { incident, participant } of entries) assert.equal(participant, incident.participants.find(p => p.personId === person.id));
  }
  assert.deepEqual(domain.incidentHistoryFor('nariakira'), []);
  assert.equal(domain.incidentHistoryFor('abe').length, 1);
  assert.equal(domain.incidentHistoryFor('hijikata').find(x => x.incident.id === 'koshu-katsunuma').participant.involvement, 'context');
  assert.equal(domain.incidentHistoryFor('okubo')[0].participant.displayName, '大久保一蔵');
});
test('scene order, coarse dates, range starts and stable ties define history order', () => {
  const scenes = [{ id: 'later', order: 2, year: 1868 }, { id: 'early', order: 1, year: 1867 }];
  const incident = (id, sceneId, date) => ({ id, sceneId, date, participants: [{ personId: 'sample', displayName: id }] });
  const fixtures = [incident('later', 'later', '1868年1月'), incident('tie-a', 'early', '1867年3月'),
    incident('nov', 'early', '慶応3年11月15日夜（旧暦）／1867年12月10日'),
    incident('range', 'early', '1867年2〜3月'), incident('tie-b', 'early', '1867年3月'),
    incident('coarse', 'early', '1867年の結成から1868年1月まで'), incident('days', 'early', '1867年3月2〜4日')];
  const sample = createDomain({ ...data, scenes, incidents: Object.fromEntries(fixtures.map(i => [i.id, i])) });
  assert.deepEqual(sample.incidentHistoryFor('sample').map(x => x.incident.id), ['coarse', 'range', 'tie-a', 'tie-b', 'days', 'nov', 'later']);
  assert.equal(sample.incidentHistoryFor('sample')[0].incident.date, '1867年の結成から1868年1月まで');
});

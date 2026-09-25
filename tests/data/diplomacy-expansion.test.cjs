const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const { searchAll } = require('../../src/search.js');
const domain = createDomain(data);
const status = (id, index) => domain.statusAt(domain.getPerson(id), index);

test('treaty negotiators resolve by official names without confusing the two Inoues', () => {
  for (const [query, id] of [['林大学頭', 'hayashi-fukusai'], ['林韑', 'hayashi-fukusai'], ['岩瀬肥後守', 'iwase-tadanari'], ['井上信濃守', 'inoue-kiyonao'], ['井上清直', 'inoue-kiyonao'], ['井上馨', 'inoue']]) {
    assert.equal(searchAll(data, query).find(result => result.type === '人物').id, id, query);
  }
});

test('treaty negotiators leave their earlier roles before later scenes', () => {
  assert.match(status('hayashi-fukusai', 2).role, /大学頭/);
  assert.doesNotMatch(status('hayashi-fukusai', 2).role, /全権/);
  assert.match(status('iwase-tadanari', 3).role, /隠居/);
  assert.match(status('inoue-kiyonao', 3).role, /軍艦奉行/);
  assert.match(status('inoue-kiyonao', 6).role, /退任/);
  assert.match(status('inoue-kiyonao', 7).stance, /夏の禁門の変より後/);
  for (const [id, last] of [['hayashi-fukusai', 2], ['iwase-tadanari', 3], ['inoue-kiyonao', 11]]) {
    assert.ok(status(id, last));
    assert.equal(status(id, last + 1), null);
    assert.equal(domain.activeRelations(last + 1).some(r => r.a === id || r.b === id), false);
  }
  assert.match(status('inoue-kiyonao', 11).stance, /慶応3年12月28日（1868年1月22日）/);
});

test('friendship and commercial treaties distinguish signatories, policy and ratification', () => {
  const friendship = domain.getIncident('friendship-treaty-1854');
  const commercial = domain.getIncident('commercial-treaty-1858');
  assert.equal(friendship.sceneId, '1854-treaty');
  assert.match(friendship.turningPoint, /1855年2月21日/);
  assert.match(friendship.participants.find(p => p.personId === 'hayashi-fukusai').summary, /井戸.*伊沢.*鵜殿/);
  assert.equal(friendship.participants.find(p => p.personId === 'abe').involvement, 'decision');
  for (const id of ['iwase-tadanari', 'inoue-kiyonao', 'harris']) {
    assert.equal(commercial.participants.find(p => p.personId === id).involvement, 'onsite');
    assert.ok(commercial.relations.some(r => r.aPersonId === id || r.bPersonId === id));
  }
  assert.equal(commercial.participants.find(p => p.personId === 'ii').involvement, 'decision');
  assert.ok(commercial.termIds.includes('consular-jurisdiction'));
  assert.ok(friendship.termIds.includes('ratification'));
});

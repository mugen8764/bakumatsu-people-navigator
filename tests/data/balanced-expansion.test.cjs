const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const { searchAll } = require('../../src/search.js');
const { projectLegacyData } = require('../../scripts/lib/project-v2.cjs');
const { validateV2Documents } = require('../../scripts/validate-data.cjs');
const domain = createDomain(data);

test('the expansion supplies one searchable person in each of eight contexts', () => {
  const expected = [
    ['kawaji-toshiakira', '川路聖謨', '幕府'], ['asahiko', '中川宮朝彦親王', '朝廷'],
    ['kaieda', '有村俊斎', '薩摩藩'], ['yoshida-toshimaro', '吉田稔麿', '長州藩'],
    ['yoshida-toyo', '吉田東洋', '土佐藩'], ['yamamoto-kakuma', '山本覚馬', '会津藩'],
    ['takeda-kounsai', '武田耕雲斎', '水戸藩'], ['parkes', 'パークス', '外国勢力']
  ];
  for (const [id, query, faction] of expected) {
    assert.equal(searchAll(data, query).find(item => item.type === '人物').id, id);
    assert.equal(domain.getPerson(id).defaultFaction, faction);
  }
  assert.equal(searchAll(data, '川路利良').find(item => item.type === '人物').id, 'kawaji');
});

test('new names and roles stop at their documented boundaries', () => {
  const status = (id, index) => domain.statusAt(domain.getPerson(id), index);
  assert.equal(status('kaieda', 3).display, '有村俊斎');
  assert.equal(status('kaieda', 4).display, '海江田信義');
  assert.equal(status('asahiko', 6).display, '中川宮朝彦親王');
  assert.equal(status('asahiko', 7).display, '賀陽宮朝彦親王');
  for (const [id, last] of [['yoshida-toyo', 4], ['yoshida-toshimaro', 7], ['takeda-kounsai', 8], ['kawaji-toshiakira', 13]]) {
    assert.ok(status(id, last));
    assert.equal(status(id, last + 1), null);
    assert.ok(!domain.activeRelations(last + 1).some(r => r.a === id || r.b === id));
  }
  assert.equal(status('parkes', 7), null);
  assert.match(status('parkes', 8).role, /公使/);
  assert.equal(status('yamamoto-kakuma', 15).evidence.reviewStatus, 'needs_review');
  assert.doesNotMatch(status('yamamoto-kakuma', 15).role, /府顧問/);
});

test('incident cast distinguishes signing, approval and the attacked side', () => {
  const treaty = data.incidents['commercial-treaty-1858'];
  assert.equal(treaty.participants.find(p => p.personId === 'ii').involvement, 'decision');
  assert.equal(treaty.participants.find(p => p.personId === 'kawaji-toshiakira').involvement, 'context');
  assert.match(treaty.participants.find(p => p.personId === 'harris').role, /署名/);
  assert.equal(treaty.relations[0].direction, 'none');
  assert.equal(data.incidents.ikedaya.participants.find(p => p.personId === 'yoshida-toshimaro').side, '襲撃された側');
  const support = data.incidents['august18-coup'].relations.find(r => r.label === '天皇を補佐');
  assert.equal(support.aPersonId, 'asahiko');
  assert.equal(support.bPersonId, 'komei');
  assert.equal(support.direction, 'forward');
});

test('term contracts reject missing references and unsupported verified definitions', () => {
  assert.equal(Object.keys(data.terms).length, 30);
  for (const mutate of [
    docs => { docs.events.terms.push(structuredClone(docs.events.terms[0])); },
    docs => { docs.events.incidents[0].termIds = ['missing']; },
    docs => { docs.people.people[0].termIds = ['missing']; },
    docs => { docs.events.terms[0].evidence.sourceIds = []; },
    docs => { docs.events.terms[0].evidence.sourceIds = ['missing']; },
    docs => { docs.events.incidents[0].relations[0].direction = 'guess'; }
  ]) {
    const docs = projectLegacyData(data);
    mutate(docs);
    assert.throws(() => validateV2Documents(docs));
  }
});

const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const { searchAll } = require('../../src/search.js');
const domain = createDomain(data);
const status = (id, index) => domain.statusAt(domain.getPerson(id), index);

test('merchants, diplomats and fleet commanders resolve separately and stop at their activity boundaries', () => {
  for (const [query, id, last] of [['リチャードソン', 'richardson', 4], ['ニール', 'neale', 6], ['キューパー', 'kuper', 8]]) {
    assert.equal(searchAll(data, query).find(item => item.type === '人物').id, id);
    assert.ok(status(id, last));
    assert.equal(status(id, last + 1), null);
    assert.ok(!domain.activeRelations(last + 1).some(relation => relation.a === id || relation.b === id));
  }
  assert.equal(domain.getPerson('richardson').born, '1833–1862');
  assert.match(status('richardson', 4).role, /商人/);
  assert.match(status('neale', 5).role, /代理公使/);
  assert.match(status('kuper', 5).role, /指揮官/);
  assert.match(status('kuper', 8).role, /帰国/);
});

test('the Namamugi victim is not carried into the next war and subsequent diplomacy is marked as context', () => {
  const incident = domain.getIncident('namamugi-1862');
  const war = domain.getIncident('satsuma-britain-1863');
  assert.equal(incident.participants.find(p => p.personId === 'neale').involvement, 'context');
  assert.equal(incident.participants.find(p => p.personId === 'richardson').involvement, 'onsite');
  assert.ok(!war.participants.some(p => p.personId === 'richardson'));
  assert.match(incident.stakes, /幕府へ謝罪と10万ポンド.*薩摩へ犯人処罰と2万5千ポンド/);
  assert.match(war.turningPoint, /11月.*支払いに合意/);
  assert.equal(war.relations.find(r => r.bPersonId === 'kuper').direction, 'forward');
});

test('Satow has event-specific activity before working for Parkes', () => {
  assert.match(status('satow', 5).stance, /アーガス/);
  assert.doesNotMatch(status('satow', 5).stance, /パークス/);
  assert.match(status('satow', 7).role, /キューパーの通訳/);
  assert.match(status('satow', 8).stance, /パークス/);
  for (const index of [5, 7]) assert.equal(status('satow', index).evidence.reviewStatus, 'verified');
});

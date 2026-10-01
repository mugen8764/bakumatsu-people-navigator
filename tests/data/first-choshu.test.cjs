const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const { searchAll } = require('../../src/search.js');

test('the first expedition separates settlement from the later war and reuses existing people', () => {
  const first = data.incidents['first-choshu-expedition'];
  const second = data.incidents['second-choshu-war'];
  assert.equal(first.sceneId, data.incidents['kinmon-conflict'].sceneId);
  assert.equal(first.sceneId, '1864-kinmon');
  assert.equal(second.sceneId, '1866-expedition');
  assert.match(first.summary, /戦闘に至らず撤兵/);
  assert.match(first.turningPoint, /長州藩政の転換.*1866年.*第二次/);
  const cast = Object.fromEntries(first.participants.map(p => [p.personId, p]));
  assert.equal(cast.saigo.involvement, 'decision');
  assert.equal(cast.saigo.role, '征長総督の参謀');
  assert.equal(cast['mori-takachika'].involvement, 'decision');
  assert.equal(cast.takasugi.involvement, 'context');
  assert.equal(first.participants.filter(p => p.involvement === 'onsite').length, 0);
  assert.equal(first.relations.length, 0);
  for (const person of first.participants) {
    assert.ok(data.people.some(p => p.id === person.personId));
    assert.equal(person.evidence.reviewStatus, 'verified');
    for (const id of person.evidence.sourceIds) {
      assert.ok(data.sources[id].locator);
      assert.ok(data.sources[id].contentCheckedAt);
    }
  }
  const domain = createDomain(data);
  const before = domain.sceneById.get(first.sceneId).index;
  const reform = domain.eventScene.get('choshu_reform');
  const after = domain.sceneById.get(second.sceneId).index;
  assert.ok(before < reform && reform < after);
  assert.ok(domain.incidentsAt(before).some(p => p.id === first.id));
  assert.ok(searchAll(data, '第一次長州征討').some(p => p.id === first.id));
});

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
  assert.match(second.summary, /四つの方面（芸州口・大島口・石州口・小倉口）/);
  assert.ok(second.evidence.sourceIds.includes('yamaguchi_choshu_reform'));
  assert.match(first.summary, /戦闘に至らず撤兵/);
  assert.match(first.turningPoint, /長州藩政の転換.*1866年.*第二次/);
  const cast = Object.fromEntries(first.participants.map(p => [p.personId, p]));
  assert.equal(cast.saigo.involvement, 'decision');
  assert.equal(cast.saigo.role, '征長総督の参謀');
  assert.equal(cast['mori-takachika'].involvement, 'decision');
  assert.ok(cast['mori-takachika'].evidence.sourceIds.includes('yamahaku_mori_name'));
  assert.deepEqual(domainReading('mori-takachika', cast['mori-takachika'].displayName), []);
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

function domainReading(id, name) {
  const { readingKanasFor } = require('../../src/domain.js');
  return readingKanasFor(data.people.find(person => person.id === id), name);
}

test('Kinmon command does not inherit Akitake column actions from the shared timeline', () => {
  const domain = createDomain(data);
  const scene = domain.sceneById.get('1864-kinmon').index;
  const yoshinobu = domain.statusAt(domain.getPerson('yoshinobu'), scene);
  assert.match(yoshinobu.stance, /諸藩を指揮/);
  assert.doesNotMatch(yoshinobu.stance, /日華門|床几隊/);
  const original = require('../../data/person-statuses.json').statuses.find(s => s.id === 'person-status-yoshinobu-1864-kinmon');
  assert.match(original.evidence.note, /昭武欄.*転用しない/);
  const cast = Object.fromEntries(data.incidents['kinmon-conflict'].participants.map(p => [p.personId, p]));
  assert.equal(cast.yoshinobu.involvement, 'decision');
  assert.equal(cast.kido.involvement, 'context');
  assert.equal(cast['sufu-masanosuke'].involvement, 'context');
  assert.equal(cast['irie-kuichi'].involvement, 'onsite');
});

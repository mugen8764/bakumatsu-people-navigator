const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const { searchAll } = require('../../src/search.js');
const domain = createDomain(data);
const at = id => domain.sceneById.get(id).index;

test('Nagaoka is a secretary in 1867, with contextual document work and limited coverage', () => {
  const person = domain.getPerson('nagaoka-kenkichi');
  assert.equal(searchAll(data, 'ながおかけんきち').find(r => r.type === '人物').id, person.id);
  assert.equal(domain.statusAt(person, at('1866-expedition')), null);
  assert.equal(domain.statusAt(person, at('1868-toba')), null);
  const status = domain.statusAt(person, at('1867-taisei'));
  assert.equal(status.role, '海援隊書記');
  assert.equal(status.faction, '航海・交易');
  const incident = data.incidents['kaientai-activities-1867'];
  const cast = incident.participants.find(p => p.personId === person.id);
  assert.equal(cast.involvement, 'context');
  assert.match(cast.summary, /文書の作成/);
  assert.ok(!JSON.stringify(cast).includes('船中八策'));
  assert.ok(!status.role.includes('隊長'));
  const source = require('../../data/sources.json').sources.find(s => s.id === 'ryoma_mutsu_kaientai');
  assert.match(source.locator, /陸奥.*長岡謙吉/);
  assert.equal(source.contentCheckedAt, '2026-09-27');
});

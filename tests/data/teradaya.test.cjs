const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const { searchAll } = require('../../src/search.js');
const domain = createDomain(data);
// Scenes are named by ID so inserting a scene does not shift the assertions.
const sceneAt = id => domain.sceneById.get(id).index;

test('Teradaya support has concrete directed actions without invented political affiliations', () => {
  const incident = domain.getIncident('teradaya-1866');
  assert.equal(incident.sceneId, '1866-satcho');
  assert.deepEqual(incident.participants.map(p => p.personId), ['ryoma', 'oryo', 'miyoshi-shinzo']);
  assert.ok(incident.participants.every(p => p.involvement === 'onsite'));
  assert.deepEqual(incident.relations.map(r => [r.aPersonId, r.bPersonId, r.direction]), [
    ['oryo', 'ryoma', 'forward'], ['miyoshi-shinzo', 'ryoma', 'forward']
  ]);
  assert.equal(domain.statusAt(domain.getPerson('miyoshi-shinzo'), 9).faction, '長府藩');
  assert.equal(domain.statusAt(domain.getPerson('oryo'), 9).faction, '暮らし・支援');
  assert.equal(data.factions['暮らし・支援'].kind, 'field');
  assert.ok(!data.factionRelations.some(r => r.a === '暮らし・支援' || r.b === '暮らし・支援'));
  assert.ok(!data.events.satcho.people.includes('oryo'));
});

test('new name searches and period bounds retain factual uncertainty separately from incident roles', () => {
  for (const [id, query] of [['oryo', '楢崎龍'], ['miyoshi-shinzo', '三吉慎蔵']]) {
    assert.equal(searchAll(data, query).find(r => r.type === '人物').id, id);
    const person = domain.getPerson(id);
    assert.equal(domain.statusAt(person, sceneAt('1865-choshu')), null);
    assert.equal(domain.statusAt(person, sceneAt('1866-expedition')), null);
    assert.equal(domain.statusAt(person, sceneAt('1866-satcho')).evidence.reviewStatus, 'verified');
  }
  assert.equal(domain.getPerson('oryo').evidence.reviewStatus, 'needs_review');
  assert.match(domain.getPerson('oryo').born, /生年確認中/);
  const events = searchAll(data, '寺田屋').filter(r => r.type === '事件');
  assert.ok(events.some(r => r.id === 'teradaya-1866'));
  assert.ok(events.some(r => r.id === 'bunkyu'));
  assert.match(data.incidents['teradaya-1866'].stakes, /1862年.*別/);
  assert.match(data.terms.funayado.context, /現在の建物は再建/);
});

const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const domain = createDomain(data);

test('Hakodate distinguishes medical care, military command and the surrender parties', () => {
  const incident = domain.getIncident('hakodate-1869');
  assert.deepEqual(incident.participants.filter(p => p.involvement === 'onsite').map(p => p.personId), ['takamatsu-ryoun']);
  assert.deepEqual(incident.participants.filter(p => p.involvement === 'decision').map(p => p.personId), ['enomoto', 'otori-keisuke', 'hijikata', 'kuroda']);
  assert.match(incident.date, /旧暦/);
  assert.match(incident.turningPoint, /11日.*土方.*戦死.*17日.*松平.*増田.*18日/);
  const mediation = incident.relations.find(r => r.aPersonId === 'takamatsu-ryoun');
  assert.equal(mediation.bPersonId, 'enomoto');
  assert.equal(mediation.direction, 'forward');
  assert.match(mediation.description, /小野.*13日.*翌日いったん拒否/);
  assert.ok(mediation.evidence.sourceIds.includes('hakodate_hospital_negotiation'));
});

test('Otori’s uncertain birth does not erase confirmed roles or turn Takamatsu into a commander', () => {
  const otori = domain.getPerson('otori-keisuke');
  const doctor = domain.getPerson('takamatsu-ryoun');
  assert.match(otori.born, /1832\/1833.*生年確認中/);
  assert.equal(otori.evidence.reviewStatus, 'needs_review');
  assert.equal(domain.statusAt(otori, 12), null);
  assert.equal(domain.statusAt(otori, 15).role, '陸軍奉行');
  assert.equal(domain.statusAt(otori, 15).evidence.reviewStatus, 'verified');
  assert.equal(otori.portrait.sourceId, 'ndl_portrait_otori');
  assert.match(otori.portrait.dateNote, /未確認/);
  assert.equal(domain.statusAt(doctor, 10), null);
  for (const scene of [11, 12]) assert.match(domain.statusAt(doctor, scene).role, /フランス/);
  assert.equal(domain.statusAt(doctor, 15).role, '箱館病院長');
  assert.equal(domain.factionAt(doctor, 15), '医療・学問');
});

test('Enomoto’s two comparisons preserve fleet departure before the surrender sequence', () => {
  const person = domain.getPerson('enomoto');
  const departure = domain.turningPointAt(person, 14);
  const surrender = domain.turningPointAt(person, 15);
  assert.equal(departure.fromScene.index, 13);
  assert.match(departure.after, /8月19日/);
  assert.equal(surrender.fromScene.index, 14);
  assert.match(surrender.after, /17日.*翌18日.*旧暦/);
  assert.match(surrender.context, /土方は5月11日に戦死/);
  assert.ok(surrender.evidence.sourceIds.includes('hakodate_surrender1869'));
  assert.equal(domain.statusAt(domain.getPerson('kuroda'), 15).display, '黒田了介');
});

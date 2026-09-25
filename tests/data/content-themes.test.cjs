const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const { searchAll } = require('../../src/search.js');
const domain = createDomain(data);
const status = (id, index) => domain.statusAt(domain.getPerson(id), index);

test('new people can be found by historical and modern names', () => {
  for (const [query, id] of [['斎藤一', 'saito'], ['藤田五郎', 'saito'], ['山口二郎', 'saito'], ['山南敬助', 'yamanami'], ['芹澤鴨', 'serizawa'], ['サトウ', 'satow'], ['グラバー', 'glover'], ['緒方洪庵', 'ogata-koan'], ['福澤諭吉', 'fukuzawa']]) {
    assert.equal(searchAll(data, query)[0].id, id, query);
  }
});

test('deaths, return abroad, and leaving office stop earlier roles carrying forward', () => {
  for (const [id, last] of [['serizawa', 6], ['ogata-koan', 5], ['yamanami', 8]]) {
    assert.ok(status(id, last));
    assert.equal(status(id, last + 1), null);
    assert.equal(domain.activeRelations(last + 1).some(r => r.a === id || r.b === id), false);
  }
  assert.match(status('satow', 15).role, /帰国/);
  assert.equal(domain.activeRelations(15).some(r => r.a === 'satow' || r.b === 'satow'), false);
  assert.equal(status('saito', 12).display, '山口二郎');
  assert.equal(status('saito', 11).evidence.reviewStatus, 'needs_review');
  assert.equal(status('yamanami', 8).evidence.reviewStatus, 'disputed');
  assert.equal(status('fukuzawa', 13).faction, '幕府');
  assert.equal(status('fukuzawa', 14).faction, '医療・学問');
  assert.match(status('fukuzawa', 14).stance, /幕臣を辞め/);
});

test('incident roles distinguish mediation, separate negotiation venues, and the battlefield', () => {
  const cast = (id, person) => domain.getIncident(id).participants.find(p => p.personId === person);
  assert.equal(cast('satcho-agreement', 'nakaoka').involvement, 'context');
  assert.equal(cast('toba-fushimi-battle', 'saito').involvement, 'onsite');
  assert.match(cast('toba-fushimi-battle', 'yoshinobu').role, /大坂/);
  assert.equal(cast('aizu-siege', 'saito').involvement, 'context');
  assert.match(cast('aizu-siege', 'saito').role, /城外/);
  assert.match(cast('edo-castle-surrender', 'yamaoka').summary, /駿府/);
  assert.equal(cast('edo-castle-surrender', 'enomoto').involvement, 'context');
});

test('the five added comparisons resolve adjacent states and keep their own evidence', () => {
  for (const [id, index] of [['takasugi', 8], ['komatsu', 9], ['katsu', 13], ['katamori', 12], ['enomoto', 14]]) {
    const point = domain.turningPointAt(domain.getPerson(id), index);
    assert.ok(point, id);
    assert.equal(point.fromScene.index, index - 1);
    assert.ok(point.evidence.sourceIds.length);
    assert.equal(domain.turningPointAt(domain.getPerson(id), index - 1), null);
  }
});

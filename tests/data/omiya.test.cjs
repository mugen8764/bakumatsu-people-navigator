const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../../data.json');
const canonical = require('../../data/events.json');
const sources = require('../../data/sources.json').sources;
const { createDomain } = require('../../src/domain.js');
const { searchAll } = require('../../src/search.js');
const domain = createDomain(data);

test('Omiya distinguishes the assault from the two deaths and ends both people at 1867', () => {
  const incident = data.incidents['omiya-1867'];
  assert.equal(incident.sceneId, '1867-taisei');
  assert.match(incident.date, /11月15日夜（旧暦）.*1867年12月10日/);
  assert.match(incident.turningPoint, /2日後の11月17日.*旧暦/);
  assert.deepEqual(incident.participants.map(p => p.personId), ['ryoma', 'nakaoka']);
  assert.deepEqual(incident.placeIds, ['kyoto']);
  for (const participant of incident.participants) {
    assert.equal(participant.involvement, 'onsite');
    assert.equal(participant.evidence.reviewStatus, 'verified');
    const person = domain.getPerson(participant.personId);
    assert.ok(domain.statusAt(person, domain.sceneById.get('1867-taisei').index));
    assert.equal(domain.statusAt(person, domain.sceneById.get('1868-toba').index), null);
  }
  assert.match(incident.participants[0].role, /海援隊長/);
  assert.match(incident.participants[1].role, /陸援隊長/);
  assert.match(incident.participants[1].summary, /駆けつけた人.*11月17日/);
  assert.equal(searchAll(data, '近江屋').find(result => result.type === '事件').id, incident.id);
});

test('Omiya preserves testimony and perpetrator caveats without creating suspect or command relations', () => {
  const original = canonical.incidents.find(i => i.id === 'omiya-1867');
  const incident = data.incidents[original.id];
  assert.equal(incident.evidence.reviewStatus, 'disputed');
  assert.deepEqual(incident.relations, []);
  assert.deepEqual(incident.termIds, original.termIds);
  for (const termId of original.termIds) {
    const term = data.terms[termId];
    assert.equal(term.evidence.reviewStatus, 'disputed');
    assert.deepEqual(term.evidence, canonical.terms.find(t => t.id === termId).evidence);
    for (const sourceId of term.evidence.sourceIds) {
      const source = sources.find(s => s.id === sourceId);
      assert.ok(source.locator);
      assert.equal(source.contentCheckedAt, '2026-09-30');
    }
  }
  assert.match(data.terms['omiya-testimony'].meaning, /襲撃後も生存.*後年の記録/);
  assert.match(data.terms['omiya-testimony'].context, /伝承.*確証はない/);
  assert.match(data.terms['omiya-perpetrator-caveat'].meaning, /有力.*食い違い.*断定できる決定的な資料はない/);
  assert.match(data.terms['omiya-perpetrator-caveat'].context, /動機.*確定せず/);
  assert.deepEqual(incident.evidence, original.evidence);
});

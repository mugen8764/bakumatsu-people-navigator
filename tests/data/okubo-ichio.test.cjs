const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const { searchAll } = require('../../src/search.js');
const domain = createDomain(data);
const at = id => domain.sceneById.get(id).index;
const person = domain.getPerson('okubo-ichio');

test('Ichio changes name on retirement and keeps unconfirmed offices under review', () => {
  for (const name of ['大久保一翁', '大久保忠寛', 'おおくぼいちおう']) {
    assert.equal(searchAll(data, name).find(result => result.type === '人物').id, person.id);
  }
  assert.equal(domain.statusAt(person, at('1853-blackships')), null);
  assert.match(domain.statusAt(person, at('1854-treaty')).role, /目付就任前/);
  assert.match(domain.statusAt(person, at('1860-sakurada')).role, /罷免後/);
  assert.equal(domain.statusAt(person, at('1864-kinmon')).display, '大久保忠寛');
  assert.equal(domain.statusAt(person, at('1865-choshu')).display, '大久保一翁');
  assert.match(domain.statusAt(person, at('1867-taisei')).role, /隠居/);
  for (const scene of ['1858-ansei', '1862-bunkyu', '1863-joi', '1864-kinmon', '1868-toba']) {
    assert.equal(domain.statusAt(person, at(scene)).evidence.reviewStatus, 'needs_review');
  }
  assert.match(domain.statusAt(person, at('1868-toba')).role, /若年寄就任前/);
  assert.match(domain.statusAt(person, at('1868-edo')).stance, /2月に若年寄/);
  assert.equal(domain.statusAt(person, at('1868-tohoku')), null);
});

test('Ichio connects to the surrender through documented cooperation, without inventing meeting attendance', () => {
  const incident = data.incidents['edo-castle-surrender'];
  const participant = incident.participants.find(p => p.personId === person.id);
  assert.equal(participant.involvement, 'context');
  assert.match(participant.summary, /恭順論/);
  assert.ok(participant.evidence.sourceIds.includes('fukuroi_minato_ichio'));
  const relations = data.relations.filter(r => r.a === person.id || r.b === person.id);
  assert.equal(relations.length, 1);
  assert.equal(relations[0].a, 'katsu');
  assert.equal(relations[0].start, at('1868-edo'));
  assert.equal(relations[0].end, at('1868-edo'));
  assert.equal(incident.relations.filter(r => r.aPersonId === person.id || r.bPersonId === person.id).length, 1);
  for (const event of ['blackships', 'treaty1854', 'sakurada', 'taisei']) {
    assert.ok(!data.events[event].people.includes(person.id));
  }
});

const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const { searchAll } = require('../../src/search.js');
const domain = createDomain(data);
const at = id => domain.sceneById.get(id).index;

test('Otose and Otome are searchable with bounded support roles and separate uncertainty', () => {
  for (const [id, queries, start, end, before, after] of [
    ['otose', ['お登勢', 'おとせ'], '1866-satcho', '1866-satcho', '1865-choshu', '1866-expedition'],
    ['sakamoto-otome', ['坂本乙女', 'さかもとおとめ', '乙女'], '1863-joi', '1866-expedition', '1862-bunkyu', '1867-taisei']
  ]) {
    for (const query of queries) assert.equal(searchAll(data, query).find(r => r.type === '人物').id, id);
    const person = domain.getPerson(id);
    assert.equal(domain.statusAt(person, at(before)), null);
    assert.equal(domain.statusAt(person, at(after)), null);
    for (let scene = at(start); scene <= at(end); scene++) {
      const status = domain.statusAt(person, scene);
      assert.equal(status.faction, '暮らし・支援');
      assert.equal(status.evidence.reviewStatus, 'verified');
    }
  }
  assert.match(domain.getPerson('sakamoto-otome').born, /確認中/);
  assert.equal(domain.getPerson('sakamoto-otome').evidence.reviewStatus, 'needs_review');
  assert.match(domain.statusAt(domain.getPerson('sakamoto-otome'), at('1865-choshu')).stance, /実際の送付.*確定しない/);
});

test('Teradaya family reports and household support remain context, not onsite rescue', () => {
  const incident = data.incidents['teradaya-1866'];
  assert.deepEqual(incident.participants.filter(p => p.involvement === 'context').map(p => p.personId), ['otose', 'sakamoto-otome']);
  const otome = incident.participants.find(p => p.personId === 'sakamoto-otome');
  assert.match(otome.summary, /事件後.*12月4日/);
  assert.match(otome.role, /現場参加ではない/);
  assert.match(incident.relations.find(r => r.id === 'teradaya-ryoma-otome').description, /襲撃当日.*ではない/);
  assert.ok(!data.incidents['teradaya-1862'].participants.some(p => ['otose', 'sakamoto-otome'].includes(p.personId)));
  assert.ok(!data.events.satcho.people.some(id => ['otose', 'sakamoto-otome'].includes(id)));
  assert.ok(domain.relationsFor('sakamoto-otome', at('1866-satcho')).some(r => r.a === 'ryoma' || r.b === 'ryoma'));
  assert.ok(domain.relationsFor('otose', at('1866-satcho')).some(r => r.a === 'oryo' || r.b === 'oryo'));
  assert.ok(domain.eventPeerGroupsFor('otose', at('1866-satcho')).some(g => g.people.some(p => p.id === 'ryoma')));
  const relations = require('../../data/relations.json').personRelations.filter(r => [r.aPersonId, r.bPersonId].some(id => ['otose', 'sakamoto-otome'].includes(id)));
  assert.ok(relations.every(r => r.typeId === 'kinship'));
  assert.match(relations.find(r => r.aPersonId === 'otose').evidence.note, /法的手続き.*確認していない/);
});

const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const { searchAll } = require('../../src/search.js');
const domain = createDomain(data);
const at = id => domain.sceneById.get(id).index;

test('Hino supporter and soldier are searchable without assigning a captaincy date', () => {
  for (const [id, names] of [
    ['sato-hikogoro', ['佐藤彦五郎', 'さとうひこごろう']],
    ['inoue-genzaburo', ['井上源三郎', 'いのうえげんざぶろう']]
  ]) {
    for (const name of names) assert.equal(searchAll(data, name).find(r => r.type === '人物').id, id);
    assert.equal(domain.statusAt(domain.getPerson(id), at('1862-bunkyu')), null);
  }
  const sato = domain.getPerson('sato-hikogoro'), inoue = domain.getPerson('inoue-genzaburo');
  assert.equal(domain.statusAt(sato, at('1863-joi')).faction, '暮らし・支援');
  assert.equal(domain.statusAt(inoue, at('1863-joi')).faction, '新選組');
  for (const scene of data.scenes) {
    const status = domain.statusAt(inoue, at(scene.id));
    if (status) assert.doesNotMatch(status.role, /六番隊|組長/);
  }
  assert.match(domain.statusAt(inoue, at('1868-toba')).role, /戦死/);
  assert.equal(domain.statusAt(inoue, at('1868-edo')), null);
  assert.equal(domain.statusAt(inoue, at('1869-hakodate')), null);
  assert.equal(domain.statusAt(sato, at('1868-toba')), null);
  assert.match(require('../../data/people.json').people.find(p => p.id === sato.id).evidence.note, /死亡・離脱時期ではなく/);
});

test('Roshigumi support stays in context while Inoue has documented battlefield roles', () => {
  const roshi = data.incidents['roshigumi-1863'];
  assert.equal(roshi.participants.find(p => p.personId === 'sato-hikogoro').involvement, 'context');
  assert.equal(roshi.participants.find(p => p.personId === 'inoue-genzaburo').involvement, 'onsite');
  assert.ok(domain.eventPeerGroupsFor('sato-hikogoro', at('1863-joi')).some(g => g.people.some(p => p.id === 'inoue-genzaburo')));
  for (const id of ['ikedaya', 'toba-fushimi-battle']) {
    const cast = data.incidents[id].participants;
    assert.ok(!cast.some(p => p.personId === 'sato-hikogoro'));
    assert.equal(cast.find(p => p.personId === 'inoue-genzaburo').involvement, 'onsite');
  }
  const inoue = data.incidents.ikedaya.participants.find(p => p.personId === 'inoue-genzaburo');
  assert.ok(inoue.evidence.sourceIds.includes('archives_ikedaya_rewards'));
  assert.match(inoue.summary, /確定しない/);
  const satoRelations = require('../../data/relations.json').personRelations.filter(r => [r.aPersonId, r.bPersonId].includes('sato-hikogoro'));
  assert.deepEqual(satoRelations.map(r => r.typeId), ['kinship']);
  assert.ok(!satoRelations.some(r => [r.aPersonId, r.bPersonId].includes('inoue-genzaburo')));
});

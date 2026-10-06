const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const domain = createDomain(data);

test('reading neighbors form one complete stable chain with open endpoints', () => {
  let id = 'mito-coastal-defense-1853', previous = null;
  const visited = [];
  while (id) {
    assert.ok(!visited.includes(id));
    visited.push(id);
    const [before, after] = domain.incidentNeighbors(id);
    assert.equal(before?.id || null, previous);
    previous = id;
    id = after?.id;
  }
  assert.equal(previous, 'hakodate-1869');
  assert.equal(visited.length, Object.keys(data.incidents).length);
  assert.deepEqual(domain.incidentNeighbors('missing'), []);
  for (const [before, after] of [['taisei-hokan','omiya-1867'], ['omiya-1867','royal-restoration'], ['royal-restoration','toba-fushimi-battle'], ['hokuetsu-1868','aizu-siege'], ['aizu-siege','hakodate-1869']]) {
    assert.equal(domain.incidentNeighbors(before)[1].id, after);
  }
  assert.equal(domain.incidentNeighbors('kinmon-conflict')[1].id, 'shimonoseki-1864');
});

test('scene order takes priority; partial dates and equal dates keep deterministic reading slots', () => {
  const fixtures = [['same-a','early','1867年3月'], ['later','later','1866年1月'], ['coarse','early','1867年'], ['same-b','early','1867年3月'], ['range','early','1867年2〜3月']]
    .map(([id,sceneId,date])=>({id,sceneId,date,participants:[]}));
  const sample = createDomain({...data,scenes:[{id:'later',order:2,year:1868},{id:'early',order:1,year:1867}],incidents:Object.fromEntries(fixtures.map(i=>[i.id,i]))});
  const expected = ['coarse','range','same-a','same-b','later'];
  for (let i=0;i<expected.length;i++) {
    assert.deepEqual(sample.incidentNeighbors(expected[i]).map(x=>x?.id || null), [expected[i-1] || null,expected[i+1] || null]);
  }
  assert.equal(sample.getIncident('coarse').date,'1867年');
});

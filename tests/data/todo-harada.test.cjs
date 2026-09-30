const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const { searchAll } = require('../../src/search.js');
const domain = createDomain(data);
const at = scene => domain.sceneById.get(scene).index;

test('Todo changes from Shinsengumi to Goryo Eji before his death, while Harada stops before Edo', () => {
  const todo = domain.getPerson('todo-heisuke'), harada = domain.getPerson('harada-sanosuke');
  for (const person of [todo, harada]) assert.equal(domain.statusAt(person, at('1863-aug18')), null);
  assert.equal(domain.statusAt(todo, at('1866-expedition')).faction, '新選組');
  assert.equal(domain.statusAt(todo, at('1867-taisei')).faction, '御陵衛士');
  assert.equal(domain.statusAt(todo, at('1868-toba')), null);
  assert.equal(domain.statusAt(harada, at('1868-toba')).faction, '新選組');
  assert.equal(domain.statusAt(harada, at('1868-edo')), null);
  assert.ok(domain.activeFactionNames(at('1867-taisei')).includes('御陵衛士'));
  assert.ok(!domain.activeFactionNames(at('1868-toba')).includes('御陵衛士'));
  for (const name of ['藤堂平助', '原田左之助', '忠一', '原田佐之助']) {
    const id = name === '藤堂平助' ? todo.id : harada.id;
    assert.equal(searchAll(data, name).find(item => item.type === '人物').id, id);
  }
});

test('Ikedaya distinguishes Todo entering with Kondo from Harada documented in the rewards list', () => {
  const cast = data.incidents.ikedaya.participants;
  const todo = cast.find(p => p.personId === 'todo-heisuke'), harada = cast.find(p => p.personId === 'harada-sanosuke');
  assert.equal(todo.involvement, 'onsite');
  assert.equal(todo.role, '近藤隊として突入');
  assert.ok(todo.evidence.sourceIds.includes('php_ikedaya_participants'));
  assert.equal(harada.involvement, 'onsite');
  assert.equal(harada.role, '事件に出動した隊士');
  assert.deepEqual(harada.evidence.sourceIds, ['archives_ikedaya_rewards']);
  assert.ok(!/突入|土方隊|時/.test(harada.summary));
  assert.equal(cast.length, 9);
});

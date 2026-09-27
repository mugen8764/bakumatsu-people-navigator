const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const { searchAll } = require('../../src/search.js');
const domain = createDomain(data);
const at = id => domain.sceneById.get(id).index;

test('Saga learning and the Paris delegation keep period names, separate roles and one-scene coverage', () => {
  for (const [id, name] of [['okuma-shigenobu', '大隈八太郎'], ['sano-tsunetami', '佐野栄寿左衛門']]) {
    const person = domain.getPerson(id);
    assert.equal(searchAll(data, name).find(r => r.type === '人物').id, id);
    assert.equal(domain.statusAt(person, at('1867-taisei')).display, name);
    assert.equal(domain.statusAt(person, at('1866-expedition')), null);
    assert.equal(domain.statusAt(person, at('1868-toba')), null);
    assert.ok(!data.relations.some(r => r.a === id || r.b === id));
  }
  assert.equal(domain.getPerson('sano-tsunetami').born, '1823–1902');
  assert.equal(domain.statusAt(domain.getPerson('nabeshima'), at('1867-taisei')).role, '前佐賀藩主');
  const paris = data.incidents['paris-exposition-1867'];
  assert.equal(paris.participants.length, 6);
  assert.equal(paris.participants.find(p => p.personId === 'sano-tsunetami').side, '佐賀藩使節');
  assert.equal(paris.participants.find(p => p.personId === 'sano-tsunetami').involvement, 'onsite');
  assert.equal(paris.participants.find(p => p.personId === 'nabeshima').involvement, 'decision');
  assert.ok(!paris.participants.some(p => p.personId === 'okuma-shigenobu'));
  const english = data.incidents['nagasaki-english-study-1867'];
  assert.deepEqual(english.participants.map(p => [p.personId, p.involvement]), [['okuma-shigenobu', 'onsite']]);
  assert.deepEqual(english.placeIds, ['nagasaki']);
  assert.ok(!domain.statusAt(domain.getPerson('okuma-shigenobu'), at('1867-taisei')).role.includes('教頭'));
});

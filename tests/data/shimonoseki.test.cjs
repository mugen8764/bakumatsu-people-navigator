const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const { searchAll } = require('../../src/search.js');
const domain = createDomain(data);
// Scenes are named by ID so inserting a scene does not shift the assertions.
const sceneAt = id => domain.sceneById.get(id).index;

test('Alcock is on leave during Neale’s term and leaves before Parkes’s scene', () => {
  const alcock = domain.getPerson('alcock');
  assert.equal(searchAll(data, 'オールコック').find(item => item.type === '人物').id, 'alcock');
  assert.equal(domain.statusAt(alcock, sceneAt('1858-ansei')), null);
  for (const index of [4, 5, 6]) {
    assert.match(domain.statusAt(alcock, index).role, /英国へ帰国中/);
    assert.match(domain.statusAt(domain.getPerson('neale'), index).role, /代理公使/);
  }
  assert.match(domain.statusAt(alcock, sceneAt('1864-kinmon')).role, /再来日/);
  assert.equal(domain.statusAt(domain.getPerson('neale'), 7), null);
  assert.equal(domain.statusAt(alcock, sceneAt('1865-choshu')), null);
  assert.ok(!domain.activeRelations(sceneAt('1865-choshu')).some(r => r.a === 'alcock' || r.b === 'alcock'));
});

test('the four-power incident distinguishes policy makers, interpreters and the two settlements', () => {
  const incident = domain.getIncident('shimonoseki-1864');
  assert.match(incident.summary, /英国・フランス・オランダ・米国/);
  for (const id of ['alcock', 'roches']) assert.equal(incident.participants.find(p => p.personId === id).involvement, 'decision');
  assert.equal(incident.participants.find(p => p.personId === 'satow').involvement, 'onsite');
  assert.match(incident.turningPoint, /9月の現地講和.*10月22日.*300万ドル/);
  assert.equal(searchAll(data, '宍戸刑馬').find(item => item.type === '人物').id, 'takasugi');
  assert.equal(incident.participants.find(p => p.personId === 'takasugi').displayName, '宍戸刑馬');
});

test('the returning students have evidence-backed comparisons before the attack', () => {
  for (const id of ['ito', 'inoue']) {
    const person = domain.getPerson(id);
    const comparison = domain.turningPointAt(person, sceneAt('1864-kinmon'));
    assert.equal(comparison.fromScene.index, 6);
    assert.match(comparison.before, /英国/);
    assert.match(comparison.after, /攻撃前/);
    assert.match(comparison.context, /前年/);
    assert.equal(domain.turningPointAt(person, sceneAt('1863-aug18')), null);
    assert.equal(domain.turningPointAt(person, sceneAt('1865-choshu')), null);
    assert.ok(comparison.evidence.sourceIds.includes('yamaguchi_bakan_war'));
  }
  assert.doesNotMatch(domain.statusAt(domain.getPerson('ito'), 7).stance, /下関戦争の報/);
});

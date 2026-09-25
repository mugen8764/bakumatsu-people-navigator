const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const { searchAll } = require('../../src/search.js');
const domain = createDomain(data);

test('succession candidates, their advocates and later purge punishments stay distinct', () => {
  const succession = domain.getIncident('shogun-succession-1858');
  assert.equal(succession.participants.find(p => p.personId === 'iemochi').displayName, '徳川慶福');
  assert.equal(succession.participants.find(p => p.personId === 'yoshinobu').involvement, 'context');
  assert.equal(succession.participants.find(p => p.personId === 'ii').involvement, 'decision');
  const purge = domain.getIncident('ansei-purge');
  assert.match(purge.date, /1858〜1859/);
  assert.match(purge.participants.find(p => p.personId === 'yoshinobu').summary, /1858.*1859/);
  assert.ok(!purge.participants.some(p => p.personId === 'iesada'));
  assert.ok(!purge.relations.some(r => [r.aPersonId, r.bPersonId].includes('sho-in') && [r.aPersonId, r.bPersonId].includes('sanai')));
  assert.equal(domain.statusAt(domain.getPerson('iesada'), 3), null);
});

test('Sakuradamon perpetrators do not turn clan leaders or the later marriage into onsite participants', () => {
  const incident = domain.getIncident('sakuradamon-1860');
  assert.deepEqual(incident.participants.filter(p => p.involvement === 'onsite').map(p => p.personId), ['ii', 'seki', 'arimura']);
  assert.equal(incident.participants.find(p => p.personId === 'nariaki').involvement, 'context');
  assert.ok(!incident.relations.some(r => r.aPersonId === 'nariaki'));
  const marriage = domain.getIncident('kazunomiya-marriage');
  assert.ok(!marriage.participants.some(p => p.personId === 'ii'));
  assert.match(marriage.participants.find(p => p.personId === 'ando').summary, /婚儀の時点では老中/);
  assert.match(domain.statusAt(domain.getPerson('ando'), 4).role, /前老中/);
  assert.equal(domain.statusAt(domain.getPerson('ando'), 5), null);
  assert.equal(domain.statusAt(domain.getPerson('arimura'), 4), null);
});

test('Roshigumi division does not make Kiyokawa a later Shinsengumi member', () => {
  const incident = domain.getIncident('roshigumi-1863');
  assert.match(incident.participants.find(p => p.personId === 'kiyokawa').side, /江戸へ戻る/);
  assert.match(incident.participants.find(p => p.personId === 'kondo').side, /京都に残る/);
  assert.notEqual(domain.statusAt(domain.getPerson('kiyokawa'), 5).faction, '新選組');
  assert.equal(domain.statusAt(domain.getPerson('kiyokawa'), 6), null);
  assert.ok(!domain.getIncident('august18-coup').participants.some(p => p.personId === 'kiyokawa'));
  assert.ok(!data.events.joi1863.people.includes('kiyokawa'));
});

test('voyage roles distinguish ships and Yokosuka construction continues across the change of government', () => {
  const voyage = domain.getIncident('embassy-kanrinmaru-1860');
  const oguri = voyage.participants.find(p => p.personId === 'oguri');
  assert.match(oguri.side, /ポーハタン/);
  assert.ok(voyage.participants.filter(p => p.personId !== 'oguri').every(p => p.side === '咸臨丸の一行'));
  const yard = domain.getIncident('yokosuka-1865');
  assert.equal(yard.participants.find(p => p.personId === 'verny').involvement, 'onsite');
  assert.equal(yard.participants.find(p => p.personId === 'roches').involvement, 'decision');
  assert.match(yard.turningPoint, /完成は1871年/);
  const verny = domain.getPerson('verny');
  assert.equal(domain.statusAt(verny, 7), null);
  assert.match(domain.statusAt(verny, 15).stance, /明治政府/);
  assert.ok(yard.placeIds.includes('yokosuka'));
});

test('new names resolve in search and portraits disclose their historical limits', () => {
  for (const [id, query] of [['iesada', '徳川家祥'], ['seki', '関鉄之介'], ['arimura', '有村次左衛門'], ['ando', '安藤信正'], ['kiyokawa', '清川八郎'], ['verny', 'ヴェルニー']]) {
    assert.equal(searchAll(data, query).find(r => r.type === '人物').id, id);
  }
  assert.match(domain.getPerson('ii').portrait.dateNote, /没後.*写真ではありません/);
  assert.match(domain.getPerson('shungaku').portrait.dateNote, /時期未確認/);
});

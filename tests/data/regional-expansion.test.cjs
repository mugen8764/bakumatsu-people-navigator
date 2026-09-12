const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const { searchAll } = require('../../src/search.js');
const { browserWrapper } = require('../../scripts/build-data.cjs');
const { projectLegacyData } = require('../../scripts/lib/project-v2.cjs');
const { validateV2Documents } = require('../../scripts/validate-data.cjs');
const domain = createDomain(data);
const status = (id, index) => domain.statusAt(domain.getPerson(id), index);

test('regional expansion names and aliases lead to their own people', () => {
  for (const [query, id] of [['小栗上野介', 'oguri'], ['毛利慶親', 'mori-takachika'],
    ['新島八重', 'yae'], ['鍋島閑叟', 'nabeshima'], ['河井継之助', 'kawai-tsuginosuke'],
    ['ロシュ', 'roches'], ['楠本伊篤', 'ine'], ['ジョン万次郎', 'manjiro']]) {
    assert.equal(searchAll(data, query).find(item => item.type === '人物').id, id);
  }
});

test('retirement, rename, departure and death do not carry old roles forward', () => {
  assert.equal(status('mori-takachika', 6).display, '毛利慶親');
  assert.match(status('mori-takachika', 7).stance, /11月4日/);
  assert.equal(status('mori-takachika', 8).display, '毛利敬親');
  assert.match(status('mori-takachika', 15).role, /隠居/);
  assert.equal(status('nabeshima', 3).role, '佐賀藩主');
  assert.equal(status('nabeshima', 4).role, '前佐賀藩主');
  assert.doesNotMatch(status('nabeshima', 15).role, /開拓使/);
  for (const [id, last] of [['oguri', 13], ['roches', 13], ['kawai-tsuginosuke', 14]]) {
    assert.ok(status(id, last));
    assert.equal(status(id, last + 1), null);
    assert.ok(!domain.activeRelations(last + 1).some(r => r.a === id || r.b === id));
  }
  assert.match(status('oguri', 13).stance, /閏4月6日/);
  assert.equal(status('yae', 14).display, '八重');
  assert.equal(status('yae', 15).evidence.reviewStatus, 'needs_review');
  assert.equal(status('manjiro', 15).evidence.reviewStatus, 'needs_review');
  assert.doesNotMatch(data.factionStates['1853-blackships']['佐賀藩'].position, /隠居/);
  assert.match(data.factionStates['1862-bunkyu']['佐賀藩'].position, /隠居/);
  assert.doesNotMatch(status('kawai-tsuginosuke', 12).role, /中立/);
  assert.match(status('kawai-tsuginosuke', 13).stance, /5月2日/);
});

test('medical and educational activity is preserved as a field through contracts', () => {
  assert.equal(domain.getPerson('ine').defaultFaction, '医療・学問');
  assert.equal(data.factions['医療・学問'].kind, 'field');
  assert.equal(status('manjiro', 9).faction, '薩摩藩');
  assert.equal(status('manjiro', 11).faction, '医療・学問');
  const docs = projectLegacyData(data);
  const field = docs.factions.factions.find(f => f.id === 'medicine-learning');
  assert.equal(field.kind, 'field');
  field.kind = 'guessed-affiliation';
  assert.throws(() => validateV2Documents(docs));
});

test('individual incidents separate prior context from the people on site', () => {
  const taisei = data.incidents['taisei-hokan'];
  assert.equal(taisei.participants.find(p => p.personId === 'ryoma').involvement, 'context');
  assert.equal(taisei.participants.find(p => p.personId === 'yoshinobu').involvement, 'decision');
  assert.match(taisei.turningPoint, /12月の王政復古は別/);
  const aizu = data.incidents['aizu-siege'];
  assert.equal(aizu.participants.find(p => p.personId === 'yae').involvement, 'onsite');
  assert.equal(aizu.participants.find(p => p.personId === 'yamamoto-kakuma').side, '京都');
  const kawai = aizu.participants.find(p => p.personId === 'kawai-tsuginosuke');
  assert.equal(kawai.involvement, 'context');
  assert.match(kawai.summary, /8月16日死去/);
  assert.ok(aizu.placeIds.includes('nagaoka'));
});

test('compact browser data retains independent scene evidence without changing its shape', () => {
  const context = { window: {} };
  vm.runInNewContext(browserWrapper(data), context);
  const browser = context.window.BM_DATA;
  assert.deepEqual(JSON.parse(JSON.stringify(browser)), data);
  const a = browser.factionStates['1853-blackships']['佐賀藩'];
  const b = browser.factionStates['1854-treaty']['佐賀藩'];
  assert.notEqual(a, b);
  a.evidence.sourceIds.push('mutation');
  assert.ok(!b.evidence.sourceIds.includes('mutation'));
});

const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const domain = createDomain(data);
const status = (id, scene) => domain.statusAt(domain.getPerson(id), scene);

test('undated careers do not become continuous current offices', () => {
  assert.equal(status('saito', 4), null);
  for (const scene of [7, 8, 9, 10]) {
    const saito = status('saito', scene);
    assert.equal(saito.evidence.reviewStatus, 'needs_review');
    assert.match(saito.stance, /就任時期は確認中/);
    assert.doesNotMatch(saito.stance, /隊長を務めた/);
  }
  for (const scene of [4, 5, 6, 7, 8]) {
    assert.match(status('manjiro', scene).role, /経験者/);
    assert.equal(status('manjiro', scene).evidence.reviewStatus, 'needs_review');
  }
  assert.equal(status('manjiro', 9).faction, '薩摩藩');
  for (const scene of [11, 12, 13, 14, 15]) {
    const manjiro = status('manjiro', scene);
    assert.match(manjiro.stance, /1869年/);
    assert.match(manjiro.stance, /任命月日/);
    assert.equal(manjiro.evidence.reviewStatus, 'needs_review');
    assert.equal(manjiro.faction, '医療・学問');
  }
});

test('Kawai appointments stay dated and separate from the May negotiation', () => {
  for (const scene of [9, 10, 11]) {
    const kawai = status('kawai-tsuginosuke', scene);
    assert.match(kawai.stance, /1866年11月/);
    assert.match(kawai.stance, /1867年10月/);
    assert.match(kawai.stance, /在任区間は確認中/);
    assert.equal(kawai.evidence.reviewStatus, 'needs_review');
  }
  const january = status('kawai-tsuginosuke', 12);
  assert.match(january.role, /随行/);
  assert.match(january.stance, /家老就任は同年4月/);
  assert.doesNotMatch(january.role, /家老|中立|軍事総督/);
  assert.equal(january.evidence.reviewStatus, 'needs_review');
  assert.match(status('kawai-tsuginosuke', 13).stance, /5月2日/);
  assert.equal(status('kawai-tsuginosuke', 15), null);
  const participant = data.incidents['hokuetsu-1868'].participants.find(p => p.personId === 'kawai-tsuginosuke');
  assert.equal(participant.involvement, 'onsite');
  assert.match(participant.role, /家老/);
});

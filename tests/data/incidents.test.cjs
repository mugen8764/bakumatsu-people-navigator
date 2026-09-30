const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const stateApi = require('../../src/state.js');
const router = require('../../src/router.js');
const { searchAll } = require('../../src/search.js');
const { projectLegacyData } = require('../../scripts/lib/project-v2.cjs');
const { validateV2Documents } = require('../../scripts/validate-data.cjs');
const domain = createDomain(data);
// Scenes are named by ID so inserting a scene does not shift the assertions.
const sceneAt = id => domain.sceneById.get(id).index;

test('Nakamura Hanjiro keeps his wartime name and documented 1868 coverage', () => {
  const person = domain.getPerson('kirino-toshiaki');
  assert.equal(domain.statusAt(person, sceneAt('1867-taisei')), null);
  for (const scene of ['1868-toba', '1868-edo', '1868-tohoku']) {
    assert.equal(domain.statusAt(person, sceneAt(scene)).display, '中村半次郎');
  }
  assert.match(domain.statusAt(person, sceneAt('1868-edo')).role, /東海道先鋒/);
  assert.match(domain.statusAt(person, sceneAt('1868-tohoku')).stance, /会津若松城/);
  assert.equal(domain.statusAt(person, sceneAt('1869-hakodate')), null);
  const cast = data.incidents['toba-fushimi-battle'].participants.find(p => p.personId === person.id);
  assert.equal(cast.involvement, 'onsite');
  assert.equal(cast.side, '新政府側');
  assert.equal(searchAll(data, '桐野利秋').find(item => item.type === '人物').id, person.id);
  assert.ok(!data.relations.some(r => (r.a === person.id && r.b === 'saigo') || (r.b === person.id && r.a === 'saigo')));
});

test('Izo retains uncertain arrest chronology, ends at execution and is not a Toyo assassin', () => {
  const izo = domain.getPerson('okada-izo');
  assert.equal(domain.statusAt(izo, sceneAt('1860-sakurada')), null);
  assert.equal(domain.statusAt(izo, sceneAt('1863-aug18')).evidence.reviewStatus, 'disputed');
  assert.match(domain.statusAt(izo, sceneAt('1864-kinmon')).stance, /この年までに/);
  assert.match(domain.statusAt(izo, sceneAt('1865-choshu')).role, /斬首/);
  assert.equal(domain.statusAt(izo, sceneAt('1866-satcho')), null);
  assert.ok(data.incidents['tosa-repression-1865'].participants.some(p => p.personId === izo.id && p.involvement === 'onsite'));
  assert.ok(!data.incidents['tosa-politics-1862'].participants.some(p => p.personId === izo.id));
  const epithet = searchAll(data, '人斬り以蔵').find(item => item.type === '人物');
  assert.equal(epithet.id, izo.id);
  assert.equal(epithet.sub, '検索用の呼び名：人斬り以蔵');
  assert.equal(searchAll(data, '岡田以蔵')[0].id, izo.id);
  assert.ok(!izo.aliases.includes('人斬り以蔵'));
  for (let scene = izo.activeRange[0]; scene <= izo.activeRange[1]; scene += 1) {
    assert.equal(domain.statusAt(izo, scene).display, '岡田以蔵');
    assert.equal(domain.laterNameAt(izo, scene), null);
  }
});

test('incident context survives participant navigation and clears outside its scene or cast', () => {
  const state = stateApi.createState(data, domain, { scene: sceneAt('1864-kinmon'), selectedIncident: 'ikedaya', selectedPerson: 'kondo' });
  stateApi.selectPerson(state, data, domain, 'okita');
  assert.equal(domain.incidentAt(state).id, 'ikedaya');
  stateApi.selectPerson(state, data, domain, 'kido');
  assert.equal(state.selectedIncident, '');
  state.selectedIncident = 'ikedaya';
  stateApi.choosePerson(state, 'okita');
  stateApi.setScene(state, data, sceneAt('1865-choshu'));
  stateApi.ensureSelections(state, data, domain);
  assert.equal(state.selectedPerson, 'okita');
  assert.equal(state.selectedIncident, '');
});

test('incident links and old URLs stay independent of stored incident context', () => {
  const storage = { getItem: key => ({ 'bm.scene': '1864-kinmon', 'bm.event': 'ikedaya', 'bm.person': 'okita' })[key] };
  const initial = router.readInitialRoute(data, domain, { location: { hash: '#event=ikedaya' }, storage });
  assert.equal(initial.scene, 7);
  assert.equal(initial.view, 'events');
  assert.equal(initial.selectedPerson, 'kondo');
  assert.equal(router.readInitialRoute(data, domain, { location: { hash: '#scene=1864-kinmon&view=people' }, storage }).selectedIncident, '');
  assert.equal(router.readHashRoute(domain, { hash: '#scene=1864-kinmon' }).selectedIncident, '');
  assert.equal(router.readHashRoute(domain, { hash: '#event=ikedaya' }).scene, 7);
  assert.equal(router.readHashRoute(domain, { hash: '#event=ikedaya' }).selectedPerson, 'kondo');
  assert.equal(searchAll(data, '池田屋').find(item => item.type === '事件').id, 'ikedaya');
});

test('Okita and Nagakura do not carry fighting roles through illness, departure or beyond coverage', () => {
  assert.equal(domain.statusAt(domain.getPerson('okita'), 12).role, '療養中');
  assert.equal(domain.statusAt(domain.getPerson('okita'), 14), null);
  assert.equal(domain.statusAt(domain.getPerson('nagakura'), 13).faction, '旧幕府勢力');
  assert.equal(domain.statusAt(domain.getPerson('nagakura'), 13).role, '靖共隊');
  assert.equal(domain.statusAt(domain.getPerson('nagakura'), 15), null);
  assert.equal(domain.statusAt(domain.getPerson('okita'), 8).evidence.reviewStatus, 'needs_review');
  assert.equal(data.incidents.ikedaya.participants.find(item => item.personId === 'katamori').involvement, 'context');
});

test('incident contracts reject unknown cast, incompatible chronology and invented relationship endpoints', () => {
  for (const mutate of [
    docs => { docs.events.incidents[0].participants[0].personId = 'missing'; },
    docs => { docs.events.incidents[0].sceneId = '1853-blackships'; },
    docs => { docs.events.incidents[0].participants[0].evidence.sourceIds = []; },
    docs => { docs.events.incidents[0].relations[0].bPersonId = 'kido'; },
    docs => { docs.events.incidents[0].relations[0].bPersonId = 'katamori'; },
    docs => { docs.people.people.find(person => person.portrait).portrait.src = '../private.jpg'; },
    docs => { docs.people.people.find(person => person.portrait).portrait.rightsSourceId = 'missing'; }
  ]) {
    const documents = projectLegacyData(data);
    mutate(documents);
    assert.throws(() => validateV2Documents(documents));
  }
});

test('incident links open on browsers without URLSearchParams.size', () => {
  // Safari before 17 lacks the size accessor; an incident link must not fall
  // back to the stored incident there.
  const descriptor = Object.getOwnPropertyDescriptor(URLSearchParams.prototype, 'size');
  delete URLSearchParams.prototype.size;
  try {
    const storage = { getItem: key => ({ 'bm.event': 'teradaya-1866', 'bm.view': 'people', 'bm.person': 'abe' })[key] ?? null };
    const shared = router.readInitialRoute(data, domain, {
      location: { hash: '#scene=1864-kinmon&view=events&person=kondo&event=ikedaya' },
      storage
    });
    assert.equal(shared.selectedIncident, 'ikedaya');
    const bare = router.readInitialRoute(data, domain, { location: { hash: '#event=ikedaya' }, storage });
    assert.equal(bare.selectedIncident, 'ikedaya');
    assert.equal(bare.view, 'events');
    assert.equal(bare.selectedPerson, 'kondo');
  } finally {
    Object.defineProperty(URLSearchParams.prototype, 'size', descriptor);
  }
});

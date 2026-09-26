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

test('incident context survives participant navigation and clears outside its scene or cast', () => {
  const state = stateApi.createState(data, domain, { scene: 7, selectedIncident: 'ikedaya', selectedPerson: 'kondo' });
  stateApi.selectPerson(state, data, domain, 'okita');
  assert.equal(domain.incidentAt(state).id, 'ikedaya');
  stateApi.selectPerson(state, data, domain, 'kido');
  assert.equal(state.selectedIncident, '');
  state.selectedIncident = 'ikedaya';
  stateApi.choosePerson(state, 'okita');
  stateApi.setScene(state, data, 8);
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

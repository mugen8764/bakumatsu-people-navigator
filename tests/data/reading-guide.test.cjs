const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createDomain } = require('../../src/domain.js');
const data = require('../../data.json');
const domain = createDomain(data);
const stateAt = (scene, selectedIncident = '') => ({ scene: domain.sceneById.get(scene).index, selectedIncident });
require('../../src/renderers/scene.js');
const { readingGuides } = globalThis.BM_RENDER_SCENE;
const router = require('../../src/router.js');
const stateApi = require('../../src/state.js');

test('the second guide uses registered incidents and distinguishes its two personal threads', () => {
  const steps = readingGuides.shinsengumi;
  assert.equal(steps.length, 7);
  assert.equal(readingGuides.bakumatsu.length, 12);
  let previousScene = -1;
  for (const id of steps) {
    const incident = domain.getIncident(id);
    assert.ok(incident);
    const index = domain.sceneById.get(incident.sceneId).index;
    assert.ok(index >= previousScene);
    previousScene = index;
    assert.equal(domain.guidePosition(steps.map(id => ['incident', id]), stateAt(incident.sceneId, id)), steps.indexOf(id));
  }
  for (const [id, personId] of [['aizu-siege', 'saito'], ['hakodate-1869', 'hijikata']]) {
    assert.ok(steps.includes(id));
    assert.ok(domain.getIncident(id).participants.some(person => person.personId === personId && person.evidence.sourceIds.length));
  }
  assert.equal(domain.guidePosition(steps.map(id => ['incident', id]), stateAt('1866-satcho', 'satcho-agreement')), -1);
  assert.equal(domain.guidePosition(steps.map(id => ['incident', id]), stateAt('1864-kinmon', 'shimonoseki-1864')), 1);
});

test('guide choice shares existing routing and never adds a progress storage key', () => {
  const stored = new Map();
  const storage = { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) };
  const location = { pathname: '/', search: '', hash: '#scene=1864-kinmon&guide=shinsengumi' };
  const state = stateApi.createState(data, domain, router.readInitialRoute(data, domain, { location, storage }));
  assert.equal(state.guide, 'shinsengumi');
  let url;
  router.writeRoute(state, data.scenes[state.scene], { location, storage, history: { replaceState: (_, __, value) => { url = value; } } });
  assert.ok(url.includes('guide=shinsengumi'));
  assert.deepEqual([...stored.keys()].sort(), ['bm.scene', 'bm.view', 'bm.person', 'bm.preferredPerson', 'bm.faction', 'bm.place', 'bm.event'].sort());
  stateApi.applyRoute(state, data, router.readHashRoute(domain, { hash: '#scene=1864-kinmon' }));
  assert.equal(state.guide, 'bakumatsu');
  for (const guide of ['constructor', 'toString', 'unknown']) {
    stateApi.applyRoute(state, data, { guide });
    assert.equal(state.guide, 'bakumatsu');
    assert.equal(stateApi.createState(data, domain, { guide }).guide, 'bakumatsu');
  }
  stateApi.resetState(state, data, domain);
  assert.equal(state.guide, 'bakumatsu');
});

test('guide position prefers an exact incident, then a scene, then first incident in guide order', () => {
  const steps = [['incident', 'kinmon-conflict'], ['scene', '1864-kinmon'], ['incident', 'ikedaya']];
  assert.equal(domain.guidePosition(steps, stateAt('1864-kinmon', 'ikedaya')), 2);
  assert.equal(domain.guidePosition(steps, stateAt('1864-kinmon')), 1);
  assert.equal(domain.guidePosition(steps, stateAt('1864-kinmon', 'shimonoseki-1864')), 1);
  const incidentsOnly = [steps[0], steps[2]];
  assert.equal(domain.guidePosition(incidentsOnly, stateAt('1864-kinmon')), 0);
  assert.equal(domain.guidePosition(incidentsOnly, stateAt('1864-kinmon', 'shimonoseki-1864')), 0);
  assert.equal(domain.guidePosition(incidentsOnly, stateAt('1864-kinmon', 'ikedaya')), 1);
});

test('guide position neither invents a position nor accepts a stale incident from another scene', () => {
  const steps = [['incident', 'ikedaya']];
  assert.equal(domain.guidePosition(steps, stateAt('1853-blackships', 'ikedaya')), -1);
  assert.equal(domain.guidePosition([], stateAt('1864-kinmon')), -1);
});

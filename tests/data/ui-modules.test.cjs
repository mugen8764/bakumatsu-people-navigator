const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const data = require(path.resolve(__dirname, '../../data.json'));
const { createDomain } = require(path.resolve(__dirname, '../../src/domain.js'));
require(path.resolve(__dirname, '../../src/renderers/shared.js'));
const { createShared } = globalThis.BM_RENDER_SHARED;
const router = require(path.resolve(__dirname, '../../src/router.js'));
const stateApi = require(path.resolve(__dirname, '../../src/state.js'));
const { normalise, searchAll } = require(path.resolve(__dirname, '../../src/search.js'));
const { projectMapCoord } = require(path.resolve(__dirname, '../../src/map.js'));

const domain = createDomain(data);

test('search normalization and aliases retain current behavior', () => {
  assert.equal(normalise(' 桂・小 五郎 '), '桂小五郎');
  assert.equal(searchAll(data, '桂小五郎')[0].id, 'kido');
  assert.equal(searchAll(data, '木戸孝允').find(result => result.id === 'kido').title, '木戸孝允');
  assert.equal(searchAll(data, '大政奉還').find(result => result.type === '事件').id, 'taisei');
  assert.equal(searchAll(data, '').length, 0);
});

test('initial route prefers valid hash values and tolerates blocked storage', () => {
  const blockedStorage = { getItem() { throw new Error('blocked'); } };
  const route = router.readInitialRoute(data, domain, {
    location: { hash: '#scene=1867-taisei&view=relations&person=kido&faction=長州藩' },
    storage: blockedStorage
  });
  assert.deepEqual(route, {
    scene: 11,
    view: 'relations',
    selectedPerson: 'kido',
    selectedFaction: '長州藩',
    calendar: 'both'
  });
});

test('state rejects invalid view and calendar values', () => {
  const state = stateApi.createState(data, domain, {
    scene: 0,
    view: 'unknown',
    selectedPerson: 'missing',
    selectedFaction: 'missing',
    calendar: 'unknown'
  });
  assert.equal(state.view, 'people');
  assert.equal(state.calendar, 'both');
  assert.equal(state.selectedPerson, 'perry');
  assert.equal(state.selectedFaction, '幕府');
});

test('route persistence is optional in restricted environments', () => {
  const state = stateApi.createState(data, domain, { scene: 0 });
  assert.doesNotThrow(() => router.writeRoute(state, data.scenes[0], {
    history: { replaceState() { throw new Error('blocked'); } },
    location: { pathname: '/index.html', search: '' },
    storage: { setItem() { throw new Error('blocked'); } }
  }));
});

test('map projection remains deterministic', () => {
  const projection = {
    width: 720,
    height: 770,
    margin: 28,
    lonMin: 127,
    lonMax: 146.5,
    myMin: 0.45087532995171514,
    myMax: 0.9251311516938677
  };
  const [x, y] = projectMapCoord([139.76, 35.68], projection);
  assert.ok(Math.abs(x - 462.4943589743587) < 1e-9);
  assert.ok(Math.abs(y - 416.03974128031706) < 1e-9);
});

test('source cards preserve optional precision metadata', () => {
  const shared = createShared({ data, state: { calendar: 'both', scene: 0 } });
  const markup = shared.sourceLinks(['ndl_kido_iwakura_proposal_1869']);
  assert.match(markup, /該当箇所: 目次144頁（0110\.jp2）/);
  assert.match(markup, /内容確認日: 2026-07-31/);

  const ordinaryMarkup = shared.sourceLinks(['archives_timeline']);
  assert.doesNotMatch(ordinaryMarkup, /source-meta/);
});

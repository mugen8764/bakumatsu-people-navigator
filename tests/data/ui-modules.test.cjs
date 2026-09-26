const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const data = require(path.resolve(__dirname, '../../data.json'));
const { createDomain } = require(path.resolve(__dirname, '../../src/domain.js'));
require(path.resolve(__dirname, '../../src/renderers/shared.js'));
const { createShared } = globalThis.BM_RENDER_SHARED;
const router = require(path.resolve(__dirname, '../../src/router.js'));
const stateApi = require(path.resolve(__dirname, '../../src/state.js'));
const search = require(path.resolve(__dirname, '../../src/search.js'));
const { highlightMatch, normalise, searchAll } = search;
const { layoutMapLabels, mapViewBoxForPoint, projectMapCoord } = require(path.resolve(__dirname, '../../src/map.js'));

const domain = createDomain(data);
// Scenes are named by ID so inserting a scene does not shift the assertions.
const sceneAt = id => domain.sceneById.get(id).index;

test('search normalization and aliases retain current behavior', () => {
  assert.equal(normalise(' 桂・小 五郎 '), '桂小五郎');
  assert.equal(searchAll(data, '桂小五郎')[0].id, 'kido');
  assert.equal(searchAll(data, '木戸孝允').find(result => result.id === 'kido').title, '木戸孝允');
  assert.equal(searchAll(data, '大政奉還').find(result => result.type === '事件').id, 'taisei-hokan');
  assert.deepEqual([...new Set(searchAll(data, '幕府').map(result => result.type))], ['人物', '勢力', '事件']);
  assert.equal(searchAll(data, '').length, 0);
});

test('search highlighting preserves text safely', () => {
  assert.equal(highlightMatch('桂小五郎／木戸孝允', '桂小五郎'), '<mark>桂小五郎</mark>／木戸孝允');
  assert.equal(highlightMatch('<script>桂小五郎</script>', '桂小五郎'), '&lt;script&gt;<mark>桂小五郎</mark>&lt;/script&gt;');
});

test('every registered person name wins over mentions in other biographies', () => {
  for (const person of data.people) {
    assert.equal(searchAll(data, person.name)[0]?.id, person.id, person.name);
  }
  assert.equal(searchAll(data, '西郷')[0].id, 'saigo');
  assert.equal(searchAll(data, 'かつかいしゅう')[0].id, 'katsu');
});

test('search ranks exact names, partial names, roles and descriptions before applying limits', () => {
  const makePerson = (id, name, role = '', stance = '') => ({
    id, name, kana: '', aliases: [], oneLine: '', statuses: { scene: { display: name, role, stance } }
  });
  const sample = {
    scenes: [{ id: 'scene', year: 1864, title: '試験時点' }], factions: {}, events: {},
    people: [
      ...Array.from({ length: 9 }, (_, index) => makePerson(`mention-${index}`, `説明${index}`, '', '対象との交渉')),
      makePerson('role', '役職の人物', '対象の役職'),
      makePerson('partial', '対象の別名'),
      makePerson('exact', '対象')
    ]
  };
  const results = searchAll(sample, '対象');
  assert.deepEqual(results.slice(0, 3).map(result => result.id), ['exact', 'partial', 'role']);
  assert.equal(results.length, 8);
  assert.match(results[2].sub, /1864年.*対象の役職/);
  assert.match(results[3].sub, /1864年.*対象との交渉/);
});

test('standalone search controller ignores composing navigation keys without touching the UI', () => {
  const fail = () => assert.fail('composition must not touch the UI');
  const elements = {
    '#globalSearch': { value: '桂小五郎', setAttribute() {}, removeAttribute() {} },
    '#searchResults': {}
  };
  let primed = false;
  const controller = search.createSearchController({
    $: selector => primed ? fail() : elements[selector],
    $$: () => primed ? fail() : [], actions: {}, data, state: {}
  });
  controller.render();
  primed = true;
  for (const key of ['ArrowDown', 'ArrowUp', 'Enter', 'Escape']) {
    assert.equal(controller.handleKeydown({ key, isComposing: true, preventDefault: fail }), false);
    assert.equal(controller.handleKeydown({ key, keyCode: 229, preventDefault: fail }), false);
  }
});

test('navigation reconciles hidden selections but keeps a compatible person filter', () => {
  const state = stateApi.createState(data, domain, { scene: 0 });
  state.personFactionFilter = '幕府';
  stateApi.selectPerson(state, data, domain, 'abe');
  assert.equal(state.personFactionFilter, '幕府');
  stateApi.selectPerson(state, data, domain, 'saigo');
  assert.equal(state.personFactionFilter, 'すべて');
  state.personFactionFilter = '幕府';
  stateApi.applyRoute(state, data, { selectedPerson: 'saigo' });
  stateApi.ensureSelections(state, data, domain);
  assert.equal(state.personFactionFilter, 'すべて');
});

test('a chosen person returns when the timeline comes back to their period', () => {
  const state = stateApi.createState(data, domain, { scene: sceneAt('1866-satcho'), selectedPerson: 'ryoma' });
  const ryoma = domain.getPerson('ryoma');
  const afterRyoma = ryoma.activeRange[1] + 1;
  stateApi.setScene(state, data, afterRyoma);
  stateApi.ensureSelections(state, data, domain);
  assert.notEqual(state.selectedPerson, 'ryoma');
  assert.equal(state.preferredPerson, 'ryoma');

  stateApi.setScene(state, data, sceneAt('1866-satcho'));
  stateApi.ensureSelections(state, data, domain);
  assert.equal(state.selectedPerson, 'ryoma');

  stateApi.setScene(state, data, afterRyoma);
  stateApi.ensureSelections(state, data, domain);
  const standIn = state.selectedPerson;
  assert.equal(stateApi.selectPerson(state, data, domain, standIn), true);
  stateApi.setScene(state, data, sceneAt('1866-satcho'));
  stateApi.ensureSelections(state, data, domain);
  assert.equal(state.preferredPerson, standIn);
});

test('initial route prefers valid hash values and tolerates blocked storage', () => {
  const blockedStorage = { getItem() { throw new Error('blocked'); } };
  const route = router.readInitialRoute(data, domain, {
    location: { hash: '#scene=1867-taisei&view=relations&person=kido&faction=長州藩&calendar=japanese&place=kyoto' },
    storage: blockedStorage
  });
  assert.deepEqual(route, {
    scene: sceneAt('1867-taisei'),
    view: 'relations',
    selectedPerson: 'kido',
    preferredPerson: 'kido',
    selectedFaction: '長州藩',
    selectedPlace: 'kyoto', selectedIncident: ''
  });
});

test('out-of-period choices survive shared URLs, stored visits and history navigation', () => {
  const state = stateApi.createState(data, domain, { scene: sceneAt('1866-satcho'), selectedPerson: 'ryoma' });
  stateApi.setScene(state, data, sceneAt('1868-toba'));
  stateApi.ensureSelections(state, data, domain);
  const displayed = state.selectedPerson;
  const saved = new Map();
  let url;
  router.writeRoute(state, data.scenes[state.scene], {
    location: { pathname: '/', search: '', hash: '' },
    history: { replaceState(_state, _title, value) { url = new URL(value, 'https://example.test'); } },
    storage: { setItem(key, value) { saved.set(key, value); } }
  });
  const params = new URLSearchParams(url.hash.slice(1));
  assert.equal(params.get('person'), displayed);
  assert.equal(params.get('preferred'), 'ryoma');
  const storage = { getItem: key => saved.get(key) };
  const routes = [
    router.readInitialRoute(data, domain, { location: url, storage: null }),
    router.readInitialRoute(data, domain, { location: { hash: '' }, storage }),
    router.readHashRoute(domain, url)
  ];
  for (const route of routes) {
    const restored = stateApi.createState(data, domain);
    stateApi.applyRoute(restored, data, route);
    stateApi.ensureSelections(restored, data, domain);
    assert.equal(restored.selectedPerson, displayed);
    assert.equal(restored.preferredPerson, 'ryoma');
    stateApi.setScene(restored, data, sceneAt('1866-satcho'));
    stateApi.ensureSelections(restored, data, domain);
    assert.equal(restored.selectedPerson, 'ryoma');
  }
  for (const hash of ['#scene=1866-satcho&person=kido', '#event=ikedaya']) {
    const route = router.readInitialRoute(data, domain, { location: { hash }, storage });
    assert.equal(route.preferredPerson, route.selectedPerson, 'explicit links override stored choices');
  }
  const invalid = stateApi.createState(data, domain, router.readInitialRoute(data, domain, {
    location: { hash: '#scene=1868-toba&person=yoshinobu&preferred=missing' }, storage
  }));
  assert.equal(invalid.preferredPerson, 'yoshinobu');
});

test('state rejects invalid view values', () => {
  const state = stateApi.createState(data, domain, {
    scene: 0,
    view: 'unknown',
    selectedPerson: 'missing',
    selectedFaction: 'missing'
  });
  assert.equal(state.view, 'people');
  assert.equal(state.selectedPerson, 'perry');
  assert.equal(state.selectedFaction, '幕府');
  assert.equal(state.selectedPlace, '');
});

test('state reset restores every selectable control to its initial value', () => {
  const state = stateApi.createState(data, domain, {
    scene: sceneAt('1867-taisei'),
    view: 'relations',
    selectedPerson: 'kido',
    selectedFaction: '長州藩'
  });
  state.personFactionFilter = '長州藩';
  state.relationType = '対立';
  state.selectedPlace = 'edo';
  state.map = { zoomedPlace: 'edo' };

  stateApi.resetState(state, data, domain);

  assert.equal(state.scene, 0);
  assert.equal(state.view, 'people');
  assert.equal(state.selectedPerson, 'abe');
  assert.equal(state.selectedFaction, '幕府');
  assert.equal(state.personFactionFilter, 'すべて');
  assert.equal(state.relationType, 'all');
  assert.equal(state.selectedPlace, '');
  assert.equal(state.map.zoomedPlace, '');
});

test('person and faction selection transitions stay consistent', () => {
  const state = stateApi.createState(data, domain, {
    scene: sceneAt('1866-satcho'),
    selectedPerson: 'kido',
    selectedFaction: '長州藩'
  });

  assert.equal(stateApi.selectPerson(state, data, domain, 'saigo'), true);
  assert.equal(state.selectedPerson, 'saigo');
  assert.equal(state.selectedFaction, '薩摩藩');

  assert.equal(stateApi.selectFaction(state, data, domain, '長州藩'), true);
  assert.equal(state.selectedPerson, 'kido');
  assert.equal(state.selectedFaction, '長州藩');
  assert.equal(stateApi.selectFaction(state, data, domain, '存在しない勢力'), false);
});

test('inherited property names are not accepted as registered records', () => {
  const state = stateApi.createState(data, domain, { scene: 0, selectedPlace: 'constructor' });
  assert.equal(state.selectedPlace, '');

  stateApi.applyRoute(state, data, { selectedPlace: 'toString' });
  assert.equal(state.selectedPlace, '');

  assert.equal(stateApi.selectFaction(state, data, domain, 'toString'), false);
  assert.equal(stateApi.selectFaction(state, data, domain, 'constructor'), false);
});

test('route persistence is optional in restricted environments', () => {
  const state = stateApi.createState(data, domain, { scene: 0 });
  assert.doesNotThrow(() => router.writeRoute(state, data.scenes[0], {
    history: { replaceState() { throw new Error('blocked'); } },
    location: { pathname: '/index.html', search: '' },
    storage: { setItem() { throw new Error('blocked'); } }
  }));
});

test('route writes add history only for deliberate navigation', () => {
  const calls = [];
  const state = stateApi.createState(data, domain, { scene: 0 });
  const environment = {
    history: {
      pushState(_state, _title, url) { calls.push(['push', url]); },
      replaceState(_state, _title, url) { calls.push(['replace', url]); }
    },
    location: { pathname: '/index.html', search: '', hash: '#previous' },
    storage: null
  };

  router.writeRoute(state, data.scenes[0], environment, { historyMode: 'push' });
  assert.equal(calls[0][0], 'push');
  assert.match(calls[0][1], /scene=1853-blackships&view=people&person=abe&faction=/);
  assert.doesNotMatch(calls[0][1], /calendar=/);

  environment.location.hash = `#${calls[0][1].split('#')[1]}`;
  router.writeRoute(state, data.scenes[0], environment, { historyMode: 'push' });
  assert.equal(calls[1][0], 'replace');
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

test('map zoom view boxes stay centered and inside the full map', () => {
  const projection = { width: 720, height: 770 };
  assert.deepEqual(mapViewBoxForPoint({ x: 360, y: 385 }, projection), {
    x: 210,
    y: 224.58333333333331,
    width: 300,
    height: 320.83333333333337
  });
  assert.deepEqual(mapViewBoxForPoint({ x: 10, y: 10 }, projection), {
    x: 0,
    y: 0,
    width: 300,
    height: 320.83333333333337
  });
  const bottomRight = mapViewBoxForPoint({ x: 710, y: 760 }, projection);
  assert.equal(bottomRight.x + bottomRight.width, 720);
  assert.equal(bottomRight.y + bottomRight.height, 770);
});

test('map labels spread apart in the Tokyo Bay cluster', () => {
  const points = [
    { id: 'edo', name: '江戸／東京', x: 462.5, y: 408.1 },
    { id: 'uraga', name: '浦賀・久里浜', x: 461.1, y: 422.3 },
    { id: 'yokohama', name: '横浜', x: 458.4, y: 415.7 },
    { id: 'shimoda', name: '下田', x: 434.9, y: 441 },
    { id: 'namamugi', name: '生麦', x: 459.4, y: 414.4 }
  ];
  const labels = layoutMapLabels(points, { width: 720, height: 770 });

  labels.forEach(label => {
    assert.ok(label.box.left >= 8 && label.box.right <= 712);
    assert.ok(label.box.top >= 8 && label.box.bottom <= 762);
  });
  labels.forEach((label, index) => labels.slice(index + 1).forEach(other => {
    const overlaps = label.box.left < other.box.right + 4 && label.box.right + 4 > other.box.left
      && label.box.top < other.box.bottom + 4 && label.box.bottom + 4 > other.box.top;
    assert.equal(overlaps, false, `${label.id} overlaps ${other.id}`);
  }));
  assert.ok(labels.some(label => Math.abs(label.y - points.find(point => point.id === label.id).y + 10) > 0.1));
});

test('markup characters in the data are escaped before they reach markup', () => {
  const { escapeHtml } = globalThis.BM_RENDER_SHARED;
  assert.equal(escapeHtml('<b>"a" & \'b\'</b>'), '&lt;b&gt;&quot;a&quot; &amp; &#39;b&#39;&lt;/b&gt;');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(0), '0');

  // Search keeps a standalone copy; it must not drift from the renderer one.
  for (const value of ['<script>', 'a&b', '"q"', "it's", '', undefined, null, 0, 1853]) {
    assert.equal(search.escapeHtml(value), escapeHtml(value), `escaping differs for ${String(value)}`);
  }
});

test('source cards preserve optional precision metadata', () => {
  const shared = createShared({ data, state: { scene: 0 } });
  const markup = shared.sourceLinks(['ndl_kido_iwakura_proposal_1869']);
  assert.match(markup, /該当箇所: 目次144頁（0110\.jp2）/);
  assert.match(markup, /内容確認日: 2026-07-31/);

  const ordinaryMarkup = shared.sourceLinks(['ndl_handwriting']);
  assert.doesNotMatch(ordinaryMarkup, /source-meta/);
});

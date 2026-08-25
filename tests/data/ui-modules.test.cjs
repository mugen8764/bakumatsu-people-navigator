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
const { layoutMapLabels, projectMapCoord } = require(path.resolve(__dirname, '../../src/map.js'));

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

test('source cards preserve optional precision metadata', () => {
  const shared = createShared({ data, state: { calendar: 'both', scene: 0 } });
  const markup = shared.sourceLinks(['ndl_kido_iwakura_proposal_1869']);
  assert.match(markup, /該当箇所: 目次144頁（0110\.jp2）/);
  assert.match(markup, /内容確認日: 2026-07-31/);

  const ordinaryMarkup = shared.sourceLinks(['archives_timeline']);
  assert.doesNotMatch(ordinaryMarkup, /source-meta/);
});

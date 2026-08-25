(() => {
  'use strict';

  function showFatalError(error) {
    console.error(error);
    const status = document.querySelector('#appStatus');
    if (!status) return;
    document.querySelectorAll('.page > :not(#appStatus)').forEach(element => { element.hidden = true; });
    status.hidden = false;
    status.innerHTML = '<h1>表示データを読み込めませんでした</h1><p>ページを再読み込みしてください。解決しない場合は、公開ファイルに <code>data.js</code> と <code>src/</code> が含まれているか確認してください。</p>';
  }

  try {
    initialize();
  } catch (error) {
    showFatalError(error);
  }

  function initialize() {
  const data = window.BM_DATA;
  if (!data) throw new Error('data.js could not be loaded');
  const requiredModules = [
    'BM_DOMAIN',
    'BM_STATE',
    'BM_ROUTER',
    'BM_SEARCH',
    'BM_MAP_VIEW',
    'BM_RENDER_SHARED',
    'BM_RENDER_SCENE',
    'BM_RENDER_PEOPLE',
    'BM_RENDER_FACTIONS',
    'BM_RENDER_RELATIONS',
    'BM_RENDER_EVENTS'
  ];
  for (const name of requiredModules) {
    if (!window[name]) throw new Error(`${name} could not be loaded`);
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const domain = window.BM_DOMAIN.createDomain(data);
  let storage = null;
  try {
    storage = window.localStorage;
  } catch {
    // The application remains usable without persistence.
  }
  const environment = { history: window.history, location: window.location, storage };
  const initial = window.BM_ROUTER.readInitialRoute(data, domain, environment);
  const state = window.BM_STATE.createState(data, domain, initial);
  const actions = {};
  const context = { $, $$, actions, data, domain, state };
  context.shared = window.BM_RENDER_SHARED.createShared(context);

  const sceneRenderer = window.BM_RENDER_SCENE.createSceneRenderer(context);
  const peopleRenderer = window.BM_RENDER_PEOPLE.createPeopleRenderer(context);
  const factionsRenderer = window.BM_RENDER_FACTIONS.createFactionsRenderer(context);
  const relationsRenderer = window.BM_RENDER_RELATIONS.createRelationsRenderer(context);
  const eventsRenderer = window.BM_RENDER_EVENTS.createEventsRenderer(context);
  const mapRenderer = window.BM_MAP_VIEW.createMapRenderer(context, window.BM_MAP);
  const searchController = window.BM_SEARCH.createSearchController(context);

  function scene() {
    return data.scenes[state.scene];
  }

  function renderActiveView() {
    const renderers = {
      people: peopleRenderer.render,
      factions: factionsRenderer.render,
      relations: relationsRenderer.render,
      map: mapRenderer.render,
      events: eventsRenderer.render,
      sources: sceneRenderer.renderSources
    };
    renderers[state.view]();
  }

  function renderAll(options = {}) {
    clearCopyStatuses();
    window.BM_STATE.ensureSelections(state, data, domain);
    sceneRenderer.renderScene();
    sceneRenderer.renderTabs();
    renderActiveView();
    window.BM_ROUTER.writeRoute(state, scene(), environment, options);
    requestAnimationFrame(revealActiveTab);
  }

  function setScene(sceneIndex, options = {}) {
    window.BM_STATE.setScene(state, data, sceneIndex);
    window.BM_STATE.ensureSelections(state, data, domain);
    renderAll({ historyMode: options.historyMode || 'push' });
    if (options.scroll) $('.card-button.selected')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function selectPerson(id, nextView = null) {
    if (!window.BM_STATE.selectPerson(state, data, domain, id)) return;
    if (nextView) state.view = nextView;
    renderAll({ historyMode: 'push' });
  }

  function selectFaction(name, nextView = 'factions') {
    if (!window.BM_STATE.selectFaction(state, data, domain, name)) return;
    state.view = nextView;
    renderAll({ historyMode: 'push' });
  }

  function setView(view) {
    if (!window.BM_STATE.views.has(view)) return;
    state.view = view;
    renderAll({ historyMode: 'push' });
  }

  function openEvent(id) {
    const index = domain.eventScene.get(id);
    if (index === undefined) return;
    state.scene = index;
    state.view = 'events';
    window.BM_STATE.ensureSelections(state, data, domain);
    renderAll({ historyMode: 'push' });
  }

  Object.assign(actions, { openEvent, selectFaction, selectPerson, setScene, setView });

  function clearCopyStatuses() {
    $$('[data-copy-status]').forEach(status => { status.textContent = ''; });
  }

  async function copyCurrentUrl(event) {
    clearCopyStatuses();
    const status = event.currentTarget.id === 'sceneCopyLink' ? $('#sceneCopyStatus') : $('#copyStatus');
    try {
      await navigator.clipboard.writeText(location.href);
      status.textContent = '表示中の状態を共有するURLをコピーしました。';
    } catch {
      status.textContent = `URL: ${location.href}`;
    }
  }

  function openSourcesFromFooter() {
    setView('sources');
    const sourcesView = $('#view-sources');
    sourcesView.focus({ preventScroll: true });
    sourcesView.scrollIntoView({ block: 'start' });
  }

  function resetApp(event) {
    event.preventDefault();
    window.BM_STATE.resetState(state, data, domain);
    $('#relationType').value = 'all';
    $('#globalSearch').value = '';
    $('#sceneDetails').open = false;
    searchController.close();
    renderAll({ historyMode: 'push' });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  let sceneRangeChanging = false;
  $('#sceneSelect').addEventListener('change', event => {
    setScene(event.target.value);
  });
  $('#sceneRange').addEventListener('input', event => {
    setScene(event.target.value, { historyMode: sceneRangeChanging ? 'replace' : 'push' });
    sceneRangeChanging = true;
  });
  $('#sceneRange').addEventListener('change', () => { sceneRangeChanging = false; });
  $('#calendarMode').addEventListener('change', event => {
    state.calendar = event.target.value;
    renderAll();
  });
  $('#prevScene').addEventListener('click', () => {
    setScene(state.scene - 1);
  });
  $('#nextScene').addEventListener('click', () => {
    setScene(state.scene + 1);
  });
  $('#clearPersonFilter').addEventListener('click', () => {
    state.personFactionFilter = 'すべて';
    peopleRenderer.render();
  });
  $('#relationType').addEventListener('change', event => {
    state.relationType = event.target.value;
    clearCopyStatuses();
    relationsRenderer.render();
  });
  const tabs = $$('.tab');
  const tabStrip = $('#primaryTabs');
  const previousTabs = $('#previousTabs');
  const nextTabs = $('#nextTabs');
  const narrowTabs = window.matchMedia('(max-width: 680px)');

  function updateTabScrollControls() {
    const overflow = narrowTabs.matches && tabStrip.scrollWidth > tabStrip.clientWidth + 2;
    previousTabs.hidden = !overflow || tabStrip.scrollLeft <= 2;
    nextTabs.hidden = !overflow || tabStrip.scrollLeft >= tabStrip.scrollWidth - tabStrip.clientWidth - 2;
  }

  function scrollTabsTo(left) {
    tabStrip.scrollTo({
      left,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    });
  }

  function revealActiveTab() {
    const activeTab = tabs.find(button => button.dataset.view === state.view);
    if (narrowTabs.matches && activeTab) {
      scrollTabsTo(activeTab.offsetLeft - (tabStrip.clientWidth - activeTab.offsetWidth) / 2);
    }
    updateTabScrollControls();
  }

  previousTabs.addEventListener('click', () => scrollTabsTo(tabStrip.scrollLeft - tabStrip.clientWidth * 0.72));
  nextTabs.addEventListener('click', () => scrollTabsTo(tabStrip.scrollLeft + tabStrip.clientWidth * 0.72));
  tabStrip.addEventListener('scroll', updateTabScrollControls, { passive: true });
  window.addEventListener('resize', revealActiveTab);
  tabs.forEach((button, index) => {
    button.addEventListener('click', () => setView(button.dataset.view));
    button.addEventListener('keydown', event => {
      let nextIndex = null;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = tabs.length - 1;
      if (nextIndex === null) return;
      event.preventDefault();
      setView(tabs[nextIndex].dataset.view);
      tabs[nextIndex].focus();
    });
  });
  $('#globalSearch').addEventListener('input', searchController.render);
  $('#globalSearch').addEventListener('keydown', event => {
    if (searchController.handleKeydown(event)) return;
    if (event.key === 'Escape') {
      event.currentTarget.value = '';
      searchController.close();
      event.currentTarget.blur();
    }
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.global-search')) searchController.close();
  });
  document.addEventListener('keydown', event => {
    if (event.key === '/' && document.activeElement !== $('#globalSearch')) {
      event.preventDefault();
      $('#globalSearch').focus();
    }
  });
  $('#footerSources').addEventListener('click', openSourcesFromFooter);
  $$('[data-copy-link]').forEach(button => button.addEventListener('click', copyCurrentUrl));
  $('#brandMarkHome').addEventListener('click', resetApp);
  $('#brandTitleHome').addEventListener('click', resetApp);
  function syncRouteFromLocation() {
    const route = window.BM_ROUTER.readHashRoute(domain, window.location);
    window.BM_STATE.applyRoute(state, data, route);
    window.BM_STATE.ensureSelections(state, data, domain);
    renderAll();
  }
  window.addEventListener('hashchange', syncRouteFromLocation);
  window.addEventListener('popstate', syncRouteFromLocation);

  renderAll();
  mapRenderer.init();
  }
})();

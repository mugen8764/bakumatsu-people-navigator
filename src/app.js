(() => {
  'use strict';

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

  function renderAll() {
    window.BM_STATE.ensureSelections(state, data, domain);
    sceneRenderer.renderScene();
    sceneRenderer.renderTabs();
    renderActiveView();
    window.BM_ROUTER.writeRoute(state, scene(), environment);
  }

  function setScene(sceneIndex, options = {}) {
    window.BM_STATE.setScene(state, data, sceneIndex);
    window.BM_STATE.ensureSelections(state, data, domain);
    renderAll();
    if (options.scroll) $('.card-button.selected')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function selectPerson(id, nextView = null) {
    const person = domain.getPerson(id);
    if (!person) return;
    state.scene = domain.nearestSceneForPerson(person, state.scene);
    state.selectedPerson = id;
    if (nextView) state.view = nextView;
    renderAll();
  }

  function selectFaction(name, nextView = 'factions') {
    state.scene = domain.nearestSceneForFaction(name, state.scene);
    state.selectedFaction = name;
    state.view = nextView;
    renderAll();
  }

  function setView(view) {
    if (!window.BM_STATE.views.has(view)) return;
    state.view = view;
    renderAll();
  }

  function openEvent(id) {
    const index = domain.eventScene.get(id);
    if (index === undefined) return;
    state.scene = index;
    state.view = 'events';
    window.BM_STATE.ensureSelections(state, data, domain);
    renderAll();
  }

  Object.assign(actions, { openEvent, selectFaction, selectPerson, setScene, setView });

  function stopPlayback() {
    if (!state.timer) return;
    clearInterval(state.timer);
    state.timer = null;
    sceneRenderer.renderScene();
  }

  function togglePlayback() {
    if (state.timer) {
      stopPlayback();
      return;
    }
    state.timer = setInterval(() => {
      if (state.scene >= data.scenes.length - 1) {
        stopPlayback();
        return;
      }
      state.scene += 1;
      window.BM_STATE.ensureSelections(state, data, domain);
      renderAll();
    }, 2200);
    sceneRenderer.renderScene();
  }

  async function copyCurrentUrl() {
    const status = $('#copyStatus');
    try {
      await navigator.clipboard.writeText(location.href);
      status.textContent = '現在の表示URLをコピーしました。';
    } catch {
      status.textContent = `URL: ${location.href}`;
    }
  }

  $('#sceneSelect').addEventListener('change', event => {
    stopPlayback();
    setScene(event.target.value);
  });
  $('#sceneRange').addEventListener('input', event => {
    stopPlayback();
    setScene(event.target.value);
  });
  $('#calendarMode').addEventListener('change', event => {
    state.calendar = event.target.value;
    renderAll();
  });
  $('#prevScene').addEventListener('click', () => {
    stopPlayback();
    setScene(state.scene - 1);
  });
  $('#nextScene').addEventListener('click', () => {
    stopPlayback();
    setScene(state.scene + 1);
  });
  $('#playScenes').addEventListener('click', togglePlayback);
  $('#clearPersonFilter').addEventListener('click', () => {
    state.personFactionFilter = 'すべて';
    peopleRenderer.render();
  });
  $('#relationType').addEventListener('change', event => {
    state.relationType = event.target.value;
    relationsRenderer.render();
  });
  $$('.tab').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  $('#globalSearch').addEventListener('input', searchController.render);
  $('#globalSearch').addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.currentTarget.value = '';
      searchController.render();
      event.currentTarget.blur();
    }
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.global-search')) $('#searchResults').hidden = true;
  });
  document.addEventListener('keydown', event => {
    if (event.key === '/' && document.activeElement !== $('#globalSearch')) {
      event.preventDefault();
      $('#globalSearch').focus();
    }
  });
  $('#copyLink').addEventListener('click', copyCurrentUrl);
  window.addEventListener('hashchange', () => {
    const route = window.BM_ROUTER.readHashRoute(domain, window.location);
    window.BM_STATE.applyRoute(state, data, route);
    window.BM_STATE.ensureSelections(state, data, domain);
    renderAll();
  });

  renderAll();
  mapRenderer.init();
})();

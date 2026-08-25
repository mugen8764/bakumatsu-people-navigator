(function exposeRouter(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BM_ROUTER = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  function safeGet(storage, key) {
    try {
      return storage?.getItem(key) || null;
    } catch {
      return null;
    }
  }

  function safeSet(storage, key, value) {
    try {
      storage?.setItem(key, value);
    } catch {
      // Persistence is optional; the current in-memory state remains usable.
    }
  }

  function hashParams(location) {
    return new URLSearchParams(String(location?.hash || '').replace(/^#/, ''));
  }

  function sceneIndex(sceneById, sceneId) {
    return sceneById.get(sceneId)?.index;
  }

  function readInitialRoute(data, domain, environment) {
    const { location, storage } = environment;
    const hash = hashParams(location);
    const storedScene = safeGet(storage, 'bm.scene');
    return {
      scene: sceneIndex(domain.sceneById, hash.get('scene') || storedScene) ?? 0,
      view: hash.get('view') || safeGet(storage, 'bm.view') || 'people',
      selectedPerson: hash.get('person') || safeGet(storage, 'bm.person') || 'abe',
      selectedFaction: hash.get('faction') || safeGet(storage, 'bm.faction') || '幕府',
      calendar: safeGet(storage, 'bm.calendar') || 'both'
    };
  }

  function readHashRoute(domain, location) {
    const hash = hashParams(location);
    const route = {};
    if (hash.has('scene')) route.scene = sceneIndex(domain.sceneById, hash.get('scene'));
    if (hash.has('view')) route.view = hash.get('view');
    if (hash.has('person')) route.selectedPerson = hash.get('person');
    if (hash.has('faction')) route.selectedFaction = hash.get('faction');
    return route;
  }

  function writeRoute(state, scene, environment, options = {}) {
    const { history, location, storage } = environment;
    const query = new URLSearchParams({ scene: scene.id, view: state.view });
    if (state.selectedPerson) query.set('person', state.selectedPerson);
    if (state.selectedFaction) query.set('faction', state.selectedFaction);
    const url = `${location.pathname}${location.search}#${query}`;
    const currentUrl = `${location.pathname}${location.search}${location.hash || ''}`;
    try {
      if (options.historyMode === 'push' && currentUrl !== url) history?.pushState(null, '', url);
      else history?.replaceState(null, '', url);
    } catch {
      // URL sharing is optional in restricted contexts such as some file:// browsers.
    }
    safeSet(storage, 'bm.scene', scene.id);
    safeSet(storage, 'bm.view', state.view);
    safeSet(storage, 'bm.person', state.selectedPerson);
    safeSet(storage, 'bm.faction', state.selectedFaction);
    safeSet(storage, 'bm.calendar', state.calendar);
  }

  return { readHashRoute, readInitialRoute, writeRoute };
}));

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
    const eventId = hash.size ? (hash.get('event') || '') : (safeGet(storage, 'bm.event') || '');
    const incident = Object.hasOwn(data.incidents || {}, eventId) ? data.incidents[eventId] : null;
    return {
      scene: sceneIndex(domain.sceneById, hash.get('scene') || incident?.sceneId || storedScene) ?? 0,
      view: hash.get('view') || (hash.size && incident ? 'events' : safeGet(storage, 'bm.view')) || 'people',
      selectedPerson: hash.get('person') || (hash.size && incident ? incident.participants[0].personId : safeGet(storage, 'bm.person')) || 'abe',
      selectedIncident: eventId,
      selectedFaction: hash.get('faction') || safeGet(storage, 'bm.faction') || '幕府',
      selectedPlace: hash.get('place') || safeGet(storage, 'bm.place') || ''
    };
  }

  function readHashRoute(domain, location) {
    const hash = hashParams(location);
    const route = {};
    if (hash.has('scene')) route.scene = sceneIndex(domain.sceneById, hash.get('scene'));
    if (hash.has('view')) route.view = hash.get('view');
    if (hash.has('person')) route.selectedPerson = hash.get('person');
    if (hash.has('faction')) route.selectedFaction = hash.get('faction');
    route.selectedPlace = hash.get('place') || '';
    route.selectedIncident = hash.get('event') || '';
    const incident = domain.getIncident(route.selectedIncident);
    if (incident) {
      if (!hash.has('scene')) route.scene = sceneIndex(domain.sceneById, incident.sceneId);
      if (!hash.has('person')) route.selectedPerson = incident.participants[0].personId;
      if (!hash.has('view')) route.view = 'events';
    }
    return route;
  }

  function writeRoute(state, scene, environment, options = {}) {
    const { history, location, storage } = environment;
    const query = new URLSearchParams({ scene: scene.id, view: state.view });
    if (state.selectedPerson) query.set('person', state.selectedPerson);
    if (state.selectedFaction) query.set('faction', state.selectedFaction);
    if (state.selectedPlace) query.set('place', state.selectedPlace);
    if (state.selectedIncident) query.set('event', state.selectedIncident);
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
    safeSet(storage, 'bm.place', state.selectedPlace);
    safeSet(storage, 'bm.event', state.selectedIncident || '');
  }

  return { readHashRoute, readInitialRoute, writeRoute };
}));

(function exposeState(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BM_STATE = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const views = new Set(['people', 'factions', 'relations', 'map', 'events', 'sources']);
  const calendars = new Set(['both', 'western', 'japanese']);

  function createState(data, domain, initial = {}) {
    const state = {
      scene: Number.isInteger(initial.scene) ? initial.scene : 0,
      view: views.has(initial.view) ? initial.view : 'people',
      selectedPerson: initial.selectedPerson || 'abe',
      selectedFaction: initial.selectedFaction || '幕府',
      personFactionFilter: 'すべて',
      relationType: 'all',
      calendar: calendars.has(initial.calendar) ? initial.calendar : 'both',
      timer: null,
      mapReady: false,
      map: null
    };
    setScene(state, data, state.scene);
    ensureSelections(state, data, domain);
    return state;
  }

  function ensureSelections(state, data, domain) {
    let person = domain.getPerson(state.selectedPerson);
    if (!person || !domain.statusAt(person, state.scene)) {
      person = domain.activePeople(state.scene)[0];
      state.selectedPerson = person?.id || '';
    }
    const factions = domain.activeFactionNames(state.scene);
    if (!factions.includes(state.selectedFaction)) state.selectedFaction = factions[0] || '幕府';
  }

  function setScene(state, data, sceneIndex) {
    const numeric = Number(sceneIndex);
    state.scene = Number.isFinite(numeric)
      ? Math.max(0, Math.min(data.scenes.length - 1, numeric))
      : 0;
  }

  function applyRoute(state, data, route) {
    if (route.scene !== undefined) setScene(state, data, route.scene);
    if (route.view !== undefined && views.has(route.view)) state.view = route.view;
    if (route.selectedPerson !== undefined) state.selectedPerson = route.selectedPerson;
    if (route.selectedFaction !== undefined) state.selectedFaction = route.selectedFaction;
    if (route.calendar !== undefined && calendars.has(route.calendar)) state.calendar = route.calendar;
  }

  return { applyRoute, calendars, createState, ensureSelections, setScene, views };
}));

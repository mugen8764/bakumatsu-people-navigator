(function exposeState(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BM_STATE = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const views = new Set(['people', 'factions', 'relations', 'map', 'events', 'sources']);

  function createState(data, domain, initial = {}) {
    const state = {
      scene: Number.isInteger(initial.scene) ? initial.scene : 0,
      view: views.has(initial.view) ? initial.view : 'people',
      selectedPerson: initial.selectedPerson || 'abe',
      selectedFaction: initial.selectedFaction || '幕府',
      personFactionFilter: 'すべて',
      relationType: 'all',
      selectedPlace: data.places[initial.selectedPlace] ? initial.selectedPlace : '',
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
    if (route.selectedPlace !== undefined) state.selectedPlace = data.places[route.selectedPlace] ? route.selectedPlace : '';
  }

  function selectPerson(state, data, domain, id) {
    const person = domain.getPerson(id);
    if (!person) return false;
    state.scene = domain.nearestSceneForPerson(person, state.scene);
    state.selectedPerson = id;
    const faction = domain.statusAt(person, state.scene)?.faction;
    if (domain.activeFactionNames(state.scene).includes(faction)) state.selectedFaction = faction;
    ensureSelections(state, data, domain);
    return true;
  }

  function selectFaction(state, data, domain, name) {
    if (!data.factions[name]) return false;
    state.scene = domain.nearestSceneForFaction(name, state.scene);
    state.selectedFaction = name;
    const selectedPerson = domain.getPerson(state.selectedPerson);
    if (!selectedPerson || domain.factionAt(selectedPerson, state.scene) !== name) {
      state.selectedPerson = domain.activePeople(state.scene)
        .find(person => domain.factionAt(person, state.scene) === name)?.id || state.selectedPerson;
    }
    ensureSelections(state, data, domain);
    return true;
  }

  function resetState(state, data, domain) {
    setScene(state, data, 0);
    state.view = 'people';
    state.selectedPerson = 'abe';
    state.selectedFaction = '幕府';
    state.personFactionFilter = 'すべて';
    state.relationType = 'all';
    state.selectedPlace = '';
    if (state.map) {
      state.map.zoomedPlace = '';
    }
    ensureSelections(state, data, domain);
  }

  return { applyRoute, createState, ensureSelections, resetState, selectFaction, selectPerson, setScene, views };
}));

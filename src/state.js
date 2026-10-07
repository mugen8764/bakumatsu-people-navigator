(function exposeState(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BM_STATE = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const views = new Set(['people', 'factions', 'relations', 'map', 'events', 'sources']);

  function hasEntry(collection, key) {
    return typeof key === 'string' && Object.hasOwn(collection, key);
  }

  function createState(data, domain, initial = {}) {
    const state = {
      scene: Number.isInteger(initial.scene) ? initial.scene : 0,
      view: views.has(initial.view) ? initial.view : 'people',
      guide: initial.guide === 'shinsengumi' ? initial.guide : 'bakumatsu',
      selectedPerson: initial.selectedPerson || 'abe',
      preferredPerson: initial.preferredPerson || initial.selectedPerson || 'abe',
      selectedFaction: initial.selectedFaction || '幕府',
      personFactionFilter: 'すべて',
      relationType: 'all',
      selectedPlace: hasEntry(data.places, initial.selectedPlace) ? initial.selectedPlace : '',
      selectedIncident: hasEntry(data.incidents || {}, initial.selectedIncident) ? initial.selectedIncident : '',
      mapReady: false,
      map: null
    };
    setScene(state, data, state.scene);
    ensureSelections(state, data, domain);
    return state;
  }

  function choosePerson(state, id) {
    state.selectedPerson = id;
    state.preferredPerson = id;
  }

  function ensureSelections(state, data, domain) {
    const preferred = domain.getPerson(state.preferredPerson);
    if (preferred && domain.statusAt(preferred, state.scene)) state.selectedPerson = preferred.id;
    const incident = domain.incidentAt(state);
    if (!incident || !incident.participants.some(item => item.personId === state.selectedPerson)) state.selectedIncident = '';
    let person = domain.getPerson(state.selectedPerson);
    if (!person || !domain.statusAt(person, state.scene)) {
      person = domain.activePeople(state.scene)[0];
      state.selectedPerson = person?.id || '';
    }
    if (!preferred) state.preferredPerson = state.selectedPerson;
    const factions = domain.activeFactionNames(state.scene);
    if (!factions.includes(state.selectedFaction)) state.selectedFaction = factions[0] || '幕府';
    if (state.personFactionFilter !== 'すべて'
      && domain.factionAt(person, state.scene) !== state.personFactionFilter) {
      state.personFactionFilter = 'すべて';
    }
  }

  function setScene(state, data, sceneIndex) {
    const numeric = Number(sceneIndex);
    state.scene = Number.isFinite(numeric)
      ? Math.max(0, Math.min(data.scenes.length - 1, numeric))
      : 0;
  }

  function applyRoute(state, data, route) {
    if (route.guide !== undefined) state.guide = route.guide === 'shinsengumi' ? route.guide : 'bakumatsu';
    if (route.scene !== undefined) setScene(state, data, route.scene);
    if (route.view !== undefined && views.has(route.view)) state.view = route.view;
    if (route.selectedPerson !== undefined) choosePerson(state, route.selectedPerson);
    if (route.preferredPerson !== undefined) state.preferredPerson = route.preferredPerson;
    if (route.selectedIncident !== undefined) state.selectedIncident = hasEntry(data.incidents || {}, route.selectedIncident) ? route.selectedIncident : '';
    if (route.selectedFaction !== undefined) state.selectedFaction = route.selectedFaction;
    if (route.selectedPlace !== undefined) state.selectedPlace = hasEntry(data.places, route.selectedPlace) ? route.selectedPlace : '';
  }

  function selectPerson(state, data, domain, id) {
    const person = domain.getPerson(id);
    if (!person) return false;
    state.scene = domain.nearestSceneForPerson(person, state.scene);
    choosePerson(state, id);
    const faction = domain.statusAt(person, state.scene)?.faction;
    if (domain.activeFactionNames(state.scene).includes(faction)) state.selectedFaction = faction;
    ensureSelections(state, data, domain);
    return true;
  }

  function selectFaction(state, data, domain, name) {
    if (!hasEntry(data.factions, name)) return false;
    state.scene = domain.nearestSceneForFaction(name, state.scene);
    state.selectedFaction = name;
    ensureSelections(state, data, domain);
    const displayed = domain.getPerson(state.selectedPerson);
    if (!displayed || domain.factionAt(displayed, state.scene) !== name) {
      const member = domain.activePeople(state.scene).find(person => domain.factionAt(person, state.scene) === name);
      if (member) choosePerson(state, member.id);
    }
    ensureSelections(state, data, domain);
    return true;
  }

  function resetState(state, data, domain) {
    setScene(state, data, 0);
    state.view = 'people';
    state.guide = 'bakumatsu';
    choosePerson(state, 'abe');
    state.selectedFaction = '幕府';
    state.personFactionFilter = 'すべて';
    state.relationType = 'all';
    state.selectedPlace = '';
    state.selectedIncident = '';
    if (state.map) {
      state.map.zoomedPlace = '';
    }
    ensureSelections(state, data, domain);
  }

  return { applyRoute, choosePerson, createState, ensureSelections, resetState, selectFaction, selectPerson, setScene, views };
}));

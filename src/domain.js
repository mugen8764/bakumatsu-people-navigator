(function exposeDomain(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BM_DOMAIN = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  function createDomain(data) {
    const personById = new Map(data.people.map(person => [person.id, person]));
    const sceneById = new Map(data.scenes.map((scene, index) => [scene.id, { ...scene, index }]));
    const eventScene = new Map(data.scenes.map((scene, index) => [scene.event, index]));

    function getPerson(id) {
      return personById.get(id);
    }

    function withinRange(person, sceneIndex) {
      return Boolean(person) && sceneIndex >= person.activeRange[0] && sceneIndex <= person.activeRange[1];
    }

    function statusAt(person, sceneIndex) {
      if (!withinRange(person, sceneIndex)) return null;
      for (let index = sceneIndex; index >= person.activeRange[0]; index -= 1) {
        const status = person.statuses[data.scenes[index].id];
        if (status) return { ...status, sceneIndex: index, faction: status.faction || person.defaultFaction };
      }
      return null;
    }

    function factionAt(person, sceneIndex) {
      return statusAt(person, sceneIndex)?.faction || person?.defaultFaction;
    }

    function activePeople(sceneIndex) {
      return data.people.filter(person => statusAt(person, sceneIndex));
    }

    function activeFactionNames(sceneIndex) {
      return Object.keys(data.factionStates[data.scenes[sceneIndex].id] || {});
    }

    function activeRelations(sceneIndex, relationType = 'all') {
      return data.relations.filter(relation => relation.start <= sceneIndex
        && relation.end >= sceneIndex
        && (relationType === 'all' || relation.type === relationType));
    }

    function relationsFor(personId, sceneIndex, relationType = 'all') {
      return activeRelations(sceneIndex, relationType).filter(relation => {
        if (relation.a !== personId && relation.b !== personId) return false;
        const otherId = relation.a === personId ? relation.b : relation.a;
        return Boolean(statusAt(getPerson(otherId), sceneIndex));
      });
    }

    function eventPeersFor(personId, sceneIndex) {
      const event = data.events[data.scenes[sceneIndex]?.event];
      if (!event?.people?.includes(personId)) return [];
      const directlyRelated = new Set(relationsFor(personId, sceneIndex, 'all').map(
        relation => (relation.a === personId ? relation.b : relation.a)
      ));
      return event.people
        .filter(id => id !== personId && !directlyRelated.has(id))
        .map(getPerson)
        .filter(person => statusAt(person, sceneIndex));
    }

    function activeFactionRelations(sceneIndex) {
      return data.factionRelations.filter(relation => relation.start <= sceneIndex && relation.end >= sceneIndex);
    }

    function nearestSceneForPerson(person, sceneIndex) {
      if (withinRange(person, sceneIndex)) return sceneIndex;
      if (sceneIndex < person.activeRange[0]) return person.activeRange[0];
      return person.activeRange[1];
    }

    function nearestSceneForFaction(name, sceneIndex) {
      const indices = data.scenes
        .map((scene, index) => (data.factionStates[scene.id]?.[name] ? index : null))
        .filter(index => index !== null);
      if (!indices.length) return sceneIndex;
      return indices.reduce((best, index) => (
        Math.abs(index - sceneIndex) < Math.abs(best - sceneIndex) ? index : best
      ), indices[0]);
    }

    return {
      activeFactionNames,
      activeFactionRelations,
      activePeople,
      activeRelations,
      eventPeersFor,
      eventScene,
      factionAt,
      getPerson,
      nearestSceneForFaction,
      nearestSceneForPerson,
      relationsFor,
      sceneById,
      statusAt,
      withinRange
    };
  }

  return { createDomain };
}));

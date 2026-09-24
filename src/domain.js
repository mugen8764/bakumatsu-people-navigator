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
    const incidents = Object.values(data.incidents || {});

    function getIncident(id) {
      return incidents.find(incident => incident.id === id) || null;
    }

    function incidentsAt(sceneIndex) {
      return incidents.filter(incident => incident.sceneId === data.scenes[sceneIndex]?.id);
    }

    function incidentAt(state) {
      return incidentsAt(state.scene).find(incident => incident.id === state.selectedIncident) || null;
    }

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

    // Only authored, sourced comparisons are turning points. Text differences
    // between status summaries do not establish a historical change.
    function turningPointAt(person, sceneIndex) {
      const point = person?.turningPoints?.find(item => item.toSceneId === data.scenes[sceneIndex]?.id);
      if (!point) return null;
      const fromScene = sceneById.get(point.fromSceneId);
      const toScene = sceneById.get(point.toSceneId);
      if (!fromScene || toScene.index !== fromScene.index + 1) return null;
      const beforeStatus = statusAt(person, fromScene.index);
      const afterStatus = statusAt(person, toScene.index);
      return beforeStatus && afterStatus ? { ...point, fromScene, toScene, beforeStatus, afterStatus } : null;
    }

    function officeTermsFor(role) {
      return Object.values(data.terms || {}).filter(term => term.kind === 'office' && role.includes(term.title));
    }

    function activePeople(sceneIndex) {
      return data.people.filter(person => statusAt(person, sceneIndex));
    }

    function personFactionNames(sceneIndex) {
      const activeNames = new Set(activePeople(sceneIndex).map(person => factionAt(person, sceneIndex)));
      return Object.keys(data.factions).filter(name => activeNames.has(name));
    }

    function activeFactionNames(sceneIndex) {
      return Object.keys(data.factionStates[data.scenes[sceneIndex].id] || {});
    }

    function laterNameAt(person, sceneIndex) {
      const current = statusAt(person, sceneIndex);
      if (!current || current.display === person.name) return null;
      const canonicalNameAppearsLater = Object.entries(person.statuses).some(([sceneId, status]) => {
        const futureScene = sceneById.get(sceneId);
        return futureScene && futureScene.index > sceneIndex && status.display === person.name;
      });
      return canonicalNameAppearsLater ? person.name : null;
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

    function sceneChangesAt(sceneIndex) {
      const previousIndex = sceneIndex - 1;
      const changes = {
        isOrigin: previousIndex < 0,
        previousIndex,
        peopleEntered: [],
        peopleExited: [],
        peopleUpdated: [],
        relationsStarted: [],
        relationsEnded: [],
        factionRelationsStarted: [],
        factionRelationsEnded: []
      };
      if (changes.isOrigin) return changes;

      data.people.forEach(person => {
        const before = statusAt(person, previousIndex);
        const after = statusAt(person, sceneIndex);
        if (!before && after) {
          changes.peopleEntered.push({ person, after });
          return;
        }
        if (before && !after) {
          changes.peopleExited.push({ person, before });
          return;
        }
        if (!before || !after) return;
        const fields = ['display', 'faction', 'role'].filter(field => before[field] !== after[field]);
        if (fields.length) changes.peopleUpdated.push({ person, before, after, fields });
      });

      changes.relationsStarted = data.relations.filter(relation => relation.start === sceneIndex);
      changes.relationsEnded = data.relations.filter(relation => relation.end === previousIndex);
      changes.factionRelationsStarted = data.factionRelations.filter(relation => relation.start === sceneIndex);
      changes.factionRelationsEnded = data.factionRelations.filter(relation => relation.end === previousIndex);
      return changes;
    }

    function relationChangesFor(personId, sceneIndex, relationType = 'all') {
      const changes = sceneChangesAt(sceneIndex);
      const matches = relation => (relation.a === personId || relation.b === personId)
        && (relationType === 'all' || relation.type === relationType);
      return {
        isOrigin: changes.isOrigin,
        started: changes.relationsStarted.filter(matches),
        ended: changes.relationsEnded.filter(matches)
      };
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
      incidentsAt,
      getIncident,
      incidentAt,
      laterNameAt,
      nearestSceneForFaction,
      nearestSceneForPerson,
      personFactionNames,
      officeTermsFor,
      turningPointAt,
      relationChangesFor,
      relationsFor,
      sceneChangesAt,
      sceneById,
      statusAt,
      withinRange
    };
  }

  return { createDomain };
}));

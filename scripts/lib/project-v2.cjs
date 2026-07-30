const mappings = require('../../schema/v2/id-mappings.json');

function evidence(sourceIds = [], reviewStatus = sourceIds.length ? 'verified' : 'needs_review', note) {
  return {
    sourceIds: [...sourceIds],
    reviewStatus,
    ...(note ? { note } : {})
  };
}

function factionId(name) {
  const id = mappings.factions[name];
  if (!id) throw new Error(`Missing stable faction ID mapping: ${name}`);
  return id;
}

function relationTypeId(name) {
  const id = mappings.personRelationTypes[name];
  if (!id) throw new Error(`Missing stable relation type ID mapping: ${name}`);
  return id;
}

function projectLegacyData(data) {
  const sceneIndex = new Map(data.scenes.map((scene, index) => [scene.id, index]));

  const manifest = {
    schemaVersion: 2,
    title: data.meta.title,
    contentVersion: data.meta.version,
    updated: data.meta.updated
  };

  const sources = {
    schemaVersion: 2,
    sources: Object.entries(data.sources).map(([id, source]) => ({ id, ...source }))
  };

  const places = {
    schemaVersion: 2,
    places: Object.entries(data.places).map(([id, place]) => ({
      id,
      name: place.name,
      longitude: place.coord[0],
      latitude: place.coord[1],
      note: place.note,
      evidence: evidence([], 'needs_review', '地点単位の出典確認が必要。')
    }))
  };

  const people = {
    schemaVersion: 2,
    people: data.people.map(person => ({
      id: person.id,
      name: person.name,
      kana: person.kana,
      aliases: [...person.aliases],
      lifespan: person.born,
      defaultFactionId: factionId(person.defaultFaction),
      activeStartSceneId: data.scenes[person.activeRange[0]].id,
      activeEndSceneId: data.scenes[person.activeRange[1]].id,
      oneLine: person.oneLine,
      placeIds: [...person.places],
      eventIds: [...person.events],
      evidence: evidence(person.sources)
    }))
  };

  const personStatuses = {
    schemaVersion: 2,
    statuses: data.people.flatMap(person => {
      const entries = Object.entries(person.statuses)
        .map(([sceneId, status]) => ({ sceneId, sceneIndex: sceneIndex.get(sceneId), status }))
        .sort((a, b) => a.sceneIndex - b.sceneIndex);
      return entries.map((entry, index) => {
        const next = entries[index + 1];
        const endIndex = next ? next.sceneIndex - 1 : person.activeRange[1];
        return {
          id: `person-status-${person.id}-${entry.sceneId}`,
          personId: person.id,
          startSceneId: entry.sceneId,
          endSceneId: data.scenes[endIndex].id,
          displayName: entry.status.display,
          role: entry.status.role,
          factionId: factionId(entry.status.faction || person.defaultFaction),
          stance: entry.status.stance,
          importance: entry.status.importance,
          evidence: evidence(person.sources, 'needs_review', '人物単位の出典から、状態ごとの確認へ細分化する必要がある。')
        };
      });
    })
  };

  const factions = {
    schemaVersion: 2,
    factions: Object.entries(data.factions).map(([name, faction]) => ({
      id: factionId(name),
      name,
      shortName: faction.short,
      color: faction.color,
      summary: faction.summary,
      aliases: [...faction.aliases],
      evidence: evidence([], 'needs_review', '勢力概要の項目別出典が必要。')
    })),
    states: data.scenes.flatMap(scene => Object.entries(data.factionStates[scene.id] || {}).map(([name, state]) => ({
      id: `faction-state-${factionId(name)}-${scene.id}`,
      factionId: factionId(name),
      startSceneId: scene.id,
      endSceneId: scene.id,
      goal: state.goal,
      position: state.position,
      evidence: evidence([], 'needs_review', '勢力状態の項目別出典が必要。')
    })))
  };

  const events = {
    schemaVersion: 2,
    scenes: data.scenes.map((scene, order) => ({
      id: scene.id,
      order,
      year: scene.year,
      era: scene.era,
      date: scene.date,
      title: scene.title,
      summary: scene.summary,
      eventId: scene.event,
      insights: [...scene.insights],
      evidence: evidence(data.events[scene.event].sources, 'needs_review', '事件出典を、シーン要約と洞察の各主張へ細分化する必要がある。')
    })),
    events: Object.entries(data.events).map(([id, event]) => ({
      id,
      date: event.date,
      title: event.title,
      category: event.category,
      description: event.description,
      causes: [...event.causes],
      issues: [...event.issues],
      results: [...event.results],
      personIds: [...event.people],
      factionIds: event.factions.map(factionId),
      placeIds: [...event.places],
      evidence: evidence(event.sources)
    }))
  };

  const relations = {
    schemaVersion: 2,
    personRelations: data.relations.map(relation => {
      const typeId = relationTypeId(relation.type);
      const startSceneId = data.scenes[relation.start].id;
      return {
        id: `person-relation-${relation.a}-${relation.b}-${startSceneId}-${typeId}`,
        aPersonId: relation.a,
        bPersonId: relation.b,
        startSceneId,
        endSceneId: data.scenes[relation.end].id,
        typeId,
        label: relation.label,
        text: relation.text,
        evidence: evidence([], 'needs_review', '関係単位の出典が必要。')
      };
    }),
    factionRelations: data.factionRelations.map(relation => {
      const aFactionId = factionId(relation.a);
      const bFactionId = factionId(relation.b);
      const startSceneId = data.scenes[relation.start].id;
      return {
        id: `faction-relation-${aFactionId}-${bFactionId}-${startSceneId}`,
        aFactionId,
        bFactionId,
        startSceneId,
        endSceneId: data.scenes[relation.end].id,
        label: relation.label,
        text: relation.text,
        evidence: evidence([], 'needs_review', '勢力関係単位の出典が必要。')
      };
    })
  };

  return { manifest, sources, places, people, personStatuses, factions, events, relations };
}

module.exports = { projectLegacyData };

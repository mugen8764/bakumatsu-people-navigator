const mappings = require('../../schema/v2/id-mappings.json');

const factionNameById = new Map(Object.entries(mappings.factions).map(([name, id]) => [id, name]));
const relationTypeNameById = new Map(Object.entries(mappings.personRelationTypes).map(([name, id]) => [id, name]));

function requiredMapping(mapping, id, label) {
  const value = mapping.get(id);
  if (!value) throw new Error(`Missing ${label} mapping: ${id}`);
  return value;
}

function toObject(items, valueFor) {
  return Object.fromEntries(items.map(item => [item.id, valueFor(item)]));
}

function evidence(value) {
  return {
    sourceIds: [...value.sourceIds],
    reviewStatus: value.reviewStatus
  };
}

function assembleLegacyData(documents) {
  const scenes = [...documents.events.scenes].sort((a, b) => a.order - b.order);
  const sceneIndex = new Map(scenes.map((scene, index) => [scene.id, index]));
  const peopleById = new Map(documents.people.people.map(person => [person.id, person]));

  const sources = toObject(documents.sources.sources, source => ({
    title: source.title,
    url: source.url,
    note: source.note,
    ...(source.locator ? { locator: source.locator } : {}),
    ...(source.contentCheckedAt ? { contentCheckedAt: source.contentCheckedAt } : {})
  }));

  const factions = toObject(documents.factions.factions, faction => ({
    short: faction.shortName,
    color: faction.color,
    summary: faction.summary,
    aliases: [...faction.aliases],
    evidence: evidence(faction.evidence)
  }));
  const legacyFactions = Object.fromEntries(Object.entries(factions).map(([id, faction]) => [
    requiredMapping(factionNameById, id, 'faction name'),
    faction
  ]));

  const legacyScenes = scenes.map(scene => ({
    id: scene.id,
    year: scene.year,
    era: scene.era,
    date: scene.date,
    title: scene.title,
    summary: scene.summary,
    event: scene.eventId,
    insights: [...scene.insights],
    evidence: evidence(scene.evidence)
  }));

  const events = toObject(documents.events.events, event => ({
    date: event.date,
    title: event.title,
    category: event.category,
    description: event.description,
    causes: [...event.causes],
    issues: [...event.issues],
    results: [...event.results],
    people: [...event.personIds],
    factions: event.factionIds.map(id => requiredMapping(factionNameById, id, 'faction name')),
    places: [...event.placeIds],
    sources: [...event.evidence.sourceIds],
    evidence: evidence(event.evidence)
  }));

  const places = toObject(documents.places.places, place => ({
    name: place.name,
    coord: [place.longitude, place.latitude],
    note: place.note,
    evidence: evidence(place.evidence)
  }));

  const statusesByPerson = new Map();
  for (const status of documents.personStatuses.statuses) {
    if (!statusesByPerson.has(status.personId)) statusesByPerson.set(status.personId, []);
    statusesByPerson.get(status.personId).push(status);
  }
  const people = documents.people.people.map(person => {
    const statusEntries = [...(statusesByPerson.get(person.id) || [])]
      .sort((a, b) => sceneIndex.get(a.startSceneId) - sceneIndex.get(b.startSceneId))
      .map(status => {
        const legacyStatus = {
          display: status.displayName,
          role: status.role,
          ...(status.factionId !== person.defaultFactionId
            ? { faction: requiredMapping(factionNameById, status.factionId, 'faction name') }
            : {}),
          stance: status.stance,
          importance: status.importance,
          evidence: evidence(status.evidence)
        };
        return [status.startSceneId, legacyStatus];
      });
    return {
      id: person.id,
      name: person.name,
      kana: person.kana,
      aliases: [...person.aliases],
      born: person.lifespan,
      defaultFaction: requiredMapping(factionNameById, person.defaultFactionId, 'faction name'),
      activeRange: [sceneIndex.get(person.activeStartSceneId), sceneIndex.get(person.activeEndSceneId)],
      oneLine: person.oneLine,
      places: [...person.placeIds],
      events: [...person.eventIds],
      sources: [...person.evidence.sourceIds],
      statuses: Object.fromEntries(statusEntries)
    };
  });

  const relations = documents.relations.personRelations.map(relation => ({
    a: relation.aPersonId,
    b: relation.bPersonId,
    start: sceneIndex.get(relation.startSceneId),
    end: sceneIndex.get(relation.endSceneId),
    type: requiredMapping(relationTypeNameById, relation.typeId, 'relation type'),
    label: relation.label,
    text: relation.text,
    evidence: evidence(relation.evidence)
  }));

  const factionRelations = documents.relations.factionRelations.map(relation => ({
    a: requiredMapping(factionNameById, relation.aFactionId, 'faction name'),
    b: requiredMapping(factionNameById, relation.bFactionId, 'faction name'),
    start: sceneIndex.get(relation.startSceneId),
    end: sceneIndex.get(relation.endSceneId),
    label: relation.label,
    text: relation.text,
    evidence: evidence(relation.evidence)
  }));

  const factionStates = Object.fromEntries(scenes.map(scene => [scene.id, {}]));
  for (const state of documents.factions.states) {
    const name = requiredMapping(factionNameById, state.factionId, 'faction name');
    const start = sceneIndex.get(state.startSceneId);
    const end = sceneIndex.get(state.endSceneId);
    for (let index = start; index <= end; index += 1) {
      factionStates[scenes[index].id][name] = {
        goal: state.goal,
        position: state.position,
        evidence: evidence(state.evidence)
      };
    }
  }

  for (const personId of statusesByPerson.keys()) {
    if (!peopleById.has(personId)) throw new Error(`Status references missing person: ${personId}`);
  }

  return {
    meta: {
      title: documents.manifest.title,
      version: documents.manifest.contentVersion,
      updated: documents.manifest.updated
    },
    sources,
    factions: legacyFactions,
    scenes: legacyScenes,
    events,
    places,
    people,
    relations,
    factionRelations,
    factionStates
  };
}

module.exports = { assembleLegacyData };

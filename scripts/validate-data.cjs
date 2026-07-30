const fs = require('node:fs');
const path = require('node:path');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const { projectLegacyData } = require('./lib/project-v2.cjs');

const root = path.resolve(__dirname, '..');
const v2SchemaFiles = {
  manifest: 'manifest.schema.json',
  people: 'people.schema.json',
  personStatuses: 'person-statuses.schema.json',
  factions: 'factions.schema.json',
  relations: 'relations.schema.json',
  events: 'events.schema.json',
  places: 'places.schema.json',
  sources: 'sources.schema.json'
};

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function createAjv() {
  const ajv = new Ajv2020({ allErrors: true, strict: true, strictTypes: false });
  addFormats(ajv);
  return ajv;
}

function formatErrors(errors) {
  return (errors || []).map(error => `${error.instancePath || '/'} ${error.message}`).join('\n');
}

function validateWith(validate, value, label) {
  if (!validate(value)) throw new Error(`${label} failed JSON Schema validation:\n${formatErrors(validate.errors)}`);
}

function validateCurrentData(data) {
  const ajv = createAjv();
  const schema = readJson('schema/current-data.schema.json');
  validateWith(ajv.compile(schema), data, 'data.json');
}

function uniqueIds(items, label) {
  const ids = items.map(item => item.id);
  if (new Set(ids).size !== ids.length) throw new Error(`${label} contains duplicate IDs`);
  return new Set(ids);
}

function requireReference(ids, value, label) {
  if (!ids.has(value)) throw new Error(`${label} references missing ID: ${value}`);
}

function validateSceneRange(item, sceneOrder, label) {
  requireReference(sceneOrder, item.startSceneId, `${label}.startSceneId`);
  requireReference(sceneOrder, item.endSceneId, `${label}.endSceneId`);
  if (sceneOrder.get(item.startSceneId) > sceneOrder.get(item.endSceneId)) {
    throw new Error(`${label} starts after it ends`);
  }
}

function validateNonOverlappingRanges(items, ownerKey, sceneOrder, label) {
  const groups = new Map();
  for (const item of items) {
    const owner = item[ownerKey];
    if (!groups.has(owner)) groups.set(owner, []);
    groups.get(owner).push(item);
  }
  for (const [owner, ranges] of groups) {
    ranges.sort((a, b) => sceneOrder.get(a.startSceneId) - sceneOrder.get(b.startSceneId));
    for (let index = 1; index < ranges.length; index += 1) {
      const previous = ranges[index - 1];
      const current = ranges[index];
      if (sceneOrder.get(previous.endSceneId) >= sceneOrder.get(current.startSceneId)) {
        throw new Error(`${label} overlap for ${owner}: ${previous.id} / ${current.id}`);
      }
    }
  }
}

function validateV2References(documents) {
  const sourceIds = uniqueIds(documents.sources.sources, 'sources');
  const placeIds = uniqueIds(documents.places.places, 'places');
  const personIds = uniqueIds(documents.people.people, 'people');
  const factionIds = uniqueIds(documents.factions.factions, 'factions');
  const eventIds = uniqueIds(documents.events.events, 'events');
  const sceneIds = uniqueIds(documents.events.scenes, 'scenes');
  const orderedScenes = [...documents.events.scenes].sort((a, b) => a.order - b.order);
  const sceneOrder = new Map(orderedScenes.map((scene, index) => [scene.id, index]));
  if (new Set(documents.events.scenes.map(scene => scene.order)).size !== documents.events.scenes.length) {
    throw new Error('scenes contains duplicate order values');
  }
  if (orderedScenes.some((scene, index) => scene.order !== index)) throw new Error('scene order must be contiguous from zero');

  const allEvidence = [];
  for (const person of documents.people.people) {
    requireReference(factionIds, person.defaultFactionId, `${person.id}.defaultFactionId`);
    requireReference(sceneIds, person.activeStartSceneId, `${person.id}.activeStartSceneId`);
    requireReference(sceneIds, person.activeEndSceneId, `${person.id}.activeEndSceneId`);
    if (sceneOrder.get(person.activeStartSceneId) > sceneOrder.get(person.activeEndSceneId)) {
      throw new Error(`${person.id} active range starts after it ends`);
    }
    person.placeIds.forEach(id => requireReference(placeIds, id, `${person.id}.placeIds`));
    person.eventIds.forEach(id => requireReference(eventIds, id, `${person.id}.eventIds`));
    allEvidence.push(person.evidence);
  }
  for (const status of documents.personStatuses.statuses) {
    requireReference(personIds, status.personId, `${status.id}.personId`);
    requireReference(factionIds, status.factionId, `${status.id}.factionId`);
    validateSceneRange(status, sceneOrder, status.id);
    allEvidence.push(status.evidence);
  }
  for (const faction of documents.factions.factions) allEvidence.push(faction.evidence);
  for (const state of documents.factions.states) {
    requireReference(factionIds, state.factionId, `${state.id}.factionId`);
    validateSceneRange(state, sceneOrder, state.id);
    allEvidence.push(state.evidence);
  }
  for (const scene of documents.events.scenes) {
    requireReference(eventIds, scene.eventId, `${scene.id}.eventId`);
    allEvidence.push(scene.evidence);
  }
  for (const event of documents.events.events) {
    event.personIds.forEach(id => requireReference(personIds, id, `${event.id}.personIds`));
    event.factionIds.forEach(id => requireReference(factionIds, id, `${event.id}.factionIds`));
    event.placeIds.forEach(id => requireReference(placeIds, id, `${event.id}.placeIds`));
    allEvidence.push(event.evidence);
  }
  for (const relation of documents.relations.personRelations) {
    requireReference(personIds, relation.aPersonId, `${relation.id}.aPersonId`);
    requireReference(personIds, relation.bPersonId, `${relation.id}.bPersonId`);
    validateSceneRange(relation, sceneOrder, relation.id);
    allEvidence.push(relation.evidence);
  }
  for (const relation of documents.relations.factionRelations) {
    requireReference(factionIds, relation.aFactionId, `${relation.id}.aFactionId`);
    requireReference(factionIds, relation.bFactionId, `${relation.id}.bFactionId`);
    validateSceneRange(relation, sceneOrder, relation.id);
    allEvidence.push(relation.evidence);
  }
  for (const place of documents.places.places) allEvidence.push(place.evidence);
  for (const item of allEvidence) item.sourceIds.forEach(id => requireReference(sourceIds, id, 'evidence.sourceIds'));

  uniqueIds(documents.personStatuses.statuses, 'person statuses');
  uniqueIds(documents.factions.states, 'faction states');
  uniqueIds(documents.relations.personRelations, 'person relations');
  uniqueIds(documents.relations.factionRelations, 'faction relations');
  validateNonOverlappingRanges(documents.personStatuses.statuses, 'personId', sceneOrder, 'person status');
  validateNonOverlappingRanges(documents.factions.states, 'factionId', sceneOrder, 'faction state');
}

function validateV2Documents(documents) {
  const ajv = createAjv();
  const definitions = readJson('schema/v2/definitions.schema.json');
  ajv.addSchema(definitions);
  for (const [documentName, schemaFile] of Object.entries(v2SchemaFiles)) {
    const schema = readJson(`schema/v2/${schemaFile}`);
    validateWith(ajv.compile(schema), documents[documentName], `v2 ${documentName}`);
  }
  validateV2References(documents);
}

function validateRepositoryData() {
  const data = readJson('data.json');
  validateCurrentData(data);
  const documents = projectLegacyData(data);
  validateV2Documents(documents);
  return documents;
}

if (require.main === module) {
  const documents = validateRepositoryData();
  const counts = {
    contentVersion: documents.manifest.contentVersion,
    people: documents.people.people.length,
    personStatuses: documents.personStatuses.statuses.length,
    factions: documents.factions.factions.length,
    factionStates: documents.factions.states.length,
    scenes: documents.events.scenes.length,
    events: documents.events.events.length,
    personRelations: documents.relations.personRelations.length,
    factionRelations: documents.relations.factionRelations.length,
    places: documents.places.places.length,
    sources: documents.sources.sources.length
  };
  console.log(`Data contracts valid: ${JSON.stringify(counts)}`);
}

module.exports = { validateCurrentData, validateRepositoryData, validateV2Documents };

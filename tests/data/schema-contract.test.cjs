const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const data = require(path.resolve(__dirname, '../../data.json'));
const mappings = require(path.resolve(__dirname, '../../schema/v2/id-mappings.json'));
const { projectLegacyData } = require(path.resolve(__dirname, '../../scripts/lib/project-v2.cjs'));
const { validateCurrentData, validateV2Documents } = require(path.resolve(__dirname, '../../scripts/validate-data.cjs'));

test('current data conforms to the strict legacy schema', () => {
  assert.doesNotThrow(() => validateCurrentData(data));
});

test('stable ID mappings cover every current faction and relation type', () => {
  assert.deepEqual(Object.keys(mappings.factions).sort(), Object.keys(data.factions).sort());
  assert.deepEqual(Object.keys(mappings.personRelationTypes).sort(), [...new Set(data.relations.map(relation => relation.type))].sort());
  assert.equal(new Set(Object.values(mappings.factions)).size, Object.keys(mappings.factions).length);
  assert.equal(new Set(Object.values(mappings.personRelationTypes)).size, Object.keys(mappings.personRelationTypes).length);
});

test('the complete legacy catalog projects into every v2 contract', () => {
  const documents = projectLegacyData(data);
  assert.doesNotThrow(() => validateV2Documents(documents));
  assert.equal(documents.manifest.title, data.meta.title);
  assert.equal(documents.manifest.contentVersion, data.meta.version);
  assert.equal(documents.manifest.updated, data.meta.updated);
  assert.equal(documents.people.people.length, data.people.length);
  assert.equal(documents.personStatuses.statuses.length, data.people.reduce((sum, person) => sum + Object.keys(person.statuses).length, 0));
  assert.equal(documents.relations.personRelations.length, data.relations.length);
  assert.equal(documents.relations.factionRelations.length, data.factionRelations.length);
});

test('numeric legacy ranges become inclusive scene-ID ranges', () => {
  const documents = projectLegacyData(data);
  const relation = documents.relations.personRelations[0];
  assert.equal(relation.startSceneId, data.scenes[data.relations[0].start].id);
  assert.equal(relation.endSceneId, data.scenes[data.relations[0].end].id);

  const kido = documents.personStatuses.statuses.filter(status => status.personId === 'kido');
  assert.deepEqual(kido.slice(0, 2).map(status => [status.startSceneId, status.endSceneId]), [
    ['1858-ansei', '1860-sakurada'],
    ['1862-bunkyu', '1862-bunkyu']
  ]);
});

test('unsupported claims remain marked for review instead of gaining inferred sources', () => {
  const documents = projectLegacyData(data);
  assert.ok(documents.relations.personRelations.every(relation => relation.evidence.reviewStatus === 'needs_review'));
  assert.ok(documents.relations.personRelations.every(relation => relation.evidence.sourceIds.length === 0));
  assert.ok(documents.factions.states.every(state => state.evidence.reviewStatus === 'needs_review'));
  assert.ok(documents.events.events.every(event => event.evidence.reviewStatus === 'verified'));
});

test('schema validation rejects an unknown field', () => {
  const documents = projectLegacyData(data);
  documents.people.people[0].unexpected = true;
  assert.throws(() => validateV2Documents(documents), /must NOT have additional properties/);
});

test('verified records cannot omit sources', () => {
  const documents = projectLegacyData(data);
  documents.events.events[0].evidence.sourceIds = [];
  assert.throws(() => validateV2Documents(documents), /must NOT have fewer than 1 items/);
});

test('source precision metadata stays paired and cannot postdate the content version', () => {
  const missingDate = projectLegacyData(data);
  const unreviewedSource = missingDate.sources.sources.find(source => !source.locator);
  unreviewedSource.locator = '本文';
  assert.throws(() => validateV2Documents(missingDate), /must have property contentCheckedAt/);

  const futureDate = projectLegacyData(data);
  futureDate.sources.sources[0].locator = '本文';
  futureDate.sources.sources[0].contentCheckedAt = '9999-12-31';
  assert.throws(() => validateV2Documents(futureDate), /contentCheckedAt is later than manifest.updated/);
});

test('scene-ID ranges cannot run backwards or overlap', () => {
  const backwards = projectLegacyData(data);
  backwards.personStatuses.statuses[1].endSceneId = '1853-blackships';
  assert.throws(() => validateV2Documents(backwards), /starts after it ends/);

  const overlapping = projectLegacyData(data);
  const kido = overlapping.personStatuses.statuses.filter(status => status.personId === 'kido');
  kido[0].endSceneId = kido[1].startSceneId;
  assert.throws(() => validateV2Documents(overlapping), /person status overlap for kido/);
});

test('display names stay registered and relations stay inside valid chronology', () => {
  const annotatedName = projectLegacyData(data);
  annotatedName.personStatuses.statuses[0].displayName = 'ペリー（提督）';
  assert.throws(() => validateV2Documents(annotatedName), /displayName must not contain parenthetical annotations/);

  const unknownName = projectLegacyData(data);
  const perry = unknownName.people.people.find(person => person.id === 'perry');
  perry.aliases = perry.aliases.filter(alias => alias !== 'ペリー');
  assert.throws(() => validateV2Documents(unknownName), /displayName is not registered for perry/);

  const outsideActiveRange = projectLegacyData(data);
  const relation = outsideActiveRange.relations.personRelations.find(item => {
    const a = outsideActiveRange.people.people.find(person => person.id === item.aPersonId);
    const b = outsideActiveRange.people.people.find(person => person.id === item.bPersonId);
    return a.activeStartSceneId !== outsideActiveRange.events.scenes[0].id
      || b.activeStartSceneId !== outsideActiveRange.events.scenes[0].id;
  });
  relation.startSceneId = outsideActiveRange.events.scenes[0].id;
  assert.throws(() => validateV2Documents(outsideActiveRange), /extends outside .* active range/);

  const overlappingRelations = projectLegacyData(data);
  const kondoHijikata = overlappingRelations.relations.personRelations
    .filter(item => [item.aPersonId, item.bPersonId].sort().join('|') === 'hijikata|kondo')
    .sort((a, b) => a.startSceneId.localeCompare(b.startSceneId));
  kondoHijikata[1].startSceneId = kondoHijikata[0].endSceneId;
  assert.throws(() => validateV2Documents(overlappingRelations), /person relation overlap for hijikata\|kondo/);

  const selfRelation = projectLegacyData(data);
  selfRelation.relations.personRelations[0].bPersonId = selfRelation.relations.personRelations[0].aPersonId;
  assert.throws(() => validateV2Documents(selfRelation), /same person at both ends/);
});

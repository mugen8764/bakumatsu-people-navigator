const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const legacyData = require(path.resolve(__dirname, '../../data.json'));
const { assembleLegacyData } = require(path.resolve(__dirname, '../../scripts/lib/assemble-legacy-data.cjs'));
const { loadV2Documents } = require(path.resolve(__dirname, '../../scripts/lib/v2-files.cjs'));
const { validateV2Documents } = require(path.resolve(__dirname, '../../scripts/validate-data.cjs'));

const root = path.resolve(__dirname, '../..');

test('split JSON files are the canonical valid v2 documents', () => {
  const documents = loadV2Documents(root);
  assert.doesNotThrow(() => validateV2Documents(documents));
  assert.deepEqual(Object.keys(documents).sort(), [
    'events',
    'factions',
    'manifest',
    'people',
    'personStatuses',
    'places',
    'relations',
    'sources'
  ]);
});

test('assembling split JSON reproduces the legacy runtime data exactly', () => {
  const documents = loadV2Documents(root);
  assert.deepEqual(assembleLegacyData(documents), legacyData);
});

test('canonical records keep review status explicit', () => {
  const documents = loadV2Documents(root);
  const evidenceRecords = [
    ...documents.people.people,
    ...documents.personStatuses.statuses,
    ...documents.factions.factions,
    ...documents.factions.states,
    ...documents.events.scenes,
    ...documents.events.events,
    ...documents.places.places,
    ...documents.relations.personRelations,
    ...documents.relations.factionRelations
  ];
  assert.ok(evidenceRecords.every(record => record.evidence));
  assert.ok(evidenceRecords.some(record => record.evidence.reviewStatus === 'verified'));
  assert.ok(evidenceRecords.some(record => record.evidence.reviewStatus === 'needs_review'));
});

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data.json'), 'utf8'));
const canonicalPersonStatuses = JSON.parse(fs.readFileSync(path.join(root, 'data/person-statuses.json'), 'utf8')).statuses;
const canonicalRelations = JSON.parse(fs.readFileSync(path.join(root, 'data/relations.json'), 'utf8'));

function unique(values, label) {
  assert.equal(new Set(values).size, values.length, `${label} must be unique`);
}

function statusAt(person, sceneIndex) {
  if (!person || sceneIndex < person.activeRange[0] || sceneIndex > person.activeRange[1]) {
    return null;
  }
  for (let index = sceneIndex; index >= person.activeRange[0]; index -= 1) {
    const status = person.statuses[data.scenes[index].id];
    if (status) return { ...status, faction: status.faction || person.defaultFaction };
  }
  return null;
}

test('data.js is an exact browser wrapper of data.json', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.window.BM_DATA)), data);
});
test('the published collection sizes stay at the stage-one baseline', () => {
  assert.deepEqual({
    people: data.people.length,
    factions: Object.keys(data.factions).length,
    scenes: data.scenes.length,
    events: Object.keys(data.events).length,
    relations: data.relations.length,
    factionRelations: data.factionRelations.length,
    places: Object.keys(data.places).length,
    sources: Object.keys(data.sources).length
  }, {
    people: 42,
    factions: 11,
    scenes: 16,
    events: 16,
    relations: 65,
    factionRelations: 17,
    places: 27,
    sources: 207
  });
});

test('IDs and all current cross-references resolve', () => {
  const people = new Set(data.people.map(person => person.id));
  const scenes = new Set(data.scenes.map(scene => scene.id));
  const events = new Set(Object.keys(data.events));
  const factions = new Set(Object.keys(data.factions));
  const places = new Set(Object.keys(data.places));
  const sources = new Set(Object.keys(data.sources));

  unique([...people], 'person IDs');
  unique([...scenes], 'scene IDs');
  unique(data.scenes.map(scene => scene.event), 'scene event references');

  for (const scene of data.scenes) assert.ok(events.has(scene.event), `missing event: ${scene.event}`);
  for (const person of data.people) {
    assert.ok(factions.has(person.defaultFaction), `missing faction for ${person.id}`);
    for (const sceneId of Object.keys(person.statuses)) assert.ok(scenes.has(sceneId), `missing status scene: ${person.id}/${sceneId}`);
    for (const eventId of person.events) assert.ok(events.has(eventId), `missing event: ${person.id}/${eventId}`);
    for (const placeId of person.places) assert.ok(places.has(placeId), `missing place: ${person.id}/${placeId}`);
    for (const sourceId of person.sources) assert.ok(sources.has(sourceId), `missing source: ${person.id}/${sourceId}`);
    for (const status of Object.values(person.statuses)) {
      if (status.faction) assert.ok(factions.has(status.faction), `missing status faction: ${person.id}/${status.faction}`);
    }
  }

  for (const [eventId, event] of Object.entries(data.events)) {
    for (const personId of event.people) assert.ok(people.has(personId), `missing event person: ${eventId}/${personId}`);
    for (const factionId of event.factions) assert.ok(factions.has(factionId), `missing event faction: ${eventId}/${factionId}`);
    for (const placeId of event.places) assert.ok(places.has(placeId), `missing event place: ${eventId}/${placeId}`);
    for (const sourceId of event.sources) assert.ok(sources.has(sourceId), `missing event source: ${eventId}/${sourceId}`);
  }

  for (const relation of data.relations) {
    assert.ok(people.has(relation.a), `missing relation person: ${relation.a}`);
    assert.ok(people.has(relation.b), `missing relation person: ${relation.b}`);
  }
  for (const relation of data.factionRelations) {
    assert.ok(factions.has(relation.a), `missing faction relation: ${relation.a}`);
    assert.ok(factions.has(relation.b), `missing faction relation: ${relation.b}`);
  }
  for (const [sceneId, states] of Object.entries(data.factionStates)) {
    assert.ok(scenes.has(sceneId), `missing faction-state scene: ${sceneId}`);
    for (const factionId of Object.keys(states)) assert.ok(factions.has(factionId), `missing faction state: ${sceneId}/${factionId}`);
  }
});

test('all numeric ranges are ordered and remain inside the scene collection', () => {
  const sceneIndex = new Map(data.scenes.map((scene, index) => [scene.id, index]));
  const assertRange = (start, end, label) => {
    assert.ok(Number.isInteger(start) && Number.isInteger(end), `${label} must use integer indexes`);
    assert.ok(start >= 0 && start <= end && end < data.scenes.length, `${label} has an invalid range`);
  };

  for (const person of data.people) {
    assertRange(person.activeRange[0], person.activeRange[1], `person ${person.id}`);
    for (const sceneId of Object.keys(person.statuses)) {
      const index = sceneIndex.get(sceneId);
      assert.ok(index >= person.activeRange[0] && index <= person.activeRange[1], `${person.id}/${sceneId} is outside activeRange`);
    }
    assert.ok(statusAt(person, person.activeRange[0]), `${person.id} has no status at its activeRange start`);
  }
  data.relations.forEach((relation, index) => assertRange(relation.start, relation.end, `relation ${index}`));
  data.factionRelations.forEach((relation, index) => assertRange(relation.start, relation.end, `faction relation ${index}`));
});

test('people and events retain valid HTTPS source references', () => {
  for (const [sourceId, source] of Object.entries(data.sources)) {
    const url = new URL(source.url);
    assert.equal(url.protocol, 'https:', `${sourceId} must use HTTPS`);
    assert.ok(source.title.trim(), `${sourceId} needs a title`);
    assert.ok(source.note.trim(), `${sourceId} needs a note`);
  }
  for (const person of data.people) assert.ok(person.sources.length > 0, `${person.id} needs a source`);
  for (const [eventId, event] of Object.entries(data.events)) assert.ok(event.sources.length > 0, `${eventId} needs a source`);
});

test('content-checked sources keep precise locators and non-future review dates', () => {
  const expectedPreciseSources = [
    'jacar_iwakura_yoshinobu_disposition_1867',
    'jacar_kawaji_detail',
    'kagoshima_cci_kawaji',
    'kagoshima_satcho_alliance',
    'ndl_kido_iwakura_proposal_1869',
    'yamaguchi_ito_guide',
    'yamaguchi_tokankeki'
  ];

  for (const sourceId of expectedPreciseSources) {
    const source = data.sources[sourceId];
    assert.ok(source.locator?.trim(), `${sourceId} needs a locator`);
    assert.match(source.contentCheckedAt, /^\d{4}-\d{2}-\d{2}$/, `${sourceId} needs a content review date`);
    assert.ok(source.contentCheckedAt <= data.meta.updated, `${sourceId} review date is later than the content version`);
  }

  const sourcesDocument = fs.readFileSync(path.join(root, 'SOURCES.md'), 'utf8');
  assert.match(sourcesDocument, /該当箇所: 目次144頁（0110\.jp2）/);
  assert.match(sourcesDocument, /内容確認日: 2026-07-31/);
});

test('the source catalog has one used entry per URL', () => {
  const sourceEntries = Object.entries(data.sources);
  unique(sourceEntries.map(([, source]) => source.url), 'source URLs');

  const usedSourceIds = new Set();
  function collectSourceIds(value) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach(collectSourceIds);
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if ((key === 'sourceIds' || key === 'sources') && Array.isArray(child)) {
        child.forEach(sourceId => usedSourceIds.add(sourceId));
      } else {
        collectSourceIds(child);
      }
    }
  }
  collectSourceIds({
    people: data.people,
    factions: data.factions,
    factionStates: data.factionStates,
    scenes: data.scenes,
    events: data.events,
    relations: data.relations,
    factionRelations: data.factionRelations,
    places: data.places
  });

  assert.deepEqual(sourceEntries.map(([sourceId]) => sourceId).filter(sourceId => !usedSourceIds.has(sourceId)), []);
});

test('canonical IDs reflect each record range and relation type', () => {
  for (const status of canonicalPersonStatuses) {
    assert.equal(status.id, `person-status-${status.personId}-${status.startSceneId}`);
  }
  for (const relation of canonicalRelations.personRelations) {
    assert.equal(
      relation.id,
      `person-relation-${relation.aPersonId}-${relation.bPersonId}-${relation.startSceneId}-${relation.typeId}`
    );
  }
  for (const relation of canonicalRelations.factionRelations) {
    assert.equal(relation.id, `faction-relation-${relation.aFactionId}-${relation.bFactionId}-${relation.startSceneId}`);
  }
});

test('relations do not extend beyond a person active range', () => {
  const peopleById = new Map(data.people.map(person => [person.id, person]));
  const personIssues = [];
  data.relations.forEach((relation, relationIndex) => {
    for (let sceneIndex = relation.start; sceneIndex <= relation.end; sceneIndex += 1) {
      const inactive = [relation.a, relation.b].filter(personId => !statusAt(peopleById.get(personId), sceneIndex));
      if (inactive.length) personIssues.push({ relationIndex, sceneId: data.scenes[sceneIndex].id, inactive });
    }
  });
  assert.deepEqual(personIssues, []);

  const factionIssues = [];
  data.factionRelations.forEach((relation, relationIndex) => {
    for (let sceneIndex = relation.start; sceneIndex <= relation.end; sceneIndex += 1) {
      const states = data.factionStates[data.scenes[sceneIndex].id] || {};
      const inactive = [relation.a, relation.b].filter(factionId => !states[factionId]);
      if (inactive.length) factionIssues.push({ relationIndex, sceneId: data.scenes[sceneIndex].id, inactive });
    }
  });
  assert.equal(factionIssues.length, 10);
  assert.deepEqual([...new Set(factionIssues.map(issue => issue.relationIndex))], [1, 3, 6, 11, 13, 15, 16]);
});

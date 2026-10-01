const assert = require('node:assert/strict');
const test = require('node:test');
const { loadV2Documents } = require('../../scripts/lib/v2-files.cjs');
const { assembleLegacyData } = require('../../scripts/lib/assemble-legacy-data.cjs');
const { projectLegacyData } = require('../../scripts/lib/project-v2.cjs');
const { validateCurrentData, validateV2Documents } = require('../../scripts/validate-data.cjs');
const { createDomain, readingKanasFor } = require('../../src/domain.js');
const { searchAll } = require('../../src/search.js');
const path = require('node:path');
const documents = () => loadV2Documents(path.resolve(__dirname, '../..'));
const data = require('../../data.json');

test('confirmed name readings resolve across sparse scene states and incident overrides', () => {
  const domain = createDomain(data);
  for (const [id, name, kana] of [
    ['kido', '桂小五郎', 'かつら こごろう'],
    ['yamagata', '山県狂介', 'やまがた きょうすけ'],
    ['sufu-masanosuke', '麻田公輔', 'あさだ こうすけ']
  ]) {
    const person = domain.getPerson(id);
    const canonical = documents().people.people.find(item => item.id === id);
    assert.deepEqual(person.nameReadings, canonical.nameReadings);
    assert.ok(data.scenes.some((scene, index) => domain.statusAt(person, index)?.display === name));
    for (const scene of data.scenes) {
      const status = domain.statusAt(person, domain.sceneById.get(scene.id).index);
      if (status?.display === name) assert.deepEqual(readingKanasFor(person, status.display), [kana]);
    }
    assert.ok(Object.values(data.incidents).some(incident => incident.participants.some(item => item.personId === id && item.displayName === name)));
    for (const incident of Object.values(data.incidents)) for (const item of incident.participants) {
      if (item.personId === id && item.displayName === name) assert.deepEqual(readingKanasFor(person, item.displayName), [kana]);
    }
    assert.ok(searchAll(data, kana.replace(/ /g, '')).some(item => item.type === '人物' && item.id === id));
  }
  assert.ok(searchAll(data, 'かつらこごろう').some(item => item.id === 'kinmon-conflict'));
  assert.ok(!searchAll(data, 'かつらこごろう').some(item => item.id === 'satcho-agreement'));
});

test('unconfirmed display names do not inherit the basic name reading', () => {
  for (const [id, name] of [['takasugi', '宍戸刑馬'], ['saito', '山口二郎'], ['kuroda', '黒田了介'], ['kido', '木戸準一郎']]) {
    const person = data.people.find(item => item.id === id);
    assert.deepEqual(readingKanasFor(person, name), []);
    assert.deepEqual(readingKanasFor(person, person.name), [person.kana]);
    assert.ok(searchAll(data, name).some(item => item.id === id));
  }
  assert.deepEqual(readingKanasFor(null, '桂小五郎'), []);
  const oldPerson = structuredClone(data.people.find(item => item.id === 'kido'));
  delete oldPerson.nameReadings;
  assert.deepEqual(readingKanasFor(oldPerson, '桂小五郎'), []);
});

test('multiple sourced readings and uncertain candidates survive both data formats', () => {
  const docs = documents();
  const person = docs.people.people.find(item => item.id === 'kido');
  const confirmed = structuredClone(person.nameReadings[0]);
  // Test fixture variants do not claim any additional historical pronunciation.
  person.nameReadings.push({ ...confirmed, kana: 'てすと' });
  for (const status of ['needs_review', 'disputed']) person.nameReadings.push({
    name: confirmed.name, kana: status === 'disputed' ? 'こうほに' : 'こうほいち',
    evidence: { sourceIds: [], reviewStatus: status, note: '回帰検査用の候補' }
  });
  assert.doesNotThrow(() => validateV2Documents(docs));
  const generated = assembleLegacyData(docs);
  assert.doesNotThrow(() => validateCurrentData(generated));
  assert.deepEqual(projectLegacyData(generated).people.people.find(item => item.id === 'kido').nameReadings, person.nameReadings);
  const runtime = generated.people.find(item => item.id === 'kido');
  assert.deepEqual(readingKanasFor(runtime, confirmed.name), [confirmed.kana, 'てすと']);
  assert.equal(searchAll(generated, 'こうほいち').length, 0);
  for (const item of docs.people.people) delete item.nameReadings;
  assert.doesNotThrow(() => validateV2Documents(docs));
});

test('reading contracts reject invented names, duplicate pronunciations, invalid kana and missing evidence', () => {
  const mutate = action => {
    const docs = documents();
    action(docs.people.people.find(item => item.id === 'kido'), docs);
    return docs;
  };
  assert.throws(() => validateV2Documents(mutate(person => { person.nameReadings[0].name = '未登録名'; })), /registered alias/);
  assert.throws(() => validateV2Documents(mutate(person => { person.nameReadings[0].name = person.name; })), /registered alias/);
  assert.throws(() => validateV2Documents(mutate(person => { person.laterNames = ['検索専用']; person.nameReadings[0].name = '検索専用'; })), /registered alias/);
  assert.throws(() => validateV2Documents(mutate(person => { person.nameReadings.push({ ...person.nameReadings[0], kana: 'かつらこごろう' }); })), /duplicate name\/kana/);
  assert.throws(() => validateV2Documents(mutate(person => { person.nameReadings[0].kana = '桂小五郎'; })), /pattern/);
  assert.throws(() => validateV2Documents(mutate(person => { person.nameReadings[0].evidence.sourceIds = []; })), /fewer than 1/);
  assert.throws(() => validateV2Documents(mutate(person => { person.nameReadings[0].evidence.sourceIds = ['missing_reading_source']; })), /missing ID/);
  assert.throws(() => validateV2Documents(mutate(person => { person.nameReadings[0].accent = 1; })), /additional properties/);
});

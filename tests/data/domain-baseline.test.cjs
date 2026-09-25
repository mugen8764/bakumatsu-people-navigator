const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const data = require(path.resolve(__dirname, '../../data.json'));
const { createDomain } = require(path.resolve(__dirname, '../../src/domain.js'));
const domain = createDomain(data);

test('scene-level counts stay at the current display baseline', () => {
  const counts = data.scenes.map((scene, sceneIndex) => ({
    scene: scene.id,
    people: domain.activePeople(sceneIndex).length,
    factions: domain.activeFactionNames(sceneIndex).length,
    relations: domain.activeRelations(sceneIndex).length
  }));

  assert.deepEqual(counts, [
    { scene: '1853-blackships', people: 14, factions: 5, relations: 7 },
    { scene: '1854-treaty', people: 19, factions: 6, relations: 9 },
    { scene: '1858-ansei', people: 35, factions: 7, relations: 30 },
    { scene: '1860-sakurada', people: 39, factions: 6, relations: 28 },
    { scene: '1862-bunkyu', people: 42, factions: 7, relations: 22 },
    { scene: '1863-joi', people: 48, factions: 7, relations: 31 },
    { scene: '1863-aug18', people: 48, factions: 7, relations: 30 },
    { scene: '1864-kinmon', people: 51, factions: 7, relations: 23 },
    { scene: '1865-choshu', people: 54, factions: 7, relations: 24 },
    { scene: '1866-satcho', people: 48, factions: 8, relations: 25 },
    { scene: '1866-expedition', people: 49, factions: 7, relations: 20 },
    { scene: '1867-taisei', people: 49, factions: 8, relations: 18 },
    { scene: '1868-toba', people: 45, factions: 8, relations: 16 },
    { scene: '1868-edo', people: 45, factions: 7, relations: 15 },
    { scene: '1868-tohoku', people: 34, factions: 9, relations: 7 },
    { scene: '1869-hakodate', people: 28, factions: 6, relations: 6 }
  ]);
});
test('a sparse status carries forward until the next explicit status', () => {
  const kido = data.people.find(person => person.id === 'kido');
  assert.equal(domain.statusAt(kido, 2).display, '桂小五郎');
  assert.equal(domain.statusAt(kido, 3).display, '桂小五郎');
  assert.equal(domain.statusAt(kido, 10).display, '木戸準一郎');
  assert.equal(domain.statusAt(kido, 11).display, '木戸孝允');
  assert.equal(domain.statusAt(kido, 12).faction, '新政府');
  assert.equal(domain.statusAt(kido, 15).display, '木戸孝允');
});

test('scene changes expose status and relation transitions without inventing new records', () => {
  const origin = domain.sceneChangesAt(0);
  assert.equal(origin.isOrigin, true);
  assert.equal(origin.peopleUpdated.length, 0);
  assert.equal(origin.relationsStarted.length, 0);

  const satcho = domain.sceneChangesAt(9);
  assert.equal(satcho.previousIndex, 8);
  assert.equal(satcho.relationsStarted.length, 7);
  assert.equal(satcho.relationsEnded.length, 6);
  const kido = satcho.peopleUpdated.find(change => change.person.id === 'kido');
  assert.deepEqual(kido.fields, ['display', 'role']);
  assert.equal(kido.before.display, '桂小五郎');
  assert.equal(kido.after.display, '木戸準一郎');

  const kidoRelations = domain.relationChangesFor('kido', 9);
  assert.deepEqual(kidoRelations.started.map(relation => relation.label), ['薩長同盟の締結', '合意内容の確認']);
  assert.deepEqual(kidoRelations.ended, []);
});

test('a person is not displayed outside activeRange', () => {
  const perry = data.people.find(person => person.id === 'perry');
  const kondo = data.people.find(person => person.id === 'kondo');
  assert.equal(domain.statusAt(perry, 2), null);
  assert.ok(domain.statusAt(kondo, 13));
  assert.equal(domain.statusAt(kondo, 14), null);
});

test('event peers exclude the selected person and direct relations', () => {
  assert.deepEqual(
    domain.eventPeersFor('kido', 9).map(person => person.id),
    ['komatsu', 'nakaoka', 'okubo']
  );
  assert.deepEqual(domain.eventPeersFor('takasugi', 9), []);
});

test('person filters include every faction represented by an active person', () => {
  for (let sceneIndex = 0; sceneIndex < data.scenes.length; sceneIndex += 1) {
    const represented = [...new Set(
      domain.activePeople(sceneIndex).map(person => domain.factionAt(person, sceneIndex))
    )].sort();
    assert.deepEqual([...domain.personFactionNames(sceneIndex)].sort(), represented);
  }
  assert.ok(domain.personFactionNames(2).includes('土佐藩'));
});

test('later names only appear when the canonical name occurs in a future status', () => {
  assert.equal(domain.laterNameAt(domain.getPerson('perry'), 0), null);
  assert.equal(domain.laterNameAt(domain.getPerson('harris'), 2), null);
  assert.equal(domain.laterNameAt(domain.getPerson('shungaku'), 2), null);
  assert.equal(domain.laterNameAt(domain.getPerson('iemochi'), 2), '徳川家茂');
  assert.equal(domain.laterNameAt(domain.getPerson('yodo'), 2), '山内容堂');
});

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const data = require(path.resolve(__dirname, '../../data.json'));
const { createDomain } = require(path.resolve(__dirname, '../../src/domain.js'));
const domain = createDomain(data);
// Scenes are named by ID so inserting a scene does not shift the assertions.
const sceneAt = id => domain.sceneById.get(id).index;

test('scene-level counts stay at the current display baseline', () => {
  const counts = data.scenes.map((scene, sceneIndex) => ({
    scene: scene.id,
    people: domain.activePeople(sceneIndex).length,
    factions: domain.activeFactionNames(sceneIndex).length,
    relations: domain.activeRelations(sceneIndex).length
  }));

  assert.deepEqual(counts, [
    { scene: '1853-blackships', people: 15, factions: 5, relations: 7 },
    { scene: '1854-treaty', people: 23, factions: 6, relations: 9 },
    { scene: '1858-ansei', people: 38, factions: 7, relations: 32 },
    { scene: '1860-sakurada', people: 45, factions: 6, relations: 31 },
    { scene: '1862-bunkyu', people: 49, factions: 7, relations: 25 },
    { scene: '1863-joi', people: 53, factions: 7, relations: 34 },
    { scene: '1863-aug18', people: 52, factions: 7, relations: 30 },
    { scene: '1864-kinmon', people: 60, factions: 7, relations: 27 },
    { scene: '1865-choshu', people: 61, factions: 9, relations: 26 },
    { scene: '1866-satcho', people: 54, factions: 10, relations: 27 },
    { scene: '1866-expedition', people: 53, factions: 7, relations: 22 },
    { scene: '1867-taisei', people: 61, factions: 10, relations: 20 },
    { scene: '1868-toba', people: 50, factions: 8, relations: 16 },
    { scene: '1868-edo', people: 51, factions: 7, relations: 19 },
    { scene: '1868-tohoku', people: 41, factions: 9, relations: 10 },
    { scene: '1869-hakodate', people: 31, factions: 6, relations: 9 }
  ]);
});
test('a sparse status carries forward until the next explicit status', () => {
  const kido = data.people.find(person => person.id === 'kido');
  assert.equal(domain.statusAt(kido, sceneAt('1858-ansei')).display, '桂小五郎');
  assert.equal(domain.statusAt(kido, sceneAt('1860-sakurada')).display, '桂小五郎');
  assert.equal(domain.statusAt(kido, sceneAt('1866-expedition')).display, '木戸準一郎');
  assert.equal(domain.statusAt(kido, sceneAt('1867-taisei')).display, '木戸準一郎');
  assert.equal(domain.statusAt(kido, sceneAt('1868-toba')).faction, '新政府');
  assert.equal(domain.statusAt(kido, sceneAt('1868-toba')).display, '木戸準一郎');
  assert.equal(domain.statusAt(kido, sceneAt('1868-edo')).display, '木戸孝允');
  assert.equal(domain.statusAt(kido, sceneAt('1869-hakodate')).display, '木戸孝允');
});

// A display name that returns after a different one is usually a data slip.
// Only documented returns, such as Saigo's exile aliases, are allowed.
test('display names do not return to an earlier name without a documented reason', () => {
  const documentedReturns = new Set(['saigo']);
  const returning = data.people.filter(person => {
    const names = data.scenes.map((scene, index) => domain.statusAt(person, index)?.display).filter(Boolean);
    return names.some((name, index) => index > 0 && name !== names[index - 1] && names.slice(0, index - 1).includes(name));
  }).map(person => person.id);
  assert.deepEqual(returning.filter(id => !documentedReturns.has(id)), []);
  assert.ok(returning.includes('saigo'));
});

test('scene changes expose status and relation transitions without inventing new records', () => {
  const origin = domain.sceneChangesAt(0);
  assert.equal(origin.isOrigin, true);
  assert.equal(origin.peopleUpdated.length, 0);
  assert.equal(origin.relationsStarted.length, 0);

  const satcho = domain.sceneChangesAt(sceneAt('1866-satcho'));
  assert.equal(satcho.previousIndex, 8);
  assert.equal(satcho.relationsStarted.length, 7);
  assert.equal(satcho.relationsEnded.length, 6);
  const kido = satcho.peopleUpdated.find(change => change.person.id === 'kido');
  assert.deepEqual(kido.fields, ['display', 'role']);
  assert.equal(kido.before.display, '桂小五郎');
  assert.equal(kido.after.display, '木戸準一郎');

  const kidoRelations = domain.relationChangesFor('kido', sceneAt('1866-satcho'));
  assert.deepEqual(kidoRelations.started.map(relation => relation.label), ['薩長同盟の締結', '合意内容の確認']);
  assert.deepEqual(kidoRelations.ended, []);
});

test('a person is not displayed outside activeRange', () => {
  const perry = data.people.find(person => person.id === 'perry');
  const kondo = data.people.find(person => person.id === 'kondo');
  assert.equal(domain.statusAt(perry, sceneAt('1858-ansei')), null);
  assert.ok(domain.statusAt(kondo, sceneAt('1868-edo')));
  assert.equal(domain.statusAt(kondo, sceneAt('1868-tohoku')), null);
});

test('event peers exclude the selected person and direct relations', () => {
  assert.deepEqual(
    domain.eventPeersFor('kido', sceneAt('1866-satcho')).map(person => person.id),
    ['komatsu', 'nakaoka', 'okubo']
  );
  assert.deepEqual(domain.eventPeersFor('takasugi', sceneAt('1866-satcho')), []);
});

test('event peer groups add incident co-participants once and never direct relations', () => {
  const ids = groups => groups.map(group => [group.id, group.people.map(person => person.id)]);
  // Kido's incident partners are already event peers or direct relations.
  assert.deepEqual(ids(domain.eventPeerGroupsFor('kido', sceneAt('1866-satcho'))), [
    ['satcho', ['komatsu', 'nakaoka', 'okubo']]
  ]);
  // A person known only through an incident still reaches its other participants.
  assert.deepEqual(ids(domain.eventPeerGroupsFor('todo-heisuke', sceneAt('1867-taisei'))), [
    ['goryo-eji-formation-1867', ['ito-kashitaro']]
  ]);
  assert.deepEqual(domain.eventPeerGroupsFor('todo-heisuke', sceneAt('1866-expedition')), []);
  for (const [index] of data.scenes.entries()) {
    for (const person of domain.activePeople(index)) {
      const peers = domain.eventPeerGroupsFor(person.id, index).flatMap(group => group.people.map(other => other.id));
      const related = domain.relationsFor(person.id, index).map(relation => (relation.a === person.id ? relation.b : relation.a));
      assert.equal(new Set(peers).size, peers.length, `${person.id} peers repeat at ${index}`);
      assert.ok(!peers.includes(person.id) && peers.every(id => !related.includes(id)), `${person.id} peers overlap relations at ${index}`);
    }
  }
});

test('person filters include every faction represented by an active person', () => {
  for (let sceneIndex = 0; sceneIndex < data.scenes.length; sceneIndex += 1) {
    const represented = [...new Set(
      domain.activePeople(sceneIndex).map(person => domain.factionAt(person, sceneIndex))
    )].sort();
    assert.deepEqual([...domain.personFactionNames(sceneIndex)].sort(), represented);
  }
  assert.ok(domain.personFactionNames(sceneAt('1858-ansei')).includes('土佐藩'));
});

test('later names only appear when the canonical name occurs in a future status', () => {
  assert.equal(domain.laterNameAt(domain.getPerson('perry'), 0), null);
  assert.equal(domain.laterNameAt(domain.getPerson('harris'), 2), null);
  assert.equal(domain.laterNameAt(domain.getPerson('shungaku'), 2), null);
  assert.equal(domain.laterNameAt(domain.getPerson('iemochi'), 2), '徳川家茂');
  assert.equal(domain.laterNameAt(domain.getPerson('yodo'), 2), '山内容堂');
});

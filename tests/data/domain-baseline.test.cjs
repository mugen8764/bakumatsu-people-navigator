const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const data = require(path.resolve(__dirname, '../../data.json'));

function statusAt(person, sceneIndex) {
  if (!person || sceneIndex < person.activeRange[0] || sceneIndex > person.activeRange[1]) return null;
  for (let index = sceneIndex; index >= person.activeRange[0]; index -= 1) {
    const status = person.statuses[data.scenes[index].id];
    if (status) return { ...status, faction: status.faction || person.defaultFaction };
  }
  return null;
}

test('scene-level counts stay at the current display baseline', () => {
  const counts = data.scenes.map((scene, sceneIndex) => ({
    scene: scene.id,
    people: data.people.filter(person => statusAt(person, sceneIndex)).length,
    factions: Object.keys(data.factionStates[scene.id] || {}).length,
    relations: data.relations.filter(relation => relation.start <= sceneIndex && relation.end >= sceneIndex).length
  }));

  assert.deepEqual(counts, [
    { scene: '1853-blackships', people: 7, factions: 4, relations: 6 },
    { scene: '1854-treaty', people: 8, factions: 4, relations: 7 },
    { scene: '1858-ansei', people: 21, factions: 5, relations: 22 },
    { scene: '1860-sakurada', people: 24, factions: 4, relations: 22 },
    { scene: '1862-bunkyu', people: 24, factions: 5, relations: 21 },
    { scene: '1863-joi', people: 26, factions: 5, relations: 24 },
    { scene: '1863-aug18', people: 26, factions: 5, relations: 25 },
    { scene: '1864-kinmon', people: 30, factions: 5, relations: 27 },
    { scene: '1865-choshu', people: 32, factions: 4, relations: 33 },
    { scene: '1866-satcho', people: 29, factions: 5, relations: 27 },
    { scene: '1866-expedition', people: 30, factions: 4, relations: 29 },
    { scene: '1867-taisei', people: 30, factions: 5, relations: 26 },
    { scene: '1868-toba', people: 27, factions: 5, relations: 29 },
    { scene: '1868-edo', people: 27, factions: 4, relations: 28 },
    { scene: '1868-tohoku', people: 20, factions: 6, relations: 16 },
    { scene: '1869-hakodate', people: 17, factions: 4, relations: 13 }
  ]);
});
test('a sparse status carries forward until the next explicit status', () => {
  const kido = data.people.find(person => person.id === 'kido');
  assert.equal(statusAt(kido, 2).display, '桂小五郎');
  assert.equal(statusAt(kido, 3).display, '桂小五郎');
  assert.equal(statusAt(kido, 10).display, '桂小五郎');
  assert.equal(statusAt(kido, 11).display, '木戸孝允');
  assert.equal(statusAt(kido, 12).faction, '新政府');
  assert.equal(statusAt(kido, 15).display, '木戸孝允');
});

test('a person is not displayed outside activeRange', () => {
  const perry = data.people.find(person => person.id === 'perry');
  const kondo = data.people.find(person => person.id === 'kondo');
  assert.equal(statusAt(perry, 2), null);
  assert.ok(statusAt(kondo, 13));
  assert.equal(statusAt(kondo, 14), null);
});

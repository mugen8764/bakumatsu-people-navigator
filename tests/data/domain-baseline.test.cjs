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
    { scene: '1853-blackships', people: 7, factions: 4, relations: 5 },
    { scene: '1854-treaty', people: 8, factions: 4, relations: 6 },
    { scene: '1858-ansei', people: 21, factions: 5, relations: 21 },
    { scene: '1860-sakurada', people: 24, factions: 4, relations: 21 },
    { scene: '1862-bunkyu', people: 24, factions: 5, relations: 19 },
    { scene: '1863-joi', people: 27, factions: 5, relations: 22 },
    { scene: '1863-aug18', people: 27, factions: 5, relations: 20 },
    { scene: '1864-kinmon', people: 30, factions: 5, relations: 18 },
    { scene: '1865-choshu', people: 32, factions: 4, relations: 17 },
    { scene: '1866-satcho', people: 29, factions: 5, relations: 18 },
    { scene: '1866-expedition', people: 30, factions: 4, relations: 13 },
    { scene: '1867-taisei', people: 30, factions: 5, relations: 14 },
    { scene: '1868-toba', people: 27, factions: 5, relations: 14 },
    { scene: '1868-edo', people: 27, factions: 4, relations: 12 },
    { scene: '1868-tohoku', people: 20, factions: 6, relations: 3 },
    { scene: '1869-hakodate', people: 17, factions: 4, relations: 5 }
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

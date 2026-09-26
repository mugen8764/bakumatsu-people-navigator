const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const { searchAll } = require('../../src/search.js');

const domain = createDomain(data);
const sceneIndex = data.scenes.findIndex(scene => scene.id === '1867-taisei');

test('the Paris exposition adds both the envoy and the official responsible for the accounts', () => {
  assert.equal(searchAll(data, '徳川昭武').find(item => item.type === '人物').id, 'tokugawa-akitake');
  assert.equal(searchAll(data, '渋沢篤太夫').find(item => item.type === '人物').id, 'shibusawa');
  assert.equal(searchAll(data, '渋澤栄一').find(item => item.type === '人物').id, 'shibusawa');
  assert.equal(domain.statusAt(domain.getPerson('tokugawa-akitake'), sceneIndex).role, '将軍名代・パリ万博使節');
  assert.match(domain.statusAt(domain.getPerson('shibusawa'), sceneIndex).role, /庶務と会計/);
  assert.equal(domain.statusAt(domain.getPerson('tokugawa-akitake'), sceneIndex - 1), null);
  assert.equal(domain.statusAt(domain.getPerson('shibusawa'), sceneIndex + 1), null);
});

test('the incident distinguishes the people in Paris from the decision in Japan', () => {
  const incident = data.incidents['paris-exposition-1867'];
  const participant = id => incident.participants.find(person => person.personId === id);
  assert.equal(participant('tokugawa-akitake').involvement, 'onsite');
  assert.equal(participant('shibusawa').role, '随員・庶務と会計');
  assert.equal(participant('takamatsu-ryoun').role, '随行医');
  assert.equal(participant('yoshinobu').involvement, 'decision');
  assert.match(participant('yoshinobu').summary, /現地参加者ではない/);
  assert.deepEqual(incident.placeIds, ['yokohama', 'paris']);
  assert.equal(incident.relations.find(relation => relation.id === 'paris-yoshinobu-akitake').direction, 'forward');
});

test('portraits disclose whether they depict the selected period', () => {
  assert.match(domain.getPerson('shibusawa').portrait.dateNote, /晩年/);
  assert.match(domain.getPerson('tokugawa-akitake').portrait.dateNote, /撮影・制作時期未確認/);
  for (const id of ['shibusawa', 'tokugawa-akitake']) {
    assert.equal(domain.getPerson(id).portrait.rightsSourceId, 'ndl_portrait_usage');
  }
});

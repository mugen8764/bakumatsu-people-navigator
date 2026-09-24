const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const { projectLegacyData } = require('../../scripts/lib/project-v2.cjs');
const { assembleLegacyData } = require('../../scripts/lib/assemble-legacy-data.cjs');
const { validateV2Documents } = require('../../scripts/validate-data.cjs');
const domain = createDomain(data);

test('authored comparisons appear only at their destination and retain status evidence', () => {
  for (const [id, destination] of [['saigo', 8], ['kido', 8], ['yoshinobu', 11]]) {
    const person = domain.getPerson(id);
    const point = domain.turningPointAt(person, destination);
    assert.ok(point);
    assert.equal(point.fromScene.index, destination - 1);
    assert.deepEqual(point.beforeStatus, domain.statusAt(person, destination - 1));
    assert.deepEqual(point.afterStatus, domain.statusAt(person, destination));
    assert.equal(point.evidence.reviewStatus, 'verified');
    for (let index = 0; index < data.scenes.length; index++) {
      if (index !== destination) assert.equal(domain.turningPointAt(person, index), null);
    }
  }
  assert.equal(domain.turningPointAt(domain.getPerson('ryoma'), 8), null);
  assert.equal(domain.turningPointAt(undefined, 8), null);
});

test('turning points survive both canonical and runtime projections', () => {
  const documents = projectLegacyData(data);
  const restored = assembleLegacyData(documents);
  for (const id of ['saigo', 'kido', 'yoshinobu']) {
    assert.deepEqual(restored.people.find(person => person.id === id).turningPoints, domain.getPerson(id).turningPoints);
  }
});

test('turning points reject invalid chronology and unsupported evidence', () => {
  for (const mutate of [
    point => { point.fromSceneId = '1864-missing'; },
    point => { point.toSceneId = '1865-missing'; },
    point => { point.fromSceneId = point.toSceneId; },
    point => { point.fromSceneId = '1866-satcho'; },
    point => { point.fromSceneId = '1853-blackships'; },
    point => { point.evidence.sourceIds = []; },
    point => { point.evidence.sourceIds = ['missing']; }
  ]) {
    const docs = projectLegacyData(data);
    mutate(docs.people.people.find(person => person.id === 'saigo').turningPoints[0]);
    assert.throws(() => validateV2Documents(docs));
  }
  const duplicate = projectLegacyData(data);
  const points = duplicate.people.people.find(person => person.id === 'saigo').turningPoints;
  points.push(structuredClone(points[0]));
  assert.throws(() => validateV2Documents(duplicate), /duplicate turning point/);
  const outside = projectLegacyData(data);
  outside.people.people.find(person => person.id === 'abe').turningPoints = structuredClone(points.slice(0, 1));
  assert.throws(() => validateV2Documents(outside), /outside active range/);
});

test('office help follows the displayed role without assigning a new office', () => {
  for (const [role, ids] of [['老中首座', ['roju']], ['勘定奉行・海防掛', ['kanjo-bugyo']], ['薩摩藩家老', ['karo']], ['前佐賀藩主', ['hanshu']], ['幕府の財政・軍備を担う実務者', []]]) {
    assert.deepEqual(domain.officeTermsFor(role).map(term => term.id), ids);
  }
  const docs = projectLegacyData(data);
  docs.events.terms.find(term => term.id === 'roju').kind = 'inferred-office';
  assert.throws(() => validateV2Documents(docs));
});

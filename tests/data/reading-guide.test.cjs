const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createDomain } = require('../../src/domain.js');
const data = require('../../data.json');
const domain = createDomain(data);
const stateAt = (scene, selectedIncident = '') => ({ scene: domain.sceneById.get(scene).index, selectedIncident });

test('guide position prefers an exact incident, then a scene, then first incident in guide order', () => {
  const steps = [['incident', 'kinmon-conflict'], ['scene', '1864-kinmon'], ['incident', 'ikedaya']];
  assert.equal(domain.guidePosition(steps, stateAt('1864-kinmon', 'ikedaya')), 2);
  assert.equal(domain.guidePosition(steps, stateAt('1864-kinmon')), 1);
  assert.equal(domain.guidePosition(steps, stateAt('1864-kinmon', 'shimonoseki-1864')), 1);
  const incidentsOnly = [steps[0], steps[2]];
  assert.equal(domain.guidePosition(incidentsOnly, stateAt('1864-kinmon')), 0);
  assert.equal(domain.guidePosition(incidentsOnly, stateAt('1864-kinmon', 'shimonoseki-1864')), 0);
  assert.equal(domain.guidePosition(incidentsOnly, stateAt('1864-kinmon', 'ikedaya')), 1);
});

test('guide position neither invents a position nor accepts a stale incident from another scene', () => {
  const steps = [['incident', 'ikedaya']];
  assert.equal(domain.guidePosition(steps, stateAt('1853-blackships', 'ikedaya')), -1);
  assert.equal(domain.guidePosition([], stateAt('1864-kinmon')), -1);
});

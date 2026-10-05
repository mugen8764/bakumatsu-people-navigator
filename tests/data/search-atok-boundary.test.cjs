const assert = require('node:assert/strict');
const test = require('node:test');
const { createSearchController } = require('../../src/search.js');
const data = require('../../data.json');
const fixture = require('../fixtures/firefox-atok-arrowdown.json');

function harness() {
  const attributes = new Map();
  const selections = [];
  let buttons = [];
  const input = {
    value: 'かつら', setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: name => attributes.delete(name), blur() {}
  };
  const box = {
    set innerHTML(html) {
      buttons = [...html.matchAll(/id="(search-result-\d+)"/g)].map(([, id]) => ({
        id, classList: { toggle() {} }, setAttribute() {}, scrollIntoView() {}, addEventListener() {}
      }));
    }
  };
  const controller = createSearchController({
    $: selector => ({ '#globalSearch': input, '#searchResults': box })[selector],
    $$: () => buttons, data, state: { scene: 0 },
    actions: { selectPerson: id => selections.push(id), revealPersonDetail() {} }
  });
  return {
    controller, selections,
    active: () => attributes.get('aria-activedescendant') || null,
    emit(record) {
      const { type, value, ...options } = record;
      if (value !== undefined) input.value = value;
      let prevented = false;
      const event = { type, ...options, preventDefault: () => { prevented = true; } };
      if (type === 'keydown') controller.handleKeydown(event);
      else if (type === 'input') controller.render(event);
      else controller.handleIME(event);
      return { active: this.active(), prevented, selections: [...selections] };
    }
  };
}

test('observed Firefox ATOK log clears the old selection, then accepts the post-keyup ArrowDown', () => {
  const h = harness();
  h.controller.render();
  h.emit({ type: 'keydown', key: 'ArrowDown' });
  h.emit({ type: 'keydown', key: 'ArrowDown' });
  assert.equal(h.active(), 'search-result-1');
  // Setup is synthetic; the fixture itself contains only user-supplied fields.
  h.emit({ type: 'compositionstart' });
  const trace = fixture.events.map(event => h.emit(event));
  assert.deepEqual(trace.map(entry => entry.active), [
    'search-result-1', 'search-result-1', 'search-result-1', null, null, null, 'search-result-0'
  ]);
  assert.deepEqual(trace.map(entry => entry.prevented), [false, false, false, false, false, false, true]);
  assert.ok(trace.every(entry => entry.selections.length === 0));
  // Probe, not an observed ATOK event: Enter selects after the ordinary ArrowDown.
  h.emit({ type: 'keydown', key: 'Enter', keyCode: 13 });
  assert.deepEqual(h.selections, ['kido']);
  assert.equal(h.active(), null);
});

test('the supplied final ArrowDown exposes no field that distinguishes IME intent from Web intent', () => {
  const observed = fixture.events.at(-1);
  const ordinary = { type: 'keydown', key: 'ArrowDown', keyCode: 40, isComposing: false };
  assert.deepEqual(observed, ordinary);
  // Replaying the available evidence must have the same effect for either intention.
  const traces = [observed, ordinary].map(lastEvent => {
    const h = harness();
    h.controller.render();
    h.emit({ type: 'compositionstart' });
    for (const event of fixture.events.slice(0, -1)) h.emit(event);
    return h.emit(lastEvent);
  });
  assert.deepEqual(traces[0], traces[1]);
  assert.equal(traces[0].active, 'search-result-0');
});

test('replaying multiple ATOK-like candidate cycles does not leave a stale Web selection', () => {
  const h = harness();
  h.controller.render();
  // Repeated cycles are synthetic probes, not an additional Windows event log.
  for (let index = 0; index < 5; index++) {
    h.emit({ type: 'compositionstart' });
    for (const event of fixture.events.slice(0, -1)) h.emit(event);
    assert.equal(h.active(), null);
    assert.deepEqual(h.selections, []);
    h.emit(fixture.events.at(-1));
    assert.equal(h.active(), 'search-result-0');
    h.emit({ type: 'keydown', key: 'ArrowDown', keyCode: 40 });
    assert.equal(h.active(), 'search-result-1');
    h.emit({ type: 'keydown', key: 'ArrowUp', keyCode: 38 });
    assert.equal(h.active(), 'search-result-0');
  }
  h.emit({ type: 'keydown', key: 'Enter' });
  assert.deepEqual(h.selections, ['kido']);
});

test('fast non-IME ArrowDown, ArrowUp, Enter and Escape remain available', () => {
  const h = harness();
  h.controller.render();
  for (let index = 0; index < 20; index++) {
    assert.equal(h.emit({ type: 'keydown', key: 'ArrowDown' }).active, 'search-result-0');
    assert.equal(h.emit({ type: 'keydown', key: 'ArrowDown' }).active, 'search-result-1');
    assert.equal(h.emit({ type: 'keydown', key: 'ArrowUp' }).active, 'search-result-0');
    h.emit({ type: 'keyup', key: 'ArrowUp' });
    h.controller.render();
  }
  h.emit({ type: 'keydown', key: 'ArrowDown' });
  h.emit({ type: 'keydown', key: 'Enter' });
  assert.deepEqual(h.selections, ['kido']);
  h.controller.render();
  assert.equal(h.emit({ type: 'keydown', key: 'Escape' }).active, null);
});

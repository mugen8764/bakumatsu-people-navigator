const catalog = require('../../data.json');

// Browser tests take expected counts from the published data, so adding a
// person or source does not require editing unrelated expectations.
function activePeopleAt(sceneIndex) {
  return catalog.people.filter(person => person.activeRange[0] <= sceneIndex && sceneIndex <= person.activeRange[1]);
}

module.exports = { activePeopleAt, catalog };

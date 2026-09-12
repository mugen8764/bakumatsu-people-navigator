const fs = require('node:fs');
const path = require('node:path');

const documentFiles = {
  manifest: 'manifest.json',
  people: 'people.json',
  personStatuses: 'person-statuses.json',
  factions: 'factions.json',
  relations: 'relations.json',
  events: 'events.json',
  places: 'places.json',
  sources: 'sources.json'
};

function loadV2Documents(root) {
  return Object.fromEntries(Object.entries(documentFiles).map(([name, fileName]) => [
    name,
    JSON.parse(fs.readFileSync(path.join(root, 'data', fileName), 'utf8'))
  ]));
}

module.exports = { documentFiles, loadV2Documents };

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

function writeV2Documents(root, documents) {
  const dataDirectory = path.join(root, 'data');
  fs.mkdirSync(dataDirectory, { recursive: true });
  for (const [name, fileName] of Object.entries(documentFiles)) {
    fs.writeFileSync(path.join(dataDirectory, fileName), `${JSON.stringify(documents[name], null, 2)}\n`);
  }
}

module.exports = { documentFiles, loadV2Documents, writeV2Documents };

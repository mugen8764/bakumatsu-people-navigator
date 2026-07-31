const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const readJson = file => JSON.parse(fs.readFileSync(path.join(root, 'data', file), 'utf8'));
const people = readJson('people.json').people;
const factions = readJson('factions.json').factions;
const { scenes } = readJson('events.json');
const { personRelations, factionRelations } = readJson('relations.json');
const places = readJson('places.json').places;
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');

const expectedLines = [
  `- 人物: ${people.length}名`,
  `- 勢力: ${factions.length}`,
  `- 時点・主要事件: ${scenes.length}`,
  `- 人物関係: ${personRelations.length}`,
  `- 勢力関係: ${factionRelations.length}`,
  `- 地点: ${places.length}`
];
const missing = expectedLines.filter(line => !readme.includes(line));

if (missing.length) {
  missing.forEach(line => console.error(`- README.md is missing the current statistic: ${line}`));
  process.exitCode = 1;
} else {
  console.log(`README statistics valid: ${expectedLines.join(', ').replaceAll('- ', '')}.`);
}

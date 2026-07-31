const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sources = JSON.parse(fs.readFileSync(path.join(root, 'data/sources.json'), 'utf8')).sources;
const events = JSON.parse(fs.readFileSync(path.join(root, 'data/events.json'), 'utf8')).events;
const people = JSON.parse(fs.readFileSync(path.join(root, 'data/people.json'), 'utf8')).people;
const sourceById = new Map(sources.map(source => [source.id, source]));
const preciseSources = sources.filter(source => source.locator && source.contentCheckedAt);
const hasPreciseEvidence = item => item.evidence.sourceIds.some(id => {
  const source = sourceById.get(id);
  return Boolean(source?.locator && source?.contentCheckedAt);
});
const missingEvents = events.filter(event => !hasPreciseEvidence(event));
const missingPeople = people.filter(person => !hasPreciseEvidence(person));

const report = {
  sources: {
    precise: preciseSources.length,
    total: sources.length,
    percent: Number((preciseSources.length / sources.length * 100).toFixed(1))
  },
  events: {
    covered: events.length - missingEvents.length,
    total: events.length,
    percent: Number(((events.length - missingEvents.length) / events.length * 100).toFixed(1))
  },
  people: {
    covered: people.length - missingPeople.length,
    total: people.length,
    percent: Number(((people.length - missingPeople.length) / people.length * 100).toFixed(1))
  },
  missingEventIds: missingEvents.map(event => event.id),
  missingPersonIds: missingPeople.map(person => person.id)
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Precise sources: ${report.sources.precise}/${report.sources.total} (${report.sources.percent}%).`);
  console.log(`Major event coverage: ${report.events.covered}/${report.events.total} (${report.events.percent}%).`);
  console.log(`Person basic-info coverage: ${report.people.covered}/${report.people.total} (${report.people.percent}%).`);
}

if (process.argv.includes('--check') && (missingEvents.length || missingPeople.length)) {
  missingEvents.forEach(event => console.error(`- Event ${event.id} has no source with locator and contentCheckedAt.`));
  missingPeople.forEach(person => console.error(`- Person ${person.id} has no source with locator and contentCheckedAt.`));
  process.exitCode = 1;
}

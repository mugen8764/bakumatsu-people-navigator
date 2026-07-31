const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sources = JSON.parse(fs.readFileSync(path.join(root, 'data/sources.json'), 'utf8')).sources;
const events = JSON.parse(fs.readFileSync(path.join(root, 'data/events.json'), 'utf8')).events;
const sourceById = new Map(sources.map(source => [source.id, source]));
const preciseSources = sources.filter(source => source.locator && source.contentCheckedAt);
const missingEvents = events.filter(event => !event.evidence.sourceIds.some(id => {
  const source = sourceById.get(id);
  return Boolean(source?.locator && source?.contentCheckedAt);
}));

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
  missingEventIds: missingEvents.map(event => event.id)
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Precise sources: ${report.sources.precise}/${report.sources.total} (${report.sources.percent}%).`);
  console.log(`Major event coverage: ${report.events.covered}/${report.events.total} (${report.events.percent}%).`);
}

if (process.argv.includes('--check') && missingEvents.length) {
  missingEvents.forEach(event => console.error(`- Event ${event.id} has no source with locator and contentCheckedAt.`));
  process.exitCode = 1;
}

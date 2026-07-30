const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const files = [
  'people.json',
  'person-statuses.json',
  'factions.json',
  'relations.json',
  'events.json',
  'places.json',
  'sources.json'
];
const allowedStatuses = new Set(['verified', 'needs_review', 'disputed']);
const totals = { verified: 0, needs_review: 0, disputed: 0 };
const rows = [];
const failures = [];

function visit(value, location, counts) {
  if (!value || typeof value !== 'object') return;
  if (value.evidence) {
    const { reviewStatus, sourceIds } = value.evidence;
    if (!allowedStatuses.has(reviewStatus)) failures.push(`${location}: invalid reviewStatus ${String(reviewStatus)}`);
    else {
      counts[reviewStatus] += 1;
      totals[reviewStatus] += 1;
    }
    if (reviewStatus === 'verified' && (!Array.isArray(sourceIds) || sourceIds.length === 0)) {
      failures.push(`${location}: verified evidence requires at least one sourceId`);
    }
  }
  for (const [key, child] of Object.entries(value)) {
    if (key !== 'evidence') visit(child, `${location}.${key}`, counts);
  }
}

for (const file of files) {
  const counts = { verified: 0, needs_review: 0, disputed: 0 };
  visit(JSON.parse(fs.readFileSync(path.join(root, 'data', file), 'utf8')), file, counts);
  rows.push({ file, ...counts });
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ files: rows, totals }, null, 2));
} else {
  console.table(rows);
  console.log(`Review totals: ${totals.verified} verified, ${totals.needs_review} needs_review, ${totals.disputed} disputed.`);
}

if (process.argv.includes('--check') && failures.length) {
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exitCode = 1;
}

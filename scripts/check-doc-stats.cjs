const fs = require('node:fs');
const path = require('node:path');
const { loadV2Documents } = require('./lib/v2-files.cjs');
const { updateDocStats } = require('./lib/doc-stats.cjs');

const root = path.resolve(__dirname, '..');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');

try {
  if (readme !== updateDocStats(readme, loadV2Documents(root))) {
    throw new Error('README.md statistics are stale. Run npm run content:prepare with the intended version and date.');
  }
  console.log('README statistics match canonical data and production checks.');
} catch (error) {
  console.error(`- ${error.message}`);
  process.exitCode = 1;
}

const fs = require('node:fs');
const path = require('node:path');
const { assembleLegacyData } = require('./lib/assemble-legacy-data.cjs');
const { loadV2Documents } = require('./lib/v2-files.cjs');
const { validateCurrentData, validateV2Documents } = require('./validate-data.cjs');

const root = path.resolve(__dirname, '..');

function expectedOutputs() {
  const documents = loadV2Documents(root);
  validateV2Documents(documents);
  const legacyData = assembleLegacyData(documents);
  validateCurrentData(legacyData);
  return {
    'data.json': JSON.stringify(legacyData, null, 2),
    'data.js': `window.BM_DATA=${JSON.stringify(legacyData)};\n`
  };
}

function checkOutputs(outputs) {
  const stale = Object.entries(outputs)
    .filter(([fileName, expected]) => !fs.existsSync(path.join(root, fileName)) || fs.readFileSync(path.join(root, fileName), 'utf8') !== expected)
    .map(([fileName]) => fileName);
  if (stale.length) throw new Error(`Generated data is stale: ${stale.join(', ')}. Run npm run build:data.`);
}

function writeOutputs(outputs) {
  for (const [fileName, contents] of Object.entries(outputs)) fs.writeFileSync(path.join(root, fileName), contents);
}

if (require.main === module) {
  const outputs = expectedOutputs();
  if (process.argv.includes('--check')) {
    checkOutputs(outputs);
    console.log('Generated data is current.');
  } else {
    writeOutputs(outputs);
    console.log('Generated data.json and data.js from data/*.json.');
  }
}

module.exports = { checkOutputs, expectedOutputs };

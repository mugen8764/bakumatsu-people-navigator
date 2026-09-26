const fs = require('node:fs');
const path = require('node:path');
const { assembleLegacyData } = require('./lib/assemble-legacy-data.cjs');
const { loadV2Documents } = require('./lib/v2-files.cjs');
const { validateCurrentData, validateV2Documents } = require('./validate-data.cjs');

const root = path.resolve(__dirname, '..');

// data.js stays a classic script so the site also opens from file:// without
// fetch. The JSON text is embedded as a string literal for JSON.parse, which
// engines parse faster than an equivalent object literal and which keeps JSON
// semantics: an own "__proto__" key stays data and no objects are shared.
// Transfer size is left to the host's HTTP compression (gzip/brotli), which
// shrinks plain JSON further than any pre-encoding the browser must undo.
function browserWrapper(data) {
  return `window.BM_DATA=JSON.parse(${JSON.stringify(JSON.stringify(data))});\n`;
}

function expectedOutputs() {
  const documents = loadV2Documents(root);
  validateV2Documents(documents);
  const legacyData = assembleLegacyData(documents);
  validateCurrentData(legacyData);
  return {
    'data.json': JSON.stringify(legacyData, null, 2),
    'data.js': browserWrapper(legacyData)
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

module.exports = { browserWrapper, checkOutputs, expectedOutputs };

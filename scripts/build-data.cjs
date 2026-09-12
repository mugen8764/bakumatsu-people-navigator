const fs = require('node:fs');
const path = require('node:path');
const { assembleLegacyData } = require('./lib/assemble-legacy-data.cjs');
const { loadV2Documents } = require('./lib/v2-files.cjs');
const { validateCurrentData, validateV2Documents } = require('./validate-data.cjs');

const root = path.resolve(__dirname, '..');

// Repeated scene states and evidence share their serialized text, then regain
// independent objects. The public BM_DATA shape and data.json stay unchanged.
function browserWrapper(data) {
  const unique = [];
  const indexes = new Map();
  const evidence = [];
  const evidenceIndexes = new Map();
  function packEvidence(key, value) {
    if (key !== 'evidence') return value;
    const text = JSON.stringify(value);
    if (!evidenceIndexes.has(text)) { evidenceIndexes.set(text, evidence.length); evidence.push(value); }
    return evidenceIndexes.get(text);
  }
  const states = Object.fromEntries(Object.entries(data.factionStates).map(([scene, factions]) => [
    scene, Object.fromEntries(Object.entries(factions).map(([name, state]) => {
      const text = JSON.stringify(state);
      if (!indexes.has(text)) { indexes.set(text, unique.length); unique.push(state); }
      return [name, indexes.get(text)];
    }))
  ]));
  const packedData = JSON.stringify({ ...data, factionStates: states }, packEvidence);
  const packedStates = JSON.stringify(unique, packEvidence);
  return `window.BM_DATA=(()=>{const d=${packedData},s=${packedStates},e=${JSON.stringify(evidence)},copy=v=>JSON.parse(JSON.stringify(v));for(const f of Object.values(d.factionStates))for(const n of Object.keys(f))f[n]=copy(s[f[n]]);function restore(v){if(v&&typeof v==="object")for(const k of Object.keys(v))if(k==="evidence")v[k]=copy(e[v[k]]);else restore(v[k])}restore(d);return d})();\n`;
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

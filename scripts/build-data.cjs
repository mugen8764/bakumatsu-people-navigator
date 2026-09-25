const fs = require('node:fs');
const path = require('node:path');
const { assembleLegacyData } = require('./lib/assemble-legacy-data.cjs');
const { loadV2Documents } = require('./lib/v2-files.cjs');
const { validateCurrentData, validateV2Documents } = require('./validate-data.cjs');

const root = path.resolve(__dirname, '..');

// Serialize object shapes and repeated strings once. Array tags make the format
// unambiguous even when original arrays contain negative numbers. Restoration
// creates independent objects and leaves the public BM_DATA contract unchanged.
function browserWrapper(data) {
  const counts = new Map();
  function countStrings(value) {
    if (typeof value === 'string') counts.set(value, (counts.get(value) || 0) + 1);
    else if (value && typeof value === 'object') Object.values(value).forEach(countStrings);
  }
  countStrings(data);
  const strings = [...counts]
    .filter(([value, count]) => count > 1 && Buffer.byteLength(JSON.stringify(value)) >= 12)
    .map(([value]) => value);
  const stringIndexes = new Map(strings.map((value, index) => [value, index]));
  const shapes = [];
  const shapeIndexes = new Map();
  function pack(value) {
    if (typeof value === 'string' && stringIndexes.has(value)) return [-2, stringIndexes.get(value)];
    if (Array.isArray(value)) return [-1, ...value.map(pack)];
    if (value && typeof value === 'object') {
      const keys = Object.keys(value);
      const shape = JSON.stringify(keys);
      if (!shapeIndexes.has(shape)) {
        shapeIndexes.set(shape, shapes.length);
        shapes.push(keys);
      }
      return [shapeIndexes.get(shape), ...keys.map(key => pack(value[key]))];
    }
    return value;
  }
  const packed = pack(data);
  return 'window.BM_DATA=(()=>{const d=' + JSON.stringify(packed)
    + ',s=' + JSON.stringify(shapes) + ',t=' + JSON.stringify(strings)
    + ';function restore(v){if(!Array.isArray(v))return v;if(v[0]===-2)return t[v[1]];if(v[0]===-1)return v.slice(1).map(restore);return Object.fromEntries(s[v[0]].map((k,i)=>[k,restore(v[i+1])]))}return restore(d)})();\n';
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

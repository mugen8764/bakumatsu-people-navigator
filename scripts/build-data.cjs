const fs = require('node:fs');
const path = require('node:path');
const { assembleLegacyData } = require('./lib/assemble-legacy-data.cjs');
const { loadV2Documents } = require('./lib/v2-files.cjs');
const { validateCurrentData, validateV2Documents } = require('./validate-data.cjs');

const root = path.resolve(__dirname, '..');

// LZW-compress the JSON text in bounded blocks. The dictionary starts with the
// text's UTF-16 code units, so Japanese prose compresses along with JSON keys.
// Each code is stored as one Unicode scalar, offset past ASCII and skipping
// surrogates: adjacent surrogate values must never merge during UTF-8 storage.
// Resetting every 262144 units bounds codes below 65536 + 262144, comfortably
// inside the scalar range even for input containing every UTF-16 code unit.
// Decoding is synchronous, needs no network/decompression API, and JSON.parse
// preserves literal arrays, __proto__ keys and independent mutable objects.
function browserWrapper(data) {
  const text = JSON.stringify(data);
  const symbols = [...new Set(text.split(''))];
  const blocks = [];
  for (let offset = 0; offset < text.length; offset += 262144) {
    const input = text.slice(offset, offset + 262144);
    const dictionary = new Map(symbols.map((symbol, index) => [symbol, index]));
    const codes = [];
    let word = '';
    for (let index = 0; index < input.length; index++) {
      const symbol = input[index];
      const next = word + symbol;
      if (dictionary.has(next)) word = next;
      else {
        codes.push(dictionary.get(word));
        dictionary.set(next, dictionary.size);
        word = symbol;
      }
    }
    if (word) codes.push(dictionary.get(word));
    blocks.push(codes.map(code => {
      const scalar = code + 256;
      return String.fromCodePoint(scalar >= 0xd800 ? scalar + 2048 : scalar);
    }).join(''));
  }
  function restore(alphabet, encodedBlocks) {
    const output = [];
    for (const block of encodedBlocks) {
      const dictionary = alphabet.slice();
      let word = '';
      for (const symbol of block) {
        const scalar = symbol.codePointAt(0);
        const code = scalar - (scalar >= 0xe000 ? 2304 : 256);
        const value = dictionary[code] ?? word + word[0];
        output.push(value);
        if (word) dictionary.push(word + value[0]);
        word = value;
      }
    }
    return JSON.parse(output.join(''));
  }
  return 'window.BM_DATA=(' + restore.toString() + ')('
    + JSON.stringify(symbols) + ',' + JSON.stringify(blocks) + ');\n';
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

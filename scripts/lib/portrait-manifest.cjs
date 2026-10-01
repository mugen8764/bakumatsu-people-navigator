const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Ajv = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const { imageSize } = require('./image-info.cjs');
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validatePortrait = ajv.compile(require('../../schema/portrait.schema.json'));

function portraitManifest(documents, root) {
  const sources = new Map(documents.sources.sources.map(source => [source.id, source]));
  const ids = new Set();
  const portraits = documents.people.people.filter(person => person.portrait).map(person => {
    if (ids.has(person.id)) throw new Error(`Duplicate portrait personId: ${person.id}`);
    ids.add(person.id);
    const portrait = person.portrait;
    if (!validatePortrait(portrait)) throw new Error(`Invalid portrait for ${person.id}: ${ajv.errorsText(validatePortrait.errors)}`);
    const source = sources.get(portrait.sourceId);
    const rights = sources.get(portrait.rightsSourceId);
    if (!source || !rights || !/^https:\/\//.test(source.url) || !/^https:\/\//.test(rights.url)) {
      throw new Error(`Unresolved portrait source or rights URL: ${person.id}`);
    }
    const bytes = fs.readFileSync(path.join(root, portrait.src));
    const size = imageSize(bytes, path.extname(portrait.src).slice(1));
    if (!size || size.width < 1 || size.height < 1) throw new Error(`Invalid portrait image: ${portrait.src}`);
    if (size.width > 320 || size.height > 320 || bytes.length > 64 * 1024) throw new Error(`Portrait exceeds 320px or 64 KiB: ${portrait.src}`);
    return {
      personId: person.id, name: person.name, ...portrait,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      width: size.width, height: size.height, bytes: bytes.length,
      sourceUrl: source.url, rightsUrl: rights.url
    };
  }).sort((a, b) => a.personId < b.personId ? -1 : a.personId > b.personId ? 1 : 0);
  return { manifestVersion: 1, contentVersion: documents.manifest.contentVersion, portraits };
}

function portraitManifestText(documents, root) {
  return `${JSON.stringify(portraitManifest(documents, root), null, 2)}\n`;
}

module.exports = { portraitManifest, portraitManifestText };

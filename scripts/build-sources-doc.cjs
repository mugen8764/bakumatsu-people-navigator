const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sourcesPath = path.join(root, 'data', 'sources.json');
const documentPath = path.join(root, 'SOURCES.md');
const beginMarker = '<!-- BEGIN GENERATED SOURCE CATALOG -->';
const endMarker = '<!-- END GENERATED SOURCE CATALOG -->';

function escapeLinkText(value) {
  return value.replace(/([\\[\]])/g, '\\$1');
}

function renderCatalog(sources) {
  const entries = sources.flatMap((source, index) => [
    `${index + 1}. [${escapeLinkText(source.title)}](${source.url}) — ${source.note}`,
    ''
  ]);

  return [
    beginMarker,
    '## 出典カタログ（正本JSONから生成）',
    '',
    '`data/sources.json` に登録された出典を掲載しています。追加・修正は正本JSONで行い、`npm run build:sources` でこの一覧へ反映してください。',
    '',
    ...entries,
    endMarker
  ].join('\n');
}

function loadSources() {
  const document = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'));
  if (!Array.isArray(document.sources)) throw new Error('data/sources.json must contain a sources array.');

  for (const [index, source] of document.sources.entries()) {
    for (const field of ['title', 'url', 'note']) {
      if (typeof source[field] !== 'string' || !source[field].trim()) {
        throw new Error(`data/sources.json sources[${index}].${field} must be a non-empty string.`);
      }
    }
  }
  return document.sources;
}

function expectedDocument(current, sources) {
  const catalog = renderCatalog(sources);
  const beginIndex = current.indexOf(beginMarker);
  const endIndex = current.indexOf(endMarker);

  if (beginIndex !== -1 || endIndex !== -1) {
    if (beginIndex === -1 || endIndex === -1 || endIndex < beginIndex) {
      throw new Error('SOURCES.md has incomplete or invalid generated source catalog markers.');
    }
    const afterEnd = endIndex + endMarker.length;
    return `${current.slice(0, beginIndex)}${catalog}${current.slice(afterEnd)}`;
  }

  const legacyStart = current.indexOf('## 主な公開資料');
  const followingSection = current.indexOf('## 情報の分類');
  if (legacyStart === -1 || followingSection === -1 || followingSection < legacyStart) {
    throw new Error('SOURCES.md does not contain generated markers or the legacy source catalog sections.');
  }
  return `${current.slice(0, legacyStart)}${catalog}\n\n${current.slice(followingSection)}`;
}

function run() {
  const current = fs.readFileSync(documentPath, 'utf8');
  const sources = loadSources();
  const expected = expectedDocument(current, sources);

  if (process.argv.includes('--check')) {
    if (current !== expected) {
      throw new Error('SOURCES.md is stale. Run npm run build:sources.');
    }
    console.log(`SOURCES.md contains all ${sources.length} registered sources.`);
    return;
  }

  fs.writeFileSync(documentPath, expected);
  console.log(`Generated SOURCES.md catalog from ${sources.length} registered sources.`);
}

if (require.main === module) run();

module.exports = { expectedDocument, renderCatalog };

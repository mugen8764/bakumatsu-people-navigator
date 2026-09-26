const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { loadV2Documents } = require('./lib/v2-files.cjs');
const { expectedOutputs } = require('./build-data.cjs');
const { expectedDocument, loadSources } = require('./build-sources-doc.cjs');
const { updateDocStats } = require('./lib/doc-stats.cjs');

const usage = 'npm run content:prepare -- --version X.Y.Z --date YYYY-MM-DD [--dry-run]';
const optionKeys = { '--version': 'version', '--date': 'date', '--dry-run': 'dryRun', '--help': 'help' };

function parseOptions(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const [flag, inline] = args[index].split(/=(.*)/s);
    const key = Object.hasOwn(optionKeys, flag) && optionKeys[flag];
    if (!key || key in options) throw new Error(`Unknown or repeated option: ${flag}`);
    if (key === 'dryRun' || key === 'help') {
      if (inline !== undefined) throw new Error(`${flag} takes no value.`);
      options[key] = true;
    } else {
      const value = inline ?? args[++index];
      if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value.`);
      options[key] = value;
    }
  }
  if (!options.help && (!options.version || !options.date)) throw new Error(`Specify both --version and --date.\n${usage}`);
  return options;
}

function updateAssetVersions(html, read) {
  const tags = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>|<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/g)]
    .map(match => ({ tag: match[0], reference: match[1] || match[2] }))
    .filter(({ reference }) => !/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(reference));
  if (!tags.length) throw new Error('index.html contains no local scripts or stylesheet.');
  const files = [...new Set(tags.map(({ reference }) => reference.split(/[?#]/)[0]))].sort();
  const hash = crypto.createHash('sha256');
  for (const file of files) hash.update(file).update('\0').update(read(file).replace(/\r\n/g, '\n')).update('\0');
  const version = hash.digest('hex').slice(0, 16);
  for (const { tag, reference } of tags) {
    const [location, fragment] = reference.split('#');
    const [file, query] = location.split('?');
    const parameters = new URLSearchParams(query);
    parameters.set('v', version);
    const next = `${file}?${parameters}${fragment === undefined ? '' : `#${fragment}`}`;
    html = html.replace(tag, tag.replace(reference, next));
  }
  return { html, version };
}

function prepareContent(root, options) {
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const documents = loadV2Documents(root);
  documents.manifest = { ...documents.manifest, contentVersion: options.version, updated: options.date };
  // Validate and calculate every output before writing any file.
  const outputs = expectedOutputs(documents);
  outputs['data/manifest.json'] = `${JSON.stringify(documents.manifest, null, 2)}\n`;
  outputs['SOURCES.md'] = expectedDocument(read('SOURCES.md'), loadSources(documents.sources));
  outputs['README.md'] = updateDocStats(read('README.md'), documents);
  const sitemap = read('sitemap.xml');
  if ([...sitemap.matchAll(/<lastmod>[^<]*<\/lastmod>/g)].length !== 1) {
    throw new Error('sitemap.xml must contain exactly one lastmod date.');
  }
  outputs['sitemap.xml'] = sitemap.replace(/<lastmod>[^<]*<\/lastmod>/, `<lastmod>${options.date}</lastmod>`);
  const assets = updateAssetVersions(read('index.html'), file => outputs[file] ?? read(file));
  outputs['index.html'] = assets.html;
  const changed = Object.keys(outputs).filter(file => !fs.existsSync(path.join(root, file)) || read(file) !== outputs[file]);
  if (!options.dryRun) {
    for (const file of changed) fs.writeFileSync(path.join(root, file), outputs[file]);
  }
  return { changed, assetVersion: assets.version };
}

if (require.main === module) {
  try {
    const options = parseOptions(process.argv.slice(2));
    if (options.help) console.log(usage);
    else {
      const result = prepareContent(path.resolve(__dirname, '..'), options);
      console.log(`Content ${options.version}, updated ${options.date}, assets ${result.assetVersion}`);
      console.log(`${options.dryRun ? 'Would update' : 'Updated'} ${result.changed.length} files${result.changed.length ? `:\n${result.changed.map(file => `- ${file}`).join('\n')}` : '.'}`);
      console.log('Next: inspect the diff, run the checks for your changes, then npm run build:site.');
    }
  } catch (error) {
    console.error(`- ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { parseOptions, prepareContent, updateAssetVersions };

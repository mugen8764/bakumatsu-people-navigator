// Shared by the production checker and the README statistics generator.
function productionConfig(people) {
  const files = [
    'index.html', 'data/manifest.json', 'data.js', 'data.json', 'og-image.png',
    'src/app.js', 'src/domain.js', 'src/renderers/people.js',
    'src/renderers/factions.js', 'src/renderers/relations.js', 'src/state.js',
    'src/router.js', 'src/search.js', 'src/map.js', 'src/renderers/shared.js',
    'src/renderers/scene.js', 'src/renderers/events.js', 'src/styles.css'
  ];
  const portraits = [...new Set(people.filter(person => person.portrait).map(person => person.portrait.src))];
  files.push(...portraits);
  const requiredHeaders = [
    'content-security-policy', 'permissions-policy', 'referrer-policy', 'x-content-type-options'
  ];
  const requiredCacheControls = new Map([
    ['data.js', 'no-cache'], ['src/app.js', 'no-cache'], ['og-image.png', 'max-age=86400'],
    ...portraits.map(file => [file, 'no-cache'])
  ]);
  return { files, requiredHeaders, requiredCacheControls };
}

module.exports = { productionConfig };

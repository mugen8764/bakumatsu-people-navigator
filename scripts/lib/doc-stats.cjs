const { productionConfig } = require('./production-config.cjs');

function updateDocStats(current, documents) {
  const { people } = documents.people;
  const { factions } = documents.factions;
  const { scenes, incidents = [], terms = [] } = documents.events;
  const { personRelations, factionRelations } = documents.relations;
  const production = productionConfig(people);
  const counts = [
    [/^(- 人物: )\d+(名)/gm, people.length],
    [/^(- 勢力: )\d+/gm, factions.filter(faction => faction.kind !== 'field').length],
    [/^(- 活動分野: )\d+/gm, factions.filter(faction => faction.kind === 'field').length],
    [/^(- 時点・主要事件: )\d+/gm, scenes.length],
    [/^(- 個別事件: )\d+/gm, incidents.length],
    [/^(- 人物関係: )\d+/gm, personRelations.length],
    [/^(- 勢力関係: )\d+/gm, factionRelations.length],
    [/^(- 地点: )\d+/gm, documents.places.places.length],
    [/^(- 背景解説: )\d+(項目)/gm, terms.length],
    [/^(- 史料肖像: )\d+(点)/gm, people.filter(person => person.portrait).length],
    [/(本番の主要)\d+(ファイル)/g, production.files.length],
    [/(、)\d+(種のセキュリティヘッダー)/g, production.requiredHeaders.length],
    [/(、)\d+(件のキャッシュ方針)/g, production.requiredCacheControls.size]
  ];
  let updated = current;
  for (const [pattern, count] of counts) {
    const matches = [...updated.matchAll(pattern)];
    if (matches.length !== 1) throw new Error(`README.md must contain exactly one statistic matching ${pattern}.`);
    const match = matches[0];
    // Replace only the number, preserving units, explanations and line endings.
    updated = updated.slice(0, match.index) + match[1] + count + (match[2] || '') + updated.slice(match.index + match[0].length);
  }
  return updated;
}

module.exports = { updateDocStats };

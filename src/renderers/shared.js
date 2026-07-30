(function exposeSharedRenderer(root, factory) {
  root.BM_RENDER_SHARED = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  function createShared(context) {
    const { data, state } = context;

    function scene() {
      return data.scenes[state.scene];
    }

    function factionColor(name) {
      return data.factions[name]?.color || '#777';
    }

    function factionShort(name) {
      return data.factions[name]?.short || name.slice(0, 1);
    }

    function dateLabel(value) {
      if (state.calendar === 'western') return `${value.year}年`;
      if (state.calendar === 'japanese') return value.era;
      return `${value.year}年（${value.era}）`;
    }

    function sourceLinks(ids) {
      return [...new Set(ids || [])]
        .map(id => data.sources[id])
        .filter(Boolean)
        .map(source => `<a class="source" href="${source.url}" target="_blank" rel="noopener"><strong>${source.title}</strong><span class="muted">${source.note}</span></a>`)
        .join('');
    }

    return { dateLabel, factionColor, factionShort, scene, sourceLinks };
  }

  return { createShared };
}));

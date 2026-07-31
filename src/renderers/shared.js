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

    function sourceCard(source) {
      const precision = source.locator
        ? `<span class="source-meta"><span>該当箇所: ${source.locator}</span><span>内容確認日: ${source.contentCheckedAt}</span></span>`
        : '';
      return `<a class="source" href="${source.url}" target="_blank" rel="noopener"><strong>${source.title}</strong><span class="muted">${source.note}</span>${precision}</a>`;
    }

    function sourceLinks(ids) {
      return [...new Set(ids || [])]
        .map(id => data.sources[id])
        .filter(Boolean)
        .map(sourceCard)
        .join('');
    }

    function reviewBadge(evidence) {
      if (!evidence || evidence.reviewStatus === 'verified') return '';
      if (evidence.reviewStatus === 'disputed') {
        return '<span class="badge review-status disputed" title="複数の見解がある項目です">諸説あり</span>';
      }
      return '<span class="badge review-status" title="項目単位の出典を確認中です">出典校正中</span>';
    }

    return { dateLabel, factionColor, factionShort, reviewBadge, scene, sourceCard, sourceLinks };
  }

  return { createShared };
}));

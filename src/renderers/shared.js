(function exposeSharedRenderer(root, factory) {
  root.BM_RENDER_SHARED = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const htmlEntities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  // Every renderer builds markup with template strings, so any value that comes
  // from the data files has to pass through this before it reaches innerHTML.
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => htmlEntities[character]);
  }

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
      return `${escapeHtml(value.year)}年（${escapeHtml(value.era)}）`;
    }

    function sourceCard(source) {
      const precision = source.locator
        ? `<span class="source-meta"><span>該当箇所: ${escapeHtml(source.locator)}</span><span>内容確認日: ${escapeHtml(source.contentCheckedAt)}</span></span>`
        : '';
      return `<a class="source" href="${escapeHtml(source.url)}" target="_blank" rel="noopener"><strong>${escapeHtml(source.title)}</strong><span class="muted">${escapeHtml(source.note)}</span>${precision}</a>`;
    }

    function sourceLinks(ids) {
      return [...new Set(ids || [])]
        .map(id => data.sources[id])
        .filter(Boolean)
        .map(sourceCard)
        .join('');
    }

    function avatar(person, faction, name = person.name, nameFallback = false) {
      const portrait = person.portrait;
      return `<span class="avatar ${portrait ? 'has-portrait' : ''}" style="background:${escapeHtml(factionColor(faction))}"><span aria-hidden="true">${escapeHtml(portrait || nameFallback ? name.slice(0, 2) : factionShort(faction))}</span>${portrait ? `<img data-portrait src="${escapeHtml(portrait.src)}" alt="${escapeHtml(portrait.alt)}" width="80" height="100" loading="lazy">` : ''}</span>`;
    }

    function bindPortraits(container) {
      container.querySelectorAll('img[data-portrait]').forEach(img => {
        const fallback = () => { img.hidden = true; };
        img.addEventListener('error', fallback, { once: true });
        if (img.complete && !img.naturalWidth) fallback();
      });
    }

    function portraitCredit(person) {
      const portrait = person.portrait;
      if (!portrait) return '';
      return `<details class="source-disclosure portrait-credit"><summary>${escapeHtml(person.name)}の肖像：出典・利用条件</summary><p>${escapeHtml(portrait.credit)}</p><p>${escapeHtml(portrait.identityNote)}</p><p>${escapeHtml(portrait.dateNote)}</p><p>原資料：${escapeHtml(portrait.originalSource || '書誌未確認')}</p><p>${escapeHtml(portrait.rightsNote)}</p><div class="source-list">${sourceLinks([portrait.sourceId, portrait.rightsSourceId])}</div></details>`;
    }

    function reviewBadge(evidence) {
      if (!evidence || evidence.reviewStatus === 'verified') return '';
      if (evidence.reviewStatus === 'disputed') {
        return '<span class="badge review-status disputed" title="複数の見解がある項目です">諸説あり</span>';
      }
      return '<span class="badge review-status" title="項目単位の出典を確認中です">出典校正中</span>';
    }

    return { avatar, bindPortraits, portraitCredit, dateLabel, escapeHtml, factionColor, factionShort, reviewBadge, scene, sourceCard, sourceLinks };
  }

  return { createShared, escapeHtml };
}));

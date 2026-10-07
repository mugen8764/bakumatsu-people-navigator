(function exposeReadingGuide(root, factory) {
  root.BM_RENDER_GUIDE = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
.reading-guide[open]{flex-basis:100%;min-width:0}
.reading-guide-body{padding:0 16px 16px}
.guide-choice{display:block;max-width:260px}
.guide-focus{display:block;font-size:.8rem;font-weight:700}
.reading-guide-body ol{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px 30px;padding-left:24px}
.reading-guide-body li{min-width:0;padding:8px}
.reading-guide-body li[aria-current]{background:var(--accent-soft);outline:2px solid var(--accent);border-radius:10px}
.reading-guide-body li[aria-current]>.muted,.guide-current{color:var(--text)}
.guide-current{font-size:.8rem}
.reading-guide-body h2{font-size:1rem;margin:4px 0}
.reading-guide-body p{margin:6px 0 10px}
.reading-guide .button{min-height:44px;white-space:normal;text-align:left}
@media(max-width:680px){.guide-summary{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}}
`;
  document.head.append(style);

  function createGuideRenderer(context) {
    const { $, $$, actions, domain, shared, state } = context;
    const esc = shared.escapeHtml;
    const defaultIntro = $('#readingGuideIntro').textContent;
    let renderedGuide = '';

    function render(guide, current) {
      if (renderedGuide !== state.guide) {
        $('#readingGuideIntro').textContent = state.guide === 'shinsengumi'
          ? 'このナビに収録された事件・人物から、新選組に関わる流れをたどるガイドです。組織の全史ではありません。離隊・復帰や、会津の斎藤一・箱館の土方歳三など、人物ごとの動きを区別して読みます。'
          : defaultIntro;
        $('#readingGuideSteps').innerHTML = guide.steps.map(([kind, id]) => {
          const personId = state.guide === 'shinsengumi' ? { 'aizu-siege': 'saito', 'hakodate-1869': 'hijikata' }[id] : undefined;
          const item = kind === 'scene' ? domain.sceneById.get(id) : domain.getIncident(id);
          const scene = kind === 'scene' ? item : domain.sceneById.get(item.sceneId);
          const participant = personId ? item.participants.find(person => person.personId === personId) : null;
          const focus = participant ? `<span class="guide-focus">人物の動き：${esc(domain.getPerson(personId).name)}</span>` : '';
          return `<li><span class="muted">${esc(scene.year)}年 · ${kind === 'scene' ? '時点' : '事件'}</span> <strong class="guide-current" hidden>現在地</strong>${focus}<h2>${esc(item.title)}</h2><p class="guide-summary">${esc(participant?.summary || item.summary)}</p>${shared.reviewBadge(participant?.evidence || item.evidence)}<button type="button" class="button" data-guide-kind="${kind}" data-guide-id="${esc(id)}"${participant ? ` data-guide-person="${esc(personId)}"` : ''}>${kind === 'scene' ? 'この時点を見る' : '事件を読む'}<span class="visually-hidden">：${esc(item.title)}</span> →</button></li>`;
        }).join('');
        $$('[data-guide-id]').forEach(button => button.addEventListener('click', () => {
          $('#readingGuide').open = false;
          if (button.dataset.guideKind === 'incident') actions.openEvent(button.dataset.guideId, { personId: button.dataset.guidePerson });
          else {
            actions.setScene(domain.sceneById.get(button.dataset.guideId).index, { view: 'people' });
            const heading = $('#sceneTitle');
            heading.scrollIntoView({ block: 'start', behavior: 'auto' });
            heading.focus({ preventScroll: true });
          }
        }));
        renderedGuide = state.guide;
      }
      $$('#readingGuideSteps li').forEach((item, index) => {
        if (index === current) item.setAttribute('aria-current', 'step');
        else item.removeAttribute('aria-current');
        item.querySelector('.guide-current').hidden = index !== current;
      });
    }

    return { render };
  }

  let renderer;
  function render(context, guide, current) {
    renderer ||= createGuideRenderer(context);
    renderer.render(guide, current);
  }
  return { render };
}));

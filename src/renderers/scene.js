(function exposeSceneRenderer(root, factory) {
  root.BM_RENDER_SCENE = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  function createSceneRenderer(context) {
    const { $, $$, data, domain, shared, state } = context;

    function renderScene() {
      const scene = shared.scene();
      $('#sceneSelect').innerHTML = data.scenes.map((item, index) => `<option value="${index}">${item.year} ${item.title}</option>`).join('');
      $('#sceneSelect').value = state.scene;
      $('#sceneRange').max = data.scenes.length - 1;
      $('#sceneRange').value = state.scene;
      $('#calendarMode').value = state.calendar;
      $('#sceneYear').textContent = state.calendar === 'japanese' ? scene.era : scene.year;
      $('#sceneEra').textContent = state.calendar === 'both' ? scene.era : '';
      $('#sceneTitle').textContent = scene.title;
      $('#sceneSummary').textContent = scene.summary;
      $('#sceneProgress').style.width = `${(state.scene + 1) / data.scenes.length * 100}%`;
      const event = data.events[scene.event];
      $('#sceneCounts').innerHTML = `<span class="count">人物 ${domain.activePeople(state.scene).length}</span><span class="count">勢力 ${domain.activeFactionNames(state.scene).length}</span><span class="count">関係 ${domain.activeRelations(state.scene, state.relationType).length}</span><span class="count">${event.category}</span>`;
      $('#sceneInsights').innerHTML = scene.insights.map(insight => `<div class="insight">${insight}</div>`).join('');
      $('#prevScene').disabled = state.scene === 0;
      $('#nextScene').disabled = state.scene === data.scenes.length - 1;
      $('#playScenes').textContent = state.timer ? 'Ⅱ 一時停止' : '▶ 再生';
      $('#playScenes').setAttribute('aria-pressed', String(Boolean(state.timer)));
    }

    function renderTabs() {
      $$('.tab').forEach(button => {
        const active = button.dataset.view === state.view;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
      });
      $$('.view').forEach(view => {
        const active = view.id === `view-${state.view}`;
        view.classList.toggle('active', active);
        view.hidden = !active;
      });
    }

    function renderSources() {
      $('#dataStats').innerHTML = `<div class="stat"><b>${data.people.length}</b><span>人物</span></div><div class="stat"><b>${Object.keys(data.factions).length}</b><span>勢力</span></div><div class="stat"><b>${data.scenes.length}</b><span>時点・事件</span></div><div class="stat"><b>${data.relations.length}</b><span>人物関係</span></div>`;
      $('#sourceCatalog').innerHTML = Object.values(data.sources).map(source => `<a class="source" href="${source.url}" target="_blank" rel="noopener"><strong>${source.title}</strong><span class="muted">${source.note}</span></a>`).join('');
    }

    return { renderScene, renderSources, renderTabs };
  }

  return { createSceneRenderer };
}));

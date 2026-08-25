(function exposeSceneRenderer(root, factory) {
  root.BM_RENDER_SCENE = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  function createSceneRenderer(context) {
    const { $, $$, actions, data, domain, shared, state } = context;

    function renderScenePeople(event) {
      const people = event.people.map(id => {
        const person = domain.getPerson(id);
        const status = domain.statusAt(person, state.scene);
        return person && status ? { person, status } : null;
      }).filter(Boolean).slice(0, 6);
      $('#scenePeople').innerHTML = people.map(({ person, status }) => `<button type="button" class="scene-person" data-scene-person="${person.id}"><span class="scene-person-avatar" style="background:${shared.factionColor(status.faction)}">${shared.factionShort(status.faction)}</span><span><strong>${status.display}</strong><small>${status.role}</small></span></button>`).join('');
      $$('[data-scene-person]').forEach(button => button.addEventListener('click', () => actions.selectPerson(button.dataset.scenePerson, 'people')));
    }

    function renderSceneFactions(event) {
      const states = data.factionStates[shared.scene().id] || {};
      $('#sceneFactions').innerHTML = event.factions.filter(name => states[name]).map(name => `<button type="button" class="scene-faction" data-scene-faction="${name}"><i style="background:${shared.factionColor(name)}"></i><span><strong>${name}</strong><small>${states[name].position}</small></span></button>`).join('');
      $$('[data-scene-faction]').forEach(button => button.addEventListener('click', () => actions.selectFaction(button.dataset.sceneFaction)));
    }

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
      $('#sceneCounts').innerHTML = `<span class="count">人物 ${domain.activePeople(state.scene).length}</span><span class="count">勢力 ${domain.activeFactionNames(state.scene).length}</span><span class="count">関係 ${domain.activeRelations(state.scene, state.relationType).length}</span><span class="count">${event.category}</span>${shared.reviewBadge(scene.evidence)}`;
      $('#sceneInsights').innerHTML = scene.insights.map(insight => `<div class="insight">${insight}</div>`).join('');
      renderScenePeople(event);
      renderSceneFactions(event);
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
      $('#sourceCatalog').innerHTML = Object.values(data.sources).map(shared.sourceCard).join('');
    }

    return { renderScene, renderSources, renderTabs };
  }

  return { createSceneRenderer };
}));

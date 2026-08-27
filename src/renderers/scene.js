(function exposeSceneRenderer(root, factory) {
  root.BM_RENDER_SCENE = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  function createSceneRenderer(context) {
    const { $, $$, actions, data, domain, shared, state } = context;
    let sceneControlsInitialized = false;
    let sourcesRendered = false;

    function eventPeopleAtCurrentScene(event, limit = Infinity) {
      return event.people.map(id => {
        const person = domain.getPerson(id);
        const status = domain.statusAt(person, state.scene);
        return person && status ? { person, status } : null;
      }).filter(Boolean).slice(0, limit);
    }

    function renderScenePeople(event) {
      const people = eventPeopleAtCurrentScene(event, 6);
      $('#scenePeople').innerHTML = people.map(({ person, status }) => `<button type="button" class="scene-person" data-scene-person="${person.id}"><span class="scene-person-avatar" style="background:${shared.factionColor(status.faction)}">${shared.factionShort(status.faction)}</span><span><strong>${status.display}</strong><small>${status.role}</small></span></button>`).join('');
      $$('[data-scene-person]').forEach(button => button.addEventListener('click', () => actions.selectPerson(button.dataset.scenePerson, 'people')));
    }

    function renderSceneFactions(event) {
      const states = data.factionStates[shared.scene().id] || {};
      $('#sceneFactions').innerHTML = event.factions.filter(name => states[name]).map(name => `<button type="button" class="scene-faction" data-scene-faction="${name}"><i style="background:${shared.factionColor(name)}"></i><span><strong>${name}</strong><small>${states[name].position}</small></span></button>`).join('');
      $$('[data-scene-faction]').forEach(button => button.addEventListener('click', () => actions.selectFaction(button.dataset.sceneFaction)));
    }

    function renderSceneAtGlance(event, scene) {
      const activePeople = eventPeopleAtCurrentScene(event);
      const people = activePeople.slice(0, 3);
      const factionStates = data.factionStates[scene.id] || {};
      const activeFactions = event.factions.filter(name => factionStates[name]);
      const factions = activeFactions.slice(0, 3);
      const peopleMore = activePeople.length > 1 ? `<span class="scene-quick-more">ほか${activePeople.length - 1}人</span>` : '';
      const factionsMore = activeFactions.length > 1 ? `<span class="scene-quick-more">ほか${activeFactions.length - 1}勢力</span>` : '';
      $('#sceneQuickPeople').innerHTML = `${people.map(({ person, status }) => `<button type="button" class="scene-quick-link" data-scene-quick-person="${person.id}"><i style="background:${shared.factionColor(status.faction)}"></i><span>${status.display}</span></button>`).join('')}${peopleMore}`;
      $('#sceneQuickFactions').innerHTML = `${factions.map(name => `<button type="button" class="scene-quick-link" data-scene-quick-faction="${name}"><i style="background:${shared.factionColor(name)}"></i><span>${name}</span></button>`).join('')}${factionsMore}`;
      $('#sceneQuickInsight').textContent = scene.insights[0] || 'この時点の変化を詳細欄で確認できます。';
      $$('[data-scene-quick-person]').forEach(button => button.addEventListener('click', () => actions.selectPerson(button.dataset.sceneQuickPerson, 'people')));
      $$('[data-scene-quick-faction]').forEach(button => button.addEventListener('click', () => actions.selectFaction(button.dataset.sceneQuickFaction)));
    }

    function personChangeCopy(change) {
      if (change.after && !change.before) {
        return { title: change.after.display, detail: `この時点から登場・${change.after.role}` };
      }
      if (change.before && !change.after) {
        return { title: change.before.display, detail: 'この時点まで' };
      }
      if (change.fields.includes('faction')) {
        return { title: change.after.display, detail: `${change.before.faction} → ${change.after.faction}` };
      }
      if (change.fields.includes('display')) {
        return { title: `${change.before.display} → ${change.after.display}`, detail: change.after.role };
      }
      return { title: change.after.display, detail: change.after.role };
    }

    function personNameAt(id, sceneIndex) {
      const person = domain.getPerson(id);
      return domain.statusAt(person, sceneIndex)?.display || person?.name || id;
    }

    function relationChangeCopy(item, sceneIndex) {
      if (item.kind === 'faction') {
        return { title: `${item.relation.a} × ${item.relation.b}`, detail: item.relation.label };
      }
      return {
        title: `${personNameAt(item.relation.a, sceneIndex)} × ${personNameAt(item.relation.b, sceneIndex)}`,
        detail: item.relation.label
      };
    }

    function changeGroup(label, count, items, tone, emptyText) {
      const content = items.length
        ? items.slice(0, 3).map(item => `<div class="scene-change-item ${tone}"><strong>${item.title}</strong><small>${item.detail}</small></div>`).join('')
        : `<p class="scene-change-empty">${emptyText}</p>`;
      return `<section class="scene-change-group" data-scene-change-group="${tone}"><div class="scene-change-group-heading"><h4>${label}</h4><span>${count}</span></div>${content}</section>`;
    }

    function renderSceneChanges(event) {
      const scene = shared.scene();
      const changes = domain.sceneChangesAt(state.scene);
      if (changes.isOrigin) {
        $('#sceneChangesHeading').textContent = 'ここからたどる';
        $('#sceneChangesPeriod').textContent = `${scene.year} → ${data.scenes.at(-1).year}`;
        $('#sceneChangeGroups').setAttribute('aria-label', '時系列の起点と次の場面');
        const nextScene = data.scenes[state.scene + 1];
        $('#sceneChangeGroups').innerHTML = `<div class="scene-change-origin"><span>起点</span><strong>「${scene.title}」から全${data.scenes.length}場面をたどります</strong><small>次の場面：${nextScene.year}年「${nextScene.title}」</small></div>`;
        return;
      }

      const previousScene = data.scenes[changes.previousIndex];
      $('#sceneChangesHeading').textContent = '前の時点から';
      $('#sceneChangesPeriod').textContent = `${previousScene.year}「${previousScene.title}」 → ${scene.year}`;
      $('#sceneChangeGroups').setAttribute('aria-label', '前の時点からの人物と関係の変化');
      const eventPeople = new Set(event.people);
      const eventFactions = new Set(event.factions);
      const peopleById = new Map([
        ...changes.peopleEntered.map(change => [change.person.id, { ...change, before: null }]),
        ...changes.peopleExited.map(change => [change.person.id, { ...change, after: null }]),
        ...changes.peopleUpdated.map(change => [change.person.id, change])
      ]);
      const people = event.people.map(id => peopleById.get(id)).filter(Boolean).map(personChangeCopy);
      const started = [
        ...changes.relationsStarted.filter(relation => eventPeople.has(relation.a) || eventPeople.has(relation.b)).map(relation => ({ kind: 'person', relation })),
        ...changes.factionRelationsStarted.filter(relation => eventFactions.has(relation.a) || eventFactions.has(relation.b)).map(relation => ({ kind: 'faction', relation }))
      ].map(item => relationChangeCopy(item, state.scene));
      const ended = [
        ...changes.relationsEnded.filter(relation => eventPeople.has(relation.a) || eventPeople.has(relation.b)).map(relation => ({ kind: 'person', relation })),
        ...changes.factionRelationsEnded.filter(relation => eventFactions.has(relation.a) || eventFactions.has(relation.b)).map(relation => ({ kind: 'faction', relation }))
      ].map(item => relationChangeCopy(item, changes.previousIndex));
      $('#sceneChangeGroups').innerHTML = [
        changeGroup('人物の立場', people.length, people, 'updated', '主要人物の表示上の変化なし'),
        changeGroup('始まった関係', started.length, started, 'started', '新しく始まった主要関係なし'),
        changeGroup('終わった関係', ended.length, ended, 'ended', 'この間に終わった主要関係なし')
      ].join('');
    }

    function renderScene() {
      const scene = shared.scene();
      if (!sceneControlsInitialized) {
        $('#sceneSelect').innerHTML = data.scenes.map((item, index) => `<option value="${index}">${item.year} ${item.title}</option>`).join('');
        $('#sceneRange').max = data.scenes.length - 1;
        sceneControlsInitialized = true;
      }
      $('#sceneSelect').value = state.scene;
      $('#sceneRange').value = state.scene;
      $('#calendarMode').value = state.calendar;
      $('#sceneYear').textContent = state.calendar === 'japanese' ? scene.era : scene.year;
      $('#sceneEra').textContent = state.calendar === 'both' ? scene.era : '';
      $('#sceneTitle').textContent = scene.title;
      $('#sceneSummary').textContent = scene.summary;
      $('#sceneProgress').style.width = `${(state.scene + 1) / data.scenes.length * 100}%`;
      const event = data.events[scene.event];
      $('#sceneCounts').innerHTML = `<span class="count">人物 ${domain.activePeople(state.scene).length}</span><span class="count">勢力 ${domain.activeFactionNames(state.scene).length}</span><span class="count">関係 ${domain.activeRelations(state.scene).length}</span><span class="count">${event.category}</span>${shared.reviewBadge(scene.evidence)}`;
      $('#sceneInsights').innerHTML = scene.insights.map(insight => `<div class="insight">${insight}</div>`).join('');
      renderSceneAtGlance(event, scene);
      renderSceneChanges(event);
      renderScenePeople(event);
      renderSceneFactions(event);
      $('#prevScene').disabled = state.scene === 0;
      $('#nextScene').disabled = state.scene === data.scenes.length - 1;
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
      if (sourcesRendered) return;
      $('#dataStats').innerHTML = `<div class="stat"><b>${data.people.length}</b><span>人物</span></div><div class="stat"><b>${Object.keys(data.factions).length}</b><span>勢力</span></div><div class="stat"><b>${data.scenes.length}</b><span>時点・事件</span></div><div class="stat"><b>${data.relations.length}</b><span>人物関係</span></div>`;
      $('#sourceCatalog').innerHTML = Object.values(data.sources).map(shared.sourceCard).join('');
      sourcesRendered = true;
    }

    return { renderScene, renderSources, renderTabs };
  }

  return { createSceneRenderer };
}));

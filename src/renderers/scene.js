(function exposeSceneRenderer(root, factory) {
  root.BM_RENDER_SCENE = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  function createSceneRenderer(context) {
    const { $, $$, actions, data, domain, shared, state } = context;
    const esc = shared.escapeHtml;
    let sceneControlsInitialized = false;
    let sourcesRendered = false;

    function eventPeopleAtCurrentScene(event, limit = Infinity) {
      return event.people.map(id => {
        const person = domain.getPerson(id);
        const status = domain.statusAt(person, state.scene);
        return person && status ? { person, status } : null;
      }).filter(Boolean).slice(0, limit);
    }

    function representativePeople(people, limit) {
      const representatives = [];
      const representedFactions = new Set();
      people.forEach(item => {
        if (representatives.length >= limit || representedFactions.has(item.status.faction)) return;
        representatives.push(item);
        representedFactions.add(item.status.faction);
      });
      people.forEach(item => {
        if (representatives.length >= limit || representatives.includes(item)) return;
        representatives.push(item);
      });
      return representatives;
    }

    function renderScenePeople(event) {
      const people = eventPeopleAtCurrentScene(event, 6);
      $('#scenePeople').innerHTML = people.map(({ person, status }) => `<button type="button" class="scene-person" data-scene-person="${esc(person.id)}"><span class="scene-person-avatar" style="background:${esc(shared.factionColor(status.faction))}">${esc(shared.factionShort(status.faction))}</span><span><strong>${esc(status.display)}</strong><small>${esc(status.role)}</small></span></button>`).join('');
      $$('[data-scene-person]').forEach(button => button.addEventListener('click', () => actions.selectPerson(button.dataset.scenePerson, 'people')));
    }

    function renderSceneFactions(event) {
      const states = data.factionStates[shared.scene().id] || {};
      $('#sceneFactions').innerHTML = event.factions.filter(name => states[name]).map(name => `<button type="button" class="scene-faction" data-scene-faction="${esc(name)}"><i style="background:${esc(shared.factionColor(name))}"></i><span><strong>${esc(name)}</strong><small>${esc(states[name].position)}</small></span></button>`).join('');
      $$('[data-scene-faction]').forEach(button => button.addEventListener('click', () => actions.selectFaction(button.dataset.sceneFaction)));
    }

    function renderSceneAtGlance(event, scene) {
      const activePeople = eventPeopleAtCurrentScene(event);
      const people = representativePeople(activePeople, 3);
      const factionStates = data.factionStates[scene.id] || {};
      const activeFactions = event.factions.filter(name => factionStates[name]);
      const factions = activeFactions.slice(0, 3);
      // The chips show at most three representatives, so the label under each
      // heading states the whole cast rather than how many chips were omitted.
      $('#sceneQuickPeopleTotal').textContent = activePeople.length > 1 ? `全${activePeople.length}人` : '';
      $('#sceneQuickFactionsTotal').textContent = activeFactions.length > 1 ? `全${activeFactions.length}勢力` : '';
      $('#sceneQuickPeople').innerHTML = people.map(({ person, status }) => `<button type="button" class="scene-quick-link" data-scene-quick-person="${esc(person.id)}"><i style="background:${esc(shared.factionColor(status.faction))}"></i><span>${esc(status.display)}</span></button>`).join('');
      $('#sceneQuickFactions').innerHTML = factions.map(name => `<button type="button" class="scene-quick-link" data-scene-quick-faction="${esc(name)}"><i style="background:${esc(shared.factionColor(name))}"></i><span>${esc(name)}</span></button>`).join('');
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
        ? items.slice(0, 3).map(item => `<div class="scene-change-item ${tone}"><strong>${esc(item.title)}</strong><small>${esc(item.detail)}</small></div>`).join('')
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
        $('#sceneChangeGroups').innerHTML = `<div class="scene-change-origin"><span>起点</span><strong>「${esc(scene.title)}」から全${data.scenes.length}場面をたどります</strong><small>次の場面：${esc(nextScene.year)}年「${esc(nextScene.title)}」</small></div>`;
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
      const turningPeople = data.people.filter(person => domain.turningPointAt(person, state.scene));
      if (turningPeople.length) {
        $('#sceneChangeGroups').insertAdjacentHTML('beforeend', `<div class="scene-turning-links"><span>人物の転換点を比べる</span>${turningPeople.map(person => `<button type="button" class="turning-link" data-turning-person="${esc(person.id)}">${esc(domain.statusAt(person, state.scene).display)} →</button>`).join('')}</div>`);
        $$('[data-turning-person]').forEach(button => button.addEventListener('click', () => {
          actions.selectPerson(button.dataset.turningPerson, 'people');
          requestAnimationFrame(() => {
            const target = $('#personTurningPoint');
            target.scrollIntoView({ block: 'start', behavior: 'auto' });
            target.focus({ preventScroll: true });
          });
        }));
      }
    }

    function renderScene() {
      const scene = shared.scene();
      if (!sceneControlsInitialized) {
        $('#sceneSelect').innerHTML = data.scenes.map((item, index) => `<option value="${index}">${esc(item.year)} ${esc(item.title)}</option>`).join('');
        $('#sceneRange').max = data.scenes.length - 1;
        sceneControlsInitialized = true;
      }
      $('#sceneSelect').value = state.scene;
      $('#sceneRange').value = state.scene;
      $('#sceneRange').setAttribute('aria-valuetext', `${scene.year}年 ${scene.title}`);
      $('#sceneYear').textContent = scene.year;
      $('#sceneEra').textContent = scene.era;
      $('#sceneTitle').textContent = scene.title;
      $('#sceneSummary').textContent = scene.summary;
      $('#sceneProgress').style.width = `${(state.scene + 1) / data.scenes.length * 100}%`;
      const event = data.events[scene.event];
      $('#sceneCounts').innerHTML = `<span class="count">人物 ${domain.activePeople(state.scene).length}</span><span class="count">勢力・分野 ${domain.activeFactionNames(state.scene).length}</span><span class="count">関係 ${domain.activeRelations(state.scene).length}</span><span class="count">${esc(event.category)}</span>${shared.reviewBadge(scene.evidence)}`;
      $('#sceneInsights').innerHTML = scene.insights.map(insight => `<div class="insight">${esc(insight)}</div>`).join('');
      renderSceneAtGlance(event, scene);
      const incidents = domain.incidentsAt(state.scene);
      $('#sceneIncidents').hidden = !incidents.length;
      $('#sceneIncidents').innerHTML = '<span>この時期の事件</span>' + incidents.map(item => `<button type="button" class="button" data-scene-incident="${esc(item.id)}">${esc(item.title)} <span aria-hidden="true">→</span></button>`).join('');
      $$('[data-scene-incident]').forEach(button => button.addEventListener('click', () => actions.openEvent(button.dataset.sceneIncident)));
      renderSceneChanges(event);
      renderScenePeople(event);
      renderSceneFactions(event);
      // The detail panels are not live regions, so the scene change is the one
      // redraw worth announcing, and only when it actually differs.
      const sceneStatus = $('#sceneStatus');
      const sceneSummary = `${scene.year}年（${scene.era}）「${scene.title}」`;
      if (sceneStatus.textContent !== sceneSummary) sceneStatus.textContent = sceneSummary;
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
      $('#dataStats').innerHTML = `<div class="stat"><b>${data.people.length}</b><span>人物</span></div><div class="stat"><b>${Object.keys(data.factions).length}</b><span>勢力・分野</span></div><div class="stat"><b>${data.scenes.length}</b><span>時点・事件</span></div><div class="stat"><b>${data.relations.length}</b><span>人物関係</span></div>`;
      $('#sourceCatalog').innerHTML = Object.values(data.sources).map(shared.sourceCard).join('');
      sourcesRendered = true;
    }

    return { renderScene, renderSources, renderTabs };
  }

  return { createSceneRenderer };
}));

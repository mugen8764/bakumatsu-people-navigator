(function exposePeopleRenderer(root, factory) {
  root.BM_RENDER_PEOPLE = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  function createPeopleRenderer(context) {
    const { $, $$, actions, data, domain, shared, state } = context;

    function renderFilters() {
      const names = ['すべて', ...domain.personFactionNames(state.scene)];
      if (!names.includes(state.personFactionFilter)) state.personFactionFilter = 'すべて';
      $('#personFilters').innerHTML = names.map(name => `<button type="button" class="chip ${state.personFactionFilter === name ? 'active' : ''}" data-person-filter="${name}" aria-pressed="${state.personFactionFilter === name}">${name}</button>`).join('');
      $$('[data-person-filter]').forEach(button => button.addEventListener('click', () => {
        state.personFactionFilter = button.dataset.personFilter;
        render();
      }));
    }

    function render() {
      renderFilters();
      let people = domain.activePeople(state.scene);
      if (state.personFactionFilter !== 'すべて') {
        people = people.filter(person => domain.factionAt(person, state.scene) === state.personFactionFilter);
      }
      people.sort((a, b) => domain.factionAt(a, state.scene).localeCompare(domain.factionAt(b, state.scene), 'ja')
        || domain.statusAt(a, state.scene).display.localeCompare(domain.statusAt(b, state.scene).display, 'ja'));
      $('#personCards').innerHTML = people.map(person => {
        const status = domain.statusAt(person, state.scene);
        const faction = status.faction;
        const laterName = domain.laterNameAt(person, state.scene);
        const nameNote = laterName ? `後の名：${laterName}` : (status.display === person.name ? (person.aliases[0] || '') : '');
        return `<button type="button" class="card-button ${person.id === state.selectedPerson ? 'selected' : ''}" data-person-card="${person.id}" aria-pressed="${person.id === state.selectedPerson}"><div class="avatar" style="background:${shared.factionColor(faction)}">${shared.factionShort(faction)}</div><div class="name">${status.display}</div>${nameNote ? `<div class="later-name">${nameNote}</div>` : ''}<div class="role">${status.role}</div><div class="card-foot"><span>${faction}</span><span>詳細 →</span></div></button>`;
      }).join('') || '<div class="notice">この条件で表示できる人物はいません。</div>';
      $$('[data-person-card]').forEach(button => button.addEventListener('click', () => actions.selectPerson(button.dataset.personCard)));
      renderDetail();
    }

    function renderDetail() {
      const person = domain.getPerson(state.selectedPerson);
      const status = domain.statusAt(person, state.scene);
      const box = $('#personDetail');
      if (!person || !status) {
        box.innerHTML = '<div class="detail-empty">人物を選択してください。</div>';
        return;
      }
      const relations = domain.relationsFor(person.id, state.scene, state.relationType);
      const event = data.events[shared.scene().event];
      const eventPeers = domain.eventPeersFor(person.id, state.scene);
      const laterName = domain.laterNameAt(person, state.scene);
      const history = Object.entries(person.statuses)
        .map(([sceneId, value]) => ({ scene: domain.sceneById.get(sceneId), value }))
        .filter(item => item.scene)
        .sort((a, b) => a.scene.index - b.scene.index);
      box.innerHTML = `<div class="detail-head"><div class="avatar" style="background:${shared.factionColor(status.faction)}">${shared.factionShort(status.faction)}</div><div><div class="detail-title">${status.display}</div>${laterName ? `<div class="aliases">後の名前：${laterName}</div>` : ''}<div class="badges"><span class="badge">${status.faction}</span><span class="badge">${status.role}</span><span class="badge">${person.born}</span></div></div></div>
      <div class="snapshot"><strong>${shared.dateLabel(shared.scene())}の位置づけ ${shared.reviewBadge(status.evidence)}</strong>${status.importance}</div>
      <div class="section"><h3>この時点の行動・立場</h3><p>${status.stance}</p></div>
      <div class="section"><h3>一言で</h3><p>${person.oneLine}</p></div>
      <div class="section"><h3>名前・通称</h3><div class="tags">${[person.name, ...person.aliases].map(alias => `<span class="tag">${alias}</span>`).join('')}</div></div>
      <div class="section"><h3>この時点の主要関係</h3><div class="relations">${relations.length ? relations.map(relation => {
        const other = domain.getPerson(relation.a === person.id ? relation.b : relation.a);
        return `<div class="rel"><button type="button" data-other-person="${other.id}">${domain.statusAt(other, state.scene).display}</button> — ${relation.label} ${shared.reviewBadge(relation.evidence)}<br><span class="muted">${relation.text}</span></div>`;
      }).join('') : '<span class="muted">登録済みの主要関係はありません。</span>'}</div></div>
      ${eventPeers.length ? `<div class="section event-peers"><h3>同じ事件の関係者</h3><p class="muted">「${event.title}」の関係人物のうち、上の主要関係には含まれない人物です。直接の人物関係を示すものではありません。</p><div class="tags">${eventPeers.map(other => `<button type="button" class="tag" data-event-peer="${other.id}">${domain.statusAt(other, state.scene).display}</button>`).join('')}</div></div>` : ''}
      <div class="section"><h3>関連事件</h3><div class="tags">${person.events.map(id => data.events[id] ? `<button type="button" class="tag" data-open-event="${id}">${data.events[id].title}</button>` : '').join('')}</div></div>
      <div class="section"><h3>人物の変化</h3><div class="history-list">${history.map(item => `<div class="history-item ${item.scene.index === state.scene ? 'current' : ''}"><button type="button" data-history-scene="${item.scene.index}"><b>${item.scene.year}年 ${item.value.display} ${shared.reviewBadge(item.value.evidence)}</b>${item.value.role}</button></div>`).join('')}</div></div>
      <div class="actions"><button type="button" class="button" id="personToGraph">相関図</button><button type="button" class="button" id="personToMap">地図</button></div>
      <div class="section"><h3>参考資料</h3><div class="source-list">${shared.sourceLinks(person.sources)}</div></div>`;
      $$('[data-other-person]', box).forEach(button => button.addEventListener('click', () => actions.selectPerson(button.dataset.otherPerson)));
      $$('[data-event-peer]', box).forEach(button => button.addEventListener('click', () => actions.selectPerson(button.dataset.eventPeer)));
      $$('[data-open-event]', box).forEach(button => button.addEventListener('click', () => actions.openEvent(button.dataset.openEvent)));
      $$('[data-history-scene]', box).forEach(button => button.addEventListener('click', () => actions.setScene(button.dataset.historyScene)));
      $('#personToGraph').addEventListener('click', () => actions.setView('relations'));
      $('#personToMap').addEventListener('click', () => actions.setView('map'));
    }

    return { render, renderDetail };
  }

  return { createPeopleRenderer };
}));

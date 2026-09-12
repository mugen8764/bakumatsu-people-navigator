(function exposePeopleRenderer(root, factory) {
  root.BM_RENDER_PEOPLE = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  function createPeopleRenderer(context) {
    const { $, $$, actions, data, domain, shared, state } = context;
    const esc = shared.escapeHtml;

    function renderFilters() {
      const names = ['すべて', ...domain.personFactionNames(state.scene)];
      if (!names.includes(state.personFactionFilter)) state.personFactionFilter = 'すべて';
      $('#personFilters').innerHTML = names.map(name => `<button type="button" class="chip ${state.personFactionFilter === name ? 'active' : ''}" data-person-filter="${esc(name)}" aria-pressed="${state.personFactionFilter === name}">${esc(name)}</button>`).join('');
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
        return `<button type="button" class="card-button ${person.id === state.selectedPerson ? 'selected' : ''}" data-person-card="${esc(person.id)}" aria-pressed="${person.id === state.selectedPerson}">${shared.avatar(person, faction, status.display)}<div class="name">${esc(status.display)}</div>${nameNote ? `<div class="later-name">${esc(nameNote)}</div>` : ''}<div class="role">${esc(status.role)}</div><div class="card-foot"><span>${esc(faction)}</span><span>詳細 →</span></div></button>`;
      }).join('') || '<div class="notice">この条件で表示できる人物はいません。</div>';
      $$('[data-person-card]').forEach(button => button.addEventListener('click', () => {
        actions.selectPerson(button.dataset.personCard);
        actions.revealPersonDetail();
      }));
      shared.bindPortraits($('#personCards'));
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
      const relations = domain.relationsFor(person.id, state.scene);
      const event = data.events[shared.scene().event];
      const incident = domain.incidentAt(state);
      const participant = incident?.participants.find(item => item.personId === person.id);
      const incidentLinks = Object.values(data.incidents || {}).filter(item => item.participants.some(member => member.personId === person.id));
      const incidentContext = participant ? `<section class="person-incident"><button type="button" class="button" data-open-event="${esc(incident.id)}">← ${esc(incident.title)}へ戻る</button><h3>${esc(incident.title)}での役割</h3><p><strong>${esc(participant.role)}</strong> ${shared.reviewBadge(participant.evidence)}</p><p>${esc(participant.summary)}</p><details class="source-disclosure"><summary>この役割の根拠</summary><div class="source-list">${shared.sourceLinks(participant.evidence.sourceIds)}</div></details></section><h3 class="section">${esc(shared.scene().year)}年の人物情報</h3>` : '';
      const eventPeers = domain.eventPeersFor(person.id, state.scene);
      const laterName = domain.laterNameAt(person, state.scene);
      const history = Object.entries(person.statuses)
        .map(([sceneId, value]) => ({ scene: domain.sceneById.get(sceneId), value }))
        .filter(item => item.scene)
        .sort((a, b) => a.scene.index - b.scene.index);
      const evidenceLinks = evidence => shared.sourceLinks(evidence?.sourceIds)
        || '<p class="muted">この項目の出典は確認中です。</p>';
      const relationSources = relations.map(relation => {
        const other = domain.getPerson(relation.a === person.id ? relation.b : relation.a);
        return `<section class="section" data-relation-sources="${esc(other.id)}"><h4>${esc(domain.statusAt(other, state.scene).display)} — ${esc(relation.label)} ${shared.reviewBadge(relation.evidence)}</h4><div class="source-list">${evidenceLinks(relation.evidence)}</div></section>`;
      }).join('');
      box.innerHTML = `<button type="button" class="button detail-back" id="personBackToList">← 人物一覧へ</button><div class="detail-head">${shared.avatar(person, status.faction, status.display)}<div><div class="detail-title">${esc(status.display)}</div>${laterName ? `<div class="aliases">後の名前：${esc(laterName)}</div>` : ''}<div class="badges"><span class="badge">${esc(status.faction)}</span><span class="badge">${esc(status.role)}</span><span class="badge">${esc(person.born)}</span></div></div></div>
      ${incidentContext}${person.portrait ? `<p class="portrait-note">${esc(person.portrait.dateNote)}</p>${shared.portraitCredit(person)}` : ''}
      <div class="snapshot"><strong>${shared.dateLabel(shared.scene())}の位置づけ ${shared.reviewBadge(status.evidence)}</strong>${esc(status.importance)}</div>
      <div class="section"><h3>この時点の行動・立場</h3><p>${esc(status.stance)}</p></div>
      <div class="section"><h3>一言で</h3><p>${esc(person.oneLine)}</p></div>
      <div class="section"><h3>名前・通称</h3><div class="tags">${[person.name, ...person.aliases].map(alias => `<span class="tag">${esc(alias)}</span>`).join('')}</div></div>
      <div class="section"><h3>この時点の主要関係</h3><div class="relations">${relations.length ? relations.map(relation => {
        const other = domain.getPerson(relation.a === person.id ? relation.b : relation.a);
        return `<div class="rel"><button type="button" data-other-person="${esc(other.id)}">${esc(domain.statusAt(other, state.scene).display)}</button> — ${esc(relation.label)} ${shared.reviewBadge(relation.evidence)}<br><span class="muted">${esc(relation.text)}</span></div>`;
      }).join('') : '<span class="muted">登録済みの主要関係はありません。</span>'}</div></div>
      ${eventPeers.length ? `<div class="section event-peers"><h3>同じ事件の関係者</h3><p class="muted">「${esc(event.title)}」の関係人物のうち、上の主要関係には含まれない人物です。直接の人物関係を示すものではありません。</p><div class="tags">${eventPeers.map(other => `<button type="button" class="tag" data-event-peer="${esc(other.id)}">${esc(domain.statusAt(other, state.scene).display)}</button>`).join('')}</div></div>` : ''}
      <div class="section"><h3>関連事件</h3><div class="tags">${incidentLinks.map(item => `<button type="button" class="tag" data-open-event="${esc(item.id)}">${esc(item.title)}</button>`).join('')}${person.events.map(id => data.events[id] ? `<button type="button" class="tag" data-open-event="${esc(id)}">${esc(data.events[id].title)}</button>` : '').join('')}</div></div>
      <div class="section"><h3>人物の変化</h3><div class="history-list">${history.map(item => `<div class="history-item ${item.scene.index === state.scene ? 'current' : ''}"><button type="button" data-history-scene="${item.scene.index}"><b>${esc(item.scene.year)}年 ${esc(item.value.display)} ${shared.reviewBadge(item.value.evidence)}</b>${esc(item.value.role)}</button></div>`).join('')}</div></div>
      <div class="actions"><button type="button" class="button" id="personToGraph">相関図</button><button type="button" class="button" id="personToMap">地図</button></div>
      <details class="source-disclosure section"><summary>参考資料を見る</summary>
        <section class="section" data-person-sources="basic"><h3>人物の基本情報</h3><div class="source-list">${shared.sourceLinks(person.sources)}</div></section>
        <section class="section" data-person-sources="status"><h3>この時点の行動・立場 ${shared.reviewBadge(status.evidence)}</h3><p class="muted">${shared.dateLabel(shared.scene())}の位置づけと行動・立場の根拠です。</p><div class="source-list">${evidenceLinks(status.evidence)}</div></section>
        ${relations.length ? `<section class="section" data-person-sources="relations"><h3>この関係の根拠</h3>${relationSources}</section>` : ''}
      </details>`;
      shared.bindPortraits(box);
      $$('[data-other-person]', box).forEach(button => button.addEventListener('click', () => actions.selectPerson(button.dataset.otherPerson)));
      $$('[data-event-peer]', box).forEach(button => button.addEventListener('click', () => actions.selectPerson(button.dataset.eventPeer)));
      $$('[data-open-event]', box).forEach(button => button.addEventListener('click', () => actions.openEvent(button.dataset.openEvent)));
      $$('[data-history-scene]', box).forEach(button => button.addEventListener('click', () => actions.setScene(button.dataset.historyScene)));
      $('#personBackToList').addEventListener('click', () => {
        const destination = $(`[data-person-card="${person.id}"]`) || $('#clearPersonFilter');
        destination.scrollIntoView({ block: 'start', behavior: 'auto' });
        destination.focus({ preventScroll: true });
      });
      $('#personToGraph').addEventListener('click', () => actions.setView('relations'));
      $('#personToMap').addEventListener('click', () => actions.setView('map'));
    }

    return { render, renderDetail };
  }

  return { createPeopleRenderer };
}));

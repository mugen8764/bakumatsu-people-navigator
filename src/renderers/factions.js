(function exposeFactionsRenderer(root, factory) {
  root.BM_RENDER_FACTIONS = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  function createFactionsRenderer(context) {
    const { $, $$, actions, data, domain, shared, state } = context;
    const esc = shared.escapeHtml;

    function render() {
      const states = data.factionStates[shared.scene().id] || {};
      const names = Object.keys(states);
      $('#factionCards').innerHTML = names.map(name => {
        const metadata = data.factions[name];
        const memberCount = domain.activePeople(state.scene).filter(person => domain.factionAt(person, state.scene) === name).length;
        return `<button type="button" class="faction-card ${name === state.selectedFaction ? 'selected' : ''}" data-faction-card="${esc(name)}" aria-pressed="${name === state.selectedFaction}"><div class="faction-header"><div class="faction-dot" style="background:${esc(metadata.color)}">${esc(metadata.short)}</div><div><div class="name">${esc(name)}</div><div class="faction-count">${metadata.kind === 'field' ? '活動分野 · ' : ''}表示人物 ${memberCount}名</div></div></div><p>${esc(states[name].position)}</p><div class="faction-count">${metadata.kind === 'field' ? '活動' : '目的'}：${esc(states[name].goal)}</div>${shared.reviewBadge(states[name].evidence)}</button>`;
      }).join('');
      $$('[data-faction-card]').forEach(button => button.addEventListener('click', () => actions.selectFaction(button.dataset.factionCard)));
      renderDetail();
    }

    function renderDetail() {
      const name = state.selectedFaction;
      const factionState = data.factionStates[shared.scene().id]?.[name];
      const box = $('#factionDetail');
      if (!factionState) {
        box.innerHTML = '<div class="detail-empty">勢力・分野を選択してください。</div>';
        return;
      }
      const metadata = data.factions[name];
      const members = domain.activePeople(state.scene).filter(person => domain.factionAt(person, state.scene) === name);
      const relations = domain.activeFactionRelations(state.scene).filter(relation => relation.a === name || relation.b === name);
      box.innerHTML = `<div class="detail-head"><div class="avatar" style="background:${esc(metadata.color)}">${esc(metadata.short)}</div><div><div class="detail-title">${esc(name)}</div><div class="aliases">${esc(metadata.aliases.join('／'))}</div></div></div>
      <div class="snapshot"><strong>${shared.dateLabel(shared.scene())}の位置 ${shared.reviewBadge(factionState.evidence)}</strong>${esc(factionState.position)}</div>
      <div class="section"><h3>${metadata.kind === 'field' ? 'この時点の活動' : 'この時点の目的'}</h3><p>${esc(factionState.goal)}</p></div>
      <div class="section"><h3>${metadata.kind === 'field' ? '活動分野について' : '勢力の基本像'}</h3><p>${esc(metadata.summary)}</p></div>
      <div class="section"><h3>表示中の人物</h3><div class="tags">${members.map(person => `<button type="button" class="tag" data-faction-member="${esc(person.id)}">${esc(domain.statusAt(person, state.scene).display)}</button>`).join('') || '<span class="muted">人物データなし</span>'}</div></div>
      <div class="section"><h3>${metadata.kind === 'field' ? '登録された関係' : '他勢力との関係'}</h3><div class="relations">${relations.length ? relations.map(relation => {
        const other = relation.a === name ? relation.b : relation.a;
        return `<div class="rel"><button type="button" data-other-faction="${esc(other)}">${esc(other)}</button> — ${esc(relation.label)} ${shared.reviewBadge(relation.evidence)}<br><span class="muted">${esc(relation.text)}</span></div>`;
      }).join('') : '<span class="muted">登録済みの主要関係はありません。</span>'}</div></div>`;
      $$('[data-faction-member]', box).forEach(button => button.addEventListener('click', () => actions.selectPerson(button.dataset.factionMember, 'people')));
      $$('[data-other-faction]', box).forEach(button => button.addEventListener('click', () => actions.selectFaction(button.dataset.otherFaction)));
    }

    return { render, renderDetail };
  }

  return { createFactionsRenderer };
}));

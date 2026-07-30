(function exposeFactionsRenderer(root, factory) {
  root.BM_RENDER_FACTIONS = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  function createFactionsRenderer(context) {
    const { $, $$, actions, data, domain, shared, state } = context;

    function render() {
      const states = data.factionStates[shared.scene().id] || {};
      const names = Object.keys(states);
      $('#factionCards').innerHTML = names.map(name => {
        const metadata = data.factions[name];
        const memberCount = domain.activePeople(state.scene).filter(person => domain.factionAt(person, state.scene) === name).length;
        return `<button type="button" class="faction-card ${name === state.selectedFaction ? 'selected' : ''}" data-faction-card="${name}"><div class="faction-header"><div class="faction-dot" style="background:${metadata.color}">${metadata.short}</div><div><div class="name">${name}</div><div class="faction-count">表示人物 ${memberCount}名</div></div></div><p>${states[name].position}</p><div class="faction-count">目的：${states[name].goal}</div></button>`;
      }).join('');
      $$('[data-faction-card]').forEach(button => button.addEventListener('click', () => actions.selectFaction(button.dataset.factionCard)));
      renderDetail();
    }

    function renderDetail() {
      const name = state.selectedFaction;
      const factionState = data.factionStates[shared.scene().id]?.[name];
      const box = $('#factionDetail');
      if (!factionState) {
        box.innerHTML = '<div class="detail-empty">勢力を選択してください。</div>';
        return;
      }
      const metadata = data.factions[name];
      const members = domain.activePeople(state.scene).filter(person => domain.factionAt(person, state.scene) === name);
      const relations = domain.activeFactionRelations(state.scene).filter(relation => relation.a === name || relation.b === name);
      box.innerHTML = `<div class="detail-head"><div class="avatar" style="background:${metadata.color}">${metadata.short}</div><div><div class="detail-title">${name}</div><div class="aliases">${metadata.aliases.join('／')}</div></div></div>
      <div class="snapshot"><strong>${shared.dateLabel(shared.scene())}の位置</strong>${factionState.position}</div>
      <div class="section"><h3>この時点の目的</h3><p>${factionState.goal}</p></div>
      <div class="section"><h3>勢力の基本像</h3><p>${metadata.summary}</p></div>
      <div class="section"><h3>表示中の人物</h3><div class="tags">${members.map(person => `<button type="button" class="tag" data-faction-member="${person.id}">${domain.statusAt(person, state.scene).display}</button>`).join('') || '<span class="muted">人物データなし</span>'}</div></div>
      <div class="section"><h3>他勢力との関係</h3><div class="relations">${relations.length ? relations.map(relation => {
        const other = relation.a === name ? relation.b : relation.a;
        return `<div class="rel"><button type="button" data-other-faction="${other}">${other}</button> — ${relation.label}<br><span class="muted">${relation.text}</span></div>`;
      }).join('') : '<span class="muted">登録済みの主要関係はありません。</span>'}</div></div>`;
      $$('[data-faction-member]', box).forEach(button => button.addEventListener('click', () => actions.selectPerson(button.dataset.factionMember, 'people')));
      $$('[data-other-faction]', box).forEach(button => button.addEventListener('click', () => actions.selectFaction(button.dataset.otherFaction)));
    }

    return { render, renderDetail };
  }

  return { createFactionsRenderer };
}));

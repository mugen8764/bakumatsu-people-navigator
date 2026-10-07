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
      $('#personFilters').innerHTML = names.map(name => `<button type="button" class="chip ${state.personFactionFilter === name ? 'active' : ''}" data-person-filter="${esc(name)}" aria-pressed="${state.personFactionFilter === name}">${data.factions[name]?.kind === 'field' ? '分野：' : ''}${esc(name)}</button>`).join('');
      $$('[data-person-filter]').forEach(button => button.addEventListener('click', () => {
        state.personFactionFilter = button.dataset.personFilter;
        shared.preserveFocus(render);
      }));
    }

    function render() {
      renderFilters();
      let people = domain.activePeople(state.scene);
      if (state.personFactionFilter !== 'すべて') {
        people = people.filter(person => domain.factionAt(person, state.scene) === state.personFactionFilter);
      }
      const cast = new Map((data.events[shared.scene().event]?.people || []).map((id, index) => [id, index]));
      const castRank = person => (cast.has(person.id) ? cast.get(person.id) : cast.size);
      people.sort((a, b) => castRank(a) - castRank(b)
        || domain.factionAt(a, state.scene).localeCompare(domain.factionAt(b, state.scene), 'ja')
        || domain.statusAt(a, state.scene).display.localeCompare(domain.statusAt(b, state.scene).display, 'ja'));
      $('#personCards').innerHTML = people.map(person => {
        const status = domain.statusAt(person, state.scene);
        const faction = status.faction;
        const laterName = domain.laterNameAt(person, state.scene);
        const nameNote = laterName ? `後の名：${laterName}` : (status.display === person.name ? (person.aliases[0] || '') : '');
        return `<button type="button" class="card-button ${person.id === state.selectedPerson ? 'selected' : ''}" data-person-card="${esc(person.id)}" aria-pressed="${person.id === state.selectedPerson}">${shared.avatar(person, faction, status.display)}${cast.has(person.id) ? '<span class="card-cast">主役</span>' : ''}<div class="name">${esc(status.display)}</div>${nameNote ? `<div class="later-name">${esc(nameNote)}</div>` : ''}<div class="role">${esc(status.role)}</div><div class="card-foot"><span>${data.factions[faction]?.kind === 'field' ? '分野：' : ''}${esc(faction)}</span><span>詳細 →</span></div></button>`;
      }).join('') || '<div class="notice">この条件で表示できる人物はいません。</div>';
      $$('[data-person-card]').forEach(button => button.addEventListener('click', () => {
        actions.selectPerson(button.dataset.personCard);
        actions.revealPersonDetail();
      }));
      shared.bindPortraits($('#personCards'));
      renderDetail();
    }

    function turningPoint(person) {
      if (!person.turningPoints?.length) return '';
      const point = domain.turningPointAt(person, state.scene);
      if (!point) return `<section class="section turning-point" id="personTurningPoint" tabindex="-1" aria-label="転換点を比べる"><h3>転換点を比べる</h3>${person.turningPoints.map(item => `<button type="button" class="turning-link" data-turning-scene="${domain.sceneById.get(item.toSceneId).index}"><span>${esc(domain.sceneById.get(item.toSceneId).year)}年</span><strong>${esc(item.title)} →</strong></button>`).join('')}</section>`;
      const side = (label, scene, status, copy, current) => `<section class="turning-side ${current ? 'current' : ''}"><h4>${label}<span>${esc(scene.year)}年</span></h4><dl><dt>名前</dt><dd>${esc(status.display)}</dd><dt>所属</dt><dd>${esc(status.faction)}</dd><dt>役職</dt><dd>${esc(status.role)} ${shared.reviewBadge(status.evidence)}</dd></dl><p class="turning-action">${esc(copy)}</p></section>`;
      return `<section class="section turning-point" id="personTurningPoint" tabindex="-1" aria-label="前の時点と比べる"><h3>前の時点と比べる</h3><p class="turning-title">${esc(point.title)} ${shared.reviewBadge(point.evidence)}</p><div class="turning-sides">${side('前の時点', point.fromScene, point.beforeStatus, point.before, false)}<span class="turning-arrow" aria-hidden="true">↓</span>${side('選択中の時点', point.toScene, point.afterStatus, point.after, true)}</div><p class="turning-context">${esc(point.context)}</p><button type="button" class="turning-link" data-turning-scene="${point.fromScene.index}">${esc(point.fromScene.year)}年の人物情報へ戻る</button><details class="source-disclosure"><summary>この比較の根拠</summary><h4>行動・関係の変化</h4><div class="source-list">${shared.sourceLinks(point.evidence.sourceIds)}</div><h4>名前・所属・役職</h4><div class="source-list">${shared.sourceLinks([...new Set([...(point.beforeStatus.evidence?.sourceIds || []), ...(point.afterStatus.evidence?.sourceIds || [])])])}</div></details></section>`;
    }

    function officeHelp(terms) {
      if (!terms.length) return '';
      return `<details class="office-help" id="personOfficeHelp"><summary>役職を知る：${terms.map(term => esc(term.title)).join('・')}</summary>${terms.map(term => `<section><h3>${esc(term.title)} <span class="term-reading">${esc(term.kana)}</span></h3><p>${esc(term.meaning)} ${shared.reviewBadge(term.evidence)}</p><p class="muted">${esc(term.context)}</p><details class="source-disclosure"><summary>解説の根拠</summary><div class="source-list">${shared.sourceLinks(term.evidence.sourceIds)}</div></details></section>`).join('')}</details>`;
    }

    function incidentHistory(person) {
      const entries = domain.incidentHistoryFor(person.id);
      if (!entries.length) return '';
      const labels = { onsite: '現場での関与', decision: '意思決定・指揮', context: '背景・前後関係' };
      const list = (items, start) => `<ol class="person-incident-list" start="${start}">${items.map(({ incident, participant }) => `<li data-person-incident="${esc(incident.id)}"><p class="muted">${esc(incident.date)} ${shared.reviewBadge(incident.evidence)}</p><button type="button" class="incident-history-link" data-open-event="${esc(incident.id)}">${esc(incident.title)} →</button><p><strong>${esc(participant.displayName)}</strong> <span class="badge">${labels[participant.involvement]}</span></p><p>${esc(participant.role)} ${shared.reviewBadge(participant.evidence)}</p></li>`).join('')}</ol>`;
      return `<section class="section person-incident-history" aria-labelledby="personIncidentHistoryTitle"><h3 id="personIncidentHistoryTitle">事件でたどる <span class="muted">${entries.length}件</span></h3><p class="muted">時点・記載日付順。期間が重なる場合があります。背景の関与は現場参加を示しません。</p>${list(entries.slice(0, 3), 1)}${entries.length > 3 ? `<details class="incident-history-more"><summary>残り${entries.length - 3}件の事件を見る</summary>${list(entries.slice(3), 4)}</details>` : ''}</section>`;
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
      const navigation = [{ id: 'personCurrentTitle', label: 'この時点' }];
      if (person.turningPoints?.length) navigation.push({ id: 'personTurningPointTitle', label: '転換点' });
      if (domain.incidentHistoryFor(person.id).length) navigation.push({ id: 'personIncidentHistoryTitle', label: '事件' });
      if (relations.length) navigation.push({ id: 'personRelationsTitle', label: '関係' });
      navigation.push({ id: 'personHistoryTitle', label: '時点履歴' }, { id: 'personSourcesTitle', label: '出典' });
      const offices = domain.officeTermsFor(status.role);
      const incident = domain.incidentAt(state);
      const participant = incident?.participants.find(item => item.personId === person.id);
      const incidentContext = participant ? `<section class="person-incident"><button type="button" class="button" data-open-event="${esc(incident.id)}">← ${esc(incident.title)}へ戻る</button><h3>${esc(incident.title)}での役割</h3><p><strong>${esc(participant.role)}</strong> ${shared.reviewBadge(participant.evidence)}</p><p>${esc(participant.summary)}</p><details class="source-disclosure"><summary>この役割の根拠</summary><div class="source-list">${shared.sourceLinks(participant.evidence.sourceIds)}</div></details></section><h3 class="section">${esc(shared.scene().year)}年の人物情報</h3>` : '';
      const eventPeerGroups = domain.eventPeerGroupsFor(person.id, state.scene);
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
      box.innerHTML = `<button type="button" class="button detail-back" id="personBackToList">← 人物一覧へ</button><div class="detail-head">${shared.avatar(person, status.faction, status.display)}<div><div class="detail-title">${esc(status.display)}</div>${laterName ? `<div class="aliases">後の名前：${esc(laterName)}</div>` : ''}<div class="badges"><span class="badge">${data.factions[status.faction]?.kind === 'field' ? '活動分野：' : ''}${esc(status.faction)}</span>${offices.length ? `<button type="button" class="badge office-trigger" aria-controls="personOfficeHelp" aria-expanded="false">${esc(status.role)} <span aria-hidden="true">?</span></button>` : `<span class="badge">${esc(status.role)}</span>`}<span class="badge">${esc(person.born)}</span></div></div></div>
      ${person.portrait ? '<p class="portrait-note">史料肖像｜選択時点の姿とは限りません。</p>' : ''}
      <nav class="incident-section-nav person-section-nav" aria-label="人物内の移動">${navigation.map(item => `<button type="button" data-person-section="${item.id}">${item.label}</button>`).join('')}</nav>
      ${incidentContext}
      <div class="snapshot"><h3 id="personCurrentTitle" tabindex="-1">${shared.dateLabel(shared.scene())}の位置づけ ${shared.reviewBadge(status.evidence)}</h3>${esc(status.importance)}</div>
      <div class="section person-stance"><h3>この時点の行動・立場</h3><p>${esc(status.stance)}</p></div>
      ${turningPoint(person)}
      ${incidentHistory(person)}
      ${officeHelp(offices)}
      ${shared.portraitCredit(person, '肖像の出典・年代・利用条件')}
      ${shared.backgroundTerms(person.termIds)}
      <div class="section"><h3>一言で</h3><p>${esc(person.oneLine)}</p></div>
      <div class="section"><h3>名前・通称</h3><div class="tags">${[person.name, ...person.aliases].map(alias => `<span class="tag">${esc(alias)}</span>`).join('')}</div></div>
      <div class="section"><h3 id="personRelationsTitle" tabindex="-1">この時点の主要関係</h3><div class="relations">${relations.length ? relations.map(relation => {
        const other = domain.getPerson(relation.a === person.id ? relation.b : relation.a);
        return `<div class="rel"><button type="button" data-other-person="${esc(other.id)}">${esc(domain.statusAt(other, state.scene).display)}</button> — ${esc(relation.label)} ${shared.reviewBadge(relation.evidence)}<br><span class="muted">${esc(relation.text)}</span></div>`;
      }).join('') : '<span class="muted">登録済みの主要関係はありません。</span>'}</div></div>
      ${eventPeerGroups.length ? `<div class="section event-peers"><h3>同じ事件の関係者</h3><p class="muted">同じ事件に関わった人物のうち、上の主要関係には含まれない人物です。直接の人物関係を示すものではありません。</p>${eventPeerGroups.map(group => `<section class="event-peer-group"><h4>${esc(group.title)}</h4><div class="tags">${group.people.map(other => `<button type="button" class="tag" data-event-peer="${esc(other.id)}">${esc(domain.statusAt(other, state.scene).display)}</button>`).join('')}</div></section>`).join('')}</div>` : ''}
      ${person.events.length ? `<div class="section"><h3>関連する年代の概要</h3><div class="tags">${person.events.map(id => data.events[id] ? `<button type="button" class="tag" data-open-event="${esc(id)}">${esc(data.events[id].title)}</button>` : '').join('')}</div></div>` : ''}
      <div class="section"><h3 id="personHistoryTitle" tabindex="-1">時点履歴</h3><div class="history-list">${history.map(item => `<div class="history-item ${item.scene.index === state.scene ? 'current' : ''}"><button type="button" data-history-scene="${item.scene.index}"><b>${esc(item.scene.year)}年 ${esc(item.value.display)} ${shared.reviewBadge(item.value.evidence)}</b>${esc(item.value.role)}</button></div>`).join('')}</div></div>
      <div class="actions"><button type="button" class="button" id="personToGraph">相関図</button><button type="button" class="button" id="personToMap">地図</button></div>
      <details class="source-disclosure section"><summary id="personSourcesTitle">参考資料を見る</summary>
        <section class="section" data-person-sources="basic"><h3>人物の基本情報 ${shared.reviewBadge(person.evidence)}</h3>${shared.reviewExplanation(person.evidence)}<div class="source-list">${shared.sourceLinks(person.sources)}</div></section>
        <section class="section" data-person-sources="status"><h3>この時点の行動・立場 ${shared.reviewBadge(status.evidence)}</h3><p class="muted">${shared.dateLabel(shared.scene())}の位置づけと行動・立場の根拠です。</p>${shared.reviewExplanation(status.evidence)}<div class="source-list">${evidenceLinks(status.evidence)}</div></section>
        ${relations.length ? `<section class="section" data-person-sources="relations"><h3>この関係の根拠</h3>${relationSources}</section>` : ''}
      </details>`;
      shared.bindPortraits(box);
      const turningTitle = $('#personTurningPoint h3', box);
      if (turningTitle) { turningTitle.id = 'personTurningPointTitle'; turningTitle.tabIndex = -1; }
      const incidentTitle = $('#personIncidentHistoryTitle', box);
      if (incidentTitle) incidentTitle.tabIndex = -1;
      $$('[data-person-section]', box).forEach(button => button.addEventListener('click', () => {
        const target = document.getElementById(button.dataset.personSection);
        const disclosure = target.closest('details');
        if (disclosure) disclosure.open = true;
        target.style.scrollMarginTop = `${$('.tabs-shell').getBoundingClientRect().height + 16}px`;
        target.scrollIntoView({ block: 'start', behavior: 'auto' });
        target.focus({ preventScroll: true });
      }));
      const officeTrigger = $('.office-trigger', box);
      const officePanel = $('#personOfficeHelp', box);
      if (officeTrigger) {
        officeTrigger.addEventListener('click', () => {
          officePanel.open = !officePanel.open;
          if (officePanel.open) {
            officePanel.scrollIntoView({ block: 'start', behavior: 'auto' });
            $('summary', officePanel).focus({ preventScroll: true });
          }
        });
        officePanel.addEventListener('toggle', () => officeTrigger.setAttribute('aria-expanded', String(officePanel.open)));
      }
      $$('[data-turning-scene]', box).forEach(button => button.addEventListener('click', () => {
        actions.setScene(button.dataset.turningScene);
        requestAnimationFrame(() => {
          const target = $('#personTurningPoint');
          target?.scrollIntoView({ block: 'start', behavior: 'auto' });
          target?.focus({ preventScroll: true });
        });
      }));
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

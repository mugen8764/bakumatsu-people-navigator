(function exposeEventsRenderer(root, factory) {
  root.BM_RENDER_EVENTS = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  function createEventsRenderer(context) {
    const { $, $$, actions, data, domain, shared, state } = context;
    const esc = shared.escapeHtml;

    const involvementLabels = { onsite: '現場での関与', decision: '意思決定・指揮', context: '背景・制度' };

    function incidentDetail(incident) {
      const people = new Map(incident.participants.map(item => [item.personId, item]));
      const groups = Object.entries(involvementLabels).map(([kind, label]) => {
        const participants = incident.participants.filter(item => item.involvement === kind);
        if (!participants.length) return '';
        return `<section class="incident-lane ${kind}"><h3><span class="involvement-dot"></span>${label}</h3><div class="incident-cast">${participants.map(item => {
          const person = domain.getPerson(item.personId);
          return `<button type="button" class="incident-person" data-event-person="${esc(item.personId)}">${shared.avatar(person, domain.factionAt(person, state.scene), item.displayName, true)}<span class="incident-person-copy">${item.side ? `<span class="incident-side">${esc(item.side)}</span>` : ''}<strong>${esc(item.displayName)}</strong><span>${esc(item.role)} ${shared.reviewBadge(item.evidence)}</span><small>${esc(item.summary)}</small></span><span class="incident-person-arrow" aria-hidden="true">→</span></button>`;
        }).join('')}</div></section>`;
      }).join('');
      const relations = incident.relations.map(relation => `<li class="incident-relation" data-direction="${esc(relation.direction || 'none')}"><div class="incident-relation-pair"><strong>${esc(people.get(relation.aPersonId).displayName)}</strong><span class="incident-edge"><span>${esc(relation.label)}</span><span aria-hidden="true">${relation.direction === 'forward' ? '↓' : relation.direction === 'both' ? '↕' : '│'}</span><span class="visually-hidden">${relation.direction === 'forward' ? '先の人物から次の人物への関係' : relation.direction === 'both' ? '双方向の関係' : '方向を持たない関係'}</span></span><strong>${esc(people.get(relation.bPersonId).displayName)}</strong></div><p>${esc(relation.description)} ${shared.reviewBadge(relation.evidence)}</p></li>`).join('');
      const evidenceItems = [...incident.participants.map(item => ({ title: `${item.displayName}：${item.role}`, evidence: item.evidence })), ...incident.relations.map(item => ({ title: item.label, evidence: item.evidence }))];
      return `<button type="button" class="button" data-open-overview>← ${esc(shared.scene().year)}年の概要へ</button>
        <header class="incident-heading"><span class="eyebrow">事件を詳しく</span><h2 id="eventDetailTitle" tabindex="-1">${esc(incident.title)}</h2><p class="incident-date">${esc(incident.date)} ${shared.reviewBadge(incident.evidence)}</p><p class="incident-lead">${esc(incident.summary)}</p></header>
        <div class="incident-overview"><section><h3>何がぶつかった？</h3><p>${esc(incident.stakes)}</p></section><section><h3>次の転換点</h3><p>${esc(incident.turningPoint)}</p></section></div>
        <section class="incident-roles" aria-labelledby="incidentRolesTitle"><div class="incident-section-heading"><h2 id="incidentRolesTitle">誰が、何をした？</h2>${incident.scope ? `<span>${esc(incident.scope)}</span>` : ''}</div><p class="muted">現場での関与・意思決定や指揮・背景を分けています。名前を選ぶと人物詳細へ進めます。</p>${groups}</section>
        <section class="incident-connections" aria-labelledby="incidentRelationsTitle"><h2 id="incidentRelationsTitle">この事件を読むための相関図</h2><p class="muted">線は記載した関係を表します。同じ事件に登場するだけでは結んでいません。矢印は方向のある関係、棒線は方向のない関係です。</p><ul class="incident-relations">${relations}</ul></section>
        ${shared.backgroundTerms(incident.termIds)}
        <div class="actions"><button type="button" class="button" id="eventToMap">地図で見る</button></div>
        <details class="source-disclosure section"><summary>事件・役割・関係の根拠</summary><div class="source-list">${shared.sourceLinks(incident.evidence.sourceIds)}</div>${evidenceItems.map(item => `<section class="section"><h3>${esc(item.title)} ${shared.reviewBadge(item.evidence)}</h3><div class="source-list">${shared.sourceLinks(item.evidence.sourceIds)}</div></section>`).join('')}</details>
        ${incident.participants.some(item => domain.getPerson(item.personId).portrait) ? '<p class="portrait-note">肖像は選択時点の姿とは限りません。各画像の出典・利用条件は以下で確認できます。</p>' : ''}${incident.participants.map(item => shared.portraitCredit(domain.getPerson(item.personId))).join('')}`;
    }

    function render() {
      const event = data.events[shared.scene().event];
      const incident = domain.incidentAt(state);
      $('#view-events').classList.toggle('incident-open', Boolean(incident));
      $('#causalTimeline').innerHTML = data.scenes.map((scene, index) => {
        const item = data.events[scene.event];
        return `<div class="chain-row"><div class="chain-date">${shared.dateLabel(scene)}</div><div class="chain-line"></div><div class="chain-card ${index === state.scene ? 'active' : ''}"><button type="button" data-timeline-scene="${index}"><h3>${esc(item.title)}</h3><p>${esc(item.results[item.results.length - 1])}</p></button></div></div>`;
      }).join('');
      $$('[data-timeline-scene]').forEach(button => button.addEventListener('click', () => actions.setScene(button.dataset.timelineScene)));
      const participantButtons = event.people.map(id => {
        const person = domain.getPerson(id);
        if (!person) return '';
        const eventIndex = domain.eventScene.get(shared.scene().event);
        const status = domain.statusAt(person, eventIndex);
        return `<button type="button" class="tag" data-event-person="${esc(id)}">${esc(status ? status.display : person.name)}</button>`;
      }).join('');
      $('#eventDetail').innerHTML = `<div class="badges"><span class="badge">${esc(event.category)}</span><span class="badge">${esc(event.date)}</span></div><div class="section"><div class="detail-title">${esc(event.title)}</div><p>${esc(event.description)}</p></div>
      <div class="event-block"><h3>背景・原因</h3><ul>${event.causes.map(cause => `<li>${esc(cause)}</li>`).join('')}</ul></div>
      <div class="event-block"><h3>主要な争点</h3><div class="tags">${event.issues.map(issue => `<span class="tag">${esc(issue)}</span>`).join('')}</div></div>
      <div class="event-block"><h3>関係人物</h3><div class="tags">${participantButtons}</div></div>
      <div class="event-block"><h3>関係勢力</h3><div class="tags">${event.factions.map(name => `<button type="button" class="tag" data-event-faction="${esc(name)}">${esc(name)}</button>`).join('')}</div></div>
      <div class="event-block"><h3>結果・次への影響</h3><ul>${event.results.map(result => `<li>${esc(result)}</li>`).join('')}</ul></div>
      <div class="actions"><button type="button" class="button" id="eventToMap">地図で見る</button></div>
      <details class="source-disclosure section"><summary>参考資料を見る</summary><div class="source-list">${shared.sourceLinks(event.sources)}</div></details>`;
      if (incident) $('#eventDetail').innerHTML = incidentDetail(incident);
      else {
        const title = $('#eventDetail .detail-title');
        title.id = 'eventDetailTitle';
        title.tabIndex = -1;
      }
      shared.bindPortraits($('#eventDetail'));
      $('[data-open-overview]')?.addEventListener('click', () => actions.openEvent(shared.scene().event));
      $$('[data-event-person]').forEach(button => button.addEventListener('click', () => {
        actions.selectPerson(button.dataset.eventPerson, 'people');
        actions.revealPersonDetail();
      }));
      $$('[data-event-faction]').forEach(button => button.addEventListener('click', () => actions.selectFaction(button.dataset.eventFaction)));
      $('#eventToMap').addEventListener('click', () => actions.setView('map'));
    }

    return { render };
  }

  return { createEventsRenderer };
}));

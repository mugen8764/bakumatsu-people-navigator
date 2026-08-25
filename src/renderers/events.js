(function exposeEventsRenderer(root, factory) {
  root.BM_RENDER_EVENTS = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  function createEventsRenderer(context) {
    const { $, $$, actions, data, domain, shared, state } = context;

    function render() {
      const event = data.events[shared.scene().event];
      $('#causalTimeline').innerHTML = data.scenes.map((scene, index) => {
        const item = data.events[scene.event];
        return `<div class="chain-row"><div class="chain-date">${shared.dateLabel(scene)}</div><div class="chain-line"></div><div class="chain-card ${index === state.scene ? 'active' : ''}"><button type="button" data-timeline-scene="${index}"><h3>${item.title}</h3><p>${item.results[item.results.length - 1]}</p></button></div></div>`;
      }).join('');
      $$('[data-timeline-scene]').forEach(button => button.addEventListener('click', () => actions.setScene(button.dataset.timelineScene)));
      const participantButtons = event.people.map(id => {
        const person = domain.getPerson(id);
        if (!person) return '';
        const eventIndex = domain.eventScene.get(shared.scene().event);
        const status = domain.statusAt(person, eventIndex);
        return `<button type="button" class="tag" data-event-person="${id}">${status ? status.display : person.name}</button>`;
      }).join('');
      $('#eventDetail').innerHTML = `<div class="badges"><span class="badge">${event.category}</span><span class="badge">${event.date}</span></div><div class="section"><div class="detail-title">${event.title}</div><p>${event.description}</p></div>
      <div class="event-block"><h3>背景・原因</h3><ul>${event.causes.map(cause => `<li>${cause}</li>`).join('')}</ul></div>
      <div class="event-block"><h3>主要な争点</h3><div class="tags">${event.issues.map(issue => `<span class="tag">${issue}</span>`).join('')}</div></div>
      <div class="event-block"><h3>関係人物</h3><div class="tags">${participantButtons}</div></div>
      <div class="event-block"><h3>関係勢力</h3><div class="tags">${event.factions.map(name => `<button type="button" class="tag" data-event-faction="${name}">${name}</button>`).join('')}</div></div>
      <div class="event-block"><h3>結果・次への影響</h3><ul>${event.results.map(result => `<li>${result}</li>`).join('')}</ul></div>
      <div class="actions"><button type="button" class="button" id="eventToMap">地図で見る</button></div>
      <details class="source-disclosure section"><summary>参考資料を見る</summary><div class="source-list">${shared.sourceLinks(event.sources)}</div></details>`;
      $$('[data-event-person]').forEach(button => button.addEventListener('click', () => actions.selectPerson(button.dataset.eventPerson, 'people')));
      $$('[data-event-faction]').forEach(button => button.addEventListener('click', () => actions.selectFaction(button.dataset.eventFaction)));
      $('#eventToMap').addEventListener('click', () => actions.setView('map'));
    }

    return { render };
  }

  return { createEventsRenderer };
}));

(function exposeRelationsRenderer(root, factory) {
  root.BM_RENDER_RELATIONS = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  function createRelationsRenderer(context) {
    const { $, $$, actions, data, domain, shared, state } = context;

    function render() {
      const svg = $('#relationGraph');
      const person = domain.getPerson(state.selectedPerson);
      const status = domain.statusAt(person, state.scene);
      if (!person || !status) {
        svg.innerHTML = '<text x="410" y="295" text-anchor="middle" class="node-label">人物を選択してください</text>';
        return;
      }
      const relations = domain.relationsFor(person.id, state.scene, state.relationType);
      const others = relations.map(relation => domain.getPerson(relation.a === person.id ? relation.b : relation.a)).filter(Boolean);
      const center = { x: 410, y: 295 };
      const radius = Math.min(225, 145 + others.length * 8);
      const points = others.map((other, index) => ({
        other,
        x: center.x + Math.cos((Math.PI * 2 * index / Math.max(others.length, 1)) - Math.PI / 2) * radius,
        y: center.y + Math.sin((Math.PI * 2 * index / Math.max(others.length, 1)) - Math.PI / 2) * radius
      }));
      let html = '';
      relations.forEach((relation, index) => {
        const point = points[index];
        if (!point) return;
        html += `<line x1="${center.x}" y1="${center.y}" x2="${point.x}" y2="${point.y}" class="edge focus ${relation.type === '対立' ? 'dash' : ''}"></line><text x="${(center.x + point.x) / 2}" y="${(center.y + point.y) / 2 - 6}" text-anchor="middle" class="edge-label">${relation.label}</text>`;
      });
      html += `<circle cx="${center.x}" cy="${center.y}" r="45" fill="${shared.factionColor(status.faction)}" class="node selected" data-graph-person="${person.id}" role="button" tabindex="0" aria-label="${status.display}を選択"></circle><text x="${center.x}" y="${center.y + 5}" text-anchor="middle" class="node-label">${status.display}</text>`;
      points.forEach(({ other, x, y }) => {
        const otherStatus = domain.statusAt(other, state.scene);
        html += `<circle cx="${x}" cy="${y}" r="36" fill="${shared.factionColor(otherStatus.faction)}" class="node" data-graph-person="${other.id}" role="button" tabindex="0" aria-label="${otherStatus.display}を選択"></circle><text x="${x}" y="${y + 5}" text-anchor="middle" class="node-label">${otherStatus.display}</text>`;
      });
      if (!points.length) html += '<text x="410" y="390" text-anchor="middle" class="edge-label">選択条件で表示できる関係がありません</text>';
      svg.innerHTML = html;
      $$('[data-graph-person]', svg).forEach(node => {
        const select = () => actions.selectPerson(node.dataset.graphPerson, 'relations');
        node.addEventListener('click', select);
        node.addEventListener('keydown', event => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          select();
        });
      });
      $('#metricPeople').textContent = domain.activePeople(state.scene).length;
      $('#metricRelations').textContent = domain.activeRelations(state.scene, state.relationType).length;
      $('#metricFactions').textContent = domain.activeFactionNames(state.scene).length;
      $('#graphExplanation').innerHTML = relations.length ? relations.map(relation => {
        const other = domain.getPerson(relation.a === person.id ? relation.b : relation.a);
        return `<div class="rel"><button type="button" data-graph-other="${other.id}">${domain.statusAt(other, state.scene).display}</button> — ${relation.label}<br><span class="muted">${relation.text}</span></div>`;
      }).join('') : '<span class="muted">該当する関係はありません。</span>';
      $$('[data-graph-other]').forEach(button => button.addEventListener('click', () => actions.selectPerson(button.dataset.graphOther, 'relations')));
      const legendFactions = [...new Set([status.faction, ...others.map(other => domain.factionAt(other, state.scene))])];
      $('#graphLegend').innerHTML = legendFactions.map(name => `<span><i class="dot" style="background:${shared.factionColor(name)}"></i>${name}</span>`).join('');
    }

    return { render };
  }

  return { createRelationsRenderer };
}));

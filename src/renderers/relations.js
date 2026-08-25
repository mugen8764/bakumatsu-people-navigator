(function exposeRelationsRenderer(root, factory) {
  root.BM_RENDER_RELATIONS = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  function createRelationsRenderer(context) {
    const { $, $$, actions, data, domain, shared, state } = context;

    function relationClass(type) {
      if (type === '対立') return 'conflict';
      if (['政治協力', '仲介・交渉'].includes(type)) return 'cooperation';
      if (['主従・登用', '組織'].includes(type)) return 'organization';
      return 'personal';
    }

    function personNode(person, status, x, y, selected = false) {
      const width = selected ? 168 : 142;
      const height = selected ? 78 : 68;
      const left = -width / 2;
      const top = -height / 2;
      return `<g transform="translate(${x} ${y})" class="node graph-person ${selected ? 'selected' : ''}" data-graph-person="${person.id}" role="button" tabindex="0" aria-label="${status.display}を選択"><rect class="node-card" x="${left}" y="${top}" width="${width}" height="${height}" rx="18"></rect><rect class="node-stripe" x="${left}" y="${top}" width="10" height="${height}" rx="5" fill="${shared.factionColor(status.faction)}"></rect><text x="0" y="-4" text-anchor="middle" class="node-label">${status.display}</text><text x="0" y="17" text-anchor="middle" class="node-faction">${status.faction}</text></g>`;
    }

    function nearestSceneWithRelations(personId) {
      return data.scenes.map((scene, index) => ({ scene, index, distance: Math.abs(index - state.scene), count: domain.relationsFor(personId, index, state.relationType).length }))
        .filter(item => item.count)
        .sort((a, b) => a.distance - b.distance || a.index - b.index)[0] || null;
    }

    function emptyMessage(person, status) {
      const nearest = nearestSceneWithRelations(person.id);
      if (!nearest) return `<div class="relation-empty"><strong>${status.display}の関係はまだ登録されていません</strong><span>人物画面から同じ事件の関係者を確認できます。</span></div>`;
      return `<div class="relation-empty"><strong>この時点の主要関係はありません</strong><span>${nearest.scene.year}年「${nearest.scene.title}」では関係を表示できます。</span><button type="button" class="button subtle" data-relation-scene="${nearest.index}">その時点を見る</button></div>`;
    }

    function render() {
      const svg = $('#relationGraph');
      const person = domain.getPerson(state.selectedPerson);
      const status = domain.statusAt(person, state.scene);
      if (!person || !status) {
        svg.innerHTML = '<text x="410" y="295" text-anchor="middle" class="node-label">人物を選択してください</text>';
        $('#relationMobile').innerHTML = '<div class="relation-empty">人物を選択してください。</div>';
        return;
      }
      const relations = domain.relationsFor(person.id, state.scene, state.relationType);
      const others = relations.map(relation => domain.getPerson(relation.a === person.id ? relation.b : relation.a)).filter(Boolean);
      const center = { x: 410, y: 295 };
      const radiusX = Math.min(275, 190 + others.length * 7);
      const radiusY = Math.min(215, 155 + others.length * 5);
      const points = others.map((other, index) => ({
        other,
        x: center.x + Math.cos((Math.PI * 2 * index / Math.max(others.length, 1)) - Math.PI / 2) * radiusX,
        y: center.y + Math.sin((Math.PI * 2 * index / Math.max(others.length, 1)) - Math.PI / 2) * radiusY
      }));
      let html = '<defs><marker id="relationArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="edge-arrow"></path></marker></defs>';
      relations.forEach((relation, index) => {
        const point = points[index];
        if (!point) return;
        html += `<line x1="${center.x}" y1="${center.y}" x2="${point.x}" y2="${point.y}" class="edge ${relationClass(relation.type)}" marker-end="url(#relationArrow)"></line><text x="${(center.x + point.x) / 2}" y="${(center.y + point.y) / 2 - 9}" text-anchor="middle" class="edge-label">${relation.label}</text>`;
      });
      html += personNode(person, status, center.x, center.y, true);
      points.forEach(({ other, x, y }) => {
        const otherStatus = domain.statusAt(other, state.scene);
        html += personNode(other, otherStatus, x, y);
      });
      if (!points.length) html += '<text x="410" y="390" text-anchor="middle" class="edge-empty-label">この時点の主要関係はありません</text>';
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
      const legendFactions = [...new Set([status.faction, ...others.map(other => domain.factionAt(other, state.scene))])];
      $('#metricPeople').textContent = others.length + 1;
      $('#metricRelations').textContent = relations.length;
      $('#metricFactions').textContent = legendFactions.length;
      const relationItems = relations.map(relation => {
        const other = domain.getPerson(relation.a === person.id ? relation.b : relation.a);
        const otherStatus = domain.statusAt(other, state.scene);
        return `<div class="rel"><button type="button" data-graph-other="${other.id}">${otherStatus.display}</button> — <span class="relation-kind ${relationClass(relation.type)}">${relation.label}</span> ${shared.reviewBadge(relation.evidence)}<br><span class="muted">${relation.text}</span></div>`;
      }).join('');
      $('#graphExplanation').innerHTML = relationItems || emptyMessage(person, status);
      $('#relationMobile').innerHTML = `<div class="relation-mobile-center"><span class="scene-person-avatar" style="background:${shared.factionColor(status.faction)}">${shared.factionShort(status.faction)}</span><span><small>中心人物</small><strong>${status.display}</strong><em>${status.role}</em></span></div>${relations.length ? relations.map(relation => {
        const other = domain.getPerson(relation.a === person.id ? relation.b : relation.a);
        const otherStatus = domain.statusAt(other, state.scene);
        return `<button type="button" class="relation-mobile-card ${relationClass(relation.type)}" data-mobile-relation-person="${other.id}"><span class="relation-mobile-line"><i></i><b>${relation.label}</b></span><span class="scene-person-avatar" style="background:${shared.factionColor(otherStatus.faction)}">${shared.factionShort(otherStatus.faction)}</span><span><strong>${otherStatus.display}</strong><small>${relation.text}</small></span></button>`;
      }).join('') : emptyMessage(person, status)}`;
      $$('[data-graph-other]').forEach(button => button.addEventListener('click', () => actions.selectPerson(button.dataset.graphOther, 'relations')));
      $$('[data-mobile-relation-person]').forEach(button => button.addEventListener('click', () => actions.selectPerson(button.dataset.mobileRelationPerson, 'relations')));
      $$('[data-relation-scene]').forEach(button => button.addEventListener('click', () => actions.setScene(button.dataset.relationScene)));
      $('#graphLegend').innerHTML = `<div class="legend-group"><strong>関係</strong><span><i class="line-sample cooperation"></i>協力・交渉</span><span><i class="line-sample conflict"></i>対立</span><span><i class="line-sample organization"></i>組織・登用</span><span><i class="line-sample personal"></i>同志・親族</span></div><div class="legend-group"><strong>勢力</strong>${legendFactions.map(name => `<span><i class="dot" style="background:${shared.factionColor(name)}"></i>${name}</span>`).join('')}</div>`;
    }

    return { render };
  }

  return { createRelationsRenderer };
}));

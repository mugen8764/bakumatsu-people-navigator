(function exposeMap(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BM_MAP_VIEW = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  function projectMapCoord(coord, projection) {
    const [longitude, latitude] = coord;
    const mercatorY = Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI / 180) / 2));
    return [
      projection.margin + (longitude - projection.lonMin) / (projection.lonMax - projection.lonMin) * (projection.width - 2 * projection.margin),
      projection.margin + (projection.myMax - mercatorY) / (projection.myMax - projection.myMin) * (projection.height - 2 * projection.margin)
    ];
  }

  function mapViewBoxForPoint(point, projection, zoom = 2.4) {
    const width = projection.width / zoom;
    const height = projection.height / zoom;
    return {
      x: Math.max(0, Math.min(projection.width - width, point.x - width / 2)),
      y: Math.max(0, Math.min(projection.height - height, point.y - height / 2)),
      width,
      height
    };
  }

  function estimateMapLabelWidth(label) {
    return Array.from(label).reduce((width, character) => (
      width + (/^[\x00-\xff]$/.test(character) ? 6.5 : 12)
    ), 0);
  }

  function mapLabelBox(x, y, anchor, width) {
    const left = anchor === 'end' ? x - width : x;
    return { left, right: left + width, top: y - 13, bottom: y + 4 };
  }

  function boxesOverlap(a, b, gap = 0) {
    return a.left < b.right + gap && a.right + gap > b.left
      && a.top < b.bottom + gap && a.bottom + gap > b.top;
  }

  function labelCandidates(point) {
    const candidates = [];
    for (let level = 0; level < 12; level += 1) {
      const above = -10 - level * 20;
      const below = 20 + level * 20;
      candidates.push(
        { x: point.x + 13, y: point.y + above, anchor: 'start' },
        { x: point.x - 13, y: point.y + above, anchor: 'end' },
        { x: point.x + 13, y: point.y + below, anchor: 'start' },
        { x: point.x - 13, y: point.y + below, anchor: 'end' }
      );
    }
    return candidates;
  }

  function layoutMapLabels(points, options = {}) {
    const width = options.width || 720;
    const height = options.height || 770;
    const edge = options.edge || 8;
    const occupied = [];
    const markerBoxes = points.map(point => ({
      left: point.x - 9,
      right: point.x + 9,
      top: point.y - 9,
      bottom: point.y + 9
    }));

    return points.map(point => {
      const labelWidth = estimateMapLabelWidth(point.name);
      const choices = labelCandidates(point).map((candidate, index) => {
        const box = mapLabelBox(candidate.x, candidate.y, candidate.anchor, labelWidth);
        const outside = Math.max(0, edge - box.left) + Math.max(0, box.right - (width - edge))
          + Math.max(0, edge - box.top) + Math.max(0, box.bottom - (height - edge));
        const labelCollisions = occupied.filter(other => boxesOverlap(box, other, 4)).length;
        const markerCollisions = markerBoxes.filter(marker => boxesOverlap(box, marker, 2)).length;
        return {
          ...candidate,
          box,
          score: outside * 1000000 + labelCollisions * 100000 + markerCollisions * 10000 + index
        };
      });
      const choice = choices.reduce((best, candidate) => candidate.score < best.score ? candidate : best);
      occupied.push(choice.box);
      const targetX = choice.x + (choice.anchor === 'end' ? 3 : -3);
      const targetY = choice.y - 4;
      const angle = Math.atan2(targetY - point.y, targetX - point.x);
      return {
        ...point,
        x: choice.x,
        y: choice.y,
        anchor: choice.anchor,
        box: choice.box,
        leader: {
          x1: point.x + Math.cos(angle) * 8,
          y1: point.y + Math.sin(angle) * 8,
          x2: targetX,
          y2: targetY
        }
      };
    });
  }

  function createMapRenderer(context, mapData) {
    const { $, $$, actions, data, domain, shared, state } = context;

    function placeIds() {
      const person = domain.getPerson(state.selectedPerson);
      const event = data.events[shared.scene().event];
      return [...new Set([...(person?.places || []), ...event.places])];
    }

    function applyMapViewport() {
      const svg = $('#historyMap');
      const point = state.map.placePoints.get(state.map.zoomedPlace);
      const reset = $('#resetMapView');
      if (!point) {
        svg.setAttribute('viewBox', `0 0 ${mapData.projection.width} ${mapData.projection.height}`);
        svg.setAttribute('aria-label', '人物と事件の関連地を示す日本地図');
        reset.hidden = true;
        return;
      }
      const box = mapViewBoxForPoint(point, mapData.projection);
      svg.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`);
      svg.setAttribute('aria-label', `${data.places[state.map.zoomedPlace].name}周辺を拡大した人物と事件の関連地`);
      reset.hidden = false;
    }

    function focusPlace(id, options = {}) {
      const card = $(`[data-map-place-card="${id}"]`);
      const marker = $(`[data-map-place="${id}"]`);
      if (!card) return;
      state.map.selectedPlace = id;
      if (options.zoom !== false) {
        state.map.zoomedPlace = marker ? id : '';
        applyMapViewport();
      }
      $$('[data-map-place-card]').forEach(item => item.classList.toggle('selected', item === card));
      $$('[data-map-place]').forEach(item => {
        const selected = item === marker;
        item.classList.toggle('selected', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      $$('[data-map-label]').forEach(item => item.classList.toggle('selected', item.dataset.mapLabel === id));
      $$('[data-map-place-name]').forEach(item => {
        item.setAttribute('aria-pressed', String(item.dataset.mapPlaceName === id));
      });
      if (options.scroll !== false) card.scrollIntoView({ block: 'nearest' });
      if (options.focusLink !== false) card.querySelector('.place-link')?.focus({ preventScroll: true });
    }

    function renderInfo() {
      const person = domain.getPerson(state.selectedPerson);
      const status = domain.statusAt(person, state.scene);
      const event = data.events[shared.scene().event];
      const ids = placeIds();
      $('#mapTitle').textContent = status ? `${status.display}と「${event.title}」の関連地` : `「${event.title}」の関連地`;
      $('#mapDescription').textContent = '緑系の丸は人物の主な関連地、菱形は事件の主要地点です。マーカー、地図上の地名、右欄の地名から地点を選ぶと周辺を拡大します。人物の所在地を特定日ごとに断定する表示ではありません。';
      const personPlaces = new Set(person?.places || []);
      const eventPlaces = new Set(event.places);
      $('#placeList').innerHTML = ids.map(id => {
        const place = data.places[id];
        if (!place) return '';
        const personLink = person && personPlaces.has(id)
          ? `<button type="button" class="place-link person" data-map-person="${person.id}">${status?.display || person.name}を見る</button>`
          : '';
        const eventLink = eventPlaces.has(id)
          ? `<button type="button" class="place-link event" data-map-event="${shared.scene().event}">「${event.title}」を見る</button>`
          : '';
        const outside = place.coord[0] < 125 || place.coord[0] > 146 || place.coord[1] < 24 || place.coord[1] > 46;
        return `<article class="list-item place-card" data-map-place-card="${id}"><div class="place-card-head"><button type="button" class="place-name" data-map-place-name="${id}" aria-pressed="false">${place.name} ${shared.reviewBadge(place.evidence)}</button><div class="place-kinds">${personPlaces.has(id) ? '<span class="person">人物</span>' : ''}${eventPlaces.has(id) ? '<span class="event">事件</span>' : ''}</div></div><p>${place.note}</p>${outside ? '<small class="muted">日本地図の範囲外</small>' : ''}<div class="place-links">${personLink}${eventLink}</div></article>`;
      }).join('');
      $$('[data-map-place-name]', $('#placeList')).forEach(button => button.addEventListener('click', () => {
        focusPlace(button.dataset.mapPlaceName, { focusLink: false });
      }));
      $$('[data-map-person]', $('#placeList')).forEach(button => button.addEventListener('click', () => actions.selectPerson(button.dataset.mapPerson, 'people')));
      $$('[data-map-event]', $('#placeList')).forEach(button => button.addEventListener('click', () => actions.openEvent(button.dataset.mapEvent)));
      return { event, ids, person };
    }

    function init() {
      if (!mapData) {
        $('#mapStatus').textContent = '地図データを読み込めませんでした。地点一覧は利用できます。';
        return;
      }
      try {
        const svg = $('#historyMap');
        svg.innerHTML = `<g aria-hidden="true">${mapData.paths.map(path => `<path d="${path.d}" class="${path.id === 'JPN' ? 'map-japan' : 'map-land'}"></path>`).join('')}</g><g id="mapPersonLayer"></g><g id="mapEventLayer"></g><g id="mapLabelLayer" aria-hidden="true"></g><g id="mapInteractionLayer"></g>`;
        state.map = {
          personLayer: $('#mapPersonLayer'),
          eventLayer: $('#mapEventLayer'),
          labelLayer: $('#mapLabelLayer'),
          interactionLayer: $('#mapInteractionLayer'),
          labelLayout: new Map(),
          placePoints: new Map(),
          selectedPlace: '',
          zoomedPlace: ''
        };
        const projection = mapData.projection;
        const catalogPoints = Object.keys(data.places).sort().map(id => {
          const place = data.places[id];
          const [longitude, latitude] = place.coord;
          if (longitude < projection.lonMin || longitude > projection.lonMax || latitude < projection.latMin || latitude > projection.latMax) return null;
          const [x, y] = projectMapCoord(place.coord, projection);
          return { id, name: place.name, x, y };
        }).filter(Boolean);
        state.map.placePoints = new Map(catalogPoints.map(point => [point.id, point]));
        state.map.labelLayout = new Map(layoutMapLabels(catalogPoints, projection).map(label => [label.id, label]));
        $('#resetMapView').addEventListener('click', () => {
          state.map.zoomedPlace = '';
          applyMapViewport();
        });
        state.mapReady = true;
        if (state.view === 'map') render();
      } catch (error) {
        $('#mapStatus').textContent = '地図を描画できませんでした。地点一覧は利用できます。';
        console.error(error);
      }
    }

    function render() {
      const { event, ids, person } = renderInfo();
      if (!state.mapReady) return;
      const personIds = new Set((person?.places || []).filter(id => ids.includes(id)));
      const eventIds = new Set(event.places.filter(id => ids.includes(id)));
      let personHtml = '';
      let eventHtml = '';
      let labelHtml = '';
      let interactionHtml = '';
      const projection = mapData.projection;
      const visiblePlaces = ids.map((id, index) => {
        const place = data.places[id];
        if (!place) return null;
        const [longitude, latitude] = place.coord;
        if (longitude < projection.lonMin || longitude > projection.lonMax || latitude < projection.latMin || latitude > projection.latMax) return null;
        const [x, y] = projectMapCoord(place.coord, projection);
        return { id, index, name: place.name, place, x, y };
      }).filter(Boolean);
      const labels = state.map.labelLayout;
      const status = person ? domain.statusAt(person, state.scene) : null;
      visiblePlaces.forEach(({ id, index, place, x, y }) => {
        const isPerson = personIds.has(id);
        const isEvent = eventIds.has(id);
        if (isPerson) {
          personHtml += `<circle cx="${x - (isEvent ? 5 : 0)}" cy="${y}" r="7" fill="${shared.factionColor(status?.faction || person.defaultFaction)}" class="map-person ${index === 0 ? 'map-active' : ''}"></circle>`;
        }
        if (isEvent) eventHtml += `<rect x="${x + (isPerson ? 1 : -5)}" y="${y - 5}" width="10" height="10" transform="rotate(45 ${x + (isPerson ? 6 : 0)} ${y})" class="map-event"></rect>`;
        const label = labels.get(id);
        const hitWidth = label.box.right - label.box.left + 4;
        const hitHeight = label.box.bottom - label.box.top + 4;
        labelHtml += `<g class="map-label-trigger" data-map-label-trigger="${id}"><line x1="${label.leader.x1}" y1="${label.leader.y1}" x2="${label.leader.x2}" y2="${label.leader.y2}" class="map-label-leader"></line><rect x="${label.box.left - 2}" y="${label.box.top - 2}" width="${hitWidth}" height="${hitHeight}" rx="3" class="map-label-hit"></rect><text x="${label.x}" y="${label.y}" text-anchor="${label.anchor}" class="map-label" data-map-label="${id}">${place.name}</text></g>`;
        interactionHtml += `<g class="map-place-marker" data-map-place="${id}" role="button" tabindex="0" aria-pressed="false" aria-label="${place.name}の地点カードを表示"><circle cx="${x}" cy="${y}" r="16" class="map-place-hit"></circle></g>`;
      });
      state.map.personLayer.innerHTML = personHtml;
      state.map.eventLayer.innerHTML = eventHtml;
      state.map.labelLayer.innerHTML = labelHtml;
      state.map.interactionLayer.innerHTML = interactionHtml;
      $$('[data-map-label-trigger]', state.map.labelLayer).forEach(label => {
        label.addEventListener('click', () => focusPlace(label.dataset.mapLabelTrigger));
      });
      $$('[data-map-place]', state.map.interactionLayer).forEach(marker => {
        const focus = () => focusPlace(marker.dataset.mapPlace);
        marker.addEventListener('click', focus);
        marker.addEventListener('keydown', event => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          focus();
        });
      });
      if (state.map.selectedPlace && $(`[data-map-place-card="${state.map.selectedPlace}"]`)) {
        focusPlace(state.map.selectedPlace, { focusLink: false, scroll: false, zoom: false });
      } else {
        state.map.selectedPlace = '';
        state.map.zoomedPlace = '';
      }
      applyMapViewport();
    }

    return { init, render };
  }

  return { createMapRenderer, layoutMapLabels, mapViewBoxForPoint, projectMapCoord };
}));

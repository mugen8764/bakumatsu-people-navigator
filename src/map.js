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

  function createMapRenderer(context, mapData) {
    const { $, $$, actions, data, domain, shared, state } = context;

    function placeIds() {
      const person = domain.getPerson(state.selectedPerson);
      const event = data.events[shared.scene().event];
      return [...new Set([...(person?.places || []), ...event.places])];
    }

    function focusPlace(id) {
      const card = $(`[data-map-place-card="${id}"]`);
      const marker = $(`[data-map-place="${id}"]`);
      if (!card || !marker) return;
      $$('[data-map-place-card]').forEach(item => item.classList.toggle('selected', item === card));
      $$('[data-map-place]').forEach(item => item.classList.toggle('selected', item === marker));
      card.scrollIntoView({ block: 'nearest' });
      card.querySelector('.place-link')?.focus({ preventScroll: true });
    }

    function renderInfo() {
      const person = domain.getPerson(state.selectedPerson);
      const status = domain.statusAt(person, state.scene);
      const event = data.events[shared.scene().event];
      const ids = placeIds();
      $('#mapTitle').textContent = status ? `${status.display}と「${event.title}」の関連地` : `「${event.title}」の関連地`;
      $('#mapDescription').textContent = '緑系の丸は人物の主な関連地、菱形は事件の主要地点です。人物の所在地を特定日ごとに断定する表示ではありません。';
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
        return `<article class="list-item place-card" data-map-place-card="${id}"><div class="place-card-head"><strong>${place.name} ${shared.reviewBadge(place.evidence)}</strong><div class="place-kinds">${personPlaces.has(id) ? '<span class="person">人物</span>' : ''}${eventPlaces.has(id) ? '<span class="event">事件</span>' : ''}</div></div><p>${place.note}</p>${outside ? '<small class="muted">日本地図の範囲外</small>' : ''}<div class="place-links">${personLink}${eventLink}</div></article>`;
      }).join('');
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
        svg.innerHTML = `<g aria-hidden="true">${mapData.paths.map(path => `<path d="${path.d}" class="${path.id === 'JPN' ? 'map-japan' : 'map-land'}"></path>`).join('')}</g><g id="mapPersonLayer"></g><g id="mapEventLayer"></g><g id="mapLabelLayer"></g><g id="mapInteractionLayer"></g>`;
        state.map = {
          personLayer: $('#mapPersonLayer'),
          eventLayer: $('#mapEventLayer'),
          labelLayer: $('#mapLabelLayer'),
          interactionLayer: $('#mapInteractionLayer')
        };
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
      ids.forEach((id, index) => {
        const place = data.places[id];
        if (!place) return;
        const [longitude, latitude] = place.coord;
        const projection = mapData.projection;
        if (longitude < projection.lonMin || longitude > projection.lonMax || latitude < projection.latMin || latitude > projection.latMax) return;
        const [x, y] = projectMapCoord(place.coord, projection);
        const isPerson = personIds.has(id);
        const isEvent = eventIds.has(id);
        if (isPerson) {
          const status = domain.statusAt(person, state.scene);
          personHtml += `<circle cx="${x - (isEvent ? 5 : 0)}" cy="${y}" r="7" fill="${shared.factionColor(status?.faction || person.defaultFaction)}" class="map-person ${index === 0 ? 'map-active' : ''}"></circle>`;
        }
        if (isEvent) eventHtml += `<rect x="${x + (isPerson ? 1 : -5)}" y="${y - 5}" width="10" height="10" transform="rotate(45 ${x + (isPerson ? 6 : 0)} ${y})" class="map-event"></rect>`;
        labelHtml += `<text x="${x + 11}" y="${y - 9}" class="map-label">${place.name}</text>`;
        interactionHtml += `<g class="map-place-marker" data-map-place="${id}" role="button" tabindex="0" aria-label="${place.name}の地点カードを表示"><circle cx="${x}" cy="${y}" r="16" class="map-place-hit"></circle></g>`;
      });
      state.map.personLayer.innerHTML = personHtml;
      state.map.eventLayer.innerHTML = eventHtml;
      state.map.labelLayer.innerHTML = labelHtml;
      state.map.interactionLayer.innerHTML = interactionHtml;
      $$('[data-map-place]', state.map.interactionLayer).forEach(marker => {
        const focus = () => focusPlace(marker.dataset.mapPlace);
        marker.addEventListener('click', focus);
        marker.addEventListener('keydown', event => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          focus();
        });
      });
    }

    return { init, render };
  }

  return { createMapRenderer, projectMapCoord };
}));

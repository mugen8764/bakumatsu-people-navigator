(function exposeSearch(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BM_SEARCH = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  function normalise(value) {
    return String(value || '').toLowerCase().replace(/[\s・･]/g, '');
  }

  // Search loads before the renderer helpers and stays independently testable,
  // so it keeps its own copy of BM_RENDER_SHARED.escapeHtml. A unit test asserts
  // the two stay identical.
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function highlightMatch(value, query) {
    const text = String(value || '');
    const needle = String(query || '').trim();
    if (!needle) return escapeHtml(text);
    const index = text.toLocaleLowerCase('ja').indexOf(needle.toLocaleLowerCase('ja'));
    if (index < 0) return escapeHtml(text);
    return `${escapeHtml(text.slice(0, index))}<mark>${escapeHtml(text.slice(index, index + needle.length))}</mark>${escapeHtml(text.slice(index + needle.length))}`;
  }

  function searchAll(data, query) {
    const normalizedQuery = normalise(query);
    if (!normalizedQuery) return [];
    const results = [];
    const scenes = new Map(data.scenes.map(scene => [scene.id, scene]));
    data.people.forEach(person => {
      const statuses = Object.entries(person.statuses);
      const names = [person.name, person.kana, ...person.aliases, ...statuses.map(([, status]) => status.display)];
      const matches = value => normalise(value).includes(normalizedQuery);
      const matchStatus = field => statuses.find(([, status]) => matches(status[field]));
      const statusReason = (entry, field, label) => {
        const [sceneId, status] = entry;
        const scene = scenes.get(sceneId);
        return `${scene ? `${scene.year}年「${scene.title}」の` : ''}${label}：${status[field]}`;
      };
      let rank;
      let sub = person.aliases.slice(0, 3).join('／');
      if (names.some(name => normalise(name) === normalizedQuery)) rank = 0;
      else if (names.some(matches)) rank = 1;
      else {
        const role = matchStatus('role');
        const stance = matchStatus('stance');
        if (role) {
          rank = 2;
          sub = statusReason(role, 'role', '役職');
        } else if (matches(person.oneLine)) {
          rank = 3;
          sub = `人物紹介：${person.oneLine}`;
        } else if (stance) {
          rank = 3;
          sub = statusReason(stance, 'stance', '行動・立場');
        } else return;
      }
      results.push({ type: '人物', title: person.name, sub, id: person.id, rank });
    });
    Object.entries(data.factions).forEach(([name, faction]) => {
      if (normalise([name, ...faction.aliases, faction.summary].join(' ')).includes(normalizedQuery)) {
        results.push({ type: '勢力', title: name, sub: faction.summary, id: name });
      }
    });
    Object.values(data.incidents || {}).forEach(incident => {
      if (normalise([incident.title, incident.summary, ...incident.participants.map(item => item.displayName)].join(' ')).includes(normalizedQuery)) {
        results.push({ type: '事件', title: incident.title, sub: incident.date, id: incident.id, rank: -1 });
      }
    });
    Object.entries(data.events).forEach(([id, event]) => {
      if (normalise([event.title, event.description, ...event.issues, ...event.causes, ...event.results].join(' ')).includes(normalizedQuery)) {
        results.push({ type: '事件', title: event.title, sub: event.date, id });
      }
    });
    const limits = { '人物': 8, '勢力': 3, '事件': 3 };
    return ['人物', '勢力', '事件'].flatMap(type => results
      .filter(result => result.type === type)
      .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
      .slice(0, limits[type])
      .map(({ rank, ...result }) => result));
  }

  function createSearchController(context) {
    const { $, $$, actions, data, state } = context;
    let activeIndex = -1;
    let currentResults = [];

    function close() {
      const input = $('#globalSearch');
      const box = $('#searchResults');
      activeIndex = -1;
      currentResults = [];
      box.hidden = true;
      box.innerHTML = '';
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
    }

    function clearStatus() {
      const status = $('#navigationStatus');
      status.textContent = '';
      status.hidden = true;
    }

    function announceSceneMove(result, previousScene) {
      if (state.scene === previousScene) return;
      const from = data.scenes[previousScene];
      const to = data.scenes[state.scene];
      const status = $('#navigationStatus');
      status.textContent = `検索結果「${result.title}」に合わせて、${from.year}年から${to.year}年「${to.title}」へ移動しました。`;
      status.hidden = false;
    }

    function selectResult(result) {
      const previousScene = state.scene;
      close();
      $('#globalSearch').value = '';
      if (result.type === '人物') {
        actions.selectPerson(result.id, 'people');
        actions.revealPersonDetail();
      }
      else if (result.type === '勢力') actions.selectFaction(result.id);
      else actions.openEvent(result.id);
      announceSceneMove(result, previousScene);
    }

    function setActive(index) {
      const buttons = $$('[data-search-index]', $('#searchResults'));
      if (!buttons.length) return;
      activeIndex = (index + buttons.length) % buttons.length;
      buttons.forEach((button, buttonIndex) => {
        const active = buttonIndex === activeIndex;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', String(active));
      });
      const activeButton = buttons[activeIndex];
      $('#globalSearch').setAttribute('aria-activedescendant', activeButton.id);
      activeButton.scrollIntoView({ block: 'nearest' });
    }

    function render() {
      const value = $('#globalSearch').value;
      const box = $('#searchResults');
      const results = searchAll(data, value);
      activeIndex = -1;
      currentResults = results;
      if (!value.trim()) {
        close();
        return;
      }
      box.hidden = false;
      $('#globalSearch').setAttribute('aria-expanded', 'true');
      $('#globalSearch').removeAttribute('aria-activedescendant');
      box.innerHTML = results.length ? ['人物', '勢力', '事件'].map(type => {
        const group = results.map((result, index) => ({ result, index })).filter(item => item.result.type === type);
        if (!group.length) return '';
        const groupId = `search-group-${type === '人物' ? 'people' : type === '勢力' ? 'factions' : 'events'}`;
        return `<section class="search-group" role="group" aria-labelledby="${groupId}"><div id="${groupId}" class="search-group-title"><strong>${type}</strong><span>${group.length}件</span></div>${group.map(({ result, index }) => `<button id="search-result-${index}" type="button" class="search-result" data-search-index="${index}" role="option" aria-selected="false" tabindex="-1"><span><strong>${highlightMatch(result.title, value)}</strong>${result.sub ? `<small>${highlightMatch(result.sub, value)}</small>` : ''}</span></button>`).join('')}</section>`;
      }).join('') : '<div class="notice" style="margin:0">該当する項目がありません。</div>';
      $$('[data-search-index]', box).forEach(button => button.addEventListener('click', () => {
        const result = results[Number(button.dataset.searchIndex)];
        selectResult(result);
      }));
    }

    function handleKeydown(event) {
      // keyCode 229 also covers IMEs that finish composition before keydown.
      if (event.isComposing || event.keyCode === 229) return false;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (!currentResults.length) return false;
        event.preventDefault();
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        setActive(activeIndex < 0 ? (direction > 0 ? 0 : currentResults.length - 1) : activeIndex + direction);
        return true;
      }
      if (event.key === 'Enter' && activeIndex >= 0) {
        event.preventDefault();
        selectResult(currentResults[activeIndex]);
        return true;
      }
      if (event.key === 'Escape') {
        const input = $('#globalSearch');
        input.value = '';
        close();
        input.blur();
        return true;
      }
      return false;
    }

    return { clearStatus, close, handleKeydown, render };
  }

  return { createSearchController, escapeHtml, highlightMatch, normalise, searchAll };
}));

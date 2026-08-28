(function exposeSearch(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BM_SEARCH = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  function normalise(value) {
    return String(value || '').toLowerCase().replace(/[\s・･]/g, '');
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, character => ({
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
    data.people.forEach(person => {
      const haystack = normalise([
        person.name,
        person.kana,
        ...person.aliases,
        person.oneLine,
        ...Object.values(person.statuses).flatMap(status => [status.display, status.role, status.stance])
      ].join(' '));
      if (haystack.includes(normalizedQuery)) {
        results.push({ type: '人物', title: person.name, sub: person.aliases.slice(0, 3).join('／'), id: person.id });
      }
    });
    Object.entries(data.factions).forEach(([name, faction]) => {
      if (normalise([name, ...faction.aliases, faction.summary].join(' ')).includes(normalizedQuery)) {
        results.push({ type: '勢力', title: name, sub: faction.summary, id: name });
      }
    });
    Object.entries(data.events).forEach(([id, event]) => {
      if (normalise([event.title, event.description, ...event.issues, ...event.causes, ...event.results].join(' ')).includes(normalizedQuery)) {
        results.push({ type: '事件', title: event.title, sub: event.date, id });
      }
    });
    const limits = { '人物': 8, '勢力': 3, '事件': 3 };
    return ['人物', '勢力', '事件'].flatMap(type => results.filter(result => result.type === type).slice(0, limits[type]));
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
      return false;
    }

    return { clearStatus, close, handleKeydown, render };
  }

  return { createSearchController, highlightMatch, normalise, searchAll };
}));

(function exposeSearch(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BM_SEARCH = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  function normalise(value) {
    return String(value || '').toLowerCase().replace(/[\s・･]/g, '');
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
    return results.slice(0, 14);
  }

  function createSearchController(context) {
    const { $, $$, actions, data } = context;
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

    function selectResult(result) {
      close();
      $('#globalSearch').value = '';
      if (result.type === '人物') actions.selectPerson(result.id, 'people');
      else if (result.type === '勢力') actions.selectFaction(result.id);
      else actions.openEvent(result.id);
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
      box.innerHTML = results.length ? results.map((result, index) => `<button id="search-result-${index}" type="button" class="search-result" data-search-index="${index}" role="option" aria-selected="false" tabindex="-1"><span class="search-type">${result.type}</span><span><strong>${result.title}</strong><small>${result.sub}</small></span></button>`).join('') : '<div class="notice" style="margin:0">該当する項目がありません。</div>';
      $$('[data-search-index]', box).forEach(button => button.addEventListener('click', () => {
        const result = results[Number(button.dataset.searchIndex)];
        selectResult(result);
      }));
    }

    function handleKeydown(event) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (!currentResults.length) return false;
        event.preventDefault();
        setActive(activeIndex + (event.key === 'ArrowDown' ? 1 : -1));
        return true;
      }
      if (event.key === 'Enter' && activeIndex >= 0) {
        event.preventDefault();
        selectResult(currentResults[activeIndex]);
        return true;
      }
      return false;
    }

    return { close, handleKeydown, render };
  }

  return { createSearchController, normalise, searchAll };
}));

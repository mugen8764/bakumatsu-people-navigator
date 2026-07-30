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

    function render() {
      const value = $('#globalSearch').value;
      const box = $('#searchResults');
      const results = searchAll(data, value);
      if (!value.trim()) {
        box.hidden = true;
        box.innerHTML = '';
        return;
      }
      box.hidden = false;
      box.innerHTML = results.length ? results.map((result, index) => `<button type="button" class="search-result" data-search-index="${index}"><span class="search-type">${result.type}</span><span><strong>${result.title}</strong><small>${result.sub}</small></span></button>`).join('') : '<div class="notice" style="margin:0">該当する項目がありません。</div>';
      $$('[data-search-index]', box).forEach(button => button.addEventListener('click', () => {
        const result = results[Number(button.dataset.searchIndex)];
        box.hidden = true;
        $('#globalSearch').value = '';
        if (result.type === '人物') actions.selectPerson(result.id, 'people');
        else if (result.type === '勢力') actions.selectFaction(result.id);
        else actions.openEvent(result.id);
      }));
    }

    return { render };
  }

  return { createSearchController, normalise, searchAll };
}));

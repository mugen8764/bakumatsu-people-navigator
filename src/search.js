(function exposeSearch(root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./domain.js') : root.BM_DOMAIN);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BM_SEARCH = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, domain => {
  'use strict';

  function normalise(value) {
    return String(value || '').toLowerCase().replace(/[\s・･]/g, '');
  }

  // Search loads before renderers; escaping must stay identical (unit-tested).
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
    const range = index >= 0 ? [index, index + needle.length] : normalizedMatchRange(text, needle);
    if (!range) return escapeHtml(text);
    return `${escapeHtml(text.slice(0, range[0]))}<mark>${escapeHtml(text.slice(range[0], range[1]))}</mark>${escapeHtml(text.slice(range[1]))}`;
  }

  function normalizedMatchRange(text, query) {
    const needle = normalise(query);
    const pattern = Array.from(needle, character => character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s・･]*');
    const match = needle && new RegExp(pattern, 'i').exec(text);
    return match ? [match.index, match.index + match[0].length] : null;
  }

  function matchSnippet(value, query) {
    const text = String(value || '');
    if (text.length <= 48) return text;
    const range = normalizedMatchRange(text, query) || [0, 0];
    const start = Math.max(0, range[0] - 12);
    const end = Math.min(text.length, Math.max(start + 48, range[1] + 12));
    return `${start ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
  }

  function searchAll(data, query) {
    const normalizedQuery = normalise(query);
    if (!normalizedQuery) return [];
    const results = [];
    const matches = value => normalise(value).includes(normalizedQuery);
    const scenes = new Map(data.scenes.map(scene => [scene.id, scene]));
    data.people.forEach(person => {
      const statuses = Object.entries(person.statuses);
      const names = [person.name, person.kana, ...person.aliases, ...statuses.map(([, status]) => status.display),
        ...person.aliases.flatMap(name => domain.readingKanasFor(person, name))];
      const matchStatus = field => statuses.find(([, status]) => matches(status[field]));
      const statusMatchText = (entry, field) => {
        const scene = scenes.get(entry[0]);
        return `${scene ? `${scene.year}年｜` : ''}${matchSnippet(entry[1][field], query)}`;
      };
      // Search-only names do not establish when a name came into use.
      const laterName = (person.laterNames || []).find(matches);
      let rank;
      let matchReason;
      let sub;
      if (names.some(name => normalise(name) === normalizedQuery)) rank = 0;
      else if (names.some(matches)) rank = 1;
      else if (laterName) {
        rank = normalise(laterName) === normalizedQuery ? 0 : 1;
        sub = `検索用の呼び名：${laterName}`;
        matchReason = '別名一致';
      } else {
        const role = matchStatus('role');
        const stance = matchStatus('stance');
        if (role) {
          rank = 2;
          matchReason = '役職一致';
          sub = statusMatchText(role, 'role');
        } else if (matches(person.oneLine)) {
          rank = 3;
          matchReason = '人物本文一致';
          sub = matchSnippet(person.oneLine, query);
        } else if (stance) {
          rank = 3;
          matchReason = '人物本文一致';
          sub = statusMatchText(stance, 'stance');
        } else return;
      }
      if (!matchReason) {
        sub = names.find(name => normalise(name) === normalizedQuery) || names.find(matches);
        matchReason = sub === person.name ? '基本名一致' : sub === person.kana ? '読み一致'
          : statuses.some(([, status]) => status.display === sub) ? '当時名一致'
          : person.aliases.includes(sub) ? '別名一致' : '読み一致';
        const office = matchReason === '別名一致' && statuses.find(([, status]) => normalise(status.role).includes(normalise(sub)));
        if (office) {
          matchReason = '役職一致';
          sub = statusMatchText(office, 'role');
        }
      }
      results.push({ type: '人物', title: person.name, sub, id: person.id, rank, matchReason });
    });
    function addResult(type, title, fields, reasons, id, date, rank) {
      const text = fields.join(' ');
      if (!matches(text)) return;
      const index = fields.findIndex(matches);
      results.push({ type, title, id, rank,
        sub: matchSnippet(index === 0 && date ? date : fields[index] || text, query),
        matchReason: reasons[index] || (type === '勢力' ? '勢力一致' : '事件内一致') });
    }
    Object.entries(data.factions).forEach(([name, faction]) => {
      const fields = [name, ...faction.aliases, faction.summary];
      addResult('勢力', name, fields, fields.map(() => '勢力一致'), name);
    });
    const peopleById = new Map(data.people.map(person => [person.id, person]));
    Object.values(data.incidents || {}).forEach(incident => {
      const names = incident.participants.flatMap(item => [item.displayName,
        ...domain.readingKanasFor(peopleById.get(item.personId), item.displayName)]);
      addResult('事件', incident.title, [incident.title, incident.summary, ...names],
        ['事件名一致', '事件本文一致', ...names.map(() => '参加者一致')], incident.id, incident.date, -1);
    });
    Object.entries(data.events).forEach(([id, event]) => {
      const body = [event.description, ...event.issues, ...event.causes, ...event.results];
      addResult('事件', event.title, [event.title, ...body],
        ['事件名一致', ...body.map(() => '事件本文一致')], id, event.date);
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
        return `<section class="search-group" role="group" aria-labelledby="${groupId}"><div id="${groupId}" class="search-group-title"><strong>${type === '勢力' ? '勢力・分野' : type}</strong><span>${group.length}件</span></div>${group.map(({ result, index }) => `<button id="search-result-${index}" type="button" class="search-result" data-search-index="${index}" role="option" aria-selected="false" tabindex="-1"><span><strong>${highlightMatch(result.title, value)}</strong><small class="search-match-summary"><span class="search-match-reason">${escapeHtml(result.matchReason)}</span> ${highlightMatch(result.sub, value)}</small></span></button>`).join('')}</section>`;
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

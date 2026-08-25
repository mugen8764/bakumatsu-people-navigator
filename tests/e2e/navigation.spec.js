const { expect, test } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test('all six primary views render without a page error', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/');

  await expect(page.locator('h1')).toHaveText('幕末人物・勢力ナビ');
  await expect(page.locator('#personCards .card-button')).toHaveCount(7);

  for (const view of ['people', 'factions', 'relations', 'map', 'events', 'sources']) {
    await page.locator(`.tab[data-view="${view}"]`).click();
    await expect(page.locator(`#view-${view}`)).toBeVisible();
  }

  await expect(page.locator('#sourceCatalog .source')).toHaveCount(207);
  const preciseSource = page.locator('#sourceCatalog .source', { hasText: '木戸孝允遺文集' });
  await expect(preciseSource.locator('.source-meta')).toContainText('該当箇所: 目次144頁（0110.jp2）');
  await expect(preciseSource.locator('.source-meta')).toContainText('内容確認日: 2026-07-31');
  await expect(page.locator('#sourcePrecisionNote')).toContainText('URLの到達確認日ではありません');
  await expect(page.locator('#view-sources')).toContainText('再利用と公開情報');
  await expect(page.locator('#view-sources')).toContainText('CC BY 4.0');
  expect(pageErrors).toEqual([]);
});

test('footer links expose reader-facing publication information', async ({ page }) => {
  await page.goto('/#scene=1866-satcho&view=people&person=kido&faction=長州藩');

  await page.locator('#footerSources').click();
  await expect(page.locator('#view-sources')).toBeVisible();
  await expect(page.locator('#view-sources')).toBeFocused();
  await expect(page).toHaveURL(/scene=1866-satcho&view=sources&person=kido/);

  await expect(page.locator('#view-sources a[href="LICENSE"]')).toHaveText('ライセンス全文');
  await expect(page.locator('a[href="https://github.com/mugen8764/bakumatsu-people-navigator"]')).toHaveCount(2);
  await expect(page.locator('footer a[href="README.md"]')).toHaveCount(0);
  await expect(page.locator('footer a[href="SOURCES.md"]')).toHaveCount(0);
});

test('brand icon and title restore the complete initial state', async ({ page }) => {
  await page.goto('/#scene=1867-taisei&view=relations&person=kido&faction=長州藩');
  await page.locator('#calendarMode').selectOption('japanese');
  await page.locator('#relationType').selectOption('対立');
  await page.locator('#globalSearch').fill('大政奉還');
  await expect(page.locator('#searchResults')).toBeVisible();

  await page.locator('#brandTitleHome').click();

  await expect(page.locator('#sceneSelect')).toHaveValue('0');
  await expect(page.locator('#tab-people')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#view-people')).toBeVisible();
  await expect(page.locator('#personDetail .detail-title')).toHaveText('阿部正弘');
  await expect(page.locator('[data-person-filter="すべて"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#calendarMode')).toHaveValue('both');
  await expect(page.locator('#relationType')).toHaveValue('all');
  await expect(page.locator('#globalSearch')).toHaveValue('');
  await expect(page.locator('#searchResults')).toBeHidden();
  await expect(page).toHaveURL(/#scene=1853-blackships&view=people&person=abe&faction=%E5%B9%95%E5%BA%9C$/);

  await page.locator('#nextScene').click();
  await page.locator('#brandMarkHome').click();
  await expect(page.locator('#sceneSelect')).toHaveValue('0');
  await expect(page.locator('#personDetail .detail-title')).toHaveText('阿部正弘');
  await page.reload();
  await expect(page.locator('#sceneSelect')).toHaveValue('0');
  await expect(page.locator('#personDetail .detail-title')).toHaveText('阿部正弘');
});

test('all primary views stay inside a 320px document viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await page.goto('/');

  for (const view of ['people', 'factions', 'relations', 'map', 'events', 'sources']) {
    await page.locator(`.tab[data-view="${view}"]`).click();
    await expect(page.locator(`#view-${view}`)).toBeVisible();
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHorizontalOverflow, `${view} view has document-level horizontal overflow`).toBe(false);
  }
});

test('scene details start compact and reveal context on demand', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');

  const details = page.locator('#sceneDetails');
  await expect(details).not.toHaveAttribute('open', '');
  await expect(page.locator('#sceneChanges')).toBeHidden();
  await expect(page.locator('#scenePeople')).toBeHidden();
  const firstCard = await page.locator('#personCards .card-button').first().boundingBox();
  expect(firstCard.y).toBeLessThan(720);

  await details.locator('summary').click();
  await expect(details).toHaveAttribute('open', '');
  await expect(page.locator('#sceneChanges')).toBeVisible();
  await expect(page.locator('#scenePeople')).toBeVisible();
  await details.locator('summary').click();
  await expect(page.locator('#sceneChanges')).toBeHidden();

  await page.setViewportSize({ width: 320, height: 780 });
  await page.reload();
  const mobileFirstCard = await page.locator('#personCards .card-button').first().boundingBox();
  expect(mobileFirstCard.y).toBeLessThan(780);
});

test('alias search and timeline changes preserve the selected person', async ({ page }) => {
  await page.goto('/');
  await page.locator('#globalSearch').fill('桂小五郎');
  await page.locator('.search-result', { hasText: '木戸孝允' }).click();

  await expect(page.locator('#personDetail .detail-title')).toHaveText('桂小五郎');
  await expect(page).toHaveURL(/person=kido/);

  await page.locator('#sceneSelect').selectOption('11');
  await expect(page.locator('#personDetail .detail-title')).toHaveText('木戸孝允');
  await expect(page).toHaveURL(/scene=1867-taisei/);

  await page.reload();
  await expect(page.locator('#personDetail .detail-title')).toHaveText('木戸孝允');
  await expect(page.locator('#sceneSelect')).toHaveValue('11');
});

test('browser back and forward revisit deliberate person and view selections', async ({ page }) => {
  await page.goto('/');
  await page.locator('#globalSearch').fill('桂小五郎');
  await page.locator('.search-result', { hasText: '木戸孝允' }).click();
  await expect(page.locator('#personDetail .detail-title')).toHaveText('桂小五郎');

  await page.locator('#tab-relations').click();
  await expect(page.locator('#view-relations')).toBeVisible();

  await page.goBack();
  await expect(page.locator('#view-people')).toBeVisible();
  await expect(page.locator('#personDetail .detail-title')).toHaveText('桂小五郎');

  await page.goBack();
  await expect(page.locator('#view-people')).toBeVisible();
  await expect(page.locator('#personDetail .detail-title')).toHaveText('阿部正弘');

  await page.goForward();
  await expect(page.locator('#personDetail .detail-title')).toHaveText('桂小五郎');
});

test('person filters follow displayed affiliations and later-name labels follow chronology', async ({ page }) => {
  await page.goto('/#scene=1853-blackships&view=people&person=perry&faction=幕府');

  const perryCard = page.locator('[data-person-card="perry"]');
  await expect(perryCard.locator('.name')).toHaveText('ペリー');
  await expect(perryCard.locator('.later-name')).toHaveCount(0);
  await expect(page.locator('#personDetail')).not.toContainText('後の名前：マシュー・ペリー');

  await page.locator('#sceneSelect').selectOption('2');
  await expect(page.locator('[data-person-filter="土佐藩"]')).toBeVisible();

  const displayedFactions = await page.locator('#personCards .card-foot span:first-child').allTextContents();
  const filterNames = await page.locator('#personFilters [data-person-filter]').allTextContents();
  for (const faction of new Set(displayedFactions)) expect(filterNames).toContain(faction);

  await page.locator('[data-person-filter="土佐藩"]').click();
  const yodoCard = page.locator('[data-person-card="yodo"]');
  await expect(yodoCard.locator('.name')).toHaveText('山内豊信');
  await expect(yodoCard.locator('.later-name')).toHaveText('後の名：山内容堂');

  await yodoCard.click();
  await expect(page.locator('#personDetail .detail-title')).toHaveText('山内豊信');
  await expect(page.locator('#personDetail .aliases').first()).toHaveText('後の名前：山内容堂');
});

test('person, relation, map, and event views remain coordinated', async ({ page }) => {
  await page.goto('/#scene=1866-satcho&view=people&person=kido&faction=長州藩');
  await expect(page.locator('#personDetail .detail-title')).toHaveText('木戸準一郎');
  await expect(page.locator('#personDetail .event-peers')).toContainText('直接の人物関係を示すものではありません');
  await expect(page.locator('#personDetail [data-event-peer]')).toHaveCount(3);
  await expect(page.locator('#personDetail [data-event-peer="komatsu"]')).toHaveText('小松帯刀');
  await expect(page.locator('#personDetail [data-event-peer="saigo"]')).toHaveCount(0);

  await page.locator('#personDetail [data-event-peer="komatsu"]').click();
  await expect(page.locator('#personDetail .detail-title')).toHaveText('小松帯刀');
  await expect(page).toHaveURL(/person=komatsu/);

  await page.locator('#personDetail [data-event-peer="kido"]').click();
  await expect(page.locator('#personDetail .detail-title')).toHaveText('木戸準一郎');

  await page.locator('#personToGraph').click();
  await expect(page.locator('#view-relations')).toBeVisible();
  expect(await page.locator('#relationGraph [data-graph-person]').count()).toBeGreaterThan(1);

  await page.locator('.tab[data-view="map"]').click();
  await expect(page.locator('#historyMap .map-japan')).toHaveCount(1);
  expect(await page.locator('#placeList .list-item').count()).toBeGreaterThan(0);
  const kyotoPlace = page.locator('[data-map-place-card="kyoto"]');
  await expect(kyotoPlace.locator('[data-map-person="kido"]')).toBeVisible();
  await expect(kyotoPlace.locator('[data-map-event="satcho"]')).toBeVisible();
  const kyotoMarker = page.locator('[data-map-place="kyoto"]');
  await kyotoMarker.focus();
  await kyotoMarker.press('Enter');
  await expect(kyotoPlace).toHaveClass(/selected/);
  await expect(kyotoMarker).toHaveAttribute('aria-pressed', 'true');
  await expect(kyotoPlace.locator('[data-map-person="kido"]')).toBeFocused();

  await page.locator('[data-map-label-trigger="kyoto"]').click();
  await expect(kyotoPlace).toHaveClass(/selected/);
  await expect(page.locator('[data-map-label="kyoto"]')).toHaveClass(/selected/);
  await expect(kyotoPlace.locator('[data-map-person="kido"]')).toBeFocused();

  const hagiName = page.locator('[data-map-place-name="hagi"]');
  await hagiName.click();
  await expect(page.locator('[data-map-place-card="hagi"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-map-place="hagi"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(hagiName).toHaveAttribute('aria-pressed', 'true');
  await expect(hagiName).toBeFocused();

  await page.locator('[data-map-place-card="hagi"] [data-map-person="kido"]').click();
  await expect(page.locator('#view-people')).toBeVisible();
  await expect(page.locator('#personDetail .detail-title')).toHaveText('木戸準一郎');

  await page.locator('.tab[data-view="map"]').click();
  await page.locator('[data-map-place-card="nagasaki"] [data-map-event="satcho"]').click();
  await expect(page.locator('#view-events')).toBeVisible();
  await expect(page.locator('#eventDetail .detail-title')).not.toBeEmpty();
  await expect(page.locator('#eventDetail [data-event-person="kido"]')).toBeVisible();
});

test('nearby Tokyo Bay map labels do not overlap', async ({ page }) => {
  await page.goto('/#scene=1853-blackships&view=map&person=perry&faction=幕府');

  const labels = page.locator('#mapLabelLayer .map-label');
  expect(await labels.count()).toBeGreaterThan(3);
  const boxes = await labels.evaluateAll(elements => elements.map(element => ({
    id: element.dataset.mapLabel,
    box: element.getBoundingClientRect().toJSON()
  })));
  boxes.forEach((label, index) => boxes.slice(index + 1).forEach(other => {
    const gap = 1;
    const overlaps = label.box.left < other.box.right + gap && label.box.right + gap > other.box.left
      && label.box.top < other.box.bottom + gap && label.box.bottom + gap > other.box.top;
    expect(overlaps, `${label.id} overlaps ${other.id}`).toBe(false);
  }));
});

test('map labels keep their position when the selected person changes', async ({ page }) => {
  await page.goto('/#scene=1868-toba&view=map&person=katsu&faction=幕府');

  const osaka = page.locator('[data-map-label="osaka"]');
  const before = await osaka.evaluate(element => ({
    x: element.getAttribute('x'),
    y: element.getAttribute('y'),
    anchor: element.getAttribute('text-anchor')
  }));
  await page.evaluate(() => {
    location.hash = 'scene=1868-toba&view=map&person=enomoto&faction=幕府';
  });
  await expect(page.locator('#mapTitle')).toContainText('榎本武揚');
  const after = await osaka.evaluate(element => ({
    x: element.getAttribute('x'),
    y: element.getAttribute('y'),
    anchor: element.getAttribute('text-anchor')
  }));

  expect(after).toEqual(before);
});

test('selecting a mapped place zooms its region and can return to Japan view', async ({ page }) => {
  await page.goto('/#scene=1853-blackships&view=map&person=perry&faction=幕府');

  const map = page.locator('#historyMap');
  const reset = page.locator('#resetMapView');
  await expect(map).toHaveAttribute('viewBox', '0 0 720 770');
  await expect(reset).toBeHidden();
  await page.locator('[data-map-label-trigger="uraga"]').click();
  const zoomedViewBox = await map.getAttribute('viewBox');
  expect(zoomedViewBox).not.toBe('0 0 720 770');
  await expect(map).toHaveAttribute('aria-label', /浦賀・久里浜周辺を拡大/);
  await expect(reset).toBeVisible();

  await reset.click();
  await expect(map).toHaveAttribute('viewBox', '0 0 720 770');
  await expect(reset).toBeHidden();
  await expect(page.locator('[data-map-place-card="uraga"]')).toHaveClass(/selected/);
});

test('map place selection survives scene and view redraws', async ({ page }) => {
  await page.goto('/#scene=1866-satcho&view=map&person=kido&faction=長州藩');

  await expect(page.locator('#mapDescription')).toContainText('地図上の地名、右欄の地名から地点を選ぶと周辺を拡大します');
  const hagiCard = page.locator('[data-map-place-card="hagi"]');
  const hagiName = page.locator('[data-map-place-name="hagi"]');
  const hagiMarker = page.locator('[data-map-place="hagi"]');
  await hagiName.click();
  const zoomedViewBox = await page.locator('#historyMap').getAttribute('viewBox');
  expect(zoomedViewBox).not.toBe('0 0 720 770');
  await page.locator('#sceneSelect').selectOption('10');
  await expect(hagiCard).toHaveClass(/selected/);
  await expect(hagiName).toHaveAttribute('aria-pressed', 'true');
  await expect(hagiMarker).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#historyMap')).toHaveAttribute('viewBox', zoomedViewBox);

  await page.locator('#tab-people').click();
  await page.locator('#tab-map').click();
  await expect(hagiCard).toHaveClass(/selected/);
  await expect(hagiName).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#historyMap')).toHaveAttribute('viewBox', zoomedViewBox);
});

test('right-column place names remain selectable outside the displayed map', async ({ page }) => {
  await page.goto('/#scene=1865-choshu&view=map&person=takasugi&faction=長州藩');

  const shanghaiName = page.locator('[data-map-place-name="shanghai"]');
  await expect(page.locator('[data-map-place="shanghai"]')).toHaveCount(0);
  await shanghaiName.click();
  await expect(page.locator('[data-map-place-card="shanghai"]')).toHaveClass(/selected/);
  await expect(shanghaiName).toHaveAttribute('aria-pressed', 'true');
  await expect(shanghaiName).toBeFocused();
  await expect(page.locator('#historyMap')).toHaveAttribute('viewBox', '0 0 720 770');
  await expect(page.locator('#resetMapView')).toBeHidden();
});

test('scene board exposes the event cast and factions as direct navigation', async ({ page }) => {
  await page.goto('/#scene=1866-satcho&view=people&person=kido&faction=長州藩');
  await page.locator('#sceneDetails summary').click();

  await expect(page.locator('#scenePeople [data-scene-person]')).toHaveCount(6);
  await expect(page.locator('#sceneFactions [data-scene-faction]')).toHaveCount(3);
  await expect(page.locator('#sceneInsights .insight')).toHaveCount(3);
  await expect(page.locator('#sceneChangesHeading')).toHaveText('前の時点から');
  await expect(page.locator('#sceneChangesPeriod')).toContainText('1865「長州藩政の転換」 → 1866');
  await expect(page.locator('[data-scene-change-group="updated"] .scene-change-group-heading span')).toHaveText('5');
  await expect(page.locator('[data-scene-change-group="updated"]')).toContainText('桂小五郎 → 木戸準一郎');
  await expect(page.locator('[data-scene-change-group="started"] .scene-change-group-heading span')).toHaveText('6');
  await expect(page.locator('[data-scene-change-group="started"]')).toContainText('薩長同盟で協力');
  await expect(page.locator('[data-scene-change-group="ended"]')).toContainText('海軍構想の師弟');

  await page.locator('[data-scene-person="ryoma"]').click();
  await expect(page.locator('#personDetail .detail-title')).toHaveText('坂本龍馬');
  await expect(page).toHaveURL(/person=ryoma/);

  await page.locator('[data-scene-faction="薩摩藩"]').click();
  await expect(page.locator('#factionDetail .detail-title')).toHaveText('薩摩藩');
  await expect(page).toHaveURL(/view=factions/);
});

test('relation view distinguishes newly started and recently ended ties', async ({ page }) => {
  await page.goto('/#scene=1867-taisei&view=relations&person=yoshinobu&faction=幕府');

  await expect(page.locator('#relationChanges')).toContainText('1866 → 1867');
  await expect(page.locator('#relationChanges')).toContainText('この時点から');
  await expect(page.locator('#relationChanges')).toContainText('辞官・納地処分');
  await expect(page.locator('#relationChanges')).toContainText('前の時点まで');
  await expect(page.locator('#relationChanges')).toContainText('将軍家の継承競争と補佐');
  await expect(page.locator('#graphExplanation .relation-change-badge')).toHaveCount(2);
});

test('mobile relation view uses readable cards instead of a scaled graph', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await page.goto('/#scene=1866-satcho&view=relations&person=kido&faction=長州藩');

  await expect(page.locator('#relationGraph')).toBeHidden();
  await expect(page.locator('#relationMobile')).toBeVisible();
  await expect(page.locator('#relationMobile [data-mobile-relation-person]')).toHaveCount(3);
  await expect(page.locator('#relationMobile')).toContainText('高杉晋作');
  await expect(page.locator('#relationMobile')).toContainText('長州改革派');

  await page.locator('[data-mobile-relation-person="saigo"]').click();
  await expect(page).toHaveURL(/person=saigo/);
  await expect(page.locator('.relation-mobile-center')).toContainText('西郷吉之助');
});

test('keyboard shortcut focuses and dismisses global search', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('/');
  await expect(page.locator('#globalSearch')).toBeFocused();
  await page.locator('#globalSearch').fill('大政奉還');
  await expect(page.locator('#searchResults')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#searchResults')).toBeHidden();
  await expect(page.locator('#globalSearch')).toHaveValue('');
});

test('keyboard focus remains visible at 320px in dark mode', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/');

  await page.keyboard.press('/');
  const search = page.locator('#globalSearch');
  await expect(search).toBeFocused();
  expect(await search.evaluate(element => getComputedStyle(element).boxShadow)).not.toBe('none');

  await search.fill('桂小五郎');
  await search.press('ArrowDown');
  await expect(search).toHaveAttribute('aria-activedescendant', 'search-result-0');
  await search.press('Enter');
  await expect(page.locator('#personDetail .detail-title')).toHaveText('桂小五郎');
});

test('timeline transport, calendar mode, and faction selection remain usable', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#sceneSelect')).toHaveValue('0');
  await expect(page.locator('#sceneChangesHeading')).toHaveText('ここからたどる');
  await expect(page.locator('#sceneChangeGroups')).toContainText('「黒船来航」から全16場面をたどります');

  await page.locator('#nextScene').click();
  await expect(page.locator('#sceneSelect')).toHaveValue('1');
  await expect(page.locator('#sceneChangesHeading')).toHaveText('前の時点から');
  await page.locator('#calendarMode').selectOption('japanese');
  await expect(page.locator('#sceneYear')).toHaveText('嘉永7年／安政元年');

  await page.locator('#playScenes').click();
  await expect(page.locator('#playScenes')).toContainText('一時停止');
  await expect.poll(() => page.locator('#sceneSelect').inputValue(), { timeout: 4_000 }).not.toBe('1');
  await page.locator('#playScenes').click();
  await expect(page.locator('#playScenes')).toContainText('再生');

  await page.locator('.tab[data-view="factions"]').click();
  await page.locator('[data-faction-card="幕府"]').click();
  await expect(page.locator('#factionDetail .detail-title')).toHaveText('幕府');
  await expect(page).toHaveURL(/faction=%E5%B9%95%E5%BA%9C/);
});

test('changing the hash after load updates the visible state', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    location.hash = 'scene=1867-taisei&view=relations&person=kido&faction=長州藩';
  });
  await expect(page.locator('#view-relations')).toBeVisible();
  await expect(page.locator('#sceneSelect')).toHaveValue('11');
  await expect(page.locator('#relationGraph .node.selected')).toHaveAttribute('data-graph-person', 'kido');
});

test('tabs, search results, and relation nodes support keyboard operation', async ({ page }) => {
  await page.goto('/');

  const peopleTab = page.locator('#tab-people');
  await expect(peopleTab).toHaveAttribute('aria-selected', 'true');
  await peopleTab.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#tab-factions')).toBeFocused();
  await expect(page.locator('#tab-factions')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#view-factions')).toBeVisible();

  const search = page.locator('#globalSearch');
  await search.fill('桂小五郎');
  await expect(search).toHaveAttribute('aria-expanded', 'true');
  await search.press('ArrowDown');
  await expect(search).toHaveAttribute('aria-activedescendant', 'search-result-0');
  await search.press('Enter');
  await expect(page.locator('#personDetail .detail-title')).toHaveText('桂小五郎');
  await expect(search).toHaveAttribute('aria-expanded', 'false');

  await page.locator('#sceneSelect').selectOption('9');
  await page.locator('#tab-relations').click();
  const otherNode = page.locator('#relationGraph [data-graph-person]:not([data-graph-person="kido"])').first();
  const nextPerson = await otherNode.getAttribute('data-graph-person');
  await otherNode.focus();
  await otherNode.press('Enter');
  await expect(page).toHaveURL(new RegExp(`person=${nextPerson}`));
});

test('missing generated data shows a recovery message instead of a blank page', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.route('**/data.js', route => route.fulfill({
    contentType: 'text/javascript',
    body: 'window.BM_DATA = null;'
  }));

  await page.goto('/');
  await expect(page.locator('#appStatus')).toBeVisible();
  await expect(page.locator('#appStatus')).toContainText('表示データを読み込めませんでした');
  await expect(page.locator('#appStatus')).toContainText('data.js');
  expect(pageErrors).toEqual([]);
});

test('reduced motion preference disables optional animation and transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  await expect(page.locator('#sceneProgress')).toHaveCSS('transition-duration', '0s');
  await page.locator('#tab-map').click();
  const activeMarker = page.locator('#historyMap .map-active').first();
  await expect(activeMarker).toHaveCSS('animation-name', 'none');
});

test('404 page recovers the correct site root from a nested path', async ({ page }) => {
  const response = await page.goto('/missing/nested/page');
  expect(response.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('ページが見つかりません');
  await expect(page.locator('#homeLink')).toHaveAttribute('href', '/');
  await page.locator('#homeLink').click();
  await expect(page.locator('h1')).toHaveText('幕末人物・勢力ナビ');
});

test('review status follows item-level calibration', async ({ page }) => {
  await page.route('**/data.js', async route => {
    const response = await route.fetch();
    const script = await response.text();
    const data = JSON.parse(script.replace(/^window\.BM_DATA=/, '').replace(/;\s*$/, ''));
    const relation = data.relations.find(item => item.a === 'kido' && item.b === 'takasugi');
    relation.evidence.reviewStatus = 'needs_review';
    await route.fulfill({
      response,
      contentType: 'application/javascript',
      body: `window.BM_DATA=${JSON.stringify(data)};`
    });
  });

  await page.goto('/#scene=1866-satcho&view=people&person=kido&faction=長州藩');
  await expect(page.locator('#sceneCounts .review-status')).toHaveCount(0);
  await expect(page.locator('#personDetail .snapshot .review-status')).toHaveCount(0);

  await page.locator('#tab-relations').click();
  await expect(page.locator('#graphExplanation .review-status').first()).toHaveText('出典校正中');

  await page.locator('#tab-map').click();
  await expect(page.locator('#placeList .review-status')).toHaveCount(0);
});

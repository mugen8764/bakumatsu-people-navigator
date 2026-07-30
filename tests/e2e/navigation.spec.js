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

  await expect(page.locator('#sourceCatalog .source')).toHaveCount(6);
  await expect(page.locator('#view-sources')).toContainText('data/*.json');
  expect(pageErrors).toEqual([]);
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

test('person, relation, map, and event views remain coordinated', async ({ page }) => {
  await page.goto('/#scene=1866-satcho&view=people&person=kido&faction=長州藩');
  await expect(page.locator('#personDetail .detail-title')).toHaveText('桂小五郎');

  await page.locator('#personToGraph').click();
  await expect(page.locator('#view-relations')).toBeVisible();
  expect(await page.locator('#relationGraph [data-graph-person]').count()).toBeGreaterThan(1);

  await page.locator('.tab[data-view="map"]').click();
  await expect(page.locator('#historyMap .map-japan')).toHaveCount(1);
  expect(await page.locator('#placeList .list-item').count()).toBeGreaterThan(0);

  await page.locator('.tab[data-view="events"]').click();
  await expect(page.locator('#eventDetail .detail-title')).not.toBeEmpty();
  await expect(page.locator('#eventDetail [data-event-person="kido"]')).toBeVisible();
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

test('timeline transport, calendar mode, and faction selection remain usable', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#sceneSelect')).toHaveValue('0');

  await page.locator('#nextScene').click();
  await expect(page.locator('#sceneSelect')).toHaveValue('1');
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

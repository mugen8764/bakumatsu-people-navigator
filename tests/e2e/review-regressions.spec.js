const { expect, test } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const data = require('../../data.json');
const crossBrowser = { tag: '@cross-browser' };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test('filtered mobile search returns to the selected person card', crossBrowser, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto('/');
  await page.locator('[data-person-filter="幕府"]').click();
  await page.locator('#globalSearch').fill('西郷');
  await page.locator('.search-result strong', { hasText: /^西郷隆盛$/ }).click();
  await expect(page.locator('#personDetail .detail-title')).toHaveText('西郷吉之助');
  await expect(page.locator('[data-person-filter="すべて"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#personBackToList').click();
  await expect(page.locator('[data-person-card="saigo"]')).toBeFocused();
  await expect(page.locator('[data-person-card="saigo"]')).toBeInViewport();

  await page.goBack();
  await expect(page.locator('#personDetail .detail-title')).toHaveText('阿部正弘');
  await page.goForward();
  await expect(page.locator('[data-person-card="saigo"]')).toHaveAttribute('aria-pressed', 'true');
});

test('the list return still works when a later filter hides the selected card', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await page.goto('/#scene=1853-blackships&view=people&person=saigo');
  await page.locator('[data-person-filter="幕府"]').click();
  await expect(page.locator('[data-person-card="saigo"]')).toHaveCount(0);
  await page.locator('#personBackToList').click();
  await expect(page.locator('#clearPersonFilter')).toBeFocused();
  await expect(page.locator('#clearPersonFilter')).toBeInViewport();
});

for (const composing of [{ isComposing: true }, { keyCode: 229 }]) {
  test(`IME key events leave search and navigation unchanged (${JSON.stringify(composing)})`, crossBrowser, async ({ page }) => {
    await page.goto('/');
    const input = page.locator('#globalSearch');
    await input.fill('桂小五郎');
    await input.press('ArrowDown');
    const url = page.url();
    for (const key of ['ArrowDown', 'ArrowUp', 'Enter', 'Escape']) {
      const accepted = await input.evaluate((element, options) => element.dispatchEvent(new KeyboardEvent('keydown', {
        bubbles: true, cancelable: true, ...options
      })), { key, ...composing });
      expect(accepted).toBe(true);
      await expect(input).toHaveValue('桂小五郎');
      await expect(input).toBeFocused();
      await expect(input).toHaveAttribute('aria-activedescendant', 'search-result-0');
      await expect(page.locator('#searchResults')).toBeVisible();
      await expect(page).toHaveURL(url);
    }
    await input.press('Enter');
    await expect(page.locator('#personDetail .detail-title')).toHaveText('桂小五郎');
    await expect(input).toHaveValue('');
    await input.fill('西郷');
    await input.press('Escape');
    await expect(input).toHaveValue('');
    await expect(page.locator('#searchResults')).toBeHidden();
  });
}

test('name matches precede mentions and other results explain their matching scene', crossBrowser, async ({ page }) => {
  await page.goto('/');
  await page.locator('#globalSearch').fill('西郷');
  await expect(page.locator('.search-group').first().locator('.search-result strong').first()).toHaveText('西郷隆盛');
  const mention = page.locator('.search-result', { hasText: '勝海舟' });
  await expect(mention.locator('small')).toContainText('1868年');
  await expect(mention.locator('small')).toContainText('西郷');
  await expect(mention.locator('small mark').first()).toHaveText('西郷');
});

for (const colorScheme of ['light', 'dark']) {
  test(`person sources identify the basic, current and relation evidence at 320px (${colorScheme})`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 780 });
    await page.emulateMedia({ colorScheme });
    await page.goto('/#scene=1853-blackships&view=people&person=saigo');
    await page.locator('#personDetail summary', { hasText: '参考資料を見る' }).click();
    const statusSources = page.locator('[data-person-sources="status"]');
    await expect(statusSources).toContainText('この時点の行動・立場');
    await expect(statusSources.locator(`a[href="${data.sources.kagoshima_saigo_youth.url}"]`)).toBeVisible();
    await expect(page.locator('[data-person-sources="basic"]')).toContainText('人物の基本情報');
    await expect(page.locator(`[data-person-sources="basic"] a[href="${data.sources.kagoshima_saigo_youth.url}"]`)).toHaveCount(0);

    await page.goto('/#scene=1866-satcho&view=people&person=saigo');
    await page.locator('#personDetail summary', { hasText: '参考資料を見る' }).click();
    const relations = data.relations.filter(relation => [relation.a, relation.b].includes('saigo') && relation.start <= 9 && relation.end >= 9);
    expect(relations.length).toBeGreaterThan(0);
    for (const relation of relations) {
      const otherId = relation.a === 'saigo' ? relation.b : relation.a;
      const sources = page.locator(`[data-relation-sources="${otherId}"]`, { hasText: relation.label });
      await expect(sources).toHaveCount(1);
      for (const sourceId of relation.evidence.sourceIds) {
        await expect(sources.locator(`a[href="${data.sources[sourceId].url}"]`)).toHaveCount(1);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    const accessibility = await new AxeBuilder({ page }).include('#personDetail').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(accessibility.violations).toEqual([]);
  });
}

test('place selection and linked views remain usable without map data', crossBrowser, async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/map-data.js*', route => route.abort());
  await page.goto('/#scene=1853-blackships&view=map&person=perry');
  await expect(page.locator('#mapStatus')).toContainText('地点一覧は利用できます');
  const place = page.locator('[data-map-place-name="uraga"]');
  await place.click();
  await expect(place).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/place=uraga/);
  await page.reload();
  await expect(place).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-map-place-card="uraga"] [data-map-person]').click();
  await expect(page.locator('#personDetail .detail-title')).toHaveText('ペリー');
  await page.goBack();
  await expect(place).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-map-place-card="uraga"] [data-map-event]').click();
  await expect(page.locator('#view-events')).toBeVisible();
  expect(errors).toEqual([]);
});

test('map reset clears selection in the route, markers, labels and cards', crossBrowser, async ({ page }) => {
  await page.goto('/#scene=1853-blackships&view=map&person=perry');
  await page.locator('[data-map-place-name="uraga"]').click();
  await expect(page.locator('[data-map-place="uraga"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-map-label="uraga"]')).toHaveClass(/selected/);
  await page.locator('#resetMapView').click();
  await expect(page.locator('#view-map .selected')).toHaveCount(0);
  await expect(page.locator('#view-map [aria-pressed="true"]')).toHaveCount(0);
  await expect(page.locator('#historyMap')).toHaveAttribute('viewBox', '0 0 720 770');
  await expect(page).not.toHaveURL(/place=/);
  await page.goBack();
  await expect(page.locator('[data-map-place="uraga"]')).toHaveClass(/selected/);
});

test('keyboard selection keeps focus on the redrawn control or the new detail', crossBrowser, async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/#scene=1858-ansei&view=people&person=ii&faction=幕府');

  const card = page.locator('[data-person-card="nariaki"]');
  await card.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#personDetail .detail-title')).toHaveText('徳川斉昭');
  await expect(card).toBeFocused();

  const chip = page.locator('[data-person-filter="幕府"]');
  await chip.focus();
  await page.keyboard.press('Enter');
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  await expect(chip).toBeFocused();
  await page.locator('[data-person-card="ii"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-person-card="ii"]')).toBeFocused();

  // The activated link names another person, whose detail replaces it.
  await page.locator('#personDetail [data-other-person="sanai"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#personDetail .detail-title')).toHaveText('橋本左内');
  await expect(page.locator('#personDetail .detail-title')).toBeFocused();

  const history = page.locator('#personDetail [data-history-scene="3"]');
  await history.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#sceneSelect')).toHaveValue('3');
  await expect(history).toBeFocused();

  await page.goto('/#scene=1858-ansei&view=factions&person=ii&faction=幕府');
  const faction = page.locator('[data-faction-card="水戸藩"]');
  await faction.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#factionDetail .detail-title')).toHaveText('水戸藩');
  await expect(faction).toBeFocused();

  await page.goto('/#scene=1858-ansei&view=relations&person=ii&faction=幕府');
  const node = page.locator('#relationGraph [data-graph-person="nariaki"]');
  await node.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#relationGraph .graph-person.selected')).toHaveAttribute('data-graph-person', 'nariaki');
  await expect(page.locator('#relationGraph .graph-person.selected')).toBeFocused();
});

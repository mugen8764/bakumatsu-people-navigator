const { expect, test } = require('../support/test.cjs');
const AxeBuilder = require('@axe-core/playwright').default;

for (const colorScheme of ['light', 'dark']) {
  test(`medical field and portrait remain accessible at 320px in ${colorScheme}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 850 });
    await page.emulateMedia({ colorScheme });
    await page.goto('/');
    await page.locator('#globalSearch').fill('医療・学問');
    await page.locator('.search-result strong', { hasText: /^医療・学問$/ }).click();
    await expect(page.locator('#factionDetail')).toContainText('活動分野について');
    await expect(page.locator('#factionDetail')).not.toContainText('この時点の目的');
    await page.locator('[data-faction-member="ine"]').click();
    await expect(page.locator('#personDetail .badges')).toContainText('活動分野：医療・学問');
    const portrait = page.locator('#personDetail img');
    await expect(portrait).toBeVisible();
    expect(await portrait.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  });
}

test('new regional factions connect to their people and map locations', { tag: '@cross-browser' }, async ({ page }) => {
  for (const [name, id, place] of [['佐賀藩', 'nabeshima', '佐賀'], ['長岡藩', 'kawai-tsuginosuke', '長岡']]) {
    await page.goto('/');
    await page.locator('#globalSearch').fill(name);
    await page.locator('.search-result strong', { hasText: name }).first().click();
    await expect(page.locator('#factionDetail .detail-title')).toHaveText(name);
    await page.locator(`[data-faction-member="${id}"]`).click();
    await page.locator('#personToMap').click();
    await expect(page.locator('#view-map')).toContainText(place);
    await page.reload();
    await expect(page.locator('#view-map')).toBeVisible();
    await expect(page.locator('#view-map')).toContainText(place);
  }
});

const { expect, test } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test('Shimonoseki connects aliases, event roles, comparisons, reload and map', { tag: '@cross-browser' }, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto('/');
  await page.locator('#globalSearch').fill('宍戸刑馬');
  await page.locator('.search-result').first().click();
  await expect(page).toHaveURL(/person=takasugi/);
  await page.goto('/#event=shimonoseki-1864');
  await expect(page.locator('.decision [data-event-person]')).toHaveCount(2);
  await expect(page.locator('.onsite [data-event-person]')).toHaveCount(5);
  await expect(page.locator('[data-event-person="takasugi"]')).toContainText('宍戸刑馬');
  await page.locator('[data-event-person="ito"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#personTurningPoint .current')).toContainText('攻撃前');
  await page.reload();
  await expect(page.locator('.person-incident')).toContainText('講和の取次ぎ');
  await page.locator('.person-incident [data-open-event]').click();
  await page.locator('#eventToMap').click();
  await expect(page.locator('#mapTitle')).toContainText('四国艦隊');
  await page.locator('[data-map-event="shimonoseki-1864"]').first().click();
  await expect(page.locator('#eventDetailTitle')).toBeFocused();
  await page.locator('[data-event-person="alcock"]').click();
  await expect(page.locator('#personDetail')).toContainText('再来日');
  await page.locator('#nextScene').click();
  await expect(page).not.toHaveURL(/person=alcock/);
  await expect(page.locator('#personCards [data-person-card="alcock"]')).toHaveCount(0);
});

for (const colorScheme of ['light', 'dark']) {
  test(`Shimonoseki and the return comparison remain readable at 320px in ${colorScheme}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 850 });
    await page.emulateMedia({ colorScheme });
    await page.goto('/#event=shimonoseki-1864');
    await expect(page.locator('#eventDetailTitle')).toHaveText('四国艦隊の下関攻撃と講和');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.locator('[data-event-person="inoue"]').click();
    await expect(page.locator('#personTurningPoint .turning-context')).toContainText('攻撃より前');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  });
}

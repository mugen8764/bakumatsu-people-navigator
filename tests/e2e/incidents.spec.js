const { expect, test } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const crossBrowser = { tag: '@cross-browser' };

test('desktop incident cards use the main width and keep commands apart from the scene overview', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/#scene=1864-kinmon&view=people&person=kondo');
  await page.locator('[data-scene-incident="ikedaya"]').click();
  const detail = await page.locator('#eventDetail').boundingBox();
  expect(detail.width).toBeGreaterThan(900);
  const kondo = await page.locator('[data-event-person="kondo"]').boundingBox();
  const okita = await page.locator('[data-event-person="okita"]').boundingBox();
  expect(Math.abs(kondo.y - okita.y)).toBeLessThan(2);
  await page.locator('[data-open-overview]').click();
  await expect(page.locator('#causalTimeline')).toBeVisible();
});

test('incident search, people, map, reload and history retain the event context', crossBrowser, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto('/');
  await page.locator('#globalSearch').fill('池田屋');
  await page.locator('.search-result strong', { hasText: /^池田屋事件$/ }).click();
  await expect(page.locator('#eventDetailTitle')).toHaveText('池田屋事件');
  await expect(page.locator('#eventDetailTitle')).toBeFocused();
  await expect(page.locator('.onsite [data-event-person]')).toHaveCount(3);
  await expect(page.locator('.context [data-event-person="katamori"]')).toBeVisible();
  await page.locator('[data-event-person="okita"]').click();
  await expect(page.locator('#personDetail .detail-title')).toHaveText('沖田総司');
  await expect(page.locator('.person-incident')).toContainText('近藤隊として突入');
  await expect(page).toHaveURL(/event=ikedaya/);
  await page.reload();
  await expect(page.locator('.person-incident')).toContainText('池田屋事件での役割');
  await page.locator('.person-incident [data-open-event]').click();
  await expect(page.locator('#eventDetailTitle')).toBeFocused();
  await page.locator('#eventToMap').click();
  await expect(page.locator('#mapTitle')).toContainText('池田屋事件');
  await page.locator('[data-map-event="ikedaya"]').click();
  await expect(page.locator('#eventDetailTitle')).toHaveText('池田屋事件');
  await page.locator('[data-open-overview]').click();
  await expect(page).not.toHaveURL(/event=/);
  await page.goBack();
  await expect(page.locator('#eventDetailTitle')).toHaveText('池田屋事件');
  await page.locator('#nextScene').click();
  await expect(page).not.toHaveURL(/event=/);
  await expect(page.locator('.incident-roles')).toHaveCount(0);
});

for (const colorScheme of ['light', 'dark']) {
  test(`incident layout and WCAG checks at 320px in ${colorScheme}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 780 });
    await page.emulateMedia({ colorScheme });
    await page.goto('/#event=ikedaya');
    await expect(page.locator('#eventDetailTitle')).toHaveText('池田屋事件');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator('[data-event-person="nagakura"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.person-incident')).toBeVisible();
    await page.locator('.person-incident [data-open-event]').click();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
  });
}

test('portrait attribution and failed image fallback preserve navigation', crossBrowser, async ({ page }) => {
  await page.route('**/assets/portraits/*', route => route.abort());
  await page.goto('/#event=ikedaya');
  const card = page.locator('[data-event-person="kondo"]');
  await card.scrollIntoViewIfNeeded();
  await expect(card.locator('img')).toBeHidden();
  await expect(card).toContainText('近藤勇');
  await card.click();
  await expect(page.locator('#personDetail')).toContainText('撮影時期未確認');
  await page.locator('#personDetail .portrait-credit summary').click();
  await expect(page.locator('#personDetail .portrait-credit')).toContainText('国立国会図書館');
  await expect(page.locator('#personDetail .portrait-credit a')).toHaveCount(2);
});

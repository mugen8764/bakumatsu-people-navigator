const { expect, test } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test('Hokuetsu links negotiators, comparison and the distinct Ojiya meeting place', { tag: '@cross-browser' }, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto('/');
  await page.locator('#globalSearch').fill('小千谷会談');
  await page.locator('.search-result strong', { hasText: '小千谷会談と北越の戦い' }).first().click();
  await expect(page.locator('.onsite [data-event-person]')).toHaveCount(2);
  await expect(page.locator('.decision [data-event-person]')).toHaveCount(2);
  await page.locator('[data-event-person="kawai-tsuginosuke"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#personTurningPoint .current')).toContainText('死去');
  await page.reload();
  await expect(page.locator('.person-incident')).toContainText('戦争回避の交渉');
  await page.locator('.person-incident [data-open-event]').click();
  await page.locator('#eventToMap').click();
  const ojiya = page.locator('[data-map-place-card="ojiya"]');
  await expect(ojiya).toContainText('慈眼寺');
  await expect(ojiya.locator('[data-map-person="kawai-tsuginosuke"]')).toBeVisible();
  await ojiya.locator('[data-map-event="hokuetsu-1868"]').click();
  await expect(page.locator('#eventDetailTitle')).toBeFocused();
  await page.locator('[data-event-person="iwamura-takatoshi"]').click();
  await expect(page.locator('#personDetail .detail-title')).toHaveText('岩村精一郎');
  await page.locator('#personToMap').click();
  await expect(ojiya.locator('[data-map-person="iwamura-takatoshi"]')).toBeVisible();
  await ojiya.locator('[data-map-person="iwamura-takatoshi"]').click();
  await page.locator('#nextScene').click();
  await expect(page.locator('#personCards [data-person-card="iwamura-takatoshi"]')).toHaveCount(0);
  await expect(page.locator('#personCards [data-person-card="kawai-tsuginosuke"]')).toHaveCount(0);
});

for (const colorScheme of ['light', 'dark']) {
  test(`Hokuetsu roles and Kawai’s comparison remain readable at 320px in ${colorScheme}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 850 });
    await page.emulateMedia({ colorScheme });
    await page.goto('/#event=hokuetsu-1868');
    await expect(page.locator('#eventDetailTitle')).toHaveText('小千谷会談と北越の戦い');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.locator('[data-event-person="kawai-tsuginosuke"]').click();
    await expect(page.locator('#personTurningPoint .turning-context')).toContainText('若松城の籠城より前');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  });
}

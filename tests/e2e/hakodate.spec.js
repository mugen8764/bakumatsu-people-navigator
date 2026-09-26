const { expect, test } = require('../support/test.cjs');
const AxeBuilder = require('@axe-core/playwright').default;

test('Hakodate connects military and medical roles, uncertain biography, map and comparisons', { tag: '@cross-browser' }, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto('/');
  await page.locator('#globalSearch').fill('箱館の戦闘');
  await page.locator('.search-result strong', { hasText: '箱館の戦闘・医療・降伏' }).first().click();
  await expect(page.locator('.onsite [data-event-person]')).toHaveCount(1);
  await expect(page.locator('.decision [data-event-person]')).toHaveCount(4);
  await page.locator('[data-event-person="otori-keisuke"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#personDetail .detail-title')).toHaveText('大鳥圭介');
  await expect(page.locator('#personDetail .badges')).toContainText('生年確認中');
  await page.locator('#personDetail').getByText('参考資料を見る', { exact: true }).click();
  await expect(page.locator('[data-person-sources="basic"] .review-status')).toHaveText('出典校正中');
  await expect(page.locator('[data-person-sources="status"] .review-status')).toHaveCount(0);
  await expect(page.locator('[data-person-sources="basic"] a[href="https://www.ndl.go.jp/nikki/person/otorikeisuke"]')).toBeVisible();
  await page.reload();
  await expect(page.locator('.person-incident')).toContainText('陸軍奉行');
  await page.locator('.person-incident [data-open-event]').click();
  await page.locator('[data-event-person="takamatsu-ryoun"]').click();
  await expect(page.locator('#personDetail .badges')).toContainText('活動分野：医療・学問');
  await page.locator('#personToMap').click();
  const map = page.locator('[data-map-place-card="hakodate"]');
  await expect(map.locator('[data-map-person="takamatsu-ryoun"]')).toBeVisible();
  await map.locator('[data-map-event="hakodate-1869"]').click();
  await expect(page.locator('#eventDetailTitle')).toBeFocused();
  await page.locator('[data-event-person="enomoto"]').click();
  await expect(page.locator('#personTurningPoint .current')).toContainText('翌18日');
  await page.locator('#personTurningPoint [data-turning-scene]').click();
  await expect(page.locator('#personTurningPoint .current')).toContainText('8月19日');
});

for (const colorScheme of ['light', 'dark']) {
  test(`Hakodate military and medical roles remain accessible at 320px in ${colorScheme}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 850 });
    await page.emulateMedia({ colorScheme });
    for (const person of [null, 'otori-keisuke', 'takamatsu-ryoun', 'enomoto']) {
      await page.goto(`/#event=hakodate-1869${person ? `&view=people&person=${person}` : ''}`);
      if (person) await expect(page.locator('#personDetail .detail-title')).toBeVisible();
      else await expect(page.locator('#eventDetailTitle')).toHaveText('箱館の戦闘・医療・降伏');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    }
  });
}

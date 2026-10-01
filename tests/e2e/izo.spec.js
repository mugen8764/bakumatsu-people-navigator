const { expect, test } = require('../support/test.cjs');

for (const colorScheme of ['light', 'dark']) {
  test(`@cross-browser Izo search-only name stays neutral through scene changes at 320px ${colorScheme}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 780 });
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/#scene=1862-bunkyu&view=people&person=okada-izo');
    for (const query of ['岡田以蔵', '人斬り以蔵']) {
      await page.locator('#globalSearch').fill(query);
      const result = page.locator('.search-result').first();
      await expect(result.locator('strong')).toHaveText('岡田以蔵');
      if (query === '人斬り以蔵') {
        await expect(result.locator('small')).toHaveText('別名一致 検索用の呼び名：人斬り以蔵');
      }
      await page.locator('#globalSearch').press('ArrowDown');
      await page.locator('#globalSearch').press('Enter');
      await expect(page.locator('#personDetail .detail-title')).toHaveText('岡田以蔵');
    }
    const checkNames = async () => {
      const detail = page.locator('#personDetail');
      const card = page.locator('[data-person-card="okada-izo"]');
      await expect(detail.locator('.detail-title')).toHaveText('岡田以蔵');
      await expect(card.locator('.name')).toHaveText('岡田以蔵');
      await expect(card).not.toContainText(/人斬り以蔵|後世|後の名/);
      await expect(detail).not.toContainText(/後世の呼び名|後の名前：/);
      const names = detail.locator('.section', { has: page.locator('h3', { hasText: '名前・通称' }) });
      await expect(names.locator('.tag')).toHaveText(['岡田以蔵', '以蔵']);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    };
    await checkNames();
    await page.locator('#nextScene').click();
    await checkNames();
    await page.locator('#prevScene').click();
    await checkNames();
  });
}

test('Izo search leads to repression, sources and map without carrying his role after execution', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await page.locator('#globalSearch').fill('人斬り以蔵');
  const result = page.locator('.search-result', { has: page.locator('strong', { hasText: /^岡田以蔵$/ }) });
  await expect(result.locator('small')).toHaveText('別名一致 検索用の呼び名：人斬り以蔵');
  await result.click();
  await expect(page.locator('#personDetail .detail-title')).toHaveText('岡田以蔵');
  // The search-only epithet is not listed among the names used at the time.
  const names = page.locator('#personDetail .section', { has: page.locator('h3', { hasText: '名前・通称' }) });
  await expect(names.locator('.tag')).toHaveText(['岡田以蔵', '以蔵']);
  await page.goto('/#event=tosa-repression-1865');
  await page.locator('[data-event-person="okada-izo"]').click();
  await expect(page.locator('#personDetail')).toContainText('斬首');
  await expect(page.locator('.person-incident')).toContainText('土佐勤王党の弾圧と処分');
  await page.locator('.person-incident summary').click();
  await expect(page.locator('.person-incident a[href="https://ryoma-kinenkan.jp/place/2018/02/post-18.html"]')).toBeVisible();
  await page.locator('.person-incident [data-open-event]').click();
  await page.locator('#eventToMap').click();
  await expect(page.locator('#mapTitle')).toContainText('土佐勤王党の弾圧と処分');
  await page.locator('[data-map-event="tosa-repression-1865"]').first().click();
  await expect(page.locator('#eventDetailTitle')).toHaveText('土佐勤王党の弾圧と処分');
  await page.goto('/#scene=1863-aug18&view=people&person=okada-izo');
  await expect(page.locator('#personDetail')).toContainText('1863年・1864年');
  await expect(page.locator('#personDetail')).toContainText('諸説');
  await page.goto('/#scene=1865-choshu&view=people&person=okada-izo');
  await expect(page.locator('#personCards [data-person-card="okada-izo"]')).toHaveCount(1);
  await page.locator('#nextScene').click();
  await expect(page.locator('#personCards [data-person-card="okada-izo"]')).toHaveCount(0);
  await expect(page.locator('#personDetail .detail-title')).not.toHaveText('岡田以蔵');
  await page.locator('#prevScene').click();
  await expect(page.locator('#personDetail .detail-title')).toHaveText('岡田以蔵');
});

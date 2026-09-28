const { expect, test } = require('../support/test.cjs');

test('Izo search leads to repression, sources and map without carrying his role after execution', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await page.locator('#globalSearch').fill('人斬り以蔵');
  const result = page.locator('.search-result', { has: page.locator('strong', { hasText: /^岡田以蔵$/ }) });
  await expect(result.locator('small')).toHaveText('後世の呼び名：人斬り以蔵');
  await result.click();
  await expect(page.locator('#personDetail .detail-title')).toHaveText('岡田以蔵');
  // The later epithet is not listed among the names used at the time.
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

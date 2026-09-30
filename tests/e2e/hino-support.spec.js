const { expect, test } = require('../support/test.cjs');

for (const colorScheme of ['light', 'dark']) {
  test(`Hino support and battlefield roles are distinct at 320px ${colorScheme}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 780 });
    await page.emulateMedia({ colorScheme });
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/#event=roshigumi-1863');
    await expect(page.locator('.context [data-event-person="sato-hikogoro"]')).toContainText('日野に留まった支援者');
    await expect(page.locator('.onsite [data-event-person="inoue-genzaburo"]')).toContainText('近藤・土方らと上洛');
    await page.locator('[data-event-person="sato-hikogoro"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#personDetail .badges')).toContainText('暮らし・支援');
    await page.locator('.person-incident summary').click();
    await expect(page.locator('.person-incident a[href="https://www.city.hino.lg.jp/shisei/profile/kokusai/note/nikki/1006599.html"]')).toBeVisible();
    await page.locator('.person-incident [data-open-event]').click();
    await page.locator('[data-event-person="inoue-genzaburo"]').click();
    await expect(page.locator('#personDetail .detail-title')).toHaveText('井上源三郎');
    await page.locator('.person-incident [data-open-event]').click();
    await page.locator('#eventToMap').click();
    await expect(page.locator('#mapTitle')).toContainText('浪士組の上洛と京都残留');
    await page.goto('/#scene=1868-toba&view=people&person=inoue-genzaburo');
    await expect(page.locator('#personDetail')).toContainText('鳥羽伏見で戦死');
    await page.locator('#nextScene').click();
    await expect(page.locator('#personCards [data-person-card="inoue-genzaburo"]')).toHaveCount(0);
    await page.locator('#globalSearch').fill('佐藤彦五郎');
    await page.locator('.search-result strong', { hasText: /^佐藤彦五郎$/ }).click();
    await expect(page.locator('#personDetail .detail-title')).toHaveText('佐藤彦五郎');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`hino-${colorScheme}.png`), fullPage: true });
  });
}

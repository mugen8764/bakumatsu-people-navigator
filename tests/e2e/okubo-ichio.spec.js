const { expect, test } = require('../support/test.cjs');

for (const colorScheme of ['light', 'dark']) {
  test(`Ichio retains the dated name and review limits at 320px in ${colorScheme}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 780 });
    await page.emulateMedia({ colorScheme });
    await page.goto('/#scene=1864-kinmon&view=people&person=okubo-ichio');
    await expect(page.locator('#personDetail .detail-title')).toHaveText('大久保忠寛');
    await expect(page.locator('#personDetail')).toContainText('現職確認中');
    await expect(page.locator('#personDetail')).toContainText('出典校正中');
    await page.locator('#nextScene').click();
    await expect(page.locator('#personDetail .detail-title')).toHaveText('大久保一翁');
    await expect(page.locator('#personDetail')).toContainText('隠居した幕臣');
    await page.locator('#personDetail [data-open-event="edo-castle-surrender"]').click();
    await expect(page.locator('.context [data-event-person="okubo-ichio"]')).toContainText('徳川家救済');
    await expect(page.locator('.onsite [data-event-person="okubo-ichio"]')).toHaveCount(0);
    await page.locator('[data-event-person="okubo-ichio"]').click();
    await expect(page.locator('#personDetail .person-incident')).toContainText('恭順論');
    await page.locator('#personDetail .person-incident summary').click();
    await expect(page.locator('#personDetail .person-incident a[href="https://lib.city.fukuroi.shizuoka.jp/wysiwyg/file/download/1/233"]')).toBeVisible();
    await expect(page.locator('#personDetail')).toContainText('2月に若年寄');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    await test.info().attach(`ichio-${colorScheme}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  });
}

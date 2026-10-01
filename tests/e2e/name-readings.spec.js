const { expect, test } = require('../support/test.cjs');
const AxeBuilder = require('@axe-core/playwright').default;

for (const colorScheme of ['light', 'dark']) {
  test(`sourced alias readings support keyboard search and incident names at 320px ${colorScheme}`, { tag: '@cross-browser' }, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 850 });
    await page.emulateMedia({ colorScheme });
    await page.addInitScript(() => localStorage.clear());
    for (const [query, id, displayName, scene, incident] of [
      ['かつらこごろう', 'kido', '桂小五郎', '1864-kinmon', 'kinmon-conflict'],
      ['やまがたきょうすけ', 'yamagata', '山県狂介', '1868-tohoku', 'hokuetsu-1868'],
      ['あさだこうすけ', 'sufu-masanosuke', '麻田公輔', '1864-kinmon', 'kinmon-conflict']
    ]) {
      await page.goto(`/#scene=${scene}&view=people&person=${id}`);
      await page.locator('#globalSearch').fill(query);
      await expect(page.locator('.search-result').first()).toContainText(id === 'kido' ? '木戸孝允' : id === 'yamagata' ? '山県有朋' : '周布政之助');
      await page.locator('#globalSearch').press('ArrowDown');
      await page.locator('#globalSearch').press('Enter');
      await expect(page.locator('#personDetail .detail-title')).toHaveText(displayName);
      await page.locator(`#personDetail [data-open-event="${incident}"]`).click();
      await expect(page.locator(`[data-event-person="${id}"] strong`)).toHaveText(displayName);
      await page.locator(`[data-event-person="${id}"]`).focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('.person-incident')).toBeVisible();
      await page.locator('.person-incident [data-open-event]').click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(audit.violations).toEqual([]);
    await page.goto('/#event=shimonoseki-1864');
    await expect(page.locator('[data-event-person="takasugi"] strong')).toHaveText('宍戸刑馬');
    await page.locator('#globalSearch').fill('ししどぎょうま');
    await expect(page.locator('#searchResults')).toContainText('該当する項目がありません');
  });
}

const { expect, test } = require('../support/test.cjs');
const AxeBuilder = require('@axe-core/playwright').default;

for (const colorScheme of ['light', 'dark']) {
  test(`Omiya separates verified roles, later testimony and uncertainty at 320px ${colorScheme}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 850 });
    await page.emulateMedia({ colorScheme });
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/#event=omiya-1867');
    await expect(page.locator('#eventDetailTitle')).toHaveText('近江屋事件');
    await expect(page.locator('.incident-date')).toContainText('11月15日夜（旧暦）');
    await expect(page.locator('.incident-date .review-status')).toHaveText('諸説あり');
    await expect(page.locator('.incident-overview')).toContainText('2日後の11月17日');
    await expect(page.locator('.onsite [data-event-person="ryoma"]')).toContainText('海援隊長');
    await expect(page.locator('.onsite [data-event-person="nakaoka"]')).toContainText('状況を語り');
    await expect(page.locator('.incident-person .review-status')).toHaveCount(0);
    await expect(page.locator('.incident-connections')).toHaveCount(0);

    const testimony = page.locator('.background-term', { hasText: '襲撃直後の証言と後年の記録' });
    await testimony.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(testimony.locator('.review-status')).toHaveText('諸説あり');
    await expect(testimony).toContainText('後年の記録');
    await expect(testimony).toContainText('伝承');
    await expect(testimony.locator('a[href="https://ryoma-kinenkan.jp/feat/faq/cat4/"]')).toBeVisible();

    const caveat = page.locator('.background-term', { hasText: '実行者・指示者の留保' });
    await caveat.locator('summary').click();
    await expect(caveat.locator('.review-status')).toHaveText('諸説あり');
    await expect(caveat).toContainText('断定できる決定的な資料はない');
    await expect(caveat.locator('a[href="https://ryoma-kinenkan.jp/feat/faq/cat/"]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);

    // Shared incident-coverage checks already cover the cast and first person.
    // Check the surviving witness's own role and the map's return here.
    await page.locator('[data-event-person="nakaoka"]').click();
    await expect(page.locator('.person-incident')).toContainText('11月17日');
    await page.reload();
    await expect(page.locator('.person-incident')).toContainText('状況を伝える');
    await page.locator('.person-incident [data-open-event]').click();
    await page.locator('#eventToMap').click();
    await expect(page.locator('#mapTitle')).toContainText('近江屋事件');
    await page.locator('[data-map-event="omiya-1867"]').click();
    await expect(page.locator('#eventDetailTitle')).toHaveText('近江屋事件');
    await page.locator('#nextScene').click();
    await expect(page).not.toHaveURL(/event=/);
    await expect(page.locator('.incident-roles')).toHaveCount(0);
  });
}

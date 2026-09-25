const { expect, test } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test('Tosa politics preserves distinct roles, source access and place context', { tag: '@cross-browser' }, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto('/');
  await page.locator('#globalSearch').fill('吉田東洋暗殺');
  await page.locator('.search-result strong', { hasText: '吉田東洋暗殺と土佐藩の政局' }).first().click();
  await expect(page.locator('.onsite [data-event-person]')).toHaveCount(1);
  await expect(page.locator('.decision [data-event-person]')).toHaveCount(1);
  await expect(page.locator('.context [data-event-person]')).toHaveCount(1);
  await page.locator('[data-event-person="yoshida-toyo"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.person-incident')).toContainText('仕置役');
  await page.locator('.person-incident summary').click();
  await expect(page.locator('.person-incident a[href="https://ryoma-kinenkan.jp/exhibition/2024/12/post-24.html"]')).toBeVisible();
  await page.reload();
  await page.locator('.person-incident [data-open-event]').click();
  await page.locator('#eventToMap').click();
  await page.locator('[data-map-place-card="kochi"] [data-map-event="tosa-politics-1862"]').click();
  await expect(page.locator('#eventDetailTitle')).toBeFocused();
  await page.locator('[data-event-person="yodo"]').click();
  await expect(page.locator('.person-incident')).toContainText('江戸在府中');
  await page.locator('#nextScene').click();
  await expect(page.locator('#personCards [data-person-card="yoshida-toyo"]')).toHaveCount(0);
  await page.goto('/#scene=1860-sakurada&view=people&person=ryoma');
  await expect(page.locator('#personDetail [data-other-person="takechi"]')).toHaveCount(0);
  await page.locator('#nextScene').click();
  await expect(page.locator('#personDetail [data-other-person="takechi"]')).toHaveCount(1);
});

for (const colorScheme of ['light', 'dark']) {
  test(`Tosa roles and organization help remain accessible at 320px in ${colorScheme}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 850 });
    await page.emulateMedia({ colorScheme });
    await page.goto('/#event=tosa-politics-1862');
    await page.locator('.background-term summary', { hasText: '土佐勤王党' }).click();
    await expect(page.locator('.background-term[open]')).toContainText('土佐藩全体と同じ組織ではない');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.locator('[data-event-person="yoshida-toyo"]').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  });
}

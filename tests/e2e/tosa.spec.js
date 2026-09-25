const { expect, test } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test('Tosa imprisonment connects the trial roles with an earlier turning point', { tag: '@cross-browser' }, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto('/');
  await page.locator('#globalSearch').fill('土佐勤王党の弾圧');
  await page.locator('.search-result strong', { hasText: '土佐勤王党の弾圧と処分' }).first().click();
  await expect(page.locator('.onsite [data-event-person]')).toHaveCount(1);
  await expect(page.locator('.decision [data-event-person]')).toHaveCount(2);
  await page.locator('[data-event-person="goto"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.person-incident')).toContainText('1865年');
  await page.reload();
  await page.locator('.person-incident summary').click();
  await expect(page.locator('.person-incident a[href="https://ryoma-kinenkan.jp/place/2018/02/post-25.html"]')).toBeVisible();
  await page.locator('.person-incident [data-open-event]').click();
  await page.locator('#eventToMap').click();
  await page.locator('[data-map-place-card="kochi"] [data-map-event="tosa-repression-1865"]').click();
  await expect(page.locator('#eventDetailTitle')).toBeFocused();
  await page.locator('[data-event-person="takechi"]').click();
  await page.locator('#personTurningPoint [data-turning-scene="6"]').click();
  await expect(page).toHaveURL(/scene=1863-aug18/);
  await expect(page.locator('.person-incident')).toHaveCount(0);
  await expect(page.locator('#personTurningPoint')).toBeFocused();
  await expect(page.locator('.turning-side.current')).toContainText('9月21日');
  await page.locator('#personTurningPoint summary').click();
  await expect(page.locator('#personTurningPoint .source-list').first().locator('a[href="https://ryoma-kinenkan.jp/exhibition/2025/06/post-27.html"]')).toBeVisible();
  await page.locator('#personTurningPoint [data-turning-scene="5"]').click();
  await expect(page.locator('#personDetail .badges')).toContainText('京都留守居加役');
  await page.locator('#nextScene').click();
  await expect(page.locator('.turning-side.current')).toContainText('投獄');
  await page.goto('/#scene=1866-satcho&view=people&person=goto');
  await expect(page.locator('#personCards [data-person-card="takechi"]')).toHaveCount(0);
  await expect(page.locator('#personDetail .badges')).toContainText('開成館');
});

for (const colorScheme of ['light', 'dark']) {
  test(`Tosa imprisonment and comparison remain accessible at 320px in ${colorScheme}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 850 });
    await page.emulateMedia({ colorScheme });
    for (const url of ['/#event=tosa-repression-1865', '/#scene=1863-aug18&view=people&person=takechi', '/#scene=1865-choshu&view=people&person=yodo']) {
      await page.goto(url);
      await expect(page.locator('#sceneTitle')).not.toBeEmpty();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    }
  });
}

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

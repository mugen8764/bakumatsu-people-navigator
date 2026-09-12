const { expect, test } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

for (const [id, title, person, term] of [
  ['commercial-treaty-1858', '日米修好通商条約の調印', 'kawaji-toshiakira', '勅許'],
  ['august18-coup', '八月十八日の政変', 'asahiko', '公武合体']
]) {
  test(`${id} keeps context through search, person, reload and map`, { tag: '@cross-browser' }, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 850 });
    await page.goto('/');
    await page.locator('#globalSearch').fill(title);
    await page.locator('.search-result strong', { hasText: title }).first().click();
    await expect(page.locator('#eventDetailTitle')).toHaveText(title);
    await expect(page.locator('#eventDetailTitle')).toBeFocused();
    const heading = await page.locator('#eventDetailTitle').boundingBox();
    const tabs = await page.locator('.tabs-shell').boundingBox();
    expect(heading.y).toBeGreaterThanOrEqual(tabs.y + tabs.height);
    expect(heading.y + heading.height).toBeLessThan(850);
    await expect(page.locator('.incident-roles')).not.toContainText('取締り・突入');
    const glossary = page.locator('.background-term').filter({ has: page.locator('summary', { hasText: term }) });
    await glossary.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(glossary).toHaveAttribute('open', '');
    await expect(glossary.locator('a').first()).toBeVisible();
    await page.locator(`[data-event-person="${person}"]`).click();
    await expect(page.locator('.person-incident')).toContainText(title);
    await page.reload();
    await expect(page.locator('.person-incident')).toContainText(title);
    await page.locator('.person-incident [data-open-event]').click();
    await page.locator('#eventToMap').click();
    await expect(page.locator('#mapTitle')).toContainText(title);
    await page.locator(`[data-map-event="${id}"]`).first().click();
    await expect(page.locator('#eventDetailTitle')).toBeFocused();
    await page.locator('[data-open-overview]').click();
    await expect(page).not.toHaveURL(/event=/);
    await page.goBack();
    await expect(page.locator('#eventDetailTitle')).toHaveText(title);
  });

  for (const colorScheme of ['light', 'dark']) {
    test(`${id} has readable roles and terms at 320px in ${colorScheme}`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 780 });
      await page.emulateMedia({ colorScheme });
      await page.goto(`/#event=${id}`);
      await page.locator('.background-term summary').first().click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(results.violations).toEqual([]);
    });
  }
}

test('incident heading remains below sticky tabs with enlarged text at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/');
  await page.addStyleTag({ content: 'body { font-size: 24px; }' });
  await page.locator('#globalSearch').fill('池田屋');
  await page.locator('.search-result strong', { hasText: /^池田屋事件$/ }).click();
  const title = await page.locator('#eventDetailTitle').boundingBox();
  const tabs = await page.locator('.tabs-shell').boundingBox();
  expect(title.y).toBeGreaterThanOrEqual(tabs.y + tabs.height);
  expect(title.y + title.height).toBeLessThan(900);
});

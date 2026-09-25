const { expect, test } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

for (const [id, title, query, person] of [
  ['namamugi-1862', '生麦事件と賠償要求', 'リチャードソン', 'richardson'],
  ['satsuma-britain-1863', '薩英戦争と戦後交渉', 'キューパー', 'kuper']
]) {
  test(`${id} connects name search, incident, person, reload and map`, { tag: '@cross-browser' }, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 850 });
    await page.goto('/');
    await page.locator('#globalSearch').fill(query);
    await page.locator('.search-result').first().click();
    await expect(page).toHaveURL(new RegExp(`person=${person}(?:&|$)`));
    await page.goto(`/#event=${id}`);
    await page.locator(`[data-event-person="${person}"]`).focus();
    await page.keyboard.press('Enter');
    await page.reload();
    await expect(page.locator('.person-incident')).toContainText(title);
    await page.locator('.person-incident [data-open-event]').click();
    await page.locator('#eventToMap').click();
    await expect(page.locator('#mapTitle')).toContainText(title);
    await page.locator(`[data-map-event="${id}"]`).first().click();
    await expect(page.locator('#eventDetailTitle')).toBeFocused();
  });

  for (const colorScheme of ['light', 'dark']) {
    test(`${id} fits 320px and remains accessible in ${colorScheme}`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 850 });
      await page.emulateMedia({ colorScheme });
      await page.goto(`/#event=${id}`);
      await expect(page.locator('#eventDetailTitle')).toHaveText(title);
      if (id === 'namamugi-1862') await expect(page.locator('#incidentRelationsTitle')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    });
  }
}

test('the deceased merchant leaves the active selection and cards in the next scene', async ({ page }) => {
  await page.goto('/#scene=1862-bunkyu&view=people&person=richardson');
  await expect(page.locator('#personDetail')).toContainText('日本を訪れた英国商人');
  await expect(page.locator('#personCards [data-person-card="richardson"]')).toHaveCount(1);
  await page.locator('#nextScene').click();
  await expect(page).toHaveURL(/scene=1863-joi/);
  await expect(page).not.toHaveURL(/person=richardson/);
  await expect(page.locator('#personCards [data-person-card="richardson"]')).toHaveCount(0);
  await expect(page.locator('#personDetail')).not.toContainText('日本を訪れた英国商人');
});

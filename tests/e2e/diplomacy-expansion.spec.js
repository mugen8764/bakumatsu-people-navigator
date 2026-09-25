const { expect, test } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

for (const [id, title, person] of [
  ['friendship-treaty-1854', '日米和親条約の交渉と調印', 'hayashi-fukusai'],
  ['commercial-treaty-1858', '日米修好通商条約の調印', 'inoue-kiyonao']
]) {
  test(`${id} links negotiators, their sources, and the map`, { tag: '@cross-browser' }, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.locator('#globalSearch').fill(title);
    await page.locator('.search-result strong', { hasText: title }).first().click();
    await page.locator(`[data-event-person="${person}"]`).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.person-incident')).toContainText(title);
    await expect(page.locator('#personDetail a[href^="https://"]')).not.toHaveCount(0);
    await page.reload();
    await expect(page.locator('.person-incident')).toContainText(title);
    await page.locator('.person-incident [data-open-event]').click();
    await page.locator('#eventToMap').click();
    await expect(page.locator('#mapTitle')).toContainText(title);
    await page.locator(`[data-map-event="${id}"]`).first().click();
    await expect(page.locator('#eventDetailTitle')).toBeFocused();
  });
  for (const colorScheme of ['light', 'dark']) {
    test(`${id} fits 320px with accessible treaty explanations in ${colorScheme}`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 850 });
      await page.emulateMedia({ colorScheme });
      await page.goto(`/#event=${id}`);
      await page.locator('.background-term summary').first().click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    });
  }
}

test('the two Inoues have separate results and period changes retain the selected negotiator', { tag: '@cross-browser' }, async ({ page }) => {
  for (const [query, id] of [['井上信濃守', 'inoue-kiyonao'], ['井上馨', 'inoue']]) {
    await page.goto('/');
    await page.locator('#globalSearch').fill(query);
    await page.locator('.search-result').first().click();
    await expect(page).toHaveURL(new RegExp(`person=${id}(?:&|$)`));
  }
  await page.goto('/#scene=1858-ansei&view=people&person=inoue-kiyonao');
  await page.locator('#nextScene').click();
  await expect(page).toHaveURL(/person=inoue-kiyonao/);
  await expect(page.locator('#personDetail')).toContainText('軍艦奉行');
});

test('American portraits load with their dates, attribution and source limitations', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 850 });
  for (const [id, scene] of [['perry', '1854-treaty'], ['harris', '1858-ansei']]) {
    await page.goto(`/#scene=${scene}&view=people&person=${id}`);
    const portrait = page.locator('#personDetail img').first();
    await portrait.scrollIntoViewIfNeeded();
    await expect.poll(() => portrait.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    await page.locator('#personDetail .portrait-credit summary').click();
    if (id === 'perry') {
      await expect(page.locator('#personDetail .portrait-credit')).toContainText('The Metropolitan Museum of Art');
      await expect(page.locator('#personDetail .portrait-credit')).toContainText('CC0');
    } else {
      await expect(page.locator('#personDetail .portrait-credit')).toContainText('Library of Congress');
      await expect(page.locator('#personDetail .portrait-credit')).toContainText('未確認情報');
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

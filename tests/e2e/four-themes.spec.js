const { expect, test } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const cases = [
  ['shogun-succession-1858', '家定の後継', 'iesada', '御三卿', 'edo'],
  ['ansei-purge', '安政の大獄と', 'sanai', '大老', 'edo'],
  ['sakuradamon-1860', '桜田門外の襲撃', 'arimura', '大老', 'edo'],
  ['kazunomiya-marriage', '和宮降嫁', 'ando', '公武合体', 'kyoto'],
  ['roshigumi-1863', '浪士組の上洛', 'kiyokawa', '浪士組', 'kyoto'],
  ['embassy-kanrinmaru-1860', '遣米使節と', 'oguri', '批准', 'uraga'],
  ['yokosuka-1865', '横須賀製鉄所の建設', 'verny', '横須賀製鉄所', 'yokosuka']
];

for (const [id, title, person, term, place] of cases) {
  test(`${id} retains event context through search, person, reload and map`, { tag: '@cross-browser' }, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 850 });
    await page.goto('/');
    await page.locator('#globalSearch').fill(title);
    await page.locator('.search-result strong', { hasText: title }).click();
    await expect(page.locator('#eventDetailTitle')).toContainText(title);
    await page.locator('.background-term summary', { hasText: term }).first().click();
    await expect(page.locator('.background-term[open]')).toContainText(term);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator(`[data-event-person="${person}"]`).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.person-incident')).toContainText(title);
    await page.reload();
    await expect(page.locator('.person-incident')).toContainText(title);
    await page.locator('.person-incident [data-open-event]').click();
    await page.locator('#eventToMap').click();
    await page.locator(`[data-map-place-card="${place}"] [data-map-event="${id}"]`).click();
    await expect(page.locator('#eventDetailTitle')).toBeFocused();
  });

  for (const colorScheme of ['light', 'dark']) {
    test(`${id} is readable and accessible at 320px in ${colorScheme}`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 850 });
      await page.emulateMedia({ colorScheme });
      await page.goto(`/#event=${id}`);
      await expect(page.locator('#eventDetailTitle')).toContainText(title);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    });
  }
}

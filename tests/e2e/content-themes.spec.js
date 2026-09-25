const { expect, test } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const incidents = [
  ['kinmon-conflict', '禁門の変', 'kusaka'],
  ['satcho-agreement', '薩長盟約', 'komatsu'],
  ['second-choshu-war', '第二次長州征討・四境戦争', 'omura'],
  ['royal-restoration', '王政復古の大号令', 'iwakura'],
  ['toba-fushimi-battle', '鳥羽・伏見の戦い', 'saito'],
  ['edo-castle-surrender', '江戸開城の交渉と引き渡し', 'yamaoka']
];

for (const [id, title, person] of incidents) {
  test(`${id} supports search and person-map round trips`, { tag: '@cross-browser' }, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.locator('#globalSearch').fill(title);
    await page.locator('.search-result strong', { hasText: title }).first().click();
    await expect(page.locator('#eventDetailTitle')).toHaveText(title);
    await page.locator(`[data-event-person="${person}"]`).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.person-incident')).toContainText(title);
    await page.reload();
    await expect(page.locator('.person-incident')).toContainText(title);
    await page.locator('.person-incident [data-open-event]').click();
    await page.locator('#eventToMap').click();
    await expect(page.locator('#mapTitle')).toContainText(title);
    await page.locator(`[data-map-event="${id}"]`).first().click();
    await expect(page.locator('#eventDetailTitle')).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
  for (const colorScheme of ['light', 'dark']) {
    test(`${id} is readable and accessible at 320px in ${colorScheme}`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 850 });
      await page.emulateMedia({ colorScheme });
      await page.goto(`/#event=${id}`);
      await page.locator('.background-term summary').first().click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    });
  }
}

test('new names expose sourced roles and preserve person selection when time changes', { tag: '@cross-browser' }, async ({ page }) => {
  for (const [query, id] of [['藤田五郎', 'saito'], ['山南敬助', 'yamanami'], ['芹澤鴨', 'serizawa'], ['サトウ', 'satow'], ['グラバー', 'glover'], ['緒方洪庵', 'ogata-koan'], ['福澤諭吉', 'fukuzawa']]) {
    await page.goto('/');
    await page.locator('#globalSearch').fill(query);
    await page.locator('.search-result').first().click();
    await expect(page).toHaveURL(new RegExp(`person=${id}`));
    await expect(page.locator('#personDetail .detail-title')).toBeVisible();
  }
  await page.goto('/#scene=1858-ansei&view=people&person=fukuzawa');
  await page.locator('#nextScene').click();
  await expect(page).toHaveURL(/person=fukuzawa/);
  await expect(page.locator('#personDetail')).toContainText('咸臨丸');
  await page.goto('/#scene=1869-hakodate&view=people&person=satow');
  await expect(page.locator('#personDetail')).toContainText('休暇で英国へ帰国');
});

test('all added comparisons and portrait credits render on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 850 });
  for (const [id, scene] of [['takasugi', '1865-choshu'], ['komatsu', '1866-satcho'], ['katsu', '1868-edo'], ['katamori', '1868-toba'], ['enomoto', '1868-tohoku']]) {
    await page.goto(`/#scene=${scene}&view=people&person=${id}`);
    await expect(page.locator('#personTurningPoint .turning-side')).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  for (const [id, scene] of [['takasugi', '1865-choshu'], ['ryoma', '1866-satcho'], ['okubo', '1868-toba'], ['enomoto', '1868-tohoku'], ['fukuzawa', '1869-hakodate']]) {
    await page.goto(`/#scene=${scene}&view=people&person=${id}`);
    const portrait = page.locator('#personDetail img').first();
    await portrait.scrollIntoViewIfNeeded();
    await expect(portrait).toBeVisible();
    await expect.poll(() => portrait.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    await page.locator('#personDetail .portrait-credit summary').click();
    await expect(page.locator('#personDetail .portrait-credit')).toContainText('国立国会図書館');
    await expect(page.locator('#personDetail')).toContainText('選択した時点の姿を示すものではありません');
  }
});

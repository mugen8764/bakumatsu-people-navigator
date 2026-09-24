const { expect, test } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const cases = [
  ['saigo', '1865-choshu', '西郷吉之助', '長州を討つ側から、支える側へ', '武器・汽船'],
  ['kido', '1865-choshu', '桂小五郎', '潜伏から、藩政の立て直しへ', '大村益次郎'],
  ['yoshinobu', '1867-taisei', '徳川慶喜', '将軍就任から、政権返上へ', '政権返上']
];

test('three turning points expose sourced actions and retain person and date through navigation', { tag: '@cross-browser' }, async ({ page }) => {
  for (const [person, scene, name, title, after] of cases) {
    await page.goto(`/#scene=${scene}&view=people&person=${person}`);
    await expect(page.locator('#personDetail .detail-title')).toHaveText(name);
    const comparison = page.locator('#personTurningPoint');
    await expect(comparison.locator('.turning-title')).toHaveText(title);
    await expect(comparison.locator('.turning-side')).toHaveCount(2);
    const beforeBox = await comparison.locator('.turning-side').first().boundingBox();
    const afterBox = await comparison.locator('.turning-side').last().boundingBox();
    expect(afterBox.x).toBeGreaterThan(beforeBox.x);
    expect(afterBox.y).toBe(beforeBox.y);
    await expect(comparison.locator('.current')).toContainText(after);
    await comparison.getByText('この比較の根拠', { exact: true }).click();
    await expect(comparison.locator('.source-list a').first()).toBeVisible();
    await page.reload();
    await expect(comparison.locator('.turning-title')).toHaveText(title);
    await comparison.locator('[data-turning-scene]').click();
    await expect(comparison).toBeFocused();
    await expect(page).toHaveURL(new RegExp(`person=${person}`));
    await expect(comparison.getByRole('heading')).toHaveText('転換点を比べる');
    await comparison.getByRole('button').click();
    await expect(page).toHaveURL(new RegExp(`scene=${scene}`));
    await expect(comparison.locator('.turning-title')).toHaveText(title);
    await page.goBack();
    await expect(comparison.getByRole('heading')).toHaveText('転換点を比べる');
  }
});

test('scene entry links reveal the chosen comparison, and incident context remains available', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#scene=1865-choshu&view=timeline&person=kido');
  await page.locator('#sceneDetails > summary').click();
  await page.locator('[data-turning-person="saigo"]').click();
  await expect(page.locator('#view-people')).toBeVisible();
  await expect(page.locator('#personTurningPoint')).toBeFocused();
  await expect(page.locator('#personTurningPoint .current')).toContainText('武器・汽船');
  await page.goto('/#scene=1867-taisei&view=people&person=yoshinobu&event=taisei-hokan');
  await expect(page.locator('#personTurningPoint .turning-context')).toContainText('王政復古とは別');
  await page.locator('.person-incident [data-open-event]').click();
  await expect(page.locator('#view-events')).toBeVisible();
});

test('all four office explanations open from their role using the keyboard', { tag: '@cross-browser' }, async ({ page }) => {
  for (const [person, scene, title] of [['abe', '1853-blackships', '老中'], ['kawaji-toshiakira', '1853-blackships', '勘定奉行'], ['nabeshima', '1862-bunkyu', '藩主'], ['komatsu', '1862-bunkyu', '家老']]) {
    await page.goto(`/#scene=${scene}&view=people&person=${person}`);
    const trigger = page.locator('.office-trigger');
    const help = page.locator('#personOfficeHelp');
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(help.getByRole('heading')).toContainText(title);
    if (person === 'nabeshima') await expect(trigger).toContainText('前佐賀藩主');
    await help.locator(':scope > summary').click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  }
});

for (const colorScheme of ['light', 'dark']) {
  test(`comparisons and role help remain accessible at 320px in ${colorScheme}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 850 });
    await page.emulateMedia({ colorScheme });
    await page.goto('/#scene=1865-choshu&view=people&person=saigo');
    const sides = page.locator('.turning-side');
    const before = await sides.first().boundingBox();
    const after = await sides.last().boundingBox();
    expect(after.y).toBeGreaterThanOrEqual(before.y + before.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.goto('/#scene=1853-blackships&view=people&person=kawaji-toshiakira');
    await page.locator('.office-trigger').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  });
}

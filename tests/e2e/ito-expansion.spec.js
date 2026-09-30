const { expect, test } = require('../support/test.cjs');
const AxeBuilder = require('@axe-core/playwright').default;

test('Ito search connects the formation to Todo, source evidence and Kyoto', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await page.locator('#globalSearch').fill('いとうかしたろう');
  await page.locator('.search-result strong', { hasText: /^伊東甲子太郎$/ }).click();
  await expect(page.locator('#personDetail .badges')).toContainText('新選組参謀');
  await expect(page.locator('#personCards [data-person-card="ito-kashitaro"]')).toHaveCount(1);
  await page.locator('#prevScene').click();
  await expect(page.locator('#personCards [data-person-card="ito-kashitaro"]')).toHaveCount(0);
  await page.goto('/#scene=1867-taisei&view=people&person=ito-kashitaro');
  await page.locator('#personCards [data-person-card="ito-kashitaro"]').click();
  await page.locator('#personDetail [data-open-event="goryo-eji-formation-1867"]').click();
  await expect(page.locator('#eventDetail')).toContainText('旧暦3月');
  await expect(page.locator('[data-event-person="todo-heisuke"]')).toBeVisible();
  await expect(page.locator('[data-event-person="kondo"]')).toContainText('分離元の新選組局長');
  await expect(page.locator('[data-event-person="hijikata"]')).toHaveCount(0);
  await page.locator('[data-event-person="ito-kashitaro"]').click();
  await expect(page.locator('.person-incident')).toContainText('離隊し御陵衛士を率いる');
  await page.locator('.person-incident summary').click();
  await expect(page.locator('.person-incident a').first()).toBeVisible();
  await page.locator('.person-incident [data-open-event]').click();
  await page.locator('#eventToMap').click();
  await expect(page.locator('#mapTitle')).toContainText('新選組から御陵衛士へ');
  await expect(page.locator('#placeList')).toContainText('京都');
  await page.locator('.tab[data-view="people"]').click();
  await page.locator('#nextScene').click();
  await expect(page.locator('#personCards [data-person-card="ito-kashitaro"]')).toHaveCount(0);
});

test('the split changes affiliations and sourced relations across scenes', { tag: '@cross-browser' }, async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/#scene=1866-expedition&view=people&person=ito-kashitaro');
  await expect(page.locator('#personDetail .badges')).toContainText('新選組');
  await expect(page.locator('#personDetail .relations')).toContainText('新選組の局長と参謀');
  await page.locator('#nextScene').click();
  await expect(page.locator('#personDetail .detail-title')).toHaveText('伊東甲子太郎');
  await expect(page.locator('#personDetail .badges')).toContainText('御陵衛士');
  await expect(page.locator('#personTurningPoint')).toContainText('新選組参謀');
  await expect(page.locator('#personTurningPoint')).toContainText('御陵衛士隊長');
  await expect(page.locator('#personDetail .relations')).toContainText('御陵衛士の隊長と隊士');
  await expect(page.locator('#personDetail .relations')).toContainText('意見の違いから分離');
  await page.locator('#personToGraph').click();
  await expect(page.locator('#relationChanges')).toContainText('新選組の局長と参謀');
  await expect(page.locator('#relationGraph [data-graph-person="kondo"]')).toBeVisible();
  await page.locator('#relationGraph [data-graph-person="todo-heisuke"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#relationGraph .selected')).toHaveAttribute('data-graph-person', 'todo-heisuke');
  await expect(page.locator('#relationGraph [data-graph-person="kondo"]')).toHaveCount(0);
  await page.locator('.tab[data-view="people"]').click();
  await page.locator('#personDetail [data-open-event="goryo-eji-formation-1867"]').click();
  await expect(page.locator('#eventDetail')).toContainText('分離元の新選組局長');
  await page.locator('#eventToMap').click();
  await page.locator('[data-map-event="goryo-eji-formation-1867"]').click();
  await expect(page.locator('#eventDetailTitle')).toHaveText('新選組から御陵衛士へ');
});

for (const theme of ['light', 'dark']) {
  test(`Goryo Eji relations stay readable and keyboard accessible at 320px in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 780 });
    await page.addInitScript(() => localStorage.clear());
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/#scene=1867-taisei&view=relations&person=ito-kashitaro');
    await expect(page.locator('#relationMobile')).toContainText('御陵衛士の隊長と隊士');
    await expect(page.locator('#relationMobile')).toContainText('意見の違いから分離');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const result = await new AxeBuilder({ page }).include('#view-relations')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(result.violations).toEqual([]);
    await page.locator('#relationMobile [data-mobile-relation-person="todo-heisuke"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#relationMobile .relation-mobile-center')).toContainText('藤堂平助');
    await expect(page.locator('#relationMobile [data-mobile-relation-person="kondo"]')).toHaveCount(0);
  });
}

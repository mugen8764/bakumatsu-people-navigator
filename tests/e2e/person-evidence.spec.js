const { expect, test } = require('../support/test.cjs');
const data = require('../../data.json');
const AxeBuilder = require('@axe-core/playwright').default;

// Refs #64: political context must remain readable without a personal conflict.
for (const width of [320, 1280]) {
  for (const colorScheme of ['light', 'dark']) {
    for (const [person, other, name] of [['komei', 'sanjo', '孝明天皇'], ['sanjo', 'komei', '三条実美']]) {
      test(`Komei and Sanjo retain context without a personal conflict: ${person}, ${width}px, ${colorScheme}`, { tag: '@cross-browser' }, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme });
        await page.goto(`/#scene=1863-joi&view=people&person=${person}`);
        for (const [scene, index] of [['1863-joi', '5'], ['1863-aug18', '6'], ['1864-kinmon', '7']]) {
          await page.locator('#sceneSelect').selectOption(index);
          await expect(page.locator('#personDetail .detail-title')).toHaveText(name);
          await expect(page.locator(`#personDetail [data-other-person="${other}"]`)).toHaveCount(0);
          await expect(page.locator(`#personDetail [data-relation-sources="${other}"]`)).toHaveCount(0);
          await expect(page.locator('#personDetail')).not.toContainText('急進尊攘への不信');
          if (scene === '1863-aug18') {
            await expect(page.locator('#personDetail')).toContainText(person === 'sanjo' ? '他の尊攘派公家6名と長州へ逃れた' : '反感が、政変の背景にあったとされる');
            await page.locator('#personDetail summary', { hasText: '参考資料を見る' }).press('Enter');
            await expect(page.locator('[data-person-sources="status"] a').first()).toBeVisible();
            await expect(page.locator('[data-person-sources="status"] .review-status')).toHaveCount(0);
          }
          await page.locator('#personToGraph').press('Enter');
          await expect(page.locator('#view-relations')).toBeVisible();
          await expect(page.locator(`#relationGraph [data-graph-person="${other}"]`)).toHaveCount(0);
          await expect(page.locator(`#relationMobile [data-mobile-relation-person="${other}"]`)).toHaveCount(0);
          await expect(page.locator('#view-relations')).not.toContainText('急進尊攘への不信');
          if (person === 'komei') await expect(page.locator('#graphExplanation')).toContainText('信任・朝廷警護');
          if (person === 'sanjo' && scene === '1863-aug18') {
            await expect(page.locator(width === 320 ? '#relationMobile' : '#graphExplanation')).toContainText('同じ事件');
          }
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
          const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
          expect(scan.violations).toEqual([]);
          await page.reload();
          await expect(page).toHaveURL(new RegExp(`scene=${scene}.*person=${person}`));
          await expect(page.locator('#view-relations')).toBeVisible();
          await page.locator('#tab-people').press('Enter');
          await expect(page.locator('#personDetail .detail-title')).toHaveText(name);
          await page.goBack();
          await expect(page.locator('#view-relations')).toBeVisible();
          await page.goForward();
          await expect(page.locator('#personDetail .detail-title')).toHaveText(name);
        }
      });
    }
  }
}

for (const [reviewStatus, label] of [['needs_review', '出典校正中'], ['disputed', '諸説あり']]) {
  test(`person basic sources retain ${reviewStatus} independently of the dated role`, async ({ page }) => {
    const fixture = structuredClone(data);
    const perry = fixture.people.find(person => person.id === 'perry');
    perry.evidence = { sourceIds: perry.sources, reviewStatus };
    await page.route(/\/data\.js(?:\?.*)?$/, route => route.fulfill({
      contentType: 'application/javascript', body: `window.BM_DATA = ${JSON.stringify(fixture)};`
    }));
    await page.goto('/#scene=1853-blackships&view=people&person=perry');
    await page.locator('#personDetail').getByText('参考資料を見る', { exact: true }).click();
    await expect(page.locator('[data-person-sources="basic"] .review-status')).toHaveText(label);
    await expect(page.locator('[data-person-sources="status"] .review-status')).toHaveCount(0);
    await expect(page.locator('[data-person-sources="basic"] a').first()).toBeVisible();
  });
}

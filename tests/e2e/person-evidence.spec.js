const { expect, test } = require('../support/test.cjs');
const data = require('../../data.json');

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

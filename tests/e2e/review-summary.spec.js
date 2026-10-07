const { expect, test } = require('../support/test.cjs');
const AxeBuilder = require('@axe-core/playwright').default;
const statuses = require('../../data/person-statuses.json').statuses;
const samples = statuses.filter(status => status.evidence.reviewSummary);

for (const width of [320, 390, 1280]) {
  for (const colorScheme of ['light', 'dark']) {
    test(`public review reasons at ${width}px ${colorScheme}`, { tag: '@cross-browser' }, async ({ page }, testInfo) => {
      test.setTimeout(60_000);
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      for (const status of samples) {
        await page.goto(`/#scene=${status.startSceneId}&view=people&person=${status.personId}`);
        const disclosure = page.locator('#personSourcesTitle');
        await disclosure.focus();
        await disclosure.press('Enter');
        const reason = page.locator('[data-person-sources="status"] .review-explanation');
        await expect(reason).toBeVisible();
        await expect(reason).toContainText(status.evidence.reviewSummary);
        await expect(reason.locator('strong')).toHaveText(status.evidence.reviewStatus === 'disputed' ? '諸説がある点' : '確認中の点');
        await expect(page.locator('#personDetail')).not.toContainText(status.evidence.note);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const audit = await new AxeBuilder({ page }).include('#personDetail').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        expect(audit.violations).toEqual([]);
        if (status.personId === 'yamanami' && testInfo.project.name === 'chromium' && process.platform === 'win32' && !process.env.CI) {
          await expect(reason).toHaveScreenshot(`review-reason-${width}-${colorScheme}.png`);
        }
      }
      for (const [scene, person] of [['1853-blackships', 'perry'], ['1863-joi', 'saito']]) {
        await page.goto(`/#scene=${scene}&view=people&person=${person}`);
        await page.locator('#personSourcesTitle').click();
        await expect(page.locator('#personDetail .review-explanation')).toHaveCount(0);
      }
      await expect(page.locator('[data-person-sources="status"] .review-status')).toHaveText('出典校正中');
    });
  }
}

test('public reasons remain reachable by touch and shared URL', { tag: '@cross-browser' }, async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await context.newPage();
  for (const status of samples) {
    await page.goto(`/#scene=${status.startSceneId}&view=people&person=${status.personId}`);
    await page.locator('[data-person-section="personSourcesTitle"]').tap();
    await expect(page.locator('[data-person-sources="status"] .review-explanation')).toContainText(status.evidence.reviewSummary);
    await page.reload();
    await page.locator('#personSourcesTitle').tap();
    await expect(page.locator('[data-person-sources="status"] .review-explanation')).toBeVisible();
  }
  await context.close();
});

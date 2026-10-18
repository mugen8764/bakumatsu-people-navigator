const { expect, test } = require('../support/test.cjs');
const AxeBuilder = require('@axe-core/playwright').default;
const statuses = require('../../data/person-statuses.json').statuses;
const samples = statuses.filter(status => status.evidence.reviewSummary);
const scenes = require('../../data/events.json').scenes;
const triggerSelector = '[data-person-section="personStatusReview"]';

async function expectReviewDestination(page, status) {
  const reason = page.locator('[data-person-sources="status"] #personStatusReview');
  await expect(reason).toBeVisible();
  await expect(reason).toBeFocused();
  await expect(reason).toHaveAttribute('tabindex', '-1');
  await expect(reason).toContainText(status.evidence.reviewSummary);
  const position = await reason.boundingBox();
  const tabs = await page.locator('.tabs-shell').boundingBox();
  expect(position.y).toBeGreaterThanOrEqual(tabs.y + tabs.height);
  expect(position.y + position.height).toBeLessThanOrEqual(page.viewportSize().height);
  await expect(page.locator('[data-person-sources="basic"] #personStatusReview')).toHaveCount(0);
}

for (const width of [320, 390, 1280]) {
  for (const colorScheme of ['light', 'dark']) {
    test(`public review reasons at ${width}px ${colorScheme}`, { tag: '@cross-browser' }, async ({ page }, testInfo) => {
      test.setTimeout(60_000);
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      for (const status of samples) {
        await page.goto(`/#scene=${status.startSceneId}&view=people&person=${status.personId}`);
        const trigger = page.locator(triggerSelector);
        const label = status.evidence.reviewStatus === 'disputed' ? '諸説がある点を見る' : '確認中の点を見る';
        await expect(trigger).toHaveText(label);
        await expect(page.locator('.snapshot').locator(triggerSelector)).toHaveCount(1);
        const size = await trigger.boundingBox();
        expect(Math.round(size.height)).toBeGreaterThanOrEqual(44);
        const before = await page.evaluate(() => ({ url: location.href, length: history.length, storage: { ...localStorage } }));
        await trigger.click();
        await expectReviewDestination(page, status);
        expect(await page.evaluate(() => ({ url: location.href, length: history.length, storage: { ...localStorage } }))).toEqual(before);
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
        await expect(page.locator(triggerSelector)).toHaveCount(0);
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
    await page.locator('#personSourcesTitle').tap();
    await expect(page.locator('[data-person-sources="status"] .review-explanation')).toBeHidden();
    await page.locator(triggerSelector).tap();
    await expectReviewDestination(page, status);
    await page.reload();
    await page.locator(triggerSelector).tap();
    await expectReviewDestination(page, status);
  }
  await context.close();
});

test('review shortcuts preserve keyboard order and manual disclosure control', { tag: '@cross-browser' }, async ({ page }) => {
  for (const status of samples) {
    await page.goto(`/#scene=${status.endSceneId}&view=people&person=${status.personId}`);
    const trigger = page.locator(triggerSelector);
    await trigger.focus();
    await trigger.press('Shift+Tab');
    await expect(page.locator('[data-person-section="personSourcesTitle"]')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(trigger).toBeFocused();
    await trigger.press('Enter');
    await expectReviewDestination(page, status);
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement !== document.body && document.activeElement.isConnected)).toBe(true);
    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate(() => document.activeElement !== document.body && document.activeElement.isConnected)).toBe(true);
    await page.locator('#personSourcesTitle').click();
    await expect(page.locator('#personStatusReview')).toBeHidden();
    await trigger.focus();
    await trigger.press('Space');
    await expectReviewDestination(page, status);
  }
});

test('person, scene, history and reload always target the current status reason', { tag: '@cross-browser' }, async ({ page }) => {
  const saito = samples.find(status => status.personId === 'saito');
  const yamanami = samples.find(status => status.personId === 'yamanami');
  const sceneIndex = id => String(scenes.findIndex(scene => scene.id === id));
  await page.goto(`/#scene=${saito.startSceneId}&view=people&person=saito`);
  await page.locator(triggerSelector).click();
  await expectReviewDestination(page, saito);
  await page.locator('[data-person-card="yamanami"]').click();
  await expect(page.locator(triggerSelector)).toHaveCount(0);
  await expect(page.locator('#personStatusReview')).toHaveCount(0);
  await page.locator('#sceneSelect').selectOption(sceneIndex(yamanami.startSceneId));
  await expect(page.locator(triggerSelector)).toHaveText('諸説がある点を見る');
  await page.locator(triggerSelector).click();
  await expectReviewDestination(page, yamanami);
  await expect(page.locator('#personDetail')).not.toContainText(saito.evidence.reviewSummary);
  await page.goBack();
  await expect(page.locator(triggerSelector)).toHaveCount(0);
  await page.goBack();
  await page.locator(triggerSelector).click();
  await expectReviewDestination(page, saito);
  await page.goForward();
  await expect(page.locator('#personStatusReview')).toHaveCount(0);
  await page.goForward();
  await page.reload();
  await page.locator(triggerSelector).click();
  await expectReviewDestination(page, yamanami);
  await page.locator('#sceneSelect').selectOption(sceneIndex(saito.startSceneId));
  await expect(page.locator(triggerSelector)).toHaveCount(0);
  expect(await page.evaluate(() => document.activeElement.isConnected)).toBe(true);
});

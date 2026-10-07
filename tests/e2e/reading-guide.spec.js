const { expect, test } = require('../support/test.cjs');
const { catalog } = require('../support/catalog.cjs');
const AxeBuilder = require('@axe-core/playwright').default;

for (const width of [320, 390, 1280]) {
  for (const colorScheme of ['light', 'dark']) {
    test(`reading guide at ${width}px in ${colorScheme}`, { tag: '@cross-browser' }, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.goto('/');
      const guide = page.locator('#readingGuide');
      const toggle = guide.locator('summary');
      await expect(toggle).toBeInViewport();
      const initialUrl = page.url();
      const initialHistory = await page.evaluate(() => history.length);
      await toggle.press('Enter');
      await expect(guide).toHaveAttribute('open', '');
      expect(page.url()).toBe(initialUrl);
      expect(await page.evaluate(() => history.length)).toBe(initialHistory);
      const steps = guide.locator('li');
      await expect(steps).toHaveCount(12);
      await expect(steps.first()).toContainText('1853年');
      await expect(steps.last()).toContainText('1869年');
      await expect(guide.locator('[aria-current="step"]')).toHaveCount(1);
      await expect(guide.locator('[aria-current="step"] .guide-current')).toHaveText('現在地');
      await expect(page.locator('#readingGuidePosition')).toHaveText('1 / 12');
      const layout = await steps.evaluateAll(items => items.map(item => {
        const summary = item.querySelector('.guide-summary');
        const style = getComputedStyle(summary);
        return { x: Math.round(item.getBoundingClientRect().x), height: summary.getBoundingClientRect().height, line: parseFloat(style.lineHeight), clamp: style.webkitLineClamp };
      }));
      if (width <= 390) for (const item of layout) {
        expect(item.clamp).toBe('2');
        expect(item.height).toBeLessThanOrEqual(item.line * 2 + 1);
      }
      else expect(new Set(layout.map(item => item.x)).size).toBe(4);
      for (const button of await guide.locator('[data-guide-id]').all()) {
        const id = await button.getAttribute('data-guide-id');
        const kind = await button.getAttribute('data-guide-kind');
        const item = kind === 'scene' ? catalog.scenes.find(scene => scene.id === id) : catalog.incidents[id];
        await expect(button.locator('..').locator('h2')).toHaveText(item.title);
        await expect(button.locator('..').locator('p')).toContainText(item.summary);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(scan.violations).toEqual([]);
      if (testInfo.project.name === 'chromium' && process.platform === 'win32' && !process.env.CI) {
        await expect(guide).toHaveScreenshot(`guide-${width}-${colorScheme}.png`, { animations: 'disabled' });
      }
      await testInfo.attach('open-guide', { body: await guide.screenshot(), contentType: 'image/png' });
      await guide.locator('[data-guide-id="1858-ansei"]').press('Enter');
      await expect(page.locator('#sceneTitle')).toBeFocused();
      await expect(page.locator('#sceneTitle')).toHaveText('通商条約・将軍継嗣・安政の大獄');
      await expect(guide).not.toHaveAttribute('open', '');
      const sceneUrl = page.url();
      await page.reload();
      await expect(page.locator('#sceneSelect')).toHaveValue(String(catalog.scenes.findIndex(scene => scene.id === '1858-ansei')));
      await expect(page.locator('#readingGuidePosition')).toHaveText('2 / 12');
      await toggle.click();
      await guide.locator('[data-guide-id="satcho-agreement"]').click();
      await expect(page.locator('#eventDetailTitle')).toBeFocused();
      await expect(page.locator('#eventDetailTitle')).toHaveText(catalog.incidents['satcho-agreement'].title);
      await expect(page.locator('#readingGuidePosition')).toHaveText('6 / 12');
      const incidentUrl = page.url();
      await page.reload();
      await expect(page.locator('#eventDetailTitle')).toHaveText(catalog.incidents['satcho-agreement'].title);
      await page.goBack();
      await expect(page.locator('#sceneTitle')).toHaveText('通商条約・将軍継嗣・安政の大獄');
      expect(page.url()).toBe(sceneUrl);
      await expect(page.locator('#readingGuidePosition')).toHaveText('2 / 12');
      await page.goForward();
      expect(page.url()).toBe(incidentUrl);
      await expect(page.locator('#readingGuidePosition')).toHaveText('6 / 12');
      await expect(page.locator('#eventDetailTitle')).toHaveText(catalog.incidents['satcho-agreement'].title);
      await toggle.click();
      await guide.locator('[data-guide-id="1864-kinmon"]').click();
      await expect(page.locator('#view-people')).toBeVisible();
      expect(new URL(page.url()).hash).not.toContain('event=');
      await page.locator('#nextScene').click();
      await expect(page.locator('#sceneTitle')).toHaveText('長州藩政の転換');
      const fresh = await page.context().newPage();
      await fresh.goto(incidentUrl);
      await expect(fresh.locator('#eventDetailTitle')).toHaveText(catalog.incidents['satcho-agreement'].title);
      await expect(fresh.locator('#readingGuidePosition')).toHaveText('6 / 12');
      await fresh.close();
    });
  }
}

test('reading guide supports touch and every destination', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 900 }, hasTouch: true });
  const page = await context.newPage();
  await page.goto('/');
  await page.locator('#readingGuide > summary').tap();
  const entries = await page.locator('[data-guide-id]').evaluateAll(buttons => buttons.map(button => ({ ...button.dataset })));
  for (const { guideId, guideKind } of entries) {
    await page.locator(`[data-guide-id="${guideId}"]`).tap();
    const hash = new URLSearchParams(new URL(page.url()).hash.slice(1));
    expect(hash.get(guideKind === 'incident' ? 'event' : 'scene')).toBe(guideId);
    await page.locator('#readingGuide > summary').tap();
    await expect(page.locator(`[data-guide-id="${guideId}"]`).locator('..')).toHaveAttribute('aria-current', 'step');
  }
  await context.close();
});

test('outside incidents use their parent scene and unrelated scenes show no current step', { tag: '@cross-browser' }, async ({ page }) => {
  await page.goto('/#event=omiya-1867');
  await page.locator('#readingGuide > summary').click();
  await expect(page.locator('[aria-current="step"] [data-guide-id]')).toHaveAttribute('data-guide-id', '1867-taisei');
  await expect(page.locator('#readingGuidePosition')).toHaveText('8 / 12');
  await page.goto('/#scene=1866-satcho&view=people&person=kido');
  await page.locator('#readingGuide > summary').click();
  await expect(page.locator('[aria-current="step"] [data-guide-id]')).toHaveAttribute('data-guide-id', 'satcho-agreement');
  await page.goto('/#scene=1854-treaty&view=people&person=abe');
  await page.locator('#readingGuide > summary').click();
  await expect(page.locator('#readingGuideSteps [aria-current]')).toHaveCount(0);
  await expect(page.locator('#readingGuidePosition')).toHaveText('12ステップ');
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => !['bm.scene', 'bm.view', 'bm.person', 'bm.preferredPerson', 'bm.faction', 'bm.place', 'bm.event'].includes(key)))).toEqual([]);
});

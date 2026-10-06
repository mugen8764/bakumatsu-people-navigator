const AxeBuilder = require('@axe-core/playwright').default;
const { expect, test } = require('../support/test.cjs');
const data = require('../../data.json');
const scenes = ['1853-blackships', '1863-aug18', '1864-kinmon', '1867-taisei', '1868-toba', '1868-tohoku', '1869-hakodate'];

for (const width of [320, 390, 1280]) for (const colorScheme of ['light', 'dark']) {
  test(`period incidents and search at ${width}px in ${colorScheme}`, { tag: '@cross-browser' }, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.addInitScript(() => localStorage.clear());
    for (const scene of scenes) {
      await page.goto(`/#scene=${scene}&view=people`);
      const items = Object.values(data.incidents).filter(item => item.sceneId === scene);
      const row = page.locator('#sceneIncidents');
      await expect(row.locator(':scope > span')).toHaveText(`この時期の事件 全${items.length}件`);
      expect(await row.locator('[data-scene-incident]').evaluateAll(buttons => buttons.map(button => button.dataset.sceneIncident))).toEqual(items.map(item => item.id));
      const visible = row.locator('[data-scene-incident]:visible');
      await expect(visible).toHaveCount(width <= 680 ? Math.min(2, items.length) : items.length);
      const toggle = page.locator('#sceneIncidentsToggle');
      if (items.length > 2 && width <= 680) {
        await expect(toggle).toHaveText(`ほか${items.length - 2}件`);
        const sharedURL = page.url();
        const historyLength = await page.evaluate(() => history.length);
        const closedSearchY = (await page.locator('#globalSearch').boundingBox()).y;
        await toggle.focus();
        await page.keyboard.press('Enter');
        await expect(toggle).toBeFocused();
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        await expect(visible).toHaveCount(items.length);
        await page.keyboard.press('Tab');
        await expect(row.locator('[data-scene-incident]').nth(2)).toBeFocused();
        const expandedSearchY = await page.locator('#globalSearch').evaluate(el => el.getBoundingClientRect().top + scrollY);
        expect(expandedSearchY).toBeGreaterThan(closedSearchY);
        await toggle.focus();
        await page.keyboard.press('Enter');
        await expect(visible).toHaveCount(2);
        expect(page.url()).toBe(sharedURL);
        expect(await page.evaluate(() => history.length)).toBe(historyLength);
        await page.locator('#globalSearch').fill(items.at(-1).title);
        await expect(page.locator('#searchResults')).toContainText(items.at(-1).title);
        await page.locator('#globalSearch').press('Escape');
        if (scene === '1867-taisei') {
          await page.evaluate(() => scrollTo(0, 0));
          const audit = await new AxeBuilder({ page }).include('.top').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
          expect(audit.violations).toEqual([]);
          if (testInfo.project.name === 'chromium' && process.platform === 'win32' && !process.env.CI) {
            await expect(page.locator('.top')).toHaveScreenshot(`incidents-${width}-${colorScheme}.png`);
          }
          await toggle.click();
          const expandedAudit = await new AxeBuilder({ page }).include('.top').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
          expect(expandedAudit.violations).toEqual([]);
        }
      } else await expect(toggle).toBeHidden();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const item of items) {
        await page.goto(`/#scene=${scene}&view=people`);
        const target = page.locator(`[data-scene-incident="${item.id}"]`);
        if (!await target.isVisible()) await page.locator('#sceneIncidentsToggle').click();
        await target.click();
        await expect(page.locator('#eventDetail h2').first()).toHaveText(item.title);
        await expect(page.locator('#eventDetail h2').first()).toBeFocused();
      }
    }
  });
}

test('incident expansion survives a same-scene render, resets on a new scene, and adapts to desktop', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/#scene=1867-taisei&view=people');
  await page.locator('#sceneIncidentsToggle').click();
  await page.locator('#tab-factions').click();
  await expect(page.locator('#sceneIncidentsToggle')).toHaveAttribute('aria-expanded', 'true');
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.locator('[data-scene-incident]:visible')).toHaveCount(6);
  await expect(page.locator('#sceneIncidentsToggle')).toBeHidden();
  await page.setViewportSize({ width: 390, height: 900 });
  await page.locator('#prevScene').click();
  await page.locator('#nextScene').click();
  await expect(page.locator('[data-scene-incident]:visible')).toHaveCount(2);
  await page.locator('#sceneDetails > summary').click();
  const details = await page.locator('#sceneDetails').boundingBox();
  const incidents = await page.locator('.scene-incident-buttons').boundingBox();
  expect(details.y).toBeGreaterThanOrEqual(incidents.y + incidents.height);
  await expect(page.locator('#sceneIncidents > span')).toBeVisible();
});

test('a scene with no incident leaves no empty row or expansion control', async ({ page }) => {
  const fixture = structuredClone(data);
  fixture.incidents = Object.fromEntries(Object.entries(fixture.incidents).filter(([, incident]) => incident.sceneId !== '1853-blackships'));
  await page.route(/\/data\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: `window.BM_DATA=${JSON.stringify(fixture)}` }));
  await page.goto('/#scene=1853-blackships');
  await expect(page.locator('#sceneIncidents')).toBeHidden();
  await expect(page.locator('#sceneIncidentsToggle')).toHaveCount(0);
});

test('touch opens the remaining period incidents and selects the last one', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 900 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto('/#scene=1867-taisei&view=people');
  await page.locator('#sceneIncidentsToggle').tap();
  await expect(page.locator('[data-scene-incident]:visible')).toHaveCount(6);
  await page.locator('[data-scene-incident="omiya-1867"]').tap();
  await expect(page).toHaveURL(/event=omiya-1867/);
  await context.close();
});

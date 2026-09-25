const { expect, test } = require('@playwright/test');

// One case per first-paint placeholder range in src/styles.css.
for (const [label, width] of [['desktop', 1280], ['tablet', 600], ['mobile', 320]]) {
test(`delayed historical data does not cause a large initial layout shift at ${label} width`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript(() => {
    window.__layoutShiftScore = 0;
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__layoutShiftScore += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.route(/\/data\.js(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await new Promise(resolve => setTimeout(resolve, 750));
    await route.fulfill({ response });
  });

  await page.goto('/');
  await expect(page.locator('html')).not.toHaveClass(/app-loading/);
  await expect(page.locator('#personCards .card-button')).toHaveCount(14);

  const layoutShiftScore = await page.evaluate(() => window.__layoutShiftScore);
  expect(layoutShiftScore).toBeLessThan(0.1);
});
}

test('initial page stays within the static asset budget', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveClass(/app-loading/);

  const metrics = await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource');
    return {
      decodedBytes: resources.reduce((sum, entry) => sum + entry.decodedBodySize, 0),
      names: resources.map(entry => new URL(entry.name).pathname),
      scriptCount: resources.filter(entry => entry.initiatorType === 'script').length
    };
  });
  const dataPath = metrics.names.find(path => path.endsWith('/data.js'));
  expect(dataPath).toBeTruthy();
  expect(metrics.names.some(path => path.endsWith('/data.json'))).toBe(false);
  expect(metrics.scriptCount).toBeLessThanOrEqual(14);
  expect(metrics.decodedBytes).toBeLessThan(550_000);
});

// The placeholders in src/styles.css must reserve what the loaded page takes.
// A layout-shift score alone does not catch over-reservation below the fold.
for (const [label, width] of [['desktop', 1280], ['tablet', 600], ['mobile', 320]]) {
  test(`first-paint placeholders match the loaded height at ${label} width`, async ({ page }) => {
    const measure = () => page.evaluate(() => Object.fromEntries(
      ['.top', '#view-people', '#personCards'].map(selector => [
        selector,
        Math.round(document.querySelector(selector).getBoundingClientRect().height)
      ])
    ));

    await page.setViewportSize({ width, height: 900 });
    await page.route(/\/data\.js(?:\?.*)?$/, async route => {
      const response = await route.fetch();
      await new Promise(resolve => setTimeout(resolve, 1_500));
      await route.fulfill({ response });
    });

    await page.goto('/', { waitUntil: 'commit' });
    await page.waitForSelector('.app-loading #personCards');
    const reserved = await measure();

    await expect(page.locator('html')).not.toHaveClass(/app-loading/);
    await expect(page.locator('#personCards .card-button')).toHaveCount(14);
    const loaded = await measure();

    for (const selector of Object.keys(loaded)) {
      const tolerance = Math.max(24, loaded[selector] * 0.05);
      expect(
        Math.abs(reserved[selector] - loaded[selector]),
        `${selector} reserves ${reserved[selector]}px for ${loaded[selector]}px of content`
      ).toBeLessThanOrEqual(tolerance);
    }
  });
}

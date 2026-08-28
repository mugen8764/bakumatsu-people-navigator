const { expect, test } = require('@playwright/test');

test('delayed historical data does not cause a large initial layout shift', async ({ page }) => {
  await page.addInitScript(() => {
    window.__layoutShiftScore = 0;
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__layoutShiftScore += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.route('**/data.js', async route => {
    const response = await route.fetch();
    await new Promise(resolve => setTimeout(resolve, 750));
    await route.fulfill({ response });
  });

  await page.goto('/');
  await expect(page.locator('html')).not.toHaveClass(/app-loading/);
  await expect(page.locator('#personCards .card-button')).toHaveCount(7);

  const layoutShiftScore = await page.evaluate(() => window.__layoutShiftScore);
  expect(layoutShiftScore).toBeLessThan(0.1);
});

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

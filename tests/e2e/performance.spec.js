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

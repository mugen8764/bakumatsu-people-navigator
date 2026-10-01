const { expect, test } = require('../support/test.cjs');

for (const width of [320, 390, 1280]) {
  for (const colorScheme of ['light', 'dark']) {
    test(`search match explanations at ${width}px in ${colorScheme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.addInitScript(() => localStorage.clear());
      await page.goto('/#scene=1853-blackships&view=people&person=abe');
      const input = page.locator('#globalSearch');
      await input.fill('伊藤俊輔');
      await input.scrollIntoViewIfNeeded();
      await expect(page.locator('.search-result strong').first()).toHaveText('伊藤博文');
      if (process.platform === 'win32' && !process.env.CI) {
        await expect(page).toHaveScreenshot(`search-${width}-${colorScheme}.png`, { animations: 'disabled' });
      }
    });
  }
}

const AxeBuilder = require('@axe-core/playwright').default;
const { expect, test } = require('../support/test.cjs');

for (const width of [320, 390, 1280]) {
  for (const colorScheme of ['light', 'dark']) {
    test(`timeline and tabs remain usable at ${width}px in ${colorScheme}`, { tag: '@cross-browser' }, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.addInitScript(() => localStorage.clear());
      const errors = [];
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await page.goto('/');
      await expect(page.locator('html')).not.toHaveClass(/app-loading/);
      await testInfo.attach('timeline-tabs', { body: await page.screenshot(), contentType: 'image/png' });

      if (width <= 680) await expect(page.locator('#sceneRange')).toBeHidden();
      else {
        await expect(page.getByRole('slider', { name: '時系列' })).toBeVisible();
        await page.locator('#sceneRange').focus();
        await page.keyboard.press('ArrowRight');
        await expect(page.locator('#sceneSelect')).toHaveValue('1');
        await page.locator('#prevScene').click();
      }
      await page.locator('#sceneSelect').selectOption('9');
      await page.locator('#nextScene').click();
      await expect(page.locator('#sceneSelect')).toHaveValue('10');
      await page.locator('#prevScene').click();
      await expect(page.locator('#sceneSelect')).toHaveValue('9');

      const strip = page.locator('#primaryTabs');
      for (const [key, id] of [['End', 'sources'], ['ArrowLeft', 'events'], ['Home', 'people'], ['ArrowRight', 'factions']]) {
        await page.locator('.tab[aria-selected="true"]').focus();
        await page.keyboard.press(key);
        const active = page.locator(`#tab-${id}`);
        await expect(active).toBeFocused();
        await expect(active).toHaveAttribute('aria-selected', 'true');
        const bounds = await strip.boundingBox();
        const box = await active.boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(bounds.x - 1);
        expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
        for (const button of await page.locator('.tab-scroll-control:visible').all()) {
          const control = await button.boundingBox();
          expect(control.x + control.width <= bounds.x || control.x >= bounds.x + bounds.width).toBe(true);
        }
      }
      await expect(page.locator('#tab-events')).toHaveText('事件');
      await expect(page.locator('#tab-sources')).toHaveText('出典');
      const shared = page.url();
      await page.reload();
      await expect(page.locator('#tab-factions')).toHaveAttribute('aria-selected', 'true');
      expect(page.url()).toBe(shared);
      await page.locator('#tab-events').click();
      await page.goBack();
      await expect(page.locator('#tab-factions')).toHaveAttribute('aria-selected', 'true');
      await page.goForward();
      await expect(page.locator('#tab-events')).toHaveAttribute('aria-selected', 'true');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(audit.violations).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}

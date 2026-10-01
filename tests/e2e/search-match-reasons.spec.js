const { expect, test } = require('../support/test.cjs');
const AxeBuilder = require('@axe-core/playwright').default;

for (const width of [320, 390, 1280]) {
  for (const colorScheme of ['light', 'dark']) {
    test(`search match explanations at ${width}px in ${colorScheme}`, { tag: '@cross-browser' }, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.addInitScript(() => localStorage.clear());
      const errors = [];
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await page.goto('/#scene=1853-blackships&view=people&person=abe');
      const input = page.locator('#globalSearch');
      await input.fill('伊藤俊輔');
      await input.scrollIntoViewIfNeeded();
      await expect(page.locator('.search-result strong').first()).toHaveText('伊藤博文');
      if (process.platform === 'win32' && !process.env.CI) {
        await expect(page).toHaveScreenshot(`search-${width}-${colorScheme}.png`, { animations: 'disabled' });
      }
      for (const [query, title, reason] of [
        ['桂小五郎', '木戸孝允', '当時名一致'], ['かつら こごろう', '木戸孝允', '読み一致'],
        ['伊藤俊輔', '伊藤博文', '当時名一致'], ['京都守護職', '松平容保', '役職一致'],
        ['大政奉還', '徳川慶喜', '役職一致'], ['薩摩', '島津斉彬', '役職一致']
      ]) {
        await input.fill(query);
        const first = page.locator('#searchResults').getByRole('option').first();
        await expect(first.locator('strong')).toHaveText(title);
        await expect(first.locator('.search-match-reason')).toHaveText(reason);
        await expect(first).toHaveAccessibleName(new RegExp(`${title}.*${reason}`));
        await expect(first.locator('mark').first()).toBeVisible();
        expect(await first.boundingBox().then(box => box.height)).toBeLessThan(90);
        for (const summary of await page.locator('.search-match-summary').all()) {
          const dimensions = await summary.evaluate(element => ({ height: element.getBoundingClientRect().height, line: parseFloat(getComputedStyle(element).lineHeight) }));
          expect(dimensions.height).toBeLessThanOrEqual(dimensions.line * 2 + 1);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      await input.fill('伊藤俊輔');
      const eventGroup = page.locator('#search-group-events').locator('..');
      await expect(eventGroup.locator('.search-match-reason')).toHaveText('参加者一致');
      await expect(eventGroup.locator('mark')).toHaveText('伊藤俊輔');
      let scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(scan.violations).toEqual([]);

      await input.fill('幕府');
      await expect(page.locator('#searchResults .search-group')).toHaveCount(3);
      await expect(page.locator('#search-group-people').locator('..').getByRole('option')).toHaveCount(8);
      await expect(page.locator('#search-group-factions').locator('..').getByRole('option')).toHaveCount(3);
      await expect(eventGroup.getByRole('option')).toHaveCount(3);
      expect(await page.locator('.search-group-title strong').allTextContents()).toEqual(['人物', '勢力・分野', '事件']);
      await expect(input).toHaveAttribute('role', 'combobox');
      await expect(page.locator('#searchResults')).toHaveAttribute('role', 'listbox');
      await input.press('ArrowUp');
      await expect(input).toHaveAttribute('aria-activedescendant', 'search-result-13');
      await expect(page.locator('#search-result-13')).toHaveAttribute('aria-selected', 'true');
      await expect(input).toBeFocused();
      await input.press('ArrowDown');
      await expect(input).toHaveAttribute('aria-activedescendant', 'search-result-0');
      await input.press('ArrowDown');
      await expect(input).toHaveAttribute('aria-activedescendant', 'search-result-1');
      await input.press('ArrowUp');
      await expect(input).toHaveAttribute('aria-activedescendant', 'search-result-0');
      const active = page.locator('#search-result-0');
      await expect(active).toBeInViewport();
      expect(await active.evaluate(element => {
        const box = element.getBoundingClientRect();
        return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
      })).toBe(true);
      scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(scan.violations).toEqual([]);
      await input.press('Enter');
      await expect(page).toHaveURL(/person=yoshinobu/);
      const sharedUrl = page.url();
      await page.reload();
      await expect(page).toHaveURL(sharedUrl);
      await expect(page.locator('[data-person-card="yoshinobu"]')).toHaveAttribute('aria-pressed', 'true');
      await page.goBack();
      await expect(page).toHaveURL(/person=abe/);
      await page.goForward();
      await expect(page).toHaveURL(/person=yoshinobu/);
      await input.fill('桂小五郎');
      await input.press('ArrowDown');
      await input.press('Enter');
      await expect(page).toHaveURL(/person=kido/);
      await input.fill('薩摩');
      await input.press('Escape');
      await expect(input).toHaveValue('');
      await expect(page.locator('#searchResults')).toBeHidden();
      expect(errors).toEqual([]);
    });
  }
}

const { expect, test } = require('../support/test.cjs');

for (const width of [320, 390, 1280]) {
  for (const colorScheme of ['light', 'dark']) {
    test(`IME composition lifecycle at ${width}px in ${colorScheme}`, { tag: '@cross-browser' }, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.addInitScript(() => localStorage.clear());
      const errors = [];
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await page.goto('/#scene=1853-blackships&view=people&person=abe');
      const input = page.locator('#globalSearch');
      const initialUrl = page.url();
      const emit = (type, options = {}) => input.evaluate((element, { type, options }) => {
        const EventClass = type.startsWith('composition') ? CompositionEvent
          : type === 'beforeinput' ? InputEvent : KeyboardEvent;
        return element.dispatchEvent(new EventClass(type, { bubbles: true, cancelable: true, ...options }));
      }, { type, options });

      for (const endFirst of [true, false]) {
        await input.fill('桂小五郎');
        await input.press('ArrowDown');
        await expect(input).toHaveAttribute('aria-activedescendant', 'search-result-0');
        await emit('compositionstart', { data: 'かつら' });
        await emit('compositionupdate', { data: '桂小五郎' });
        await emit('beforeinput', { inputType: 'insertCompositionText', data: '桂小五郎', isComposing: true });
        // Deliberately omit isComposing/keyCode 229: the old guard misses these.
        for (const key of ['ArrowDown', 'ArrowUp', 'Enter', 'Escape']) {
          expect(await emit('keydown', { key, keyCode: key === 'Enter' ? 13 : 0 })).toBe(true);
          await expect(page).toHaveURL(initialUrl);
          await expect(input).toHaveValue('桂小五郎');
          await expect(input).toHaveAttribute('aria-activedescendant', 'search-result-0');
        }
        if (!endFirst) await emit('keydown', { key: 'Enter', keyCode: 13 });
        await emit('compositionend', { data: '桂小五郎' });
        // Some browsers deliver the final input after compositionend.
        await emit('beforeinput', { inputType: 'insertCompositionText', data: '桂小五郎', isComposing: endFirst });
        await input.dispatchEvent('input');
        if (endFirst) expect(await emit('keydown', { key: 'Enter', keyCode: 13 })).toBe(true);
        // Holding the confirmation key must not trigger application navigation.
        expect(await emit('keydown', { key: 'Enter', keyCode: 13, repeat: true })).toBe(true);
        await expect(page).toHaveURL(initialUrl);
        await expect(input).not.toHaveAttribute('aria-activedescendant', /.+/);
        await expect(page.locator('#searchResults')).toBeVisible();
        await emit('keyup', { key: 'Enter', keyCode: 13 });
        await input.press('ArrowDown');
        await expect(input).toHaveAttribute('aria-activedescendant', 'search-result-0');
        await input.press('Enter');
        await expect(page).toHaveURL(/person=kido/);
        await page.goBack();
        await expect(page).toHaveURL(initialUrl);
      }

      // beforeinput supplies composition state even if compositionstart is absent.
      await input.fill('伊藤俊輔');
      await input.press('ArrowDown');
      await emit('beforeinput', { inputType: 'insertCompositionText', data: '伊藤俊輔' });
      await emit('keydown', { key: 'Enter', keyCode: 13 });
      await expect(page).toHaveURL(initialUrl);
      await emit('compositionend', { data: '伊藤俊輔' });
      await input.dispatchEvent('input');
      await emit('keyup', { key: 'Enter', keyCode: 13 });
      await input.press('ArrowDown');
      await input.press('Enter');
      await expect(page).toHaveURL(/person=ito/);
      await page.reload();
      await expect(page).toHaveURL(/person=ito/);

      // Cancelling composition by leaving the input cannot leave a stuck guard.
      await input.fill('薩摩');
      await emit('compositionstart');
      await input.press('Tab');
      await input.fill('薩摩');
      await input.press('ArrowDown');
      await expect(input).toHaveAttribute('aria-activedescendant', 'search-result-0');
      await input.press('Escape');
      await expect(input).toHaveValue('');
      await expect(page.locator('#searchResults')).toBeHidden();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(errors).toEqual([]);
    });
  }
}

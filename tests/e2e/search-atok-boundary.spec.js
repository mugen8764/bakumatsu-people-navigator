const { expect, test } = require('../support/test.cjs');
const fixture = require('../fixtures/firefox-atok-arrowdown.json');

for (const width of [320, 390, 1280]) {
  for (const colorScheme of ['light', 'dark']) {
    test(`observed Firefox ATOK boundary at ${width}px in ${colorScheme}`, { tag: '@cross-browser' }, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.addInitScript(() => localStorage.clear());
      const errors = [];
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await page.goto('/#scene=1853-blackships&view=people&person=abe');
      const initialUrl = page.url();
      const input = page.locator('#globalSearch');
      const emit = event => input.evaluate((element, record) => {
        const { type, value, ...options } = record;
        if (value !== undefined) element.value = value;
        const EventClass = type.startsWith('composition') ? CompositionEvent
          : ['beforeinput', 'input'].includes(type) ? InputEvent : KeyboardEvent;
        const dispatched = new EventClass(type, { bubbles: true, cancelable: true, ...options });
        const accepted = element.dispatchEvent(dispatched);
        return { type, key: dispatched.key, code: dispatched.code, keyCode: dispatched.keyCode,
          isComposing: dispatched.isComposing, inputType: dispatched.inputType, accepted,
          active: element.getAttribute('aria-activedescendant'), value: element.value, url: location.href };
      }, event);

      // Synthetic setup, outside the supplied log: begin with an old active result.
      await input.fill('かつら');
      await input.press('ArrowDown');
      await input.press('ArrowDown');
      await expect(input).toHaveAttribute('aria-activedescendant', 'search-result-1');
      await emit({ type: 'compositionstart', data: 'かつら' });

      const trace = [];
      for (const [index, event] of fixture.events.entries()) {
        const snapshot = await emit(event);
        trace.push(snapshot);
        // This characterizes the current ambiguity; it does NOT establish ATOK compatibility.
        // The final keydown has the same observable fields as intentional Web navigation.
        const expected = index < 3 ? 'search-result-1' : index === 6 ? 'search-result-0' : null;
        expect(snapshot.active).toBe(expected);
        expect(snapshot.accepted).toBe(index !== 6);
        expect(snapshot.value).toBe('かつら');
        expect(snapshot.url).toBe(initialUrl);
        await expect(page.locator('#searchResults')).toBeVisible();
        await expect(page.locator('#searchResults [aria-selected="true"]')).toHaveCount(expected ? 1 : 0);
      }
      await testInfo.attach('observed-log-replay', { body: JSON.stringify({ fixture, trace }, null, 2), contentType: 'application/json' });

      // Synthetic continuation, not part of the real log: fast ordinary navigation and Enter.
      await emit({ type: 'keyup', key: 'ArrowDown', keyCode: 40 });
      await input.press('ArrowDown');
      await expect(input).toHaveAttribute('aria-activedescendant', 'search-result-1');
      await input.press('ArrowUp');
      await expect(input).toHaveAttribute('aria-activedescendant', 'search-result-0');
      await input.press('Enter');
      await expect(page).toHaveURL(/person=kido/);
      await expect(input).toHaveValue('');
      await expect(page.locator('#searchResults')).toBeHidden();
      await page.reload();
      await expect(page).toHaveURL(/person=kido/);
      await page.goBack();
      await expect(page).toHaveURL(initialUrl);
      await input.fill('かつら');
      await input.press('ArrowUp');
      await input.press('Escape');
      await expect(input).toHaveValue('');
      await expect(page.locator('#searchResults')).toBeHidden();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(errors).toEqual([]);
    });
  }
}

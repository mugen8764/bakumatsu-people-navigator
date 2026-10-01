const AxeBuilder = require('@axe-core/playwright').default;
const { expect, test } = require('../support/test.cjs');
const data = require('../../data.json');

for (const width of [320, 390, 1280]) {
  for (const colorScheme of ['light', 'dark']) {
    test(`person information precedes portrait details at ${width}px in ${colorScheme}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.addInitScript(() => localStorage.clear());
      const errors = [];
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      for (const [scene, id] of [['1853-blackships', 'abe'], ['1865-choshu', 'kido'], ['1853-blackships', 'nariaki']]) {
        await page.goto(`/#scene=${scene}&view=people&person=${id}`);
        await page.locator(`[data-person-card="${id}"]`).click();
        const detail = page.locator('#personDetail');
        const person = data.people.find(item => item.id === id);
        const sequence = await detail.locator('.detail-head,.portrait-note,.snapshot,.person-stance,#personTurningPoint,.portrait-credit').evaluateAll(items => items.map(item => item.className));
        expect(sequence.indexOf('snapshot')).toBeLessThan(sequence.indexOf('section person-stance'));
        if (person.turningPoints?.length) {
          expect(sequence.indexOf('section person-stance')).toBeLessThan(sequence.indexOf('section turning-point'));
        }
        if (person.portrait) {
          await expect(detail.locator('.portrait-note')).toHaveText('史料肖像｜選択時点の姿とは限りません。');
          await expect(detail.locator('.portrait-credit')).not.toHaveAttribute('open', '');
          expect(sequence.indexOf('section person-stance')).toBeLessThan(sequence.indexOf('source-disclosure portrait-credit'));
          await testInfo.attach(`person-${id}`, { body: await page.screenshot(), contentType: 'image/png' });
          await detail.locator('.portrait-credit summary').focus();
          await page.keyboard.press('Enter');
          await expect(detail.locator('.portrait-credit')).toHaveAttribute('open', '');
          for (const field of ['credit', 'dateNote', 'identityNote', 'rightsNote', 'originalSource']) {
            if (person.portrait[field]) await expect(detail.locator('.portrait-credit')).toContainText(person.portrait[field]);
          }
          await expect(detail.locator('.portrait-credit a')).toHaveCount(2);
          await page.keyboard.press('Enter');
          await expect(detail.locator('.portrait-credit')).not.toHaveAttribute('open', '');
        } else {
          await expect(detail.locator('.portrait-note,.portrait-credit')).toHaveCount(0);
        }
        if (await detail.locator('.office-trigger').count()) {
          await detail.locator('.office-trigger').focus();
          await page.keyboard.press('Enter');
          const help = detail.locator('#personOfficeHelp > summary');
          await expect(help).toBeFocused();
          const helpBox = await help.boundingBox();
          const tabs = await page.locator('.tabs-shell').boundingBox();
          expect(helpBox.y).toBeGreaterThanOrEqual(tabs.y + tabs.height);
          await page.keyboard.press('Enter');
        }
        const audit = await new AxeBuilder({ page }).include('#personDetail').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        expect(audit.violations).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      await page.goto('/#event=taisei-hokan');
      await page.locator('[data-event-person="yoshinobu"]').click();
      const role = page.locator('.person-incident');
      await expect(role).toBeVisible();
      const roleBox = await role.boundingBox();
      const snapshot = await page.locator('#personDetail .snapshot').boundingBox();
      expect(roleBox.y).toBeLessThan(snapshot.y);
      const sharedUrl = page.url();
      await page.reload();
      expect(page.url()).toBe(sharedUrl);
      await expect(role).toBeVisible();
      await role.locator('[data-open-event]').click();
      await page.goBack();
      await expect(role).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
}

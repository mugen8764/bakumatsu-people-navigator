const { expect, test } = require('../support/test.cjs');
const AxeBuilder = require('@axe-core/playwright').default;
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const domain = createDomain(data);
for (const width of [320, 390, 1280]) {
  for (const colorScheme of ['light', 'dark']) {
    test(`person incident history at ${width}px ${colorScheme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      for (const id of ['ryoma', 'hijikata', 'ii', 'abe', 'nariakira']) {
        const person = domain.getPerson(id);
        await page.goto(`/#scene=${data.scenes[person.activeRange[0]].id}&view=people&person=${id}`);
        const history = page.locator('.person-incident-history');
        const entries = domain.incidentHistoryFor(id);
        if (!entries.length) { await expect(history).toHaveCount(0); continue; }
        const shown = history.locator('[data-person-incident]:visible');
        await expect(shown).toHaveCount(Math.min(entries.length, 3));
        if (entries.length > 3) {
          await history.locator('summary').focus();
          await page.keyboard.press('Enter');
          await expect(shown).toHaveCount(entries.length);
        }
        for (const { incident, participant } of entries) {
          const row = history.locator(`[data-person-incident="${incident.id}"]`);
          await expect(row).toContainText(incident.date);
          await expect(row).toContainText(participant.displayName);
          await expect(row).toContainText(participant.role);
          await expect(page.locator(`#personDetail [data-open-event="${incident.id}"]`)).toHaveCount(1);
        }
        expect(await history.locator('[data-person-incident]').evaluateAll(items => items.map(x => x.dataset.personIncident))).toEqual(entries.map(x => x.incident.id));
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const audit = await new AxeBuilder({ page }).include('#personDetail').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        expect(audit.violations).toEqual([]);
      }
    });
  }
}
test('history preserves event role, shared URL, reload and back/forward', { tag: '@cross-browser' }, async ({ page, context }) => {
  await page.goto('/#scene=1864-kinmon&view=people&person=hijikata');
  const origin = page.url();
  const link = page.locator('.person-incident-history [data-open-event="ikedaya"]');
  await link.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#eventDetailTitle')).toHaveText('池田屋事件');
  await expect(page.locator('#eventDetailTitle')).toBeFocused();
  const sharedUrl = page.url();
  await page.reload();
  await expect(page.locator('#eventDetailTitle')).toHaveText('池田屋事件');
  const fresh = await context.newPage();
  await fresh.goto(sharedUrl);
  await expect(fresh.locator('#eventDetailTitle')).toHaveText('池田屋事件');
  await fresh.close();
  await page.goBack();
  await expect(page).toHaveURL(origin);
  await expect(link).toBeVisible();
  await page.goForward();
  await page.locator('[data-event-person="hijikata"]').click();
  await expect(page.locator('.person-incident')).toContainText('別隊の探索を指揮');
  await page.locator('.person-incident [data-open-event]').click();
  await expect(page.locator('#eventDetailTitle')).toHaveText('池田屋事件');
});
for (const colorScheme of ['light', 'dark']) {
  test(`incident history visual ${colorScheme}`, async ({ page }) => {
    test.skip(process.platform !== 'win32' || Boolean(process.env.CI), 'Windows visual baseline');
    await page.setViewportSize({ width: 390, height: 900 });
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.goto('/#scene=1867-taisei&view=people&person=ryoma');
    await expect(page.locator('.person-incident-history')).toHaveScreenshot(`incident-history-${colorScheme}.png`);
  });
}

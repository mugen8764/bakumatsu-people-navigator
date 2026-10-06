const { expect, test } = require('../support/test.cjs');
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const domain = createDomain(data);

for (const [width, colorScheme] of [[320, 'light'], [390, 'dark']]) {
  test(`reviewed careers and incident context at ${width}px ${colorScheme}`, { tag: '@cross-browser' }, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme });
    for (const [id, scenes, incident] of [
      ['saito', [5, 6, 7, 10, 11, 12], 'toba-fushimi-battle'],
      ['okubo-ichio', [1, 2, 3, 4, 5, 7, 8, 11, 12, 13], 'edo-castle-surrender'],
      ['kawai-tsuginosuke', [8, 9, 10, 11, 12, 13, 14], 'hokuetsu-1868'],
      ['manjiro', [3, 4, 5, 8, 9, 10, 11, 12, 15], 'embassy-kanrinmaru-1860']
    ]) {
      for (const scene of scenes) {
        await page.goto(`/#scene=${data.scenes[scene].id}&view=people&person=${id}`);
        const expected = domain.statusAt(domain.getPerson(id), scene);
        const detail = page.locator('#personDetail');
        await expect(detail.locator('.detail-title')).toHaveText(expected.display);
        await expect(detail).toContainText(expected.role);
        await expect(detail).toContainText(expected.stance);
        if (expected.evidence.reviewStatus === 'needs_review') await expect(detail).toContainText('出典校正中');
      }
      const participant = data.incidents[incident].participants.find(p => p.personId === id);
      await page.locator('#personDetail [data-person-section="personIncidentHistoryTitle"]').click();
      if (!await page.locator(`#personDetail [data-open-event="${incident}"]`).isVisible()) {
        await page.locator('#personDetail .person-incident-history summary').click();
      }
      await page.locator(`#personDetail [data-open-event="${incident}"]`).click();
      await expect(page.locator(`[data-event-person="${id}"]`)).toContainText(participant.role);
      await page.locator(`[data-event-person="${id}"]`).click();
      await expect(page.locator('.person-incident')).toContainText(participant.role);
      const url = page.url();
      await page.reload();
      expect(page.url()).toBe(url);
      await expect(page.locator('.person-incident')).toContainText(participant.role);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  });
}

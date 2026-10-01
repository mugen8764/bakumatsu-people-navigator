const AxeBuilder = require('@axe-core/playwright').default;
const { expect, test } = require('../support/test.cjs');
const people = require('../../data/people.json').people;
const incidents = require('../../data/events.json').incidents;

const addedIds = ['ito', 'inoue', 'yamagata', 'kuroda', 'itakagi', 'okuma-shigenobu', 'kawai-tsuginosuke', 'hisamitsu', 'abe', 'komei'];
const addedPeople = addedIds.map(id => people.find(person => person.id === id));

for (const colorScheme of ['light', 'dark']) {
  test(`added portraits load with credits and keyboard access at 320px in ${colorScheme}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 850 });
    await page.emulateMedia({ colorScheme });
    for (const person of addedPeople) {
      await page.goto(`/#scene=${person.activeStartSceneId}&view=people&person=${person.id}`);
      const card = page.locator(`[data-person-card="${person.id}"]`);
      await card.scrollIntoViewIfNeeded();
      await expect.poll(() => card.locator('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
      await card.focus();
      await page.keyboard.press('Enter');
      const detail = page.locator('#personDetail');
      await expect.poll(() => detail.locator('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
      await detail.locator('.portrait-credit summary').focus();
      await page.keyboard.press('Enter');
      await expect(detail.locator('.portrait-credit')).toHaveAttribute('open', '');
      await expect(detail.locator('.portrait-credit')).toContainText(person.portrait.originalSource);
      await expect(detail.locator('.portrait-credit')).toContainText(person.portrait.dateNote);
      await expect(detail.locator('.portrait-credit a')).toHaveCount(2);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
  });
}

test('added portraits render inside existing incidents and retain navigation when unavailable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 850 });
  const incidentCases = incidents.flatMap(incident => incident.participants
    .filter(participant => addedIds.includes(participant.personId))
    .map(participant => [incident.id, participant.personId]));
  expect(incidentCases.length).toBeGreaterThan(0);
  for (const [eventId, personId] of incidentCases) {
    await page.goto(`/#event=${eventId}`);
    const card = page.locator(`[data-event-person="${personId}"]`);
    await card.scrollIntoViewIfNeeded();
    await expect.poll(() => card.locator('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  }
  await page.route('**/assets/portraits/*', route => route.abort());
  for (const person of addedPeople) {
    await page.goto(`/#scene=${person.activeStartSceneId}&view=people&person=${person.id}`);
    const card = page.locator(`[data-person-card="${person.id}"]`);
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator('img')).toBeHidden();
    await card.click();
    await expect(page.locator('#personDetail img')).toBeHidden();
    await page.locator('#personDetail .portrait-credit summary').click();
    await expect(page.locator('#personDetail .portrait-credit')).toContainText(person.portrait.identityNote);
    await page.locator('#personBackToList').click();
    await expect(card).toBeFocused();
  }
});

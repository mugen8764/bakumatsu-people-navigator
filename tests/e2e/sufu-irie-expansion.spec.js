const { expect, test } = require('../support/test.cjs');

for (const [query, id, registryName, periodName, group] of [
  ['麻田公輔', 'sufu-masanosuke', '周布政之助', '麻田公輔', 'context'],
  ['入江杉蔵', 'irie-kuichi', '入江九一', '入江九一', 'onsite']
]) {
  test(`${registryName} search connects the period role, sources and Kyoto`, async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/');
    await page.locator('#globalSearch').fill(query);
    await page.locator('.search-result strong', { hasText: registryName }).click();
    await expect(page.locator('#personDetail')).toContainText(periodName);
    await expect(page.locator(`#personCards [data-person-card="${id}"]`)).toHaveCount(1);
    await page.locator('#prevScene').click();
    await expect(page.locator(`#personCards [data-person-card="${id}"]`)).toHaveCount(0);
    await page.locator('#nextScene').click();
    await page.locator(`#personCards [data-person-card="${id}"]`).click();
    await page.locator('#personDetail [data-open-event="kinmon-conflict"]').click();
    await expect(page.locator('#eventDetail [data-event-person]')).toHaveCount(6);
    await expect(page.locator(`.${group} [data-event-person="${id}"]`)).toBeVisible();
    if (id === 'sufu-masanosuke') {
      await expect(page.locator(`.onsite [data-event-person="${id}"]`)).toHaveCount(0);
    }
    await page.locator(`[data-event-person="${id}"]`).click();
    await page.locator('.person-incident summary').click();
    await expect(page.locator('.person-incident a').first()).toBeVisible();
    await page.locator('.person-incident [data-open-event]').click();
    await page.locator('#eventToMap').click();
    await expect(page.locator('#mapTitle')).toContainText('禁門の変');
    await expect(page.locator('#placeList')).toContainText('京都');
    await page.locator('.tab[data-view="people"]').click();
    await page.locator('#nextScene').click();
    await expect(page.locator(`#personCards [data-person-card="${id}"]`)).toHaveCount(0);
  });
}

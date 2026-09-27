const { expect, test } = require('../support/test.cjs');

for (const [query, id, registryName, periodName, incident, title, place] of [
  ['大隈八太郎', 'okuma-shigenobu', '大隈重信', '大隈八太郎', 'nagasaki-english-study-1867', '長崎での英学と佐賀藩の人材育成', '長崎'],
  ['佐野栄寿左衛門', 'sano-tsunetami', '佐野常民', '佐野栄寿左衛門', 'paris-exposition-1867', 'パリ万国博覧会と幕府・佐賀の使節', 'パリ']
]) {
  test(`Saga ${registryName} connects the period name, role, sources and map`, async ({ page }) => {
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
    await page.locator(`#personDetail [data-open-event="${incident}"]`).click();
    await expect(page.locator(`.onsite [data-event-person="${id}"]`)).toBeVisible();
    if (id === 'sano-tsunetami') {
      await expect(page.locator('#eventDetail [data-event-person]')).toHaveCount(6);
      await expect(page.locator('.decision [data-event-person="nabeshima"]')).toContainText('前佐賀藩主');
      await expect(page.locator('[data-event-person="okuma-shigenobu"]')).toHaveCount(0);
    }
    await page.locator(`[data-event-person="${id}"]`).click();
    await page.locator('.person-incident summary').click();
    await expect(page.locator('.person-incident a').first()).toBeVisible();
    await page.locator('.person-incident [data-open-event]').click();
    await page.locator('#eventToMap').click();
    await expect(page.locator('#mapTitle')).toContainText(title);
    await expect(page.locator('#placeList')).toContainText(place);
    await page.locator('.tab[data-view="people"]').click();
    await page.locator('#nextScene').click();
    await expect(page.locator(`#personCards [data-person-card="${id}"]`)).toHaveCount(0);
  });
}

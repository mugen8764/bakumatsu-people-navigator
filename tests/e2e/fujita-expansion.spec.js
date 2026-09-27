const { expect, test } = require('../support/test.cjs');

for (const [query, name, id, event, title, place, role] of [
  ['藤田誠之進', '藤田東湖', 'fujita-toko', 'mito-coastal-defense-1853', '黒船来航後の水戸の海防と斉昭の補佐', '水戸', '斉昭の海防補佐'],
  ['ふじたこしろう', '藤田小四郎', 'fujita-koshiro', 'tenguto-uprising-westward', '天狗党の挙兵と西上', '敦賀', '筑波山の挙兵と西上']
]) {
  test(`${name} search reaches distinct role, evidence and representative map`, async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/');
    await page.locator('#globalSearch').fill(query);
    await page.locator('.search-result strong', { hasText: new RegExp(`^${name}$`) }).click();
    await expect(page.locator(`#personCards [data-person-card="${id}"]`)).toHaveCount(1);
    await page.locator(`#personDetail [data-open-event="${event}"]`).click();
    await expect(page.locator('#eventDetail')).toContainText(role);
    await page.locator(`[data-event-person="${id}"]`).click();
    await page.locator('.person-incident summary').click();
    await expect(page.locator('.person-incident a').first()).toBeVisible();
    await page.locator('.person-incident [data-open-event]').click();
    await page.locator('#eventToMap').click();
    await expect(page.locator('#mapTitle')).toContainText(title);
    await expect(page.locator('#placeList')).toContainText(place);
    await page.locator('.tab[data-view="people"]').click();
    await page.locator('#nextScene').click();
    if (id === 'fujita-toko') {
      await expect(page.locator(`#personCards [data-person-card="${id}"]`)).toHaveCount(1);
      await page.locator('#nextScene').click();
    }
    await expect(page.locator(`#personCards [data-person-card="${id}"]`)).toHaveCount(0);
  });
}

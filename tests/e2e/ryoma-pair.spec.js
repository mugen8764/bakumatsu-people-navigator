const { expect, test } = require('../support/test.cjs');

for (const [query, id, name, incident] of [
  ['饅頭屋長次郎', 'kondo-chojiro', '近藤長次郎', 'kameyama-shachu-procurement'],
  ['陸奥宗光', 'mutsu-munemitsu', '陸奥陽之助', 'kaientai-activities-1867']
]) {
  test(`${query} connects the period name, incident, sources and Nagasaki`, async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/');
    await page.locator('#globalSearch').fill(query);
    await page.locator('.search-result strong', { hasText: id === 'mutsu-munemitsu' ? /^陸奥宗光$/ : /^近藤長次郎$/ }).click();
    await expect(page.locator(`#personCards [data-person-card="${id}"]`)).toHaveCount(1);
    await expect(page.locator('#personDetail')).toContainText(name);
    await expect(page.locator('#personDetail')).toContainText('航海・交易');
    await page.locator('#prevScene').click();
    await expect(page.locator(`#personCards [data-person-card="${id}"]`)).toHaveCount(0);
    await page.locator('#nextScene').click();
    await expect(page.locator(`#personCards [data-person-card="${id}"]`)).toHaveCount(1);
    await page.locator(`#personCards [data-person-card="${id}"]`).click();
    await page.locator(`#personDetail [data-open-event="${incident}"]`).click();
    await page.locator(`[data-event-person="${id}"]`).click();
    await page.locator('.person-incident summary').click();
    await expect(page.locator('.person-incident a').first()).toBeVisible();
    await page.locator('.person-incident [data-open-event]').click();
    await expect(page.locator(`[data-event-person="${id}"]`)).toContainText(name);
    if (id === 'mutsu-munemitsu') {
      await expect(page.locator(`.context [data-event-person="${id}"]`)).toBeVisible();
      await expect(page.locator('[data-event-person="kondo-chojiro"]')).toHaveCount(0);
    } else {
      await expect(page.locator('#eventDetail')).toContainText('1866年旧暦1月');
      await expect(page.locator('[data-event-person="glover"]')).toBeVisible();
    }
    await page.locator('#eventToMap').click();
    await expect(page.locator('#mapTitle')).toContainText(id === 'mutsu-munemitsu' ? '海援隊と出身藩を越えた活動' : '亀山社中と武器・船の調達');
    await expect(page.locator('#placeList')).toContainText('長崎');
    await page.locator('.tab[data-view="people"]').click();
    await page.locator('#nextScene').click();
    await expect(page.locator(`#personCards [data-person-card="${id}"]`)).toHaveCount(0);
    await page.goto(`/#event=${incident}`);
    await expect(page.locator(`[data-event-person="${id}"]`)).toBeVisible();
  });
}

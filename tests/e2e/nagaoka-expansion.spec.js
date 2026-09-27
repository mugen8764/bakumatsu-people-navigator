const { expect, test } = require('../support/test.cjs');

test('Nagaoka search connects secretary work, evidence and Nagasaki within 1867', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await page.locator('#globalSearch').fill('ながおかけんきち');
  await page.locator('.search-result strong', { hasText: /^長岡謙吉$/ }).click();
  await expect(page.locator('#personDetail')).toContainText('海援隊書記');
  await expect(page.locator('#personDetail')).toContainText('航海・交易');
  await expect(page.locator('#personCards [data-person-card="nagaoka-kenkichi"]')).toHaveCount(1);
  await page.locator('#prevScene').click();
  await expect(page.locator('#personCards [data-person-card="nagaoka-kenkichi"]')).toHaveCount(0);
  await page.locator('#nextScene').click();
  await page.locator('#personCards [data-person-card="nagaoka-kenkichi"]').click();
  await page.locator('#personDetail [data-open-event="kaientai-activities-1867"]').click();
  await expect(page.locator('.context [data-event-person="nagaoka-kenkichi"]')).toContainText('文書の作成');
  await expect(page.locator('[data-event-person="mutsu-munemitsu"]')).toBeVisible();
  await page.locator('[data-event-person="nagaoka-kenkichi"]').click();
  await expect(page.locator('.person-incident')).toContainText('文官的な役割');
  await page.locator('.person-incident summary').click();
  await expect(page.locator('.person-incident a').first()).toBeVisible();
  await page.locator('.person-incident [data-open-event]').click();
  await page.locator('#eventToMap').click();
  await expect(page.locator('#mapTitle')).toContainText('海援隊と出身藩を越えた活動');
  await expect(page.locator('#placeList')).toContainText('長崎');
  await page.locator('.tab[data-view="people"]').click();
  await page.locator('#nextScene').click();
  await expect(page.locator('#personCards [data-person-card="nagaoka-kenkichi"]')).toHaveCount(0);
});

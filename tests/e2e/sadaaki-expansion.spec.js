const { expect, test } = require('../support/test.cjs');

test('Sadaaki search connects separate Kyoto offices, treaty evidence and map within 1865', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await page.locator('#globalSearch').fill('まつだいらさだあき');
  await page.locator('.search-result strong', { hasText: /^松平定敬$/ }).click();
  await expect(page.locator('#personDetail')).toContainText('桑名藩主・京都所司代');
  await expect(page.locator('#personCards [data-person-card="matsudaira-sadaaki"]')).toHaveCount(1);
  await page.locator('#prevScene').click();
  await expect(page.locator('#personCards [data-person-card="matsudaira-sadaaki"]')).toHaveCount(0);
  await page.locator('#nextScene').click();
  await page.locator('#personCards [data-person-card="matsudaira-sadaaki"]').click();
  await page.locator('#personDetail [data-open-event="treaty-imperial-approval-1865"]').click();
  await expect(page.locator('.decision [data-event-person]')).toHaveCount(3);
  await expect(page.locator('.onsite [data-event-person]')).toHaveCount(0);
  for (const role of ['禁裏守衛総督', '京都守護職', '京都所司代']) {
    await expect(page.locator('#eventDetail')).toContainText(role);
  }
  await expect(page.locator('#eventDetail')).toContainText('条約のみ勅許');
  await expect(page.locator('#eventDetail')).toContainText('先期開港は認められなかった');
  await page.locator('[data-event-person="matsudaira-sadaaki"]').click();
  await page.locator('.person-incident summary').click();
  await expect(page.locator('.person-incident a').first()).toBeVisible();
  await page.locator('.person-incident [data-open-event]').click();
  await page.locator('#eventToMap').click();
  await expect(page.locator('#mapTitle')).toContainText('条約の勅許と兵庫開港をめぐる協議');
  await expect(page.locator('#placeList')).toContainText('京都');
  await page.locator('.tab[data-view="people"]').click();
  await page.locator('#nextScene').click();
  await expect(page.locator('#personCards [data-person-card="matsudaira-sadaaki"]')).toHaveCount(0);
});

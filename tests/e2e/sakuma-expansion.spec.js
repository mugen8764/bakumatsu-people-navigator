const { expect, test } = require('../support/test.cjs');

test('Sakuma search connects the voyage role, sources and historical places', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await page.locator('#globalSearch').fill('佐久間国忠');
  await page.locator('.search-result strong', { hasText: /^佐久間象山$/ }).click();
  await expect(page.locator('#personDetail')).toContainText('松代で蟄居中の学者');
  await expect(page.locator('#personCards [data-person-card="sakuma-shozan"]')).toHaveCount(1);
  await page.locator('#prevScene').click();
  await expect(page.locator('#personCards [data-person-card="sakuma-shozan"]')).toHaveCount(0);
  await page.locator('#nextScene').click();
  await page.locator('#personCards [data-person-card="sakuma-shozan"]').click();
  await page.locator('#personDetail [data-open-event="shoin-voyage-attempt-1854"]').click();
  await expect(page.locator('.context [data-event-person="sakuma-shozan"]')).toBeVisible();
  await expect(page.locator('.onsite [data-event-person="sho-in"]')).toBeVisible();
  await expect(page.locator('.onsite [data-event-person="sakuma-shozan"]')).toHaveCount(0);
  await page.locator('[data-event-person="sakuma-shozan"]').click();
  await expect(page.locator('.person-incident')).toContainText('事件に連座');
  await page.locator('.person-incident summary').click();
  await expect(page.locator('.person-incident a').first()).toBeVisible();
  await page.locator('.person-incident [data-open-event]').click();
  await page.locator('#eventToMap').click();
  await expect(page.locator('#mapTitle')).toContainText('松陰の渡航未遂と象山の処分');
  await expect(page.locator('#placeList')).toContainText('下田');
  await expect(page.locator('#placeList')).toContainText('萩');
});

test('Sakuma dies before Kinmon and disappears at the next scene', async ({ page }) => {
  await page.goto('/#scene=1864-kinmon&view=people&person=sakuma-shozan');
  await expect(page.locator('#personCards [data-person-card="sakuma-shozan"]')).toHaveCount(1);
  await expect(page.locator('#personDetail')).toContainText('禁門の変が起きる前に死亡');
  await page.locator('#nextScene').click();
  await expect(page.locator('#personCards [data-person-card="sakuma-shozan"]')).toHaveCount(0);
  await page.goto('/#event=kinmon-conflict');
  await expect(page.locator('[data-event-person="sakuma-shozan"]')).toHaveCount(0);
  await page.goto('/#event=ansei-purge');
  await expect(page.locator('[data-event-person="sakuma-shozan"]')).toHaveCount(0);
});

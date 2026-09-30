const { expect, test } = require('../support/test.cjs');
const { catalog } = require('../support/catalog.cjs');

test('Ikedaya exposes distinct Todo and Harada roles with readable sources', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/#event=ikedaya');
  await expect(page.locator('.onsite [data-event-person]')).toHaveCount(catalog.incidents.ikedaya.participants.filter(p => p.involvement === 'onsite').length);
  await expect(page.locator('[data-event-person="todo-heisuke"]')).toContainText('近藤隊として突入');
  await expect(page.locator('[data-event-person="harada-sanosuke"]')).toContainText('事件に出動した隊士');
  await page.locator('[data-event-person="harada-sanosuke"]').click();
  await page.locator('.person-incident summary').click();
  await expect(page.locator('.person-incident a[href="https://www.archives.go.jp/exhibition/digital/bakumatsu/contents/43.html"]')).toBeVisible();
  await page.locator('.person-incident [data-open-event]').click();
  await page.locator('#eventToMap').click();
  await expect(page.locator('#mapTitle')).toContainText('池田屋事件');
});

test('Todo affiliation switches to Goryo Eji and both people end at their coverage boundaries', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await page.locator('#globalSearch').fill('藤堂平助');
  await page.locator('.search-result strong', { hasText: /^藤堂平助$/ }).click();
  await expect(page.locator('#personCards [data-person-card="todo-heisuke"]')).toHaveCount(1);
  await page.locator('#prevScene').click();
  await expect(page.locator('#personCards [data-person-card="todo-heisuke"]')).toHaveCount(0);
  await page.goto('/#scene=1866-expedition&view=people&person=todo-heisuke');
  await expect(page.locator('#personDetail .badges')).toContainText('新選組');
  await page.locator('#nextScene').click();
  await expect(page.locator('#personDetail .detail-title')).toHaveText('藤堂平助');
  await expect(page.locator('#personDetail .badges')).toContainText('御陵衛士');
  await page.locator('.tab[data-view="factions"]').click();
  await expect(page.locator('#view-factions')).toContainText('孝明天皇');
  await page.locator('#nextScene').click();
  await page.locator('.tab[data-view="people"]').click();
  await expect(page.locator('#personCards [data-person-card="todo-heisuke"]')).toHaveCount(0);
  await page.goto('/#scene=1868-toba&view=people&person=harada-sanosuke');
  await expect(page.locator('#personCards [data-person-card="harada-sanosuke"]')).toHaveCount(1);
  await page.locator('#nextScene').click();
  await expect(page.locator('#personCards [data-person-card="harada-sanosuke"]')).toHaveCount(0);
  await page.locator('#globalSearch').fill('忠一');
  await page.locator('.search-result strong', { hasText: /^原田左之助$/ }).click();
  await expect(page.locator('#personDetail .detail-title')).toHaveText('原田左之助');
});

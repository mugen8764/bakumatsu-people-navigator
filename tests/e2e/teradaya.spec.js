const { expect, test } = require('../support/test.cjs');
const AxeBuilder = require('@axe-core/playwright').default;

test('Teradaya search separates two years and preserves help, sources and map context', { tag: '@cross-browser' }, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto('/');
  await page.locator('#globalSearch').fill('寺田屋');
  await expect(page.locator('.search-result strong', { hasText: '寺田屋事件と薩摩藩内の対立（1862年）' })).toBeVisible();
  await page.locator('.search-result strong', { hasText: '寺田屋襲撃と龍馬の救援（1866年）' }).click();
  await expect(page.locator('.onsite [data-event-person]')).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('[data-event-person="oryo"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#personDetail .badges')).toContainText('活動分野：暮らし・支援');
  await expect(page.locator('.person-incident')).toContainText('看護');
  await page.locator('#personDetail').getByText('参考資料を見る', { exact: true }).click();
  await expect(page.locator('[data-person-sources="basic"]')).toContainText('出典校正中');
  await expect(page.locator('[data-person-sources="status"]')).not.toContainText('出典校正中');
  await page.reload();
  await page.locator('.person-incident [data-open-event]').click();
  await page.locator('#eventToMap').click();
  await page.locator('[data-map-place-card="fushimi"] [data-map-event="teradaya-1866"]').click();
  await expect(page.locator('#eventDetailTitle')).toBeFocused();
  await page.locator('[data-event-person="miyoshi-shinzo"]').click();
  await expect(page.locator('#personDetail .badges')).toContainText('長府藩');
  await page.locator('.person-incident summary').click();
  await expect(page.locator('.person-incident a[href="https://www.city.shimonoseki.lg.jp/site/kouhou/50756.html"]')).toBeVisible();
  await page.locator('#nextScene').click();
  await expect(page.locator('#personCards [data-person-card="miyoshi-shinzo"]')).toHaveCount(0);
  await page.locator('#globalSearch').fill('楢崎龍');
  await page.locator('.search-result strong', { hasText: 'お龍' }).first().click();
  await expect(page.locator('#sceneSelect')).toHaveValue('9');
  await expect(page.locator('#personDetail .detail-title')).toHaveText('お龍');
});

test('1862 Teradaya retains the internal Satsuma conflict through person and map navigation', { tag: '@cross-browser' }, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto('/');
  await page.locator('#globalSearch').fill('寺田屋');
  await page.locator('.search-result strong', { hasText: '寺田屋事件と薩摩藩内の対立（1862年）' }).click();
  await expect(page.locator('.onsite [data-event-person]')).toHaveCount(2);
  await expect(page.locator('[data-event-person="hisamitsu"]')).toContainText('派遣');
  await page.locator('[data-event-person="narahara-shigeru"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#personDetail .detail-title')).toHaveText('奈良原喜八郎');
  await page.reload();
  await page.locator('.person-incident [data-open-event]').click();
  await page.locator('#eventToMap').click();
  await page.locator('[data-map-place-card="fushimi"] [data-map-event="teradaya-1862"]').click();
  await expect(page.locator('#eventDetailTitle')).toBeFocused();
  await page.locator('[data-event-person="arima-shinshichi"]').click();
  await page.locator('.person-incident summary').click();
  await expect(page.locator('.person-incident a[href="https://www.pref.kagoshima.jp/ab23/pr/gaiyou/rekishi/bakumatu/teradaya.html"]')).toBeVisible();
  await page.locator('#nextScene').click();
  await expect(page.locator('#personCards [data-person-card="arima-shinshichi"]')).toHaveCount(0);
  await expect(page.locator('#personCards [data-person-card="narahara-shigeru"]')).toHaveCount(0);
  await page.locator('#globalSearch').fill('奈良原繁');
  await page.locator('.search-result strong', { hasText: '奈良原' }).first().click();
  await expect(page.locator('#sceneSelect')).toHaveValue('4');
});

for (const colorScheme of ['light', 'dark']) {
  test(`1862 Teradaya roles are accessible at 320px in ${colorScheme}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 850 });
    await page.emulateMedia({ colorScheme });
    await page.goto('/#event=teradaya-1862');
    await expect(page.locator('#eventDetailTitle')).toContainText('1862年');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.locator('[data-event-person="arima-shinshichi"]').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  });
  test(`Teradaya help and the new field are readable and accessible at 320px in ${colorScheme}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 850 });
    await page.emulateMedia({ colorScheme });
    await page.goto('/#event=teradaya-1866');
    await expect(page.locator('#eventDetailTitle')).toContainText('1866年');
    await page.locator('.background-term summary', { hasText: '船宿' }).click();
    await expect(page.locator('.background-term[open]')).toContainText('現在の建物は再建');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.locator('[data-event-person="oryo"]').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.goto('/#scene=1866-satcho&view=factions&faction=' + encodeURIComponent('暮らし・支援'));
    await expect(page.locator('#factionDetail')).toContainText('活動分野について');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  });
}

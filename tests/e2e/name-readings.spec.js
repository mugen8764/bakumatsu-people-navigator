const { expect, test } = require('../support/test.cjs');
const AxeBuilder = require('@axe-core/playwright').default;

for (const [id, basicName, displayName, query, scene, incident] of [
  ['takechi', '武市瑞山', '武市半平太', 'たけちはんぺいた', '1862-bunkyu', 'tosa-politics-1862'],
  ['shungaku', '松平慶永', '松平春嶽', 'まつだいらしゅんがく', '1862-bunkyu'],
  ['okubo-ichio', '大久保一翁', '大久保忠寛', 'おおくぼただひろ', '1858-ansei'],
  ['itakagi', '板垣退助', '乾退助', 'いぬいたいすけ', '1867-taisei'],
  ['katsu', '勝海舟', '勝麟太郎', 'かつりんたろう', '1860-sakurada', 'embassy-kanrinmaru-1860'],
  ['iemochi', '徳川家茂', '徳川慶福', 'とくがわよしとみ', '1858-ansei', 'shogun-succession-1858'],
  ['omura', '大村益次郎', '村田蔵六', 'むらたぞうろく', '1866-satcho']
]) {
  test(`third-round reading ${displayName} selects its person and preserves the current name`, { tag: '@cross-browser' }, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 850 });
    await page.addInitScript(() => localStorage.clear());
    await page.goto(`/#scene=${scene}&view=people`);
    for (const input of [displayName, query]) {
      await page.locator('#globalSearch').fill(input);
      await expect(page.locator('.search-result').first()).toContainText(basicName);
      await page.locator('#globalSearch').press('ArrowDown');
      await page.locator('#globalSearch').press('Enter');
      await expect(page.locator('#personDetail .detail-title')).toHaveText(displayName);
      await expect(page).toHaveURL(new RegExp(`person=${id}`));
    }
    await page.reload();
    await expect(page.locator('#personDetail .detail-title')).toHaveText(displayName);
    if (incident) {
      await page.locator(`#personDetail [data-open-event="${incident}"]`).click();
      await expect(page.locator(`[data-event-person="${id}"] strong`)).toHaveText(displayName);
      await page.locator(`[data-event-person="${id}"]`).click();
      await expect(page.locator('#personDetail .detail-title')).toHaveText(displayName);
      await expect(page.locator('.person-incident')).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('unconfirmed Okubo Shosuke remains searchable by name without an invented reading', { tag: '@cross-browser' }, async ({ page }) => {
  await page.goto('/#scene=1858-ansei&view=people&person=okubo');
  await page.locator('#globalSearch').fill('大久保正助');
  await expect(page.locator('.search-result').first()).toContainText('大久保利通');
  await page.locator('#globalSearch').fill('おおくぼしょうすけ');
  await expect(page.locator('#searchResults')).toContainText('該当する項目がありません');
});

for (const colorScheme of ['light', 'dark']) {
  test(`sourced alias readings support keyboard search and incident names at 320px ${colorScheme}`, { tag: '@cross-browser' }, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 850 });
    await page.emulateMedia({ colorScheme });
    await page.addInitScript(() => localStorage.clear());
    for (const [query, id, displayName, scene, incident] of [
      ['かつらこごろう', 'kido', '桂小五郎', '1864-kinmon', 'kinmon-conflict'],
      ['やまがたきょうすけ', 'yamagata', '山県狂介', '1868-tohoku', 'hokuetsu-1868'],
      ['あさだこうすけ', 'sufu-masanosuke', '麻田公輔', '1864-kinmon', 'kinmon-conflict'],
      ['いとうしゅんすけ', 'ito', '伊藤俊輔', '1864-kinmon', 'shimonoseki-1864'],
      ['いのうえもんた', 'inoue', '井上聞多', '1864-kinmon', 'shimonoseki-1864'],
      ['さいごうきちのすけ', 'saigo', '西郷吉之助', '1866-satcho', 'satcho-agreement'],
      ['きどじゅんいちろう', 'kido', '木戸準一郎', '1866-satcho', 'satcho-agreement'],
      ['おおくぼいちぞう', 'okubo', '大久保一蔵', '1867-taisei', 'royal-restoration'],
      ['ひとつばしよしのぶ', 'yoshinobu', '一橋慶喜', '1864-kinmon', 'kinmon-conflict']
    ]) {
      await page.goto(`/#scene=${scene}&view=people&person=${id}`);
      await page.locator('#globalSearch').fill(query);
      const basicName = { kido: '木戸孝允', yamagata: '山県有朋', 'sufu-masanosuke': '周布政之助', ito: '伊藤博文', inoue: '井上馨', saigo: '西郷隆盛', okubo: '大久保利通', yoshinobu: '徳川慶喜' }[id];
      await expect(page.locator('.search-result').first()).toContainText(basicName);
      await page.locator('#globalSearch').press('ArrowDown');
      await page.locator('#globalSearch').press('Enter');
      await expect(page.locator('#personDetail .detail-title')).toHaveText(displayName);
      await page.locator(`#personDetail [data-open-event="${incident}"]`).click();
      await expect(page.locator(`[data-event-person="${id}"] strong`)).toHaveText(displayName);
      await page.locator(`[data-event-person="${id}"]`).focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('.person-incident')).toBeVisible();
      await page.locator('.person-incident [data-open-event]').click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(audit.violations).toEqual([]);
    await page.goto('/#event=shimonoseki-1864');
    await expect(page.locator('[data-event-person="takasugi"] strong')).toHaveText('宍戸刑馬');
    await page.locator('#globalSearch').fill('ししどぎょうま');
    await expect(page.locator('#searchResults')).toContainText('該当する項目がありません');
  });
}

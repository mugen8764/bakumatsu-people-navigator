const { expect, test } = require('../support/test.cjs');
const AxeBuilder = require('@axe-core/playwright').default;

for (const width of [320, 390, 1280]) {
  for (const colorScheme of ['light', 'dark']) {
    test(`relation display differences at ${width}px in ${colorScheme}`, { tag: '@cross-browser' }, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      const errors = [];
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await page.goto('/#scene=1866-satcho&view=events&person=kido');
      await page.locator('#sceneDetails > summary').press('Enter');
      const groups = page.locator('#sceneChangeGroups');
      const started = page.locator('[data-scene-change-group="started"]');
      const ended = page.locator('[data-scene-change-group="ended"]');
      await expect(groups).toHaveAccessibleName('前の時点からの人物の立場と関係の表示差分');
      await expect(groups).toHaveAccessibleDescription(/登録された表示期間の差分.*史実上の関係・同盟の終了を意味しません/);
      await expect(started.locator('h4')).toHaveText('この時点から表示する関係');
      await expect(started.locator('.scene-change-group-heading span')).toHaveText('6');
      await expect(started.locator('.scene-change-item')).toHaveCount(3);
      await expect(ended.locator('h4')).toHaveText('前の時点まで表示した関係');
      await expect(ended.locator('.scene-change-group-heading span')).toHaveText('1');
      await expect(page.locator('[data-scene-change-group="updated"]')).toContainText('桂小五郎 → 木戸準一郎');

      await page.locator('#nextScene').press('Enter');
      await expect(page.locator('#sceneSelect')).toHaveValue('10');
      await expect(started.locator('.scene-change-empty')).toHaveText('この時点から表示する主要関係なし');
      await expect(ended.locator('.scene-change-group-heading span')).toHaveText('5');
      await expect(ended.locator('.scene-change-item')).toHaveCount(3);
      await expect(ended).toContainText('西郷吉之助 × 木戸準一郎');
      await expect(ended).toContainText('薩長同盟の締結');
      await expect(ended).toContainText('薩長同盟の仲介');
      await expect(groups).not.toContainText('終わった関係');
      await expect(page.locator('#sceneRelationsNote')).toBeVisible();
      await testInfo.attach(`relations-${width}-${colorScheme}`, { body: await page.locator('#sceneChanges').screenshot(), contentType: 'image/png' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(scan.violations).toEqual([]);

      await page.locator('#prevScene').press('Enter');
      await expect(started.locator('.scene-change-group-heading span')).toHaveText('6');
      await page.locator('#sceneSelect').selectOption('1');
      await expect(ended.locator('.scene-change-empty')).toHaveText('前の時点までで表示対象から外れる主要関係なし');
      await expect(started).toContainText('和親条約の交渉');
      await page.locator('#sceneSelect').selectOption('15');
      await expect(ended.locator('.scene-change-group-heading span')).toHaveText('4');
      await expect(ended).toContainText('新政府 × 会津藩');
      await page.locator('#sceneSelect').selectOption('0');
      await expect(page.locator('#sceneChangesHeading')).toHaveText('ここからたどる');
      await expect(page.locator('#sceneRelationsNote')).toBeHidden();
      await expect(groups).not.toHaveAttribute('aria-describedby');
      await expect(page.locator('.scene-change-group')).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  }
}

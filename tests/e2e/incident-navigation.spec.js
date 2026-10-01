const { expect, test } = require('../support/test.cjs');
const { catalog } = require('../support/catalog.cjs');
const AxeBuilder = require('@axe-core/playwright').default;

for (const width of [320, 390, 1280]) {
  for (const colorScheme of ['light', 'dark']) {
    test(`incident section navigation at ${width}px in ${colorScheme}`, { tag: '@cross-browser' }, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      const errors = [];
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await page.goto('/');
      const sceneToggle = page.locator('#sceneDetails > summary');
      await expect(sceneToggle).toHaveAccessibleName('前の時点からの変化を見る');
      await expect(sceneToggle.locator('.details-closed-copy')).toHaveText('変化を見る');
      await sceneToggle.press('Enter');
      await expect(page.locator('#sceneDetails')).toHaveAttribute('open', '');
      await sceneToggle.press('Enter');
      await expect(page.locator('#sceneDetails')).not.toHaveAttribute('open', '');

      for (const id of ['toba-fushimi-battle', 'aizu-siege', 'hakodate-1869', 'first-choshu-expedition']) {
        await page.goto(`/#event=${id}`);
        const incident = catalog.incidents[id];
        await expect(page.locator('#eventDetailTitle')).toHaveText(incident.title);
        const route = page.url();
        const historyLength = await page.evaluate(() => history.length);
        const expected = ['eventDetailTitle'];
        for (const [kind, label] of [['onsite', '現場'], ['decision', '意思決定'], ['context', '背景']]) {
          const count = incident.participants.filter(item => item.involvement === kind).length;
          const button = page.locator(`[data-incident-section="incidentLane-${kind}"]`);
          if (count) {
            await expect(button).toHaveText(`${label} ${count}`);
            expected.push(`incidentLane-${kind}`);
          } else await expect(button).toHaveCount(0);
        }
        if (incident.relations.length) expected.push('incidentRelationsTitle');
        else await expect(page.locator('[data-incident-section="incidentRelationsTitle"]')).toHaveCount(0);
        expected.push('incidentSourcesTitle');
        await expect(page.getByRole('navigation', { name: '事件内の移動' })).toBeVisible();
        await expect(page.locator('[data-incident-section]')).toHaveCount(expected.length);
        await page.locator('[data-incident-section="eventDetailTitle"]').scrollIntoViewIfNeeded();
        await page.locator('[data-incident-section="eventDetailTitle"]').click();
        if (id === 'toba-fushimi-battle' && width === 390 && process.platform === 'win32' && !process.env.CI) {
          await expect(page).toHaveScreenshot(`incident-navigation-390-${colorScheme}.png`, { animations: 'disabled' });
        }
        await testInfo.attach(`${id}-${width}-${colorScheme}`, { body: await page.screenshot(), contentType: 'image/png' });
        for (const targetId of expected) {
          await page.locator(`[data-incident-section="${targetId}"]`).press('Enter');
          const target = page.locator(`#${targetId}`);
          await expect(target).toBeFocused();
          const bounds = await target.boundingBox();
          const tabs = await page.locator('.tabs-shell').boundingBox();
          expect(bounds.y, `${id}: ${targetId} below tabs`).toBeGreaterThanOrEqual(tabs.y + tabs.height);
          expect(bounds.y).toBeLessThan(900);
          expect(await target.textContent()).toBeTruthy();
          expect(page.url()).toBe(route);
          expect(await page.evaluate(() => history.length)).toBe(historyLength);
        }
        await expect(page.locator('#incidentSourcesTitle').locator('..')).toHaveAttribute('open', '');
        if (incident.participants.some(item => item.involvement === 'context')) {
          await expect(page.locator('#incidentLane-context')).toHaveText('背景・前後関係');
          await expect(page.locator('.context .incident-lane-note')).toContainText('現場参加を示すものではありません');
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.locator('[data-incident-section="incidentSourcesTitle"]').hover();
        const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        expect(scan.violations).toEqual([]);
        await page.reload();
        await expect(page.locator('#eventDetailTitle')).toHaveText(incident.title);
        const personId = incident.participants[0].personId;
        await page.locator(`[data-event-person="${personId}"]`).click();
        await expect(page.locator('.person-incident')).toBeVisible();
        await page.goBack();
        await expect(page.locator('#eventDetailTitle')).toHaveText(incident.title);
        await page.goForward();
        await expect(page.locator('.person-incident')).toBeVisible();
      }
      expect(errors).toEqual([]);
    });
  }
}

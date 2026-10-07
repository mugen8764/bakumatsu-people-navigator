const { expect, test } = require('../support/test.cjs');
const AxeBuilder = require('@axe-core/playwright').default;
const data = require('../../data.json');
const { createDomain } = require('../../src/domain.js');
const domain = createDomain(data);

function targets(id, scene) {
  const person = domain.getPerson(id);
  return ['personCurrentTitle', ...(person.turningPoints?.length ? ['personTurningPointTitle'] : []),
    ...(domain.incidentHistoryFor(id).length ? ['personIncidentHistoryTitle'] : []),
    ...(domain.relationsFor(id, scene).length ? ['personRelationsTitle'] : []), 'personHistoryTitle', 'personSourcesTitle'];
}

for (const width of [320, 390, 1280]) {
  for (const colorScheme of ['light', 'dark']) {
    test(`person section navigation at ${width}px ${colorScheme}`, { tag: '@cross-browser' }, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      for (const id of ['ryoma', 'hijikata', 'iwakura']) {
        const scene = 11;
        await page.goto(`/#scene=${data.scenes[scene].id}&view=people&person=${id}`);
        const nav = page.getByRole('navigation', { name: '人物内の移動' });
        await expect(nav).toBeVisible();
        const expected = targets(id, scene);
        await expect(nav.locator('[data-person-section="personCurrentTitle"]')).toHaveText('この時点');
        await expect(nav.locator('[data-person-section="personHistoryTitle"]')).toHaveText('時点履歴');
        await expect(page.locator('#personHistoryTitle')).toHaveText('時点履歴');
        const rows = await nav.locator('button').evaluateAll(items => [...new Set(items.map(item => Math.round(item.getBoundingClientRect().top)))]);
        if (width <= 390) expect(rows.length).toBeLessThanOrEqual(2);
        expect(await nav.locator('button').evaluateAll(items => items.map(x => x.dataset.personSection))).toEqual(expected);
        expect(await nav.evaluate(x => getComputedStyle(x).position)).toBe('static');
        const url = page.url();
        const historyLength = await page.evaluate(() => history.length);
        for (const targetId of expected) {
          await nav.locator(`[data-person-section="${targetId}"]`).press('Enter');
          const heading = page.locator(`#${targetId}`);
          await expect(heading).toBeFocused();
          const bounds = await heading.boundingBox();
          const tabs = await page.locator('.tabs-shell').boundingBox();
          expect(bounds.y).toBeGreaterThanOrEqual(tabs.y + tabs.height);
          expect(bounds.y).toBeLessThan(900);
          expect(page.url()).toBe(url);
          expect(await page.evaluate(() => history.length)).toBe(historyLength);
        }
        await expect(page.locator('#personSourcesTitle').locator('..')).toHaveAttribute('open', '');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (id === 'ryoma') {
          await nav.scrollIntoViewIfNeeded();
          if (testInfo.project.name === 'chromium' && process.platform === 'win32' && !process.env.CI) {
            await expect(nav).toHaveScreenshot(`person-nav-${width}-${colorScheme}.png`);
          }
          await testInfo.attach(`person-nav-${width}-${colorScheme}`, { body: await page.screenshot(), contentType: 'image/png' });
        }
      }
      const audit = await new AxeBuilder({ page }).include('#personDetail').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(audit.violations).toEqual([]);
    });
  }
}

test('absent sections have no navigation and existing details still work', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  for (const [id, scene] of [['meiji', 11], ['okubo-ichio', 11], ['kawaji-toshiakira', 0], ['nariaki', 0]]) {
    await page.goto(`/#scene=${data.scenes[scene].id}&view=people&person=${id}`);
    const nav = page.getByRole('navigation', { name: '人物内の移動' });
    await expect(nav.locator('[data-person-section="personCurrentTitle"]')).toHaveText('この時点');
    await expect(nav.locator('[data-person-section="personHistoryTitle"]')).toHaveText('時点履歴');
    expect(await nav.locator('button').evaluateAll(items => items.map(x => x.dataset.personSection))).toEqual(targets(id, scene));
    if (!domain.getPerson(id).portrait) await expect(page.locator('#personDetail .portrait-credit')).toHaveCount(0);
    if (await page.locator('.office-trigger').count()) {
      await page.locator('.office-trigger').press('Enter');
      await expect(page.locator('#personOfficeHelp > summary')).toBeFocused();
    }
    if (await page.locator('#personDetail .portrait-credit').count()) {
      await page.locator('#personDetail .portrait-credit > summary').press('Enter');
      await expect(page.locator('#personDetail .portrait-credit')).toHaveAttribute('open', '');
    }
  }
});

test('section navigation preserves event context, reload and route history', { tag: '@cross-browser' }, async ({ page }) => {
  await page.goto('/#event=ikedaya');
  await page.locator('[data-event-person="hijikata"]').click();
  const personUrl = page.url();
  await page.locator('[data-person-section="personIncidentHistoryTitle"]').click();
  await expect(page.locator('#personIncidentHistoryTitle')).toBeFocused();
  await expect(page.locator('.person-incident')).toContainText('別隊の探索を指揮');
  await page.reload();
  expect(page.url()).toBe(personUrl);
  await expect(page.locator('.person-incident')).toBeVisible();
  await page.locator('[data-person-section="personTurningPointTitle"]').click();
  await expect(page.locator('#personTurningPointTitle')).toBeFocused();
  await page.locator('.person-incident [data-open-event]').click();
  await expect(page.locator('#eventDetailTitle')).toHaveText('池田屋事件');
  await page.goBack();
  expect(page.url()).toBe(personUrl);
  await expect(page.locator('.person-incident')).toBeVisible();
  await page.goForward();
  await expect(page.locator('#eventDetailTitle')).toHaveText('池田屋事件');
});

test('person navigation works by touch', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto('/#scene=1867-taisei&view=people&person=ryoma');
  await page.locator('[data-person-section="personHistoryTitle"]').tap();
  await expect(page.locator('#personHistoryTitle')).toBeFocused();
  await page.locator('[data-person-section="personCurrentTitle"]').tap();
  await expect(page.locator('#personCurrentTitle')).toBeFocused();
  await context.close();
});

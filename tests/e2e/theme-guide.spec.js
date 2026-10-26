const { expect, test } = require('../support/test.cjs');
const AxeBuilder = require('@axe-core/playwright').default;
const data = require('../../data.json');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
require('../../src/renderers/scene.js');
const { readingGuides } = globalThis.BM_RENDER_SCENE;
const steps = readingGuides.shinsengumi.map(id => ['incident', id, { 'aizu-siege': 'saito', 'hakodate-1869': 'hijikata' }[id]]);

for (const width of [320, 390, 1280]) {
  for (const colorScheme of ['light', 'dark']) {
    test(`guide involvement destinations at ${width}px ${colorScheme}`, { tag: '@cross-browser' }, async ({ page }, testInfo) => {
      test.setTimeout(60_000);
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      const errors = [];
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await page.goto('/#scene=1853-blackships&view=people&person=abe&guide=shinsengumi');
      const original = page.url();
      const storageKeys = await page.evaluate(() => Object.keys(localStorage).sort());
      const toggle = page.locator('#readingGuide > summary');
      for (const [id, personId, kind, label, name] of [
        ['aizu-siege', 'saito', 'context', '背景・前後関係', '山口二郎'],
        ['hakodate-1869', 'hijikata', 'decision', '意思決定・指揮', '土方歳三']
      ]) {
        await toggle.click();
        await page.locator(`[data-guide-id="${id}"]`).press('Enter');
        await expect(page.locator('#eventDetailTitle')).toBeFocused();
        await expect(page.locator('#eventDetailTitle')).toHaveText(data.incidents[id].title);
        const normalUrl = page.url();
        await page.goBack();
        expect(page.url()).toBe(original);
        await toggle.click();
        // Back/forward navigation has retained a forward entry; count pushes directly.
        await page.evaluate(() => {
          window.__guidePushes = 0;
          const push = history.pushState.bind(history);
          history.pushState = (...args) => { window.__guidePushes++; return push(...args); };
        });
        await page.locator(`[data-guide-focus-person="${personId}"]`).press(id === 'aizu-siege' ? 'Enter' : 'Space');
        const card = page.locator(`#eventDetail .incident-person[data-event-person="${personId}"]`);
        await expect(card).toBeFocused();
        expect(page.url()).toBe(normalUrl);
        expect(await page.evaluate(() => window.__guidePushes)).toBe(1);
        const params = new URLSearchParams(new URL(page.url()).hash.slice(1));
        expect([...params.keys()].sort()).toEqual(['event', 'faction', 'guide', 'person', 'scene', 'view']);
        expect(params.get('person')).toBe(personId);
        expect(params.get('event')).toBe(id);
        expect(params.get('view')).toBe('events');
        expect(params.get('scene')).toBe(data.incidents[id].sceneId);
        expect(params.get('guide')).toBe('shinsengumi');
        await expect(page.locator(`.incident-lane.${kind} [data-event-person="${personId}"]`)).toBeVisible();
        await expect(card.locator('strong')).toHaveText(name);
        await expect(card.locator('.incident-focus-label')).toBeVisible();
        await expect(card.locator('.incident-focus-label')).toHaveText(label);
        const participant = data.incidents[id].participants.find(item => item.personId === personId);
        await expect(card).toContainText(participant.role);
        await expect(card).toContainText(participant.summary);
        const bounds = await card.boundingBox();
        const tabs = await page.locator('.tabs-shell').boundingBox();
        expect(bounds.y).toBeGreaterThanOrEqual(tabs.y + tabs.height);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(900);
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await testInfo.attach(`${id}-${width}-${colorScheme}-position`, { body: JSON.stringify({ bounds, tabs, label, name }), contentType: 'application/json' });
        await testInfo.attach(`${id}-${width}-${colorScheme}`, { body: await page.screenshot(), contentType: 'image/png' });
        await page.keyboard.press('Tab');
        await expect(card).not.toBeFocused();
        await page.keyboard.press('Shift+Tab');
        await expect(card).toBeFocused();
        await page.keyboard.press('Shift+Tab');
        await expect(card).not.toBeFocused();
        await page.keyboard.press('Tab');
        await expect(card).toBeFocused();
        const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        expect(audit.violations).toEqual([]);
        await card.press(id === 'aizu-siege' ? 'Space' : 'Enter');
        await expect(page.locator('.person-incident')).toBeVisible();
        expect(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('view')).toBe('people');
        await page.goBack();
        await expect(page.locator('#eventDetailTitle')).toHaveText(data.incidents[id].title);
        await page.goForward();
        await expect(page.locator('.person-incident')).toBeVisible();
        await page.goBack();
        const sharedUrl = page.url();
        await page.reload();
        await expect(page.locator('#eventDetailTitle')).toHaveText(data.incidents[id].title);
        await expect(card).not.toBeFocused();
        await expect(card.locator('.incident-focus-label')).toBeHidden();
        const fresh = await page.context().newPage();
        await fresh.goto(sharedUrl);
        await expect(fresh.locator('#eventDetailTitle')).toHaveText(data.incidents[id].title);
        await expect(fresh.locator('.incident-person:focus')).toHaveCount(0);
        await fresh.close();
        await page.goto(original);
      }
      expect(await page.evaluate(() => Object.keys(localStorage).sort())).toEqual(storageKeys);
      expect(errors).toEqual([]);
    });
  }
}

test('guide safely handles a participant removed before rendering or navigation', { tag: '@cross-browser' }, async ({ page }) => {
  await page.goto('/#guide=shinsengumi');
  await page.locator('#readingGuide > summary').click();
  await expect(page.locator('[data-guide-focus-person="saito"]')).toBeVisible();
  // Change only this browser's fixture after the guide has rendered.
  await page.evaluate(() => {
    const incident = window.BM_DATA.incidents['aizu-siege'];
    incident.participants = incident.participants.filter(item => item.personId !== 'saito');
  });
  await page.locator('[data-guide-focus-person="saito"]').click();
  await expect(page.locator('#eventDetailTitle')).toBeFocused();
  await expect(page.locator('#eventDetailTitle')).toHaveText(data.incidents['aizu-siege'].title);
  await expect(page.locator('#eventDetail [data-event-person="saito"]')).toHaveCount(0);
  await page.locator('#readingGuide > summary').click();
  await page.locator('#readingGuideSelect').selectOption('bakumatsu');
  await page.locator('#readingGuideSelect').selectOption('shinsengumi');
  await expect(page.locator('[data-guide-focus-person="saito"]')).toHaveCount(0);
  await expect(page.locator('[data-guide-focus-person="hijikata"]')).toHaveCount(1);
});

for (const width of [320, 390, 1280]) {
  for (const colorScheme of ['light', 'dark']) {
    test(`theme guide at ${width}px ${colorScheme}`, { tag: '@cross-browser' }, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.goto('/#scene=1853-blackships&view=people&person=abe');
      const guide = page.locator('#readingGuide');
      const closedHeight = (await guide.boundingBox()).height;
      const heroHeight = (await page.locator('.hero').boundingBox()).height;
      await guide.locator('summary').press('Enter');
      const choice = page.locator('#readingGuideSelect');
      await choice.focus();
      await choice.selectOption('shinsengumi');
      await expect(choice).toBeFocused();
      await expect(page.locator('#readingGuideTitle')).toHaveText('新選組を追う');
      await expect(guide.locator('li')).toHaveCount(7);
      await expect(guide.locator('[data-guide-id]')).toHaveCount(7);
      await expect(guide.locator('[data-guide-focus-person]')).toHaveCount(2);
      await expect(page.locator('#readingGuideIntro')).toContainText('組織の全史ではありません');
      await expect(page.locator('#readingGuidePosition')).toHaveText('7ステップ');
      await expect(guide.locator('[aria-current]')).toHaveCount(0);
      for (const [, id, personId] of steps) {
        const incident = data.incidents[id];
        const item = guide.locator(`[data-guide-id="${id}"]`).locator('..');
        await expect(item.locator('h2')).toHaveText(incident.title);
        await expect(item.locator('.guide-summary')).toHaveText(personId ? incident.participants.find(person => person.personId === personId).summary : incident.summary);
        if (personId) await expect(item.locator('.guide-focus')).toHaveText(`人物の動き：${data.people.find(person => person.id === personId).name}`);
        await expect(item.locator('[data-guide-focus-person]')).toHaveCount(personId ? 1 : 0);
        if (personId) {
          const button = item.locator('[data-guide-focus-person]');
          await expect(button).toHaveAccessibleName(new RegExp(`${data.people.find(person => person.id === personId).name}の関与を見る`));
          expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44);
        }
      }
      await expect(guide.locator('[data-guide-id="aizu-siege"]').locator('..')).toContainText('斎藤一の事件中の名前：山口二郎');
      const layout = await guide.locator('li').evaluateAll(items => items.map(item => ({ x: Math.round(item.getBoundingClientRect().x), clamp: getComputedStyle(item.querySelector('.guide-summary')).webkitLineClamp })));
      expect(new Set(layout.map(item => item.x)).size).toBe(width === 1280 ? 4 : 1);
      if (width < 680) expect(layout.every(item => item.clamp === '2')).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(audit.violations).toEqual([]);
      if (testInfo.project.name === 'chromium' && process.platform === 'win32' && !process.env.CI) await expect(guide).toHaveScreenshot(`theme-guide-${width}-${colorScheme}.png`);
      await guide.locator('summary').click();
      expect((await guide.boundingBox()).height).toBeLessThanOrEqual(closedHeight + 1);
      expect((await page.locator('.hero').boundingBox()).height).toBeLessThanOrEqual(heroHeight + 1);
      await guide.locator('summary').click();
      await choice.selectOption('bakumatsu');
      await expect(guide.locator('li')).toHaveCount(12);
      await expect(guide.locator('[data-guide-id]')).toHaveCount(12);
      await expect(guide.locator('[data-guide-focus-person]')).toHaveCount(0);
      await expect(page.locator('#readingGuidePosition')).toHaveText('1 / 12');
    });
  }
}

test('guide switching shares scene, incident and browser history without progress persistence', { tag: '@cross-browser' }, async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/#scene=1864-kinmon&event=ikedaya&view=events');
  const guide = page.locator('#readingGuide');
  const choice = page.locator('#readingGuideSelect');
  const toggle = guide.locator('summary');
  const originalUrl = page.url();
  const storageKeys = await page.evaluate(() => Object.keys(localStorage).sort());
  await toggle.click();
  await choice.selectOption('shinsengumi');
  await expect(page.locator('#readingGuidePosition')).toHaveText('2 / 7');
  const themeUrl = page.url();
  await choice.selectOption('bakumatsu');
  await expect(page.locator('#readingGuidePosition')).toHaveText('5 / 12');
  await page.goBack();
  await expect(choice).toHaveValue('shinsengumi');
  expect(page.url()).toBe(themeUrl);
  await page.goBack();
  await expect(choice).toHaveValue('bakumatsu');
  expect(page.url()).toBe(originalUrl);
  await page.goForward();
  await expect(choice).toHaveValue('shinsengumi');
  await page.reload();
  await toggle.click();
  await expect(choice).toHaveValue('shinsengumi');
  await expect(page.locator('#readingGuidePosition')).toHaveText('2 / 7');
  const fresh = await page.context().newPage();
  await fresh.goto(themeUrl);
  await expect(fresh.locator('#readingGuideTitle')).toHaveText('新選組を追う');
  await expect(fresh.locator('#readingGuidePosition')).toHaveText('2 / 7');
  await fresh.close();
  for (const [, id, personId] of steps) {
    await guide.locator(`[data-guide-id="${id}"]`).press('Enter');
    await expect(page.locator('#eventDetailTitle')).toBeFocused();
    await expect(page.locator('#eventDetailTitle')).toHaveText(data.incidents[id].title);
    if (personId) expect(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('person')).toBe(personId);
    await toggle.click();
    await expect(guide.locator('[aria-current] [data-guide-id]')).toHaveAttribute('data-guide-id', id);
  }
  await page.goto('/#scene=1864-kinmon&event=shimonoseki-1864&guide=shinsengumi');
  await expect(page.locator('#readingGuidePosition')).toHaveText('2 / 7');
  await page.goto('/#scene=1866-satcho&event=satcho-agreement&guide=shinsengumi');
  await expect(page.locator('#readingGuidePosition')).toHaveText('7ステップ');
  await expect(guide.locator('[aria-current]')).toHaveCount(0);
  expect(await page.evaluate(() => Object.keys(localStorage).sort())).toEqual(storageKeys);
});

test('touch switches guides and follows the individual threads', { tag: '@cross-browser' }, async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await context.newPage();
  await page.goto('/#scene=1868-tohoku&guide=shinsengumi');
  const toggle = page.locator('#readingGuide > summary');
  await toggle.tap();
  await expect(page.locator('#readingGuidePosition')).toHaveText('6 / 7');
  await page.locator('[data-guide-id="aizu-siege"]').tap();
  await expect(page.locator('#eventDetailTitle')).toBeFocused();
  await toggle.tap();
  await page.locator('[data-guide-focus-person="saito"]').tap();
  await expect(page.locator('#eventDetail [data-event-person="saito"]')).toBeFocused();
  expect(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('person')).toBe('saito');
  await page.reload();
  await toggle.tap();
  await page.locator('[data-guide-id="hakodate-1869"]').tap();
  await expect(page.locator('#eventDetailTitle')).toBeFocused();
  await toggle.tap();
  await page.locator('[data-guide-focus-person="hijikata"]').tap();
  await expect(page.locator('#eventDetail [data-event-person="hijikata"]')).toBeFocused();
  expect(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('person')).toBe('hijikata');
  await toggle.tap();
  await page.locator('#readingGuideSelect').selectOption('bakumatsu');
  await expect(page.locator('#readingGuideSteps li')).toHaveCount(12);
  await context.close();
});

test('shared guide renderer loads once on demand with the release cache version', { tag: '@cross-browser' }, async ({ page }) => {
  const requests = [];
  page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/src/renderers/reading-guide.js')) requests.push(request.url()); });
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveClass(/app-loading/);
  expect(requests).toHaveLength(0);
  const version = new URLSearchParams((await page.locator('script[src*="src/app.js"]').getAttribute('src')).split('?')[1]).get('v');
  await page.locator('#readingGuide > summary').press('Enter');
  await expect(page.locator('#readingGuideSteps li')).toHaveCount(12);
  expect(requests).toHaveLength(1);
  expect(new URL(requests[0]).searchParams.get('v')).toBe(version);
  await page.locator('#readingGuide > summary').click();
  await page.locator('#readingGuide > summary').click();
  await page.locator('#readingGuideSelect').selectOption('shinsengumi');
  await expect(page.locator('#readingGuideSteps li')).toHaveCount(7);
  expect(requests).toHaveLength(1);
});

test('both guides remain available when opening index.html directly', async ({ page }) => {
  const root = path.resolve(__dirname, '../..', process.env.STATIC_SITE_ROOT || '.');
  const url = pathToFileURL(path.join(root, 'index.html'));
  url.hash = 'scene=1868-tohoku&guide=shinsengumi';
  await page.goto(url.href);
  await page.locator('#readingGuide > summary').press('Enter');
  await expect(page.locator('#readingGuideSteps li')).toHaveCount(7);
  await expect(page.locator('#readingGuidePosition')).toHaveText('6 / 7');
  await page.locator('[data-guide-id="aizu-siege"]').click();
  await expect(page.locator('#eventDetailTitle')).toHaveText(data.incidents['aizu-siege'].title);
  await page.locator('#readingGuide > summary').click();
  await page.locator('[data-guide-focus-person="saito"]').click();
  await expect(page.locator('#eventDetail [data-event-person="saito"]')).toBeFocused();
  await page.locator('#readingGuide > summary').click();
  await page.locator('#readingGuideSelect').selectOption('bakumatsu');
  await expect(page.locator('#readingGuideSteps li')).toHaveCount(12);
});

for (const width of [320, 390]) {
  test(`shared theme guide keeps initial CLS below 0.1 at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      window.__themeCLS = 0;
      new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__themeCLS += entry.value; }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.route(/\/data\.js(?:\?.*)?$/, async route => {
      const response = await route.fetch();
      await new Promise(resolve => setTimeout(resolve, 750));
      await route.fulfill({ response });
    });
    await page.goto('/#scene=1853-blackships&guide=shinsengumi');
    await expect(page.locator('html')).not.toHaveClass(/app-loading/);
    await expect(page.locator('#readingGuideTitle')).toHaveText('新選組を追う');
    expect(await page.evaluate(() => window.__themeCLS)).toBeLessThan(0.1);
  });
}

const { expect, test } = require('../support/test.cjs');
const { catalog } = require('../support/catalog.cjs');
const AxeBuilder = require('@axe-core/playwright').default;

const pathIds = ['first-choshu-expedition', 'choshu_reform', 'satcho-agreement', 'second-choshu-war'];
const destinations = [
  { id: 'first-choshu-expedition', scene: '1864-kinmon', index: 7 },
  { id: 'choshu_reform', scene: '1865-choshu', index: 8 },
  { id: 'satcho-agreement', scene: '1866-satcho', index: 9 }
];

for (const width of [320, 390, 1280]) {
  for (const colorScheme of ['light', 'dark']) {
    for (const destination of destinations) {
      test(`second expedition to ${destination.id} at ${width}px in ${colorScheme}`, { tag: '@cross-browser' }, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
        const errors = [];
        page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
        await page.goto('/#event=second-choshu-war');
        await expect(page.locator('.incident-lead')).toContainText('四つの方面（芸州口・大島口・石州口・小倉口）');
        const route = page.url();
        const nav = page.getByRole('navigation', { name: '長州征討の前後をたどる' });
        await expect(nav.locator('li')).toHaveCount(4);
        await expect.poll(() => nav.locator('li').evaluateAll(items => items.map(item => item.querySelector('button')?.dataset.relatedEvent || 'second-choshu-war'))).toEqual(pathIds);
        await expect(nav.locator('[aria-current="step"]')).toContainText('第二次長州征討・四境戦争');
        await expect(nav.locator('[aria-current="step"] button')).toHaveCount(0);
        await expect(page.getByRole('navigation', { name: '事件内の移動' })).toBeVisible();
        const historyLength = await page.evaluate(() => history.length);
        await nav.locator('[aria-current="step"]').click();
        expect(page.url()).toBe(route);
        expect(await page.evaluate(() => history.length)).toBe(historyLength);
        await testInfo.attach(`second-expedition-${width}-${colorScheme}`, { body: await page.locator('#eventDetail').screenshot(), contentType: 'image/png' });

        // One ordinary keyboard activation opens the existing record.
        await nav.locator(`[data-related-event="${destination.id}"]`).press('Enter');
        const incident = catalog.incidents[destination.id];
        const title = (incident || catalog.events[destination.id]).title;
        const heading = page.locator('#eventDetailTitle');
        await expect(heading).toHaveText(title);
        await expect(heading).toBeFocused();
        const bounds = await heading.boundingBox();
        const tabs = await page.locator('.tabs-shell').boundingBox();
        expect(bounds.y).toBeGreaterThanOrEqual(tabs.y + tabs.height);
        expect(bounds.y).toBeLessThan(900);
        await expect(page.locator('#sceneSelect')).toHaveValue(String(destination.index));
        await expect(page.locator('.chain-card.active h3')).toHaveText(catalog.events[catalog.scenes[destination.index].event].title);
        await expect(page.locator('#tab-events')).toHaveAttribute('aria-selected', 'true');
        const hash = new URL(page.url()).hash;
        const params = new URLSearchParams(hash.slice(1));
        expect(params.get('scene')).toBe(destination.scene);
        expect(params.get('view')).toBe('events');
        expect(params.get('event')).toBe(incident ? destination.id : null);
        if (incident) expect(incident.participants.map(item => item.personId)).toContain(params.get('person'));
        await expect(nav.locator('[aria-current="step"]')).toContainText(title);
        await expect(nav.locator(`[data-related-event="${destination.id}"]`)).toHaveCount(0);
        const destinationRoute = page.url();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        expect(scan.violations).toEqual([]);
        await page.reload();
        await expect(heading).toHaveText(title);
        expect(page.url()).toBe(destinationRoute);
        await expect(page.locator('#sceneSelect')).toHaveValue(String(destination.index));
        await page.goBack();
        await expect(heading).toHaveText(catalog.incidents['second-choshu-war'].title);
        expect(page.url()).toBe(route);
        await page.goForward();
        await expect(heading).toHaveText(title);
        expect(page.url()).toBe(destinationRoute);
        // The route continues in either direction from every destination.
        await nav.locator('[data-related-event="second-choshu-war"]').press('Enter');
        await expect(heading).toHaveText(catalog.incidents['second-choshu-war'].title);
        await expect(page.locator('#sceneSelect')).toHaveValue('10');
        expect(errors).toEqual([]);
      });
    }
  }
}

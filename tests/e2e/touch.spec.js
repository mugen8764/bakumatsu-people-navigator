const { expect, test } = require('@playwright/test');
const crossBrowser = { tag: '@cross-browser' };

test.use({
  hasTouch: true,
  viewport: { width: 320, height: 780 }
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test('primary mobile journeys work with touch input', crossBrowser, async ({ page }) => {
  await page.goto('/');

  await page.locator('#nextScene').tap();
  await expect(page.locator('#sceneSelect')).toHaveValue('1');

  const personCard = page.locator('#personCards .card-button').first();
  await personCard.tap();
  await expect(page.locator('#personBackToList')).toBeVisible();
  await page.locator('#personBackToList').tap();

  await page.locator('#nextTabs').tap();
  await page.locator('#tab-map').tap();
  await expect(page.locator('#view-map')).toBeVisible();

  const placeName = page.locator('[data-map-place-name]').first();
  const placeId = await placeName.getAttribute('data-map-place-name');
  await placeName.tap();
  await expect(page.locator(`[data-map-place-card="${placeId}"]`)).toHaveClass(/selected/);
  await expect(page).toHaveURL(new RegExp(`place=${placeId}`));

  await page.locator('#resetMapView').tap();
  await expect(page.locator(`[data-map-place-card="${placeId}"]`)).not.toHaveClass(/selected/);
  await expect(page).not.toHaveURL(/(?:[?#&])place=/);
});

test('essential touch targets meet the 24 CSS pixel minimum', async ({ page }) => {
  await page.goto('/#scene=1867-taisei&view=map&person=kido&faction=長州藩');

  const undersizedTargets = await page.locator(
    'button:visible, a:visible, select:visible, input:not([type="range"]):visible, summary:visible'
  ).evaluateAll(elements => elements
    .map(element => {
      const box = element.getBoundingClientRect();
      return {
        label: element.getAttribute('aria-label') || element.textContent.trim().slice(0, 40),
        tag: element.tagName.toLowerCase(),
        width: Math.round(box.width),
        height: Math.round(box.height)
      };
    })
    .filter(({ width, height }) => width < 24 || height < 24));

  expect(undersizedTargets).toEqual([]);
});

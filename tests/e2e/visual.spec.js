const { expect, test } = require('@playwright/test');

async function prepare(page, { width, height, colorScheme }) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/#scene=1867-taisei&view=people&person=kido&faction=長州藩');
  await page.addStyleTag({
    content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'
  });
  await expect(page.locator('#personDetail .detail-title')).toHaveText('木戸孝允');
}

async function prepareMap(page, { width, height, colorScheme }) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/#scene=1853-blackships&view=map&person=perry&faction=幕府');
  await page.addStyleTag({
    content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}.tabs{position:static!important}'
  });
  await expect(page.locator('#mapTitle')).toContainText('ペリー');
}

test('desktop light appearance stays stable', async ({ page }) => {
  await prepare(page, { width: 1280, height: 900, colorScheme: 'light' });
  await expect(page).toHaveScreenshot('people-desktop-light.png', { animations: 'disabled' });
});
test('desktop dark appearance stays stable', async ({ page }) => {
  await prepare(page, { width: 1280, height: 900, colorScheme: 'dark' });
  await expect(page).toHaveScreenshot('people-desktop-dark.png', { animations: 'disabled' });
});

test('320px mobile appearance stays stable', async ({ page }) => {
  await prepare(page, { width: 320, height: 780, colorScheme: 'light' });
  await expect(page).toHaveScreenshot('people-mobile-320.png', { animations: 'disabled' });
});

test('320px mobile dark appearance stays stable', async ({ page }) => {
  await prepare(page, { width: 320, height: 780, colorScheme: 'dark' });
  await expect(page).toHaveScreenshot('people-mobile-320-dark.png', { animations: 'disabled' });
});

test('map desktop light appearance stays stable', async ({ page }) => {
  await prepareMap(page, { width: 1280, height: 900, colorScheme: 'light' });
  await expect(page.locator('#view-map')).toHaveScreenshot('map-desktop-light.png', { animations: 'disabled' });
});

test('map desktop dark appearance stays stable', async ({ page }) => {
  await prepareMap(page, { width: 1280, height: 900, colorScheme: 'dark' });
  await expect(page.locator('#view-map')).toHaveScreenshot('map-desktop-dark.png', { animations: 'disabled' });
});

test('map 320px mobile appearance stays stable', async ({ page }) => {
  await prepareMap(page, { width: 320, height: 780, colorScheme: 'light' });
  await expect(page.locator('#view-map')).toHaveScreenshot('map-mobile-320.png', { animations: 'disabled' });
});

test('map 320px mobile dark appearance stays stable', async ({ page }) => {
  await prepareMap(page, { width: 320, height: 780, colorScheme: 'dark' });
  await expect(page.locator('#view-map')).toHaveScreenshot('map-mobile-320-dark.png', { animations: 'disabled' });
});

test('zoomed Tokyo Bay map stays readable on desktop', async ({ page }) => {
  await prepareMap(page, { width: 1280, height: 900, colorScheme: 'light' });
  await page.locator('[data-map-label-trigger="uraga"]').click();
  await expect(page.locator('#resetMapView')).toBeVisible();
  await expect(page.locator('#view-map')).toHaveScreenshot('map-zoomed-tokyo-desktop.png', { animations: 'disabled' });
});

test('zoomed Tokyo Bay map stays readable at 320px', async ({ page }) => {
  await prepareMap(page, { width: 320, height: 780, colorScheme: 'light' });
  await page.locator('[data-map-label-trigger="uraga"]').click();
  await expect(page.locator('#resetMapView')).toBeVisible();
  await expect(page.locator('#view-map')).toHaveScreenshot('map-zoomed-tokyo-mobile-320.png', { animations: 'disabled' });
});

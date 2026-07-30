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

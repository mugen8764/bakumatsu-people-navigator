const AxeBuilder = require('@axe-core/playwright').default;
const { expect, test } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

for (const view of ['people', 'factions', 'relations', 'map', 'events', 'sources']) {
  test(`${view} view has no automatically detectable WCAG A/AA violations`, async ({ page }) => {
    await page.goto(`/#scene=1867-taisei&view=${view}&person=kido&faction=長州藩`);
    await expect(page.locator(`#view-${view}`)).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const violations = results.violations.map(violation => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.map(node => node.target.join(' '))
    }));

    expect(violations).toEqual([]);
  });
}

test('404 page has no automatically detectable WCAG A/AA violations', async ({ page }) => {
  await page.goto('/missing');
  await expect(page.locator('h1')).toHaveText('ページが見つかりません');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(results.violations.map(violation => violation.id)).toEqual([]);
});

test('all primary views remain accessible at 320px in dark mode', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/#scene=1867-taisei&view=people&person=kido&faction=長州藩');

  for (const view of ['people', 'factions', 'relations', 'map', 'events', 'sources']) {
    await page.locator(`.tab[data-view="${view}"]`).click();
    await expect(page.locator(`#view-${view}`)).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const violations = results.violations.map(violation => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.map(node => node.target.join(' '))
    }));

    expect(violations, `${view} view has dark mobile accessibility violations`).toEqual([]);
  }
});

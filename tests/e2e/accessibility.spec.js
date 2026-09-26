const AxeBuilder = require('@axe-core/playwright').default;
const { expect, test } = require('../support/test.cjs');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

for (const colorScheme of ['light', 'dark']) {
  test(`incident role evidence meets contrast requirements in ${colorScheme}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 850 });
    await page.emulateMedia({ colorScheme });
    await page.goto('/#event=ikedaya&view=people&person=okita');
    const evidence = page.locator('.person-incident .source-disclosure summary');
    await evidence.scrollIntoViewIfNeeded();
    await expect(evidence).toHaveText('この役割の根拠');
    const results = await new AxeBuilder({ page }).include('.person-incident').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
  });
}

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

test('the timeline slider exposes the scene it points at', async ({ page }) => {
  await page.goto('/#scene=1867-taisei&view=people&person=kido&faction=長州藩');
  await expect(page.locator('#sceneRange')).toHaveAttribute('aria-valuetext', '1867年 大政奉還');

  await page.locator('#prevScene').click();
  await expect(page.locator('#sceneRange')).toHaveAttribute('aria-valuetext', '1866年 第二次長州征討の失敗');
});

test('only short status lines are live regions, and the scene status follows the scene', async ({ page }) => {
  await page.goto('/#scene=1867-taisei&view=people&person=kido&faction=長州藩');

  for (const panel of ['#personDetail', '#factionDetail', '#eventDetail', '#relationChanges']) {
    await expect(page.locator(panel)).not.toHaveAttribute('aria-live', /.*/);
  }
  await expect(page.locator('#sceneStatus')).toHaveText('1867年（慶応3年）「大政奉還」');

  // Selecting another person in the same scene must not restate the scene.
  const beforePersonChange = await page.evaluate(() => {
    const status = document.querySelector('#sceneStatus');
    window.__statusWrites = 0;
    new MutationObserver(() => { window.__statusWrites += 1; }).observe(status, { childList: true, characterData: true, subtree: true });
    return status.textContent;
  });
  await page.locator('#personCards .card-button').nth(1).click();
  await expect(page.locator('#sceneStatus')).toHaveText(beforePersonChange);
  expect(await page.evaluate(() => window.__statusWrites)).toBe(0);

  await page.locator('#nextScene').click();
  await expect(page.locator('#sceneStatus')).toHaveText('1868年（慶応4年／明治元年）「王政復古と鳥羽・伏見」');
});

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

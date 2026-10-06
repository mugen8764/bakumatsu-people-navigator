const {test,expect}=require('../support/test.cjs');
const AxeBuilder=require('@axe-core/playwright').default;
const data=require('../../data.json');

for (const width of [320,390,1280]) for (const colorScheme of ['light','dark']) {
  test(`incident reading at ${width}px in ${colorScheme}`,{tag:'@cross-browser'},async({page})=>{
    await page.setViewportSize({width,height:900});
    await page.emulateMedia({colorScheme,reducedMotion:'reduce'});
    const nav=page.getByRole('navigation',{name:'時系列の事件を読む'});
    await page.goto('/#event=mito-coastal-defense-1853');
    await expect(nav.getByRole('button')).toHaveCount(1);
    await expect(nav).toContainText('因果関係は示しません');
    await expect(page.locator('.incident-date')).toContainText(data.incidents['mito-coastal-defense-1853'].date);
    await nav.getByRole('button',{name:/次の事件/}).press('Enter');
    await expect(page).toHaveURL(/event=shoin-voyage-attempt-1854/);
    await page.reload();
    await expect(page.locator('#eventDetailTitle')).toHaveText(data.incidents['shoin-voyage-attempt-1854'].title);
    const shared=page.url();
    await page.goBack();
    await expect(page.locator('#eventDetailTitle')).toHaveText(data.incidents['mito-coastal-defense-1853'].title);
    await page.goForward();
    await expect(page).toHaveURL(shared);
    await page.goto(shared);
    await expect(nav).toBeVisible();

    await page.goto('/#event=royal-restoration');
    await expect(nav.getByRole('button',{name:/前の事件/})).toContainText(data.incidents['omiya-1867'].title);
    await expect(nav.getByRole('button',{name:/次の事件/})).toContainText(data.incidents['toba-fushimi-battle'].title);
    await nav.scrollIntoViewIfNeeded();
    expect((await new AxeBuilder({page}).include('.incident-reading').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
    if(width===390&&process.platform==='win32'&&!process.env.CI) await expect(nav).toHaveScreenshot(`incident-reading-${colorScheme}.png`,{animations:'disabled'});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    for(const button of await nav.getByRole('button').all()) expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44);
    await nav.getByRole('button',{name:/次の事件/}).press('Enter');
    await expect(page.locator('#eventDetailTitle')).toBeFocused();
    const heading=await page.locator('#eventDetailTitle').boundingBox(),tabs=await page.locator('.tabs-shell').boundingBox();
    expect(heading.y).toBeGreaterThanOrEqual(tabs.y+tabs.height);
    await expect(page.getByRole('navigation',{name:'事件内の移動'})).toBeVisible();
    await expect(page.locator('[data-open-overview]')).toContainText('概要へ');

    await page.goto('/#event=aizu-siege');
    await nav.getByRole('button',{name:/前の事件/}).click();
    await expect(page).toHaveURL(/event=hokuetsu-1868/);
    await nav.getByRole('button',{name:/次の事件/}).click();
    await expect(page).toHaveURL(/event=aizu-siege/);
    await nav.getByRole('button',{name:/次の事件/}).click();
    await expect(page).toHaveURL(/event=hakodate-1869/);
    await expect(nav.getByRole('button')).toHaveCount(1);
    await expect(nav.getByRole('button')).toContainText('前の事件');
  });
}

test('same-scene month ties retain canonical order',{tag:'@cross-browser'},async({page})=>{
  await page.goto('/#event=satcho-agreement');
  const nav=page.getByRole('navigation',{name:'時系列の事件を読む'});
  await nav.getByRole('button',{name:/次の事件/}).click();
  await expect(page).toHaveURL(/event=teradaya-1866/);
  await nav.getByRole('button',{name:/前の事件/}).click();
  await expect(page).toHaveURL(/event=satcho-agreement/);
});

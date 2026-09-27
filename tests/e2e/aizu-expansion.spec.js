const {expect,test}=require('../support/test.cjs');
const AxeBuilder=require('@axe-core/playwright').default;

for(const [name,id]of [['中野竹子','nakano-takeko'],['西郷近悳','saigo-tanomo']]){
  test(`${name} search and siege context remain within the 1868 coverage`,async({page})=>{
    await page.addInitScript(()=>localStorage.clear());
    await page.goto('/');
    await page.locator('#globalSearch').fill(name);
    await page.locator('.search-result strong',{hasText:id==='saigo-tanomo'?/^西郷頼母$/:/^中野竹子$/}).click();
    await expect(page.locator(`#personCards [data-person-card="${id}"]`)).toHaveCount(1);
    if(id==='saigo-tanomo'){
      await expect(page.locator('#personDetail')).toContainText('没年確認中');
      await expect(page.locator('#personDetail')).toContainText('出典校正中');
    }
    await page.locator('#prevScene').click();
    await expect(page.locator(`#personCards [data-person-card="${id}"]`)).toHaveCount(0);
    await page.locator('#nextScene').click();
    await expect(page.locator(`#personCards [data-person-card="${id}"]`)).toHaveCount(1);
    await page.goto('/#event=aizu-siege');
    await expect(page.locator(`.context [data-event-person="${id}"]`)).toBeVisible();
    await expect(page.locator(`.onsite [data-event-person="${id}"]`)).toHaveCount(0);
    await page.locator(`[data-event-person="${id}"]`).click();
    await expect(page.locator('.person-incident')).toContainText(id==='nakano-takeko'?'柳橋':'白河口');
    await page.locator('.person-incident summary').click();
    await expect(page.locator('.person-incident a').first()).toBeVisible();
    await page.locator('.person-incident [data-open-event]').click();
    await page.locator('#eventToMap').click();
    await expect(page.locator('#mapTitle')).toContainText('会津戦争');
    await page.locator('.tab[data-view="people"]').click();
    await page.locator('#nextScene').click();
    await expect(page.locator(`#personCards [data-person-card="${id}"]`)).toHaveCount(0);
  });
}
for(const colorScheme of ['light','dark'])test(`Expanded Aizu context stays accessible at 320px in ${colorScheme}`,async({page})=>{
  await page.setViewportSize({width:320,height:850});
  await page.emulateMedia({colorScheme});
  await page.goto('/#event=aizu-siege');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator('.context [data-event-person="nakano-takeko"]')).toContainText('城外');
  await expect(page.locator('.context [data-event-person="saigo-tanomo"]')).toContainText('白河口');
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
});

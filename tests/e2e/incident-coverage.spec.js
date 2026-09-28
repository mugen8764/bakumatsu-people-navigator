const { expect, test } = require('../support/test.cjs');
const { catalog } = require('../support/catalog.cjs');

// Every incident gets the shared navigation checks from the data itself, so a
// new incident needs browser tests only for behaviour these do not cover.
for (const incident of Object.values(catalog.incidents)) {
  test(`${incident.id} opens with its cast, a person round trip and the map`, async ({ page }) => {
    await page.goto(`/#event=${incident.id}`);
    await expect(page.locator('#eventDetailTitle')).toHaveText(incident.title);
    const cast = page.locator('#eventDetail [data-event-person]');
    await expect(cast).toHaveCount(incident.participants.length);
    for (const participant of incident.participants) {
      await expect(page.locator(`#eventDetail [data-event-person="${participant.personId}"]`)).toContainText(participant.displayName);
    }

    const first = incident.participants[0];
    await page.locator(`#eventDetail [data-event-person="${first.personId}"]`).click();
    await expect(page.locator('#personDetail .person-incident')).toContainText(`${incident.title}での役割`);
    await page.locator('#personDetail .person-incident [data-open-event]').click();
    await expect(page.locator('#eventDetailTitle')).toHaveText(incident.title);

    await page.locator('#eventToMap').click();
    await expect(page.locator('#mapTitle')).toContainText(incident.title);
    for (const placeId of incident.placeIds) {
      await expect(page.locator(`[data-map-place-card="${placeId}"]`)).toHaveCount(1);
    }
  });
}

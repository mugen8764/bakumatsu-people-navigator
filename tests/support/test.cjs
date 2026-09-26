const base = require('@playwright/test');

// Every browser spec uses this test object. An uncaught page error fails the
// test, and console errors are attached when a test fails, because the app
// catches startup failures and shows only its generic error panel.
const test = base.test.extend({
  pageDiagnostics: [async ({ page }, use, testInfo) => {
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', error => pageErrors.push(error.stack || error.message));
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    await use();
    if (consoleErrors.length && testInfo.status !== testInfo.expectedStatus) {
      await testInfo.attach('console-errors', { body: consoleErrors.join('\n'), contentType: 'text/plain' });
    }
    base.expect(pageErrors, 'uncaught page errors').toEqual([]);
  }, { auto: true }]
});

module.exports = { ...base, test };

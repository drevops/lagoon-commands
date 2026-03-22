const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'file://' + __dirname + '/',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});

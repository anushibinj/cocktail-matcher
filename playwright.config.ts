import { defineConfig, devices } from '@playwright/test';

// End-to-end suite (TEST002). Builds the production bundle and serves it with
// `vite preview`; specs open it with `?debug=1` to get window.__COCKTAIL__.
const PORT = 4173;

const phone = {
  ...devices['Desktop Chrome'],
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true
};
const desktop = { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } };

export default defineConfig({
  testDir: './e2e',
  workers: process.env.CI ? 2 : 3,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}/`,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  // Headless Chromium has no GPU, and SwiftShader WebGL renders a busy board
  // at ~2 fps, which makes every input and animation crawl. The gameplay
  // projects therefore disable WebGL so Phaser.AUTO picks its Canvas renderer
  // (~60 fps). Game logic, input and lifecycle are renderer-independent; the
  // webgl-* projects still boot the real WebGL renderer for the console checks.
  projects: [
    {
      name: 'phone-touch',
      testIgnore: /webgl/,
      use: { ...phone, launchOptions: { args: ['--disable-webgl'] } }
    },
    {
      name: 'desktop-mouse',
      testIgnore: /webgl/,
      use: { ...desktop, launchOptions: { args: ['--disable-webgl'] } }
    },
    { name: 'webgl-phone-touch', testMatch: /boot\.spec/, use: phone },
    { name: 'webgl-desktop-mouse', testMatch: /boot\.spec/, use: desktop }
  ],
  webServer: {
    command: `pnpm run build && pnpm run preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});

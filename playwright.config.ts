import { defineConfig, devices } from '@playwright/test';

// End-to-end suite (TEST002). Builds the production bundle and serves it with
// `vite preview`; specs open it with `?debug=1` to get window.__COCKTAIL__.
const PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  // Software-WebGL Phaser is CPU heavy; more workers than this just starve each other.
  workers: process.env.CI ? 2 : 3,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // Swiftshader renders the game at ~6-10 fps under parallel load, and every
  // input event waits for a frame, so a scenario takes many seconds
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}/`,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'phone-touch',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true
      }
    },
    {
      name: 'desktop-mouse',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 }
      }
    }
  ],
  webServer: {
    // npm (not pnpm) so CI, which only runs `npm ci`, can use the same config
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});

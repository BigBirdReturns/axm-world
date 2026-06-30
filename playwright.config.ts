import { defineConfig, devices } from "@playwright/test";

// End-to-end shell/playability proofs. These are intentionally NOT part of `npm test`
// (vitest, unit) or CI — run them with `npm run test:e2e`. They drive the real built/
// dev app in Chromium to prove view-switch state persistence, modal layering, and
// readability that code inspection alone can't establish.
//
// The container ships Chromium at PLAYWRIGHT_BROWSERS_PATH; we point Playwright at it
// rather than downloading (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 is set in the image).
const CHROMIUM =
  process.env.PW_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "off",
    launchOptions: { executablePath: CHROMIUM },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { ...devices["Pixel 5"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173/axm-world/game/",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

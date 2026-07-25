import { defineConfig, devices } from "@playwright/test";

// End-to-end playability proofs. These are intentionally separate from `npm test`
// (vitest, unit). They drive the real app in Chromium to prove the cold journey,
// exact pre/post-resolution resume, and multi-cartridge receiver behavior.
//
// The container ships Chromium at PLAYWRIGHT_BROWSERS_PATH; we point Playwright at it
// rather than downloading (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 is set in the image).
const CHROMIUM =
  process.env.PW_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const BASE_URL = process.env.PW_BASE_URL ?? "http://127.0.0.1:5173";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "off",
    launchOptions: { executablePath: CHROMIUM },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { ...devices["Pixel 5"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    // Match the successful Gate 6 runner exactly. Vite's implicit localhost
    // binding can resolve to IPv6 while CI probes 127.0.0.1, leaving Playwright
    // waiting on a server that is healthy on a different loopback address.
    command: "npm run dev -- --host 127.0.0.1 --port 5173 --strictPort",
    url: `${BASE_URL}/axm-world/game/`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

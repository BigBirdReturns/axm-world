import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.PW_BASE_URL ?? "http://127.0.0.1:5173";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  reporter: [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "edge-desktop",
      use: { ...devices["Desktop Edge"], channel: "msedge", viewport: { width: 1280, height: 800 } },
    },
    {
      name: "edge-mobile",
      use: { ...devices["Pixel 5"], channel: "msedge", viewport: { width: 390, height: 844 } },
    },
    {
      name: "firefox-desktop-smoke",
      use: { ...devices["Desktop Firefox"], browserName: "firefox", viewport: { width: 1280, height: 800 } },
    },
    {
      name: "webkit-desktop-smoke",
      use: { ...devices["Desktop Safari"], browserName: "webkit", viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: `${BASE_URL}/axm-world/game/`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const budgets = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/performance/RODOH_PERFORMANCE_BUDGETS.json"), "utf8")) as {
  browser: Record<"desktop" | "mobile", {
    maximumBootMilliseconds: number;
    maximumResourceBytes: number;
    maximumDomNodes: number;
  }>;
};

test("cold local boot remains inside the declared product budget", async ({ page }, testInfo) => {
  const profile = testInfo.project.name.includes("mobile") ? "mobile" : "desktop";
  const budget = budgets.browser[profile];
  await page.goto("/axm-world/game/", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("rodoh-cartridge-bay")).toBeVisible();

  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    return {
      bootMilliseconds: navigation?.domContentLoadedEventEnd ?? performance.now(),
      resourceBytes: resources.reduce((sum, entry) => sum + (entry.encodedBodySize || entry.decodedBodySize || 0), 0),
      domNodes: document.getElementsByTagName("*").length,
      resources: resources.map((entry) => ({
        name: new URL(entry.name).pathname,
        encodedBodySize: entry.encodedBodySize,
        decodedBodySize: entry.decodedBodySize,
        duration: entry.duration,
      })).sort((a, b) => (b.encodedBodySize || b.decodedBodySize) - (a.encodedBodySize || a.decodedBodySize)).slice(0, 20),
    };
  });

  await testInfo.attach(`performance-${profile}.json`, {
    body: Buffer.from(JSON.stringify({ format: "rodoh-browser-performance-receipt/1", profile, budget, metrics }, null, 2)),
    contentType: "application/json",
  });
  expect(metrics.bootMilliseconds, `${profile} DOM-content-loaded budget`).toBeLessThanOrEqual(budget.maximumBootMilliseconds);
  expect(metrics.resourceBytes, `${profile} resource byte budget`).toBeLessThanOrEqual(budget.maximumResourceBytes);
  expect(metrics.domNodes, `${profile} DOM-node budget`).toBeLessThanOrEqual(budget.maximumDomNodes);
});

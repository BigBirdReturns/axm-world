#!/usr/bin/env node

import { chromium } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
function option(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}
function required(name, pattern = null) {
  const value = option(name);
  if (!value || (pattern && !pattern.test(value))) {
    throw new Error(`${name} is absent or invalid.`);
  }
  return value;
}

const htmlPath = resolve(required("--html"));
const worldCommit = required("--world-commit", /^[0-9a-f]{40}$/);
const arcCommit = required("--arc-commit", /^[0-9a-f]{40}$/);
const outputPath = resolve(required("--output"));
const screenshotRoot = resolve(option("--screenshot-root", dirname(outputPath)));
const htmlBytes = readFileSync(htmlPath);
const htmlSha256 = createHash("sha256").update(htmlBytes).digest("hex");
const baseUrl = pathToFileURL(htmlPath).href;
mkdirSync(dirname(outputPath), { recursive: true });
mkdirSync(screenshotRoot, { recursive: true });

const receipt = {
  format: "rodoh-underdrain-direct-file-delivery/1",
  status: "running",
  worldCommit,
  arcCommit,
  html: { path: htmlPath, bytes: htmlBytes.length, sha256: htmlSha256 },
  operatingSystem: process.platform,
  browsers: [],
  closeTabRequiresExport: true,
};
function writeReceipt() {
  writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`);
}
writeReceipt();

async function qualifyBrowser(label, launchOptions) {
  const result = { browser: label, status: "running" };
  receipt.browsers.push(result);
  writeReceipt();
  const browser = await chromium.launch({ headless: true, ...launchOptions });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    const errors = [];
    const externalRequests = [];
    page.on("pageerror", (error) => errors.push(error.stack || error.message));
    page.on("request", (request) => {
      const protocol = new URL(request.url()).protocol;
      if (!["file:", "data:", "blob:"].includes(protocol)) externalRequests.push(request.url());
    });

    await page.goto(baseUrl, { waitUntil: "load" });
    await page.evaluate(() => { window.name = ""; });
    await page.reload({ waitUntil: "load" });
    if ((await page.title()) !== "UNDERDRAIN: The Bloom Below") throw new Error(`${label}: title mismatch.`);

    const persistence = await page.evaluate(() => window.UnderdrainPersistence ?? null);
    if (persistence?.mode !== "window-name" || persistence?.durability !== "current-tab") {
      throw new Error(`${label}: direct-file persistence mode mismatch ${JSON.stringify(persistence)}.`);
    }
    await page.getByText("Direct-file save · current tab").waitFor({ state: "visible" });
    await page.getByText(/Download the episode record before closing the tab/).waitFor({ state: "visible" });

    await page.getByRole("button", { name: "Answer the service call" }).click();
    await page.locator("#action.active").waitFor({ state: "visible" });
    const beforeReload = await page.evaluate(() => ({
      arcCommit: window.UnderdrainRuntime.session.arcCommit,
      worldCommit: window.UnderdrainRuntime.session.worldSourceCommit,
      cartridgeDigest: window.UnderdrainRuntime.session.cartridgeDigest,
      authoringSha256: window.UnderdrainRuntime.session.authoringSha256,
      challengeId: window.UnderdrainRuntime.session.current.challengeId,
      enemyCount: window.UnderdrainRuntime.session.current.state.enemies.length,
      runtimeVersion: window.UnderdrainRuntime.session.current.spec.runtimeVersion,
      recordPersistence: window.UnderdrainRuntime.episodeRecord().persistence,
      windowNameLength: window.name.length,
    }));
    if (beforeReload.arcCommit !== arcCommit) throw new Error(`${label}: Arc identity mismatch.`);
    if (beforeReload.worldCommit !== worldCommit) throw new Error(`${label}: World identity mismatch.`);
    if (beforeReload.challengeId !== "mrs-kett-service-call" || beforeReload.enemyCount !== 0) {
      throw new Error(`${label}: opening service law mismatch.`);
    }
    if (beforeReload.runtimeVersion !== "1.1.0") throw new Error(`${label}: runtime version mismatch.`);
    if (beforeReload.recordPersistence?.closeTabRequiresExport !== true) {
      throw new Error(`${label}: episode record omitted direct-file custody.`);
    }
    if (beforeReload.windowNameLength < 100) throw new Error(`${label}: direct-file session was not serialized.`);

    await page.reload({ waitUntil: "load" });
    let resumeMode = "automatic";
    if (!(await page.locator("#action").evaluate((node) => node.classList.contains("active")))) {
      resumeMode = "resume-button";
      await page.getByRole("button", { name: "Resume where I stopped" }).waitFor({ state: "visible" });
      await page.getByRole("button", { name: "Resume where I stopped" }).click();
    }
    await page.locator("#action.active").waitFor({ state: "visible" });
    const afterReload = await page.evaluate(() => ({
      arcCommit: window.UnderdrainRuntime.session.arcCommit,
      worldCommit: window.UnderdrainRuntime.session.worldSourceCommit,
      cartridgeDigest: window.UnderdrainRuntime.session.cartridgeDigest,
      authoringSha256: window.UnderdrainRuntime.session.authoringSha256,
      challengeId: window.UnderdrainRuntime.session.current.challengeId,
      persistence: window.UnderdrainRuntime.persistence,
    }));
    const expectedAfterReload = {
      arcCommit: beforeReload.arcCommit,
      worldCommit: beforeReload.worldCommit,
      cartridgeDigest: beforeReload.cartridgeDigest,
      authoringSha256: beforeReload.authoringSha256,
      challengeId: beforeReload.challengeId,
    };
    const actualIdentity = {
      arcCommit: afterReload.arcCommit,
      worldCommit: afterReload.worldCommit,
      cartridgeDigest: afterReload.cartridgeDigest,
      authoringSha256: afterReload.authoringSha256,
      challengeId: afterReload.challengeId,
    };
    if (JSON.stringify(actualIdentity) !== JSON.stringify(expectedAfterReload)) {
      throw new Error(`${label}: exact reload identity mismatch.`);
    }
    if (afterReload.persistence?.exactReload !== true) throw new Error(`${label}: persistence surface lost exact-reload law.`);
    await page.screenshot({ path: resolve(screenshotRoot, `${label}-resumed.png`), fullPage: true });
    await context.close();

    const matrixContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const matrixPage = await matrixContext.newPage();
    matrixPage.on("pageerror", (error) => errors.push(error.stack || error.message));
    matrixPage.on("request", (request) => {
      const protocol = new URL(request.url()).protocol;
      if (!["file:", "data:", "blob:"].includes(protocol)) externalRequests.push(request.url());
    });
    await matrixPage.goto(`${baseUrl}?autotest=1`, { waitUntil: "load" });
    await matrixPage.waitForFunction(() => document.body.dataset.testStatus === "pass", null, { timeout: 60_000 });
    const matrix = await matrixPage.evaluate(() => window.__UNDERDRAIN_TEST_RESULT__);
    if (matrix?.format !== "rodoh-underdrain-automated-pilot-qualification/2") {
      throw new Error(`${label}: route-by-compact matrix format mismatch.`);
    }
    if (matrix?.status !== "pass" || matrix?.cases?.length !== 9) {
      throw new Error(`${label}: route-by-compact matrix failed.`);
    }
    await matrixContext.close();

    if (errors.length) throw new Error(`${label}: page errors ${JSON.stringify(errors)}.`);
    if (externalRequests.length) throw new Error(`${label}: external requests ${JSON.stringify(externalRequests)}.`);
    Object.assign(result, {
      status: "pass",
      protocol: "file:",
      persistenceMode: persistence.mode,
      persistenceDurability: persistence.durability,
      resumeMode,
      exactReload: true,
      zeroPressureOpening: true,
      automatedCases: matrix.cases.length,
      pageErrors: 0,
      externalRequests: 0,
    });
    writeReceipt();
  } catch (error) {
    Object.assign(result, {
      status: "fail",
      error: error instanceof Error ? error.stack : String(error),
    });
    receipt.status = "fail";
    receipt.error = result.error;
    writeReceipt();
    throw error;
  } finally {
    await browser.close();
  }
}

try {
  await qualifyBrowser("chromium", {});
  await qualifyBrowser("edge", { channel: "msedge" });
  receipt.status = "pass";
  writeReceipt();
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
} catch (error) {
  receipt.status = "fail";
  receipt.error = error instanceof Error ? error.stack : String(error);
  writeReceipt();
  console.error(receipt.error);
  process.exitCode = 1;
}

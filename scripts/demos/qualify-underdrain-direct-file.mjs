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
const presentationSha256 = required("--presentation-sha256", /^[0-9a-f]{64}$/);
const productionSha256 = required("--production-sha256", /^[0-9a-f]{64}$/);
const outputPath = resolve(required("--output"));
const screenshotRoot = resolve(option("--screenshot-root", dirname(outputPath)));
const htmlBytes = readFileSync(htmlPath);
const htmlSha256 = createHash("sha256").update(htmlBytes).digest("hex");
const baseUrl = pathToFileURL(htmlPath).href;
mkdirSync(dirname(outputPath), { recursive: true });
mkdirSync(screenshotRoot, { recursive: true });

const receipt = {
  format: "rodoh-underdrain-direct-file-delivery/3",
  status: "running",
  worldCommit,
  arcCommit,
  representation: {
    planId: "underdrain-white-label-v1",
    presentationSha256,
    productionSha256,
    releaseClassification: "representation-rework",
    declaredRoles: 48,
    productionRoles: 1,
    prototypeRoles: 47,
    productionCoverageComplete: false,
  },
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
    if ((await page.locator("body").getAttribute("data-representation-status")) !== "rework") {
      throw new Error(`${label}: honest representation-rework status did not mount.`);
    }
    if ((await page.locator("body").getAttribute("data-representation-plan")) !== "underdrain-white-label-v1") {
      throw new Error(`${label}: representation plan identity mismatch.`);
    }
    await page.locator('[data-presentation-asset="underdrain:scene-kitchen"]').first().waitFor({ state: "visible" });
    await page.locator('[data-presentation-asset="underdrain:portrait-rhea-venn"]').first().waitFor({ state: "visible" });
    if (await page.getByText(/48 cartridge assets/i).count()) throw new Error(`${label}: stale 48-asset claim is still visible.`);

    const production = await page.evaluate(() => {
      const asset = window.UnderdrainProductionAssets?.assets?.["underdrain:scene-pump-seven"] ?? null;
      return {
        asset,
        coverage: JSON.parse(document.getElementById("underdrain-production")?.textContent ?? "null"),
        productionSha256: window.__UNDERDRAIN_PRODUCTION_SHA256__,
      };
    });
    if (production.productionSha256 !== productionSha256
      || production.coverage?.status !== "mixed"
      || production.coverage?.productionAssetIds?.length !== 1
      || production.asset?.sha256 !== "c5810b7362b511a8789e26300517ab0156b2593f99c9b45227765f465ef871ca") {
      throw new Error(`${label}: production coverage mismatch ${JSON.stringify(production)}.`);
    }

    const persistence = await page.evaluate(() => window.UnderdrainPersistence ?? null);
    if (persistence?.mode !== "window-name" || persistence?.durability !== "current-tab") {
      throw new Error(`${label}: direct-file persistence mode mismatch ${JSON.stringify(persistence)}.`);
    }
    await page.getByText("Direct-file save · current tab").waitFor({ state: "visible" });
    await page.getByText(/Download the episode record before closing the tab/).waitFor({ state: "visible" });
    await page.screenshot({ path: resolve(screenshotRoot, `${label}-rework-cold-entry.png`), fullPage: true });

    await page.getByRole("button", { name: "Answer the service call" }).click();
    await page.locator("#action.active").waitFor({ state: "visible" });
    if ((await page.locator("#game").getAttribute("data-presentation-asset")) !== "underdrain:scene-kitchen") {
      throw new Error(`${label}: service action lost the kitchen representation.`);
    }
    const actionAssets = await page.locator("#game").getAttribute("data-representation-assets");
    if (!actionAssets?.includes("underdrain:mechanism-inspect-living-trap-active")) {
      throw new Error(`${label}: service mechanism representation is absent.`);
    }
    const commandGeometry = await page.evaluate(() => {
      const stage = document.querySelector(".stage")?.getBoundingClientRect();
      const deck = document.querySelector(".command-deck")?.getBoundingClientRect();
      const canvas = document.querySelector("#game")?.getBoundingClientRect();
      if (!stage || !deck || !canvas) return null;
      const overlap = (left, right) => Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left))
        * Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top));
      return {
        stageDeckOverlap: overlap(stage, deck),
        canvasDeckOverlap: overlap(canvas, deck),
        sibling: document.querySelector(".stage")?.parentElement === document.querySelector(".command-deck")?.parentElement,
      };
    });
    if (!commandGeometry?.sibling || commandGeometry.stageDeckOverlap > 1 || commandGeometry.canvasDeckOverlap > 1) {
      throw new Error(`${label}: command deck obstructs the rendered world ${JSON.stringify(commandGeometry)}.`);
    }

    const beforeReload = await page.evaluate(() => ({
      arcCommit: window.UnderdrainRuntime.session.arcCommit,
      worldCommit: window.UnderdrainRuntime.session.worldSourceCommit,
      cartridgeDigest: window.UnderdrainRuntime.session.cartridgeDigest,
      authoringSha256: window.UnderdrainRuntime.session.authoringSha256,
      representation: window.UnderdrainRuntime.session.representation,
      challengeId: window.UnderdrainRuntime.session.current.challengeId,
      enemyCount: window.UnderdrainRuntime.session.current.state.enemies.length,
      runtimeVersion: window.UnderdrainRuntime.session.current.spec.runtimeVersion,
      recordPersistence: window.UnderdrainRuntime.episodeRecord().persistence,
      recordRepresentation: window.UnderdrainRuntime.episodeRecord().representation,
      windowNameLength: window.name.length,
    }));
    if (beforeReload.arcCommit !== arcCommit) throw new Error(`${label}: Arc identity mismatch.`);
    if (beforeReload.worldCommit !== worldCommit) throw new Error(`${label}: World identity mismatch.`);
    if (beforeReload.representation?.planId !== "underdrain-white-label-v1"
      || beforeReload.representation?.presentationSha256 !== presentationSha256
      || beforeReload.representation?.productionSha256 !== productionSha256
      || beforeReload.representation?.declaredRoleCount !== 48
      || beforeReload.representation?.productionRoleCount !== 1
      || beforeReload.representation?.prototypeRoleCount !== 47
      || beforeReload.representation?.productionCoverageComplete !== false
      || beforeReload.representation?.releaseClassification !== "representation-rework") {
      throw new Error(`${label}: session representation custody mismatch ${JSON.stringify(beforeReload.representation)}.`);
    }
    if (beforeReload.recordRepresentation?.presentationSha256 !== presentationSha256
      || beforeReload.recordRepresentation?.productionSha256 !== productionSha256
      || beforeReload.recordRepresentation?.productionCoverageComplete !== false) {
      throw new Error(`${label}: episode record omitted honest representation custody.`);
    }
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
    if ((await page.locator("body").getAttribute("data-representation-status")) !== "rework") {
      throw new Error(`${label}: reload lost honest representation status.`);
    }
    const resumedAssets = await page.locator("#game").getAttribute("data-representation-assets");
    if (!resumedAssets?.includes("underdrain:mechanism-inspect-living-trap-active")) {
      throw new Error(`${label}: reload lost the represented mechanism.`);
    }
    const afterReload = await page.evaluate(() => ({
      arcCommit: window.UnderdrainRuntime.session.arcCommit,
      worldCommit: window.UnderdrainRuntime.session.worldSourceCommit,
      cartridgeDigest: window.UnderdrainRuntime.session.cartridgeDigest,
      authoringSha256: window.UnderdrainRuntime.session.authoringSha256,
      representation: window.UnderdrainRuntime.session.representation,
      challengeId: window.UnderdrainRuntime.session.current.challengeId,
      persistence: window.UnderdrainRuntime.persistence,
    }));
    const expectedAfterReload = {
      arcCommit: beforeReload.arcCommit,
      worldCommit: beforeReload.worldCommit,
      cartridgeDigest: beforeReload.cartridgeDigest,
      authoringSha256: beforeReload.authoringSha256,
      representation: beforeReload.representation,
      challengeId: beforeReload.challengeId,
    };
    const actualIdentity = {
      arcCommit: afterReload.arcCommit,
      worldCommit: afterReload.worldCommit,
      cartridgeDigest: afterReload.cartridgeDigest,
      authoringSha256: afterReload.authoringSha256,
      representation: afterReload.representation,
      challengeId: afterReload.challengeId,
    };
    if (JSON.stringify(actualIdentity) !== JSON.stringify(expectedAfterReload)) {
      throw new Error(`${label}: exact represented reload identity mismatch.`);
    }
    if (afterReload.persistence?.exactReload !== true) throw new Error(`${label}: persistence surface lost exact-reload law.`);
    await page.screenshot({ path: resolve(screenshotRoot, `${label}-rework-resumed.png`), fullPage: true });
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
    const checks = matrix.checks ?? {};
    if (checks.presentationSha256 !== presentationSha256
      || checks.productionSha256 !== productionSha256
      || checks.representationPlanId !== "underdrain-white-label-v1"
      || checks.declaredRepresentationRoleCount !== 48
      || checks.declaredRoleCountIsNotFileCount !== true
      || checks.productionRoleCount !== 1
      || checks.prototypeRoleCount !== 47
      || checks.productionSourceCount !== 1
      || checks.productionCoverageComplete !== false
      || checks.releaseClassification !== "representation-rework"
      || checks.commandDeckOutsideRenderedWorld !== true
      || checks.completeSurfaceRolePlan !== true
      || checks.representativePrototypeRolesMounted !== true) {
      throw new Error(`${label}: honest representation matrix checks failed ${JSON.stringify(checks)}.`);
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
      representationPlanId: "underdrain-white-label-v1",
      presentationSha256,
      productionSha256,
      releaseClassification: "representation-rework",
      declaredRoles: 48,
      productionRoles: 1,
      prototypeRoles: 47,
      commandDeckOutsideRenderedWorld: true,
      representedResume: true,
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

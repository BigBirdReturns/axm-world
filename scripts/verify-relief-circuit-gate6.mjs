import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const SCRIPT = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SCRIPT), "..");
const PHASE = process.argv[2] ?? "all";
const MODE = process.argv[3] ?? "desktop";
const MOBILE = MODE === "mobile";
const BASE_URL = process.env.PW_BASE_URL ?? "http://127.0.0.1:5173";
// Permanent CI may pin an explicit executable. Local-estate runs instead bind
// PLAYWRIGHT_BROWSERS_PATH to their holder-owned cache, so ask Playwright for
// the exact installed browser rather than falling through to a Linux-only path.
const CHROMIUM = process.env.PW_CHROMIUM_PATH ?? chromium.executablePath();
const OUT = path.resolve(process.env.GATE6_RECEIPT_DIR ?? path.join(ROOT, "test-results", "gate6-browser-receipt", MODE));
const RELIEF = "cart1_15a9f3792ff8a68948053a06cefcbf586e9960158ca051a187e1ab341b7a2e65";
const LAMP = "cart1_05530ae780a30f2f79fb0ddf030ba0e92321d736f146e8e16ddb325ae948b23e";
const OPS = [
  "recognize-the-school-loop",
  "audit-the-relief-stores",
  "compose-the-three-clock-watch",
  "declare-the-lamp-approach-watch",
  "cross-the-infected-mesh",
  "dock-without-declaring-the-tomb",
  "conduct-the-lamp-relief-descent",
  "conduct-the-commonship-inquiry",
  "carry-the-returning-constitution",
];

fs.mkdirSync(OUT, { recursive: true });

if (PHASE === "all") {
  for (const phase of ["journey", "restore", "neutral", "access"]) {
    const failurePath = path.join(OUT, `${phase}-failure.txt`);
    let passed = false;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      fs.rmSync(failurePath, { force: true });
      const result = spawnSync(process.execPath, [SCRIPT, phase, MODE], {
        cwd: ROOT,
        env: process.env,
        stdio: "inherit",
        timeout: 180_000,
      });
      if (result.error) throw result.error;
      if (result.status === 0) {
        passed = true;
        break;
      }
      if (attempt < 2) console.warn(`Retrying Gate 6 ${MODE} ${phase} after exit ${result.status}.`);
    }
    if (!passed) process.exit(1);
  }
  process.exit(0);
}

const started = Date.now();
const timeline = [];
const record = (event, data = {}) => timeline.push({ event, elapsedMs: Date.now() - started, ...data });

function contextOptions() {
  return MOBILE
    ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
    : { viewport: { width: 1280, height: 800 } };
}
async function boundedClose(close, timeout = 5_000) {
  await Promise.race([close(), new Promise((resolve) => setTimeout(resolve, timeout))]);
}
async function resolvePending(page) {
  for (let guard = 0; guard < 100; guard += 1) {
    const card = page.getByTestId("pending-decision-card");
    if (!(await card.isVisible().catch(() => false))) return;
    await card.locator('[data-testid^="decision-option-"]').first().click();
    const confirm = card.getByTestId("decision-confirm");
    if (await confirm.isVisible().catch(() => false)) await confirm.click();
  }
  throw new Error("Pending decision surface did not drain.");
}
async function finishEntry(page) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await page.getByTestId("engine-shell").isVisible().catch(() => false)) break;
    const transition = page.getByTestId("cartridge-enter-transition");
    const skip = transition.getByRole("button", { name: /skip entry/i });
    if (await skip.isVisible().catch(() => false)) await skip.click();
    if (await page.getByTestId("pending-decision-card").isVisible().catch(() => false)) await resolvePending(page);
    await page.waitForTimeout(25);
  }
  await page.getByTestId("engine-shell").waitFor({ state: "visible" });
  await resolvePending(page);
}
async function chooseRepresentation(page, control, target) {
  await page.getByTestId(control).click();
  const surface = page.getByTestId(target);
  const back = page.getByTestId("mobile-step-back");
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (await surface.isVisible().catch(() => false)) return;
    if (await back.isVisible().catch(() => false)) await back.click();
    await page.waitForTimeout(30);
  }
  await surface.waitFor({ state: "visible" });
}
async function enterRelief(page) {
  await page.goto(`${BASE_URL}/axm-world/game/`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId("rodoh-cartridge-bay").waitFor({ state: "visible" });
  await page.getByTestId("play-cartridge-relief-circuit").click();
  await finishEntry(page);
  await chooseRepresentation(page, "view-common-ship", "common-ship-scene");
}
async function returnToCommonShip(page) {
  await chooseRepresentation(page, "view-common-ship", "common-ship-scene");
}
async function resolveOperation(page, id) {
  const card = page.getByTestId(`common-ship-watch-${id}`);
  await card.scrollIntoViewIfNeeded();
  await card.click();
  const prepare = page.getByTestId("common-ship-prepare");
  if (await prepare.isVisible().catch(() => false)) await prepare.click();
  const commit = page.getByTestId("common-ship-commit");
  await commit.waitFor({ state: "visible" });
  await commit.click();
  await page.getByTestId("encounter-shell").waitFor({ state: "visible" });
  const deploy = page.getByTestId("encs-deploy");
  if (await deploy.isVisible().catch(() => false)) await deploy.click();
  await page.getByTestId("encs-resolve").click();
  const receipt = page.getByTestId("encs-receipt");
  await receipt.waitFor({ state: "visible" });
  assert.equal(await receipt.getAttribute("data-outcome"), "success", `${id} should resolve successfully after preparation.`);
  const reward = page.getByTestId("reward-choice");
  if (await reward.count()) await reward.locator('[data-testid^="reward-candidate-"]').first().click();
  await page.getByTestId("encs-leave").click();
  await page.getByTestId("encounter-shell").waitFor({ state: "detached" });
  await resolvePending(page);
  await returnToCommonShip(page);
  assert.equal(await page.getByTestId(`common-ship-watch-${id}`).getAttribute("data-status"), "cleared");
  record("operation-cleared", { id, cycle: Number(await page.getByTestId("common-ship-cycle").textContent()) });
}
function assertReturnedRun(file) {
  const run = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(run.format, "axm-cartridge-run/v3");
  assert.equal(run.authoredArcDigest, RELIEF);
  const connection = run.extensions?.["axm.connected-operation@1"];
  assert(connection);
  assert.equal(connection.format, "axm-connected-operation/v1");
  assert.equal(connection.status, "returned");
  assert.equal(connection.sourceCartridgeDigest, RELIEF);
  assert.equal(connection.destinationCartridgeDigest, LAMP);
  assert.equal(connection.transfer.selectedWatchId, "conduct-the-lamp-relief-descent");
  assert(connection.transfer.people.includes("Nima Quell"));
  assert.notDeepEqual(connection.returnLedger.sourceStateBefore, connection.returnLedger.sourceStateAfter);
  assert.notDeepEqual(connection.returnLedger.destinationStateBefore, connection.returnLedger.destinationStateAfter);
  assert(connection.returnLedger.inheritedFacts.length > 0);
  assert.equal(connection.destinationRun.authoredArcDigest, LAMP);
  return connection;
}
async function withBrowser(run) {
  const browser = await chromium.launch({ headless: true, executablePath: CHROMIUM, args: ["--no-sandbox"] });
  const external = [];
  let context;
  try {
    context = await browser.newContext(contextOptions());
    context.on("request", (request) => {
      const url = new URL(request.url());
      if (!["127.0.0.1", "localhost"].includes(url.hostname)) external.push(request.url());
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    await run(page, context);
    assert.deepEqual(external, [], `External network requests: ${external.join(", ")}`);
  } finally {
    if (context) await boundedClose(() => context.close());
    await boundedClose(() => browser.close());
  }
}
function writePhase(extra = {}) {
  fs.writeFileSync(path.join(OUT, `${PHASE}.json`), JSON.stringify({
    format: "rodoh-gate6-browser-phase/1",
    phase: PHASE,
    mode: MODE,
    reliefDigest: RELIEF,
    lampDigest: LAMP,
    elapsedMs: Date.now() - started,
    timeline,
    ...extra,
  }, null, 2));
}

try {
  if (PHASE === "journey") {
    await withBrowser(async (page) => {
      await enterRelief(page);
      record("entered");
      const scene = page.getByTestId("common-ship-scene");
      assert.equal(await scene.getAttribute("data-first-party-art"), "true");
      assert.equal(await page.locator('[data-testid^="common-ship-portrait-"]').count(), 6);
      assert.match((await page.getByTestId("common-ship-cross-section").getAttribute("src")) ?? "", /relief-circuit-cross-section/);
      assert.match((await page.getByTestId("common-ship-atlas").getAttribute("src")) ?? "", /relief-circuit-symbol-atlas/);
      assert.equal(await page.getByTestId("common-ship-profile-nima-quell").getAttribute("data-agent-id"), "founder:nima-quell");
      const nima = page.getByTestId("common-ship-profile-nima-quell");
      await nima.focus();
      await page.keyboard.press("Space");
      assert.equal(await page.getByTestId("common-ship-composition").getAttribute("data-feasible"), "false");
      await page.keyboard.press("Space");
      assert.equal(await page.getByTestId("common-ship-composition").getAttribute("data-feasible"), "true");
      const box = await nima.boundingBox();
      assert((box?.width ?? 0) >= 44 && (box?.height ?? 0) >= 44);
      for (const id of OPS) {
        await resolveOperation(page, id);
        if (id === "conduct-the-lamp-relief-descent") {
          assert.equal(await page.getByTestId("connected-operation").getAttribute("data-status"), "outbound");
          record("connected-operation-outbound");
        }
      }
      assert.equal(await page.getByTestId("connected-operation").getAttribute("data-status"), "returned");
      assert.equal(await page.getByTestId("common-ship-state").locator("article").count(), 8);
      const output = path.join(OUT, "relief-circuit-returned.run.json");
      await page.getByTestId("export-run").click();
      const download = await page.waitForEvent("download");
      await download.saveAs(output);
      assertReturnedRun(output);
      writePhase({ status: "pass", output });
    });
  } else if (PHASE === "restore") {
    const source = path.join(OUT, "relief-circuit-returned.run.json");
    assert(fs.existsSync(source), "Journey output is missing.");
    const connection = assertReturnedRun(source);
    await withBrowser(async (page) => {
      await page.goto(`${BASE_URL}/axm-world/game/`);
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await page.getByTestId("open-cartridge").setInputFiles(source);
      await page.getByTestId("import-success").waitFor({ state: "visible" });
      await page.getByTestId("play-cartridge-relief-circuit").click();
      await finishEntry(page);
      await chooseRepresentation(page, "view-common-ship", "common-ship-scene");
      assert.equal(await page.getByTestId("connected-operation").getAttribute("data-status"), "returned");
      assert.equal(await page.getByTestId("common-ship-cycle").textContent(), "9");
      assert.equal(await page.getByTestId("common-ship-state").locator("article").count(), 8);
      assert.equal(connection.returnLedger.inheritedFacts.length > 0, true);
      writePhase({ status: "pass", restored: true });
    });
  } else if (PHASE === "neutral") {
    const neutral = path.join(ROOT, "cartridges", "clean-room", "orchard-at-low-tide.arc.json");
    await withBrowser(async (page) => {
      await page.goto(`${BASE_URL}/axm-world/game/`);
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await page.getByTestId("open-cartridge").setInputFiles(neutral);
      await page.getByTestId("import-success").waitFor({ state: "visible" });
      await page.getByTestId("play-cartridge-orchard-at-low-tide").click();
      await finishEntry(page);
      assert.equal(await page.locator("html").getAttribute("data-cartridge"), null);
      writePhase({ status: "pass", neutral: true });
    });
  } else if (PHASE === "access") {
    await withBrowser(async (page) => {
      await enterRelief(page);
      const controls = ["view-run-graph", "view-map", "view-hall", "view-aperture", "view-planet", "view-underworld", "view-common-ship"];
      for (const id of controls) {
        const control = page.getByTestId(id);
        await control.focus();
        assert.equal(await control.evaluate((element) => document.activeElement === element), true, `${id} must accept keyboard focus.`);
      }
      writePhase({ status: "pass", keyboard: true });
    });
  } else {
    throw new Error(`Unknown Gate 6 phase: ${PHASE}`);
  }
} catch (error) {
  fs.writeFileSync(path.join(OUT, `${PHASE}-failure.txt`), `${error?.stack ?? error}\n`);
  throw error;
}

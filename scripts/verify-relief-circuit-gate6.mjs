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
const CHROMIUM = process.env.PW_CHROMIUM_PATH ?? "/usr/bin/chromium";
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
      const failure = fs.existsSync(failurePath) ? fs.readFileSync(failurePath, "utf8") : "";
      const browserTransportFailure = /Target page, context or browser has been closed|browser has been closed|Browser closed|ECONNREFUSED/i.test(failure);
      if (attempt === 1 && browserTransportFailure) {
        console.warn(`[gate6:${MODE}:${phase}] browser transport closed; retrying the same phase once.`);
        continue;
      }
      process.exit(result.status ?? 1);
    }
    if (!passed) process.exit(1);
  }
  const parts = Object.fromEntries(
    ["journey", "restore", "neutral", "access"].map((phase) => [
      phase,
      JSON.parse(fs.readFileSync(path.join(OUT, `${phase}.json`), "utf8")),
    ]),
  );
  const receipt = {
    format: "rodoh-gate6-browser-receipt/1",
    mode: MODE,
    reliefDigest: RELIEF,
    lampDigest: LAMP,
    operations: OPS,
    completed: true,
    elapsedMs: Object.values(parts).reduce((sum, part) => sum + part.elapsedMs, 0),
    phases: parts,
  };
  fs.writeFileSync(path.join(OUT, "receipt.json"), JSON.stringify(receipt, null, 2));
  console.log(`[gate6:${MODE}] acceptance complete in ${receipt.elapsedMs}ms`);
  process.exit(0);
}

const started = Date.now();
const timeline = [];
function record(event, extra = {}) {
  const row = { elapsedMs: Date.now() - started, event, ...extra };
  timeline.push(row);
  console.log(`[gate6:${MODE}:${PHASE}] ${row.elapsedMs}ms ${event}${Object.keys(extra).length ? ` ${JSON.stringify(extra)}` : ""}`);
}
function contextOptions() {
  return MOBILE
    ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce", acceptDownloads: true }
    : { viewport: { width: 1280, height: 800 }, reducedMotion: "reduce", acceptDownloads: true };
}
const visible = (locator) => locator.isVisible().catch(() => false);

async function boundedClose(action, timeoutMs = 2000) {
  await Promise.race([
    action().catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}
async function resolvePending(page) {
  const card = page.getByTestId("pending-decision-card");
  for (let i = 0; i < 40; i += 1) {
    if (!(await card.count())) return;
    const cont = card.getByRole("button", { name: /continue/i });
    if (await cont.count()) await cont.click();
    else await card.getByRole("button").first().click();
    await page.waitForTimeout(10);
  }
  throw new Error("Pending decision loop exceeded 40 decisions.");
}
async function returnToCommonShip(page) {
  for (let i = 0; i < 8; i += 1) {
    if (await visible(page.getByTestId("common-ship-scene"))) return;
    const back = page.getByTestId("mobile-step-back");
    if (await visible(back)) {
      await back.click();
      continue;
    }
    const view = page.getByTestId("view-common-ship");
    if (await visible(view)) {
      await view.click();
      continue;
    }
    await page.waitForTimeout(50);
  }
  await page.getByTestId("common-ship-scene").waitFor({ state: "visible" });
}
async function coldBay(page) {
  await page.goto(new URL("/axm-world/game/", BASE_URL).toString());
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId("rodoh-cartridge-bay").waitFor({ state: "visible" });
}
async function completeEntry(page) {
  const transition = page.getByTestId("cartridge-enter-transition");
  for (let i = 0; i < 100; i += 1) {
    if (await visible(page.getByTestId("engine-shell"))) break;
    if (await visible(transition)) {
      const skip = transition.getByRole("button", { name: /skip entry/i });
      if (await visible(skip)) await skip.click();
    }
    await page.waitForTimeout(25);
  }
  await page.getByTestId("engine-shell").waitFor({ state: "visible" });
  await resolvePending(page);
  await returnToCommonShip(page);
}
async function enterRelief(page) {
  await coldBay(page);
  await page.getByTestId("play-cartridge-relief-circuit").click();
  await completeEntry(page);
}
async function selectOperation(page, id) {
  await returnToCommonShip(page);
  const scene = page.getByTestId("common-ship-scene");
  if ((await scene.getAttribute("data-selected-watch")) !== id) {
    const watch = page.getByTestId(`common-ship-watch-${id}`);
    assert.equal(await watch.getAttribute("data-status"), "available", `${id} should be available.`);
    await watch.click();
    await returnToCommonShip(page);
  }
  assert.equal(await scene.getAttribute("data-selected-watch"), id);
}
async function prepareOnce(page) {
  const cycle = page.getByTestId("common-ship-cycle");
  const before = Number(await cycle.textContent());
  const button = page.getByTestId("common-ship-prepare-cycle");
  assert(await button.isEnabled(), "Preparation cycle should be enabled.");
  await button.click();
  for (let i = 0; i < 100 && Number(await cycle.textContent()) <= before; i += 1) await page.waitForTimeout(20);
  assert(Number(await cycle.textContent()) > before, "Preparation should advance the Arc cycle.");
  await resolvePending(page);
  await returnToCommonShip(page);
}
async function resolveOperation(page, id) {
  await selectOperation(page, id);
  assert.equal(await page.getByTestId("common-ship-composition").getAttribute("data-feasible"), "true");
  await prepareOnce(page);
  await selectOperation(page, id);
  assert.equal(await page.getByTestId("common-ship-readiness").getAttribute("data-outcome"), "success");
  const enter = page.getByTestId("common-ship-enter");
  assert(await enter.isEnabled());
  await enter.click();
  await page.getByTestId("encounter-shell").waitFor({ state: "visible" });
  assert.equal(await page.getByTestId("encs-composition").getAttribute("data-feasible"), "true");
  const commit = page.getByTestId("commit-plan");
  if (await visible(commit)) await commit.click();
  const spend = page.getByTestId("encs-spend-inc");
  while (await spend.isEnabled().catch(() => false)) await spend.click();
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
      const runFile = path.join(OUT, `relief-${MODE}.run.json`);
      await page.getByTestId("cartridge-object-button").click();
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: /export run/i }).click();
      await (await download).saveAs(runFile);
      const connection = assertReturnedRun(runFile);
      record("run-exported", { bytes: fs.statSync(runFile).size, inheritedFacts: connection.returnLedger.inheritedFacts.length });
    });
    writePhase({ operations: OPS });
  } else if (PHASE === "restore") {
    const runFile = path.join(OUT, `relief-${MODE}.run.json`);
    assert(fs.existsSync(runFile), `Missing journey run: ${runFile}`);
    await withBrowser(async (page) => {
      await coldBay(page);
      await page.getByTestId("open-cartridge").setInputFiles(runFile);
      assert.match((await page.getByTestId("import-success").textContent()) ?? "", /Exact run restored/);
      await page.getByTestId("play-cartridge-relief-circuit").click();
      await completeEntry(page);
      assert.equal(await page.locator('[data-testid^="common-ship-watch-"][data-status="cleared"]').count(), 9);
      assert.equal(await page.getByTestId("connected-operation").getAttribute("data-status"), "returned");
      assert(Number(await page.getByTestId("common-ship-cycle").textContent()) > 0);
      record("fresh-holder-restored");
    });
    writePhase();
  } else if (PHASE === "neutral") {
    await withBrowser(async (page) => {
      await coldBay(page);
      const arc = JSON.parse(fs.readFileSync(path.join(ROOT, "cartridges/relief-circuit.arc.json"), "utf8"));
      arc.meta = { ...arc.meta, id: `holder-common-ship-probe-${MODE}`, name: `Holder Common Ship Probe ${MODE}`, version: "1.0.1" };
      const neutral = path.join(OUT, `neutral-${MODE}.arc.json`);
      fs.writeFileSync(neutral, JSON.stringify(arc));
      await page.getByTestId("open-cartridge").setInputFiles(neutral);
      await page.getByTestId("import-success").waitFor({ state: "visible" });
      await page.getByTestId(`play-cartridge-holder-common-ship-probe-${MODE}`).click();
      await completeEntry(page);
      const scene = page.getByTestId("common-ship-scene");
      assert.equal(await scene.getAttribute("data-first-party-art"), "false");
      assert.match((await scene.textContent()) ?? "", /HOLDER-OWNED CARTRIDGE/);
      assert.equal(await page.locator('[data-testid^="common-ship-portrait-"]').count(), 0);
      assert.equal(await page.getByTestId("common-ship-cross-section").count(), 0);
      assert.equal(await page.getByTestId("common-ship-symbol-atlas").count(), 0);
      assert.equal(await page.getByTestId("common-ship-neutral-anatomy").count(), 1);
      assert.equal(await scene.evaluate((node) => getComputedStyle(node).getPropertyValue("--commonship-environment").trim()), "none");
      record("neutral-fallback-verified");
    });
    writePhase();
  } else if (PHASE === "access") {
    await withBrowser(async (page) => {
      await enterRelief(page);
      const profile = page.getByTestId("common-ship-profile-nima-quell");
      const box = await profile.boundingBox();
      assert((box?.width ?? 0) >= 44 && (box?.height ?? 0) >= 44);
      await profile.focus();
      await page.keyboard.press("Space");
      assert.equal(await profile.getAttribute("aria-pressed"), "false");
      await page.keyboard.press("Space");
      assert.equal(await profile.getAttribute("aria-pressed"), "true");
      await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
      assert.equal(await page.getByTestId("common-ship-cross-section").evaluate((node) => getComputedStyle(node).display), "none");
      assert.equal(await page.getByTestId("common-ship-portrait-nima-quell").evaluate((node) => getComputedStyle(node).display), "none");
      assert(await page.getByTestId("common-ship-prepare-cycle").isEnabled());
      assert(await page.getByTestId("common-ship-enter").isEnabled());
      record("keyboard-forced-colors-reduced-motion-verified");
    });
    writePhase();
  } else {
    throw new Error(`Unknown Gate 6 verification phase: ${PHASE}`);
  }
} catch (error) {
  fs.writeFileSync(path.join(OUT, `${PHASE}-failure.txt`), error instanceof Error ? `${error.stack ?? error.message}\n` : `${String(error)}\n`);
  throw error;
}

process.exit(0);

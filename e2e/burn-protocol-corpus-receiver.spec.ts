import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { openMobileContractSheet, resolvePendingDecisions } from "./helpers";

const ARC_PATH = process.env["BURN_PROTOCOL_ARC_PATH"];
const CORPUS_PATH = process.env["BURN_PROTOCOL_CORPUS_PATH"];
const RECEIPT_PATH = process.env["BURN_PROTOCOL_PUBLICATION_RECEIPT_PATH"];

const ALL = [
  "founder:vance",
  "founder:osyraa",
  "founder:georgiou",
  "founder:saru",
  "founder:sukal",
  "founder:discovery",
];

const CHALLENGES = [
  "open-the-six-repository-hearing",
  "assign-the-six-withdrawal-mandates",
  "repair-the-first-public-corridor",
  "publish-the-read-only-reconstruction",
];

const CONSEQUENCE_KEYS = [
  "consequence:archive:six-repository-hearing-open",
  "consequence:jurisdiction:separate-withdrawal-mandates",
  "consequence:route:first-corridor-public-repair",
  "consequence:continuity:read-only-reconstruction-ledger",
];

async function coldBay(page: Page): Promise<void> {
  await page.goto("/axm-world/game/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId("rodoh-cartridge-bay")).toBeVisible();
}

async function importFile(page: Page, file: string): Promise<void> {
  await page.getByTestId("open-cartridge").setInputFiles(file);
}

async function finishEntryTransition(page: Page): Promise<void> {
  const transition = page.getByTestId("cartridge-enter-transition");
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await page.getByTestId("pending-decision-card").isVisible().catch(() => false)) break;
    if (await page.getByTestId("engine-shell").isVisible().catch(() => false)) return;
    const skip = transition.getByRole("button", { name: /skip entry/i });
    if (await skip.isVisible().catch(() => false)) {
      await Promise.race([
        skip.click({ timeout: 250 }).catch(() => undefined),
        transition.waitFor({ state: "hidden", timeout: 250 }).catch(() => undefined),
      ]);
    }
    await page.waitForTimeout(25);
  }
  if (await page.getByTestId("pending-decision-card").isVisible().catch(() => false)) {
    await resolvePendingDecisions(page);
  }
  await expect(page.getByTestId("engine-shell")).toBeVisible();
}

async function enterBurn(page: Page): Promise<void> {
  await page.getByTestId("play-cartridge-burn-protocol-disclosure-probe").click();
  await finishEntryTransition(page);
  await resolvePendingDecisions(page);
}

async function chooseRepresentation(page: Page, control: string, surface: string): Promise<void> {
  await page.getByTestId(control).click();
  const target = page.getByTestId(surface);
  const back = page.getByTestId("mobile-step-back");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (await target.isVisible().catch(() => false)) return;
    if (await back.isVisible().catch(() => false)) {
      await back.click();
      await page.waitForTimeout(25);
      continue;
    }
    await page.waitForTimeout(50);
  }
  await expect(target).toBeVisible({ timeout: 15_000 });
}

async function enterAvailableMapNode(page: Page): Promise<string> {
  const button = page.locator('[data-testid^="wm-enter-"]:visible').first();
  await expect(button).toBeVisible();
  const testId = await button.getAttribute("data-testid");
  expect(testId).toBeTruthy();
  await button.click();
  return testId!.replace("wm-enter-", "");
}

async function setAllFounders(page: Page): Promise<void> {
  const inRoom = page.getByTestId("encs-in-room");
  const reserve = page.getByTestId("encs-reserve");
  for (const id of ALL) {
    const button = reserve.getByTestId(`encs-token-${id}`);
    if (await button.count()) await button.click();
  }
  await expect(inRoom.locator('[data-testid^="encs-token-"]')).toHaveCount(ALL.length);
  for (const id of ALL) await expect(inRoom.getByTestId(`encs-token-${id}`)).toBeVisible();
}

async function maximizeSpend(page: Page): Promise<void> {
  const spendPanel = page.getByTestId("encs-spend");
  if (!(await spendPanel.count())) return;
  const plus = page.getByTestId("encs-spend-inc");
  while (await plus.isEnabled()) await plus.click();
}

async function completeChallenge(page: Page, expectedId: string): Promise<void> {
  await chooseRepresentation(page, "view-map", "world-map");
  const entered = await enterAvailableMapNode(page);
  expect(entered).toBe(expectedId);
  await expect(page.getByTestId("encounter-shell")).toBeVisible();

  await setAllFounders(page);
  await maximizeSpend(page);
  await expect(page.getByTestId("encs-projection")).toHaveAttribute("data-projected", "success");

  const commit = page.getByTestId("commit-plan");
  if (await commit.isVisible().catch(() => false)) await commit.click();
  await page.getByTestId("encs-resolve").click();
  await expect(page.getByTestId("encs-receipt")).toHaveAttribute("data-outcome", "success");
  const reward = page.getByTestId("reward-choice");
  if (await reward.count()) await reward.locator('[data-testid^="reward-candidate-"]').first().click();
  await page.getByTestId("encs-leave").click();
  await expect(page.getByTestId("encounter-shell")).toHaveCount(0);
  await resolvePendingDecisions(page);
}

async function exportRun(page: Page, destination: string): Promise<Record<string, unknown>> {
  await page.getByTestId("cartridge-object-button").click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /export run/i }).click();
  await (await downloadPromise).saveAs(destination);
  return JSON.parse(fs.readFileSync(destination, "utf8")) as Record<string, unknown>;
}

async function expectRecordedMapNodes(page: Page, count: number): Promise<void> {
  await chooseRepresentation(page, "view-map", "world-map");
  const map = page.getByTestId("world-map");
  await expect(map.getByTestId("wm-progress")).toHaveAttribute("data-recorded", String(count));
  await expect(map.locator('[data-state="recorded"]')).toHaveCount(count);
}

async function ensureRosterSurface(page: Page): Promise<void> {
  if ((await page.getByTestId("mobile-step-board").count()) === 0) return;
  await openMobileContractSheet(page);
  await page.getByTestId("mobile-adjust-party").click();
  await expect(page.getByTestId("mobile-step-party")).toBeVisible();
}

test.describe("Burn Protocol corpus publication receiver", () => {
  test.skip(!ARC_PATH || !CORPUS_PATH || !RECEIPT_PATH, "Requires the exact axm-arc publication output.");
  test.describe.configure({ mode: "serial" });

  test("imports, plays, exports, and resumes the disclosure probe through neutral Rodoh", async ({ page }, testInfo) => {
    test.slow();
    const arcPath = path.resolve(ARC_PATH!);
    const corpus = JSON.parse(fs.readFileSync(path.resolve(CORPUS_PATH!), "utf8")) as {
      exactParent: { sha256: string; nextTransaction: string };
      publication: { liveRunAuthority: string; assetPolicy: string };
    };
    const receipt = JSON.parse(fs.readFileSync(path.resolve(RECEIPT_PATH!), "utf8")) as {
      status: string;
      cartridgeId: string;
      exactParentSha256: string;
      challenges: string[];
    };

    expect(receipt).toMatchObject({
      status: "pass",
      cartridgeId: "burn-protocol-disclosure-probe",
      exactParentSha256: corpus.exactParent.sha256,
      challenges: CHALLENGES,
    });
    expect(corpus.exactParent.nextTransaction).toBe("A13C1");
    expect(corpus.publication).toMatchObject({
      liveRunAuthority: "counterfactual-only",
      assetPolicy: "no-panel-payloads-in-probe",
    });

    const external: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (!["127.0.0.1", "localhost"].includes(url.hostname)) external.push(request.url());
    });

    await coldBay(page);
    await importFile(page, arcPath);
    await expect(page.getByTestId("import-success")).toContainText("The Burn Protocol: Disclosure and Repair");
    const preflightDigest = await page.getByTestId("bay-import-preflight-digest").getAttribute("title");
    expect(preflightDigest).toBe("cart1_c53f00a2d11568377793a898d298df1dd5b2e35bf8c89f081489c9796808820d");

    const entry = page.getByTestId("cartridge-entry-burn-protocol-disclosure-probe");
    await expect(entry).toBeVisible();
    await expect(entry).not.toHaveAttribute("data-program-id", /.+/);
    await expect(entry.getByTestId("bay-digest")).toHaveAttribute("title", preflightDigest!);
    await expect(entry.getByTestId("trust-chip-imported-unsigned")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`burn-bay-${testInfo.project.name}.png`), fullPage: true });

    await enterBurn(page);
    await expect(page.locator("html")).not.toHaveAttribute("data-cartridge", /.+/);
    await expect(page.getByTestId("cartridge-title")).toContainText("The Burn Protocol: Disclosure and Repair");
    await expect(page.getByText("Common Standing", { exact: true })).toBeVisible();
    await expect(page.getByText("Stores", { exact: true })).toBeVisible();
    await expect(page.getByText("Watch", { exact: true })).toBeVisible();
    await expect(page.getByText("Trust", { exact: true })).toBeVisible();
    await ensureRosterSurface(page);
    await expect(page.getByText("Admiral Vance", { exact: true })).toBeVisible();
    await expect(page.getByText("Osyraa", { exact: true })).toBeVisible();
    await expect(page.getByText("Su'Kal", { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`burn-world-entry-${testInfo.project.name}.png`), fullPage: true });

    await chooseRepresentation(page, "view-run-graph", "contract-board");
    await chooseRepresentation(page, "view-map", "world-map");
    await chooseRepresentation(page, "view-hall", "hall-scene");

    for (const challenge of CHALLENGES) await completeChallenge(page, challenge);
    await expectRecordedMapNodes(page, CHALLENGES.length);
    await page.screenshot({ path: testInfo.outputPath(`burn-world-complete-${testInfo.project.name}.png`), fullPage: true });

    const exportedPath = testInfo.outputPath(`burn-protocol-${testInfo.project.name}.run.json`);
    const exported = await exportRun(page, exportedPath);
    expect(exported["format"]).toBe("axm-cartridge-run/v3");
    expect(exported["authoredArcDigest"]).toBe(preflightDigest);
    const exportedArc = exported["arc"] as { extensions?: Record<string, unknown> };
    const source = exportedArc.extensions?.["godscar.common-ship@1"] as {
      notes?: { canonicalBoundary?: Record<string, unknown> };
    };
    expect(source.notes?.canonicalBoundary).toEqual({
      inheritedHistory: "read-only",
      liveRuns: "counterfactual-only",
      storyChanges: "none",
      panelPayloads: "not-present",
    });
    const state = (exported["org"] as { cartridgeState?: Record<string, unknown> }).cartridgeState ?? {};
    for (const key of CONSEQUENCE_KEYS) expect(state[key]).toBe(true);

    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByTestId("rodoh-cartridge-bay")).toBeVisible();
    await importFile(page, exportedPath);
    await expect(page.getByTestId("import-success")).toContainText(/Exact run restored/i);
    const restored = page.getByTestId("cartridge-entry-burn-protocol-disclosure-probe");
    await expect(restored.getByTestId("bay-save-state")).toContainText(/Resumable/i);
    await enterBurn(page);
    await expectRecordedMapNodes(page, CHALLENGES.length);
    await page.screenshot({ path: testInfo.outputPath(`burn-world-restored-${testInfo.project.name}.png`), fullPage: true });
    expect(external).toEqual([]);
  });
});

import { expect, test } from "@playwright/test";

const DEMO = "/local/underdrain-draft/index.html";
const ARC_COMMIT = "395bc539165cc525678ba7eb83434c8cd674437b";

async function completeCurrentEncounter(
  page: Parameters<typeof test>[0] extends never ? never : import("@playwright/test").Page,
  challengeId: "mrs-kett-service-call" | "breach-crown-pump",
  cycle: number,
  orgSeed: number,
): Promise<void> {
  await page.evaluate(
    ({ challengeId: id, cycle: encounterCycle, orgSeed: seed }) => {
      const simulated = simulateAccepted(id, encounterCycle, seed);
      const current = window.UnderdrainRuntime.session.current;
      if (!current || current.challengeId !== id) throw new Error(`Expected active ${id} encounter.`);
      current.state = structuredClone(simulated.state);
      current.frames = structuredClone(simulated.frames);
      acceptCurrentAction();
    },
    { challengeId, cycle, orgSeed },
  );
}

test.describe("UNDERDRAIN continuous authored pilot", () => {
  test("a cold player crosses repair, authored route, accepted consequence, successor, and record", async ({ page }, testInfo) => {
    await page.goto(DEMO);
    await expect(page).toHaveTitle("UNDERDRAIN: The Bloom Below");
    await expect(page.getByRole("heading", { name: "The Bloom Below" })).toBeVisible();
    await expect(page.getByText("You are Rhea Venn, a licensed plumber.")).toBeVisible();
    await expect(page.getByText("Restore Mrs. Kett's water.")).toBeVisible();
    await expect(page.getByText("The opening repair has no enemies.")).toBeVisible();
    await expect(page.locator('script[src]')).toHaveCount(0);
    await expect(page.locator('link[rel="stylesheet"]')).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("cold-entry.png"), fullPage: true });

    await page.getByRole("button", { name: "Answer the service call" }).click();
    await expect(page.locator("#action")).toHaveClass(/active/);
    await expect(page.getByText("Inspect the living trap joint")).toBeVisible();
    await expect(page.getByText(/This is a safe repair/)).toBeVisible();
    await completeCurrentEncounter(page, "mrs-kett-service-call", 1, 0x1a0001);

    await expect(page.locator("#draft")).toHaveClass(/active/);
    await expect(page.getByRole("heading", { name: "Bellwether drafts its plumber." })).toBeVisible();
    await expect(page.getByText("The tissue under the sink was regulating pressure.")).toBeVisible();
    await page.getByRole("radio", { name: /Carry the truce/ }).click();
    await expect(page.getByRole("button", { name: "Enter Pump Seven" })).toBeEnabled();
    await page.getByRole("button", { name: "Enter Pump Seven" }).click();

    await expect(page.locator("#action")).toHaveClass(/active/);
    await expect(page.getByText("Inspect and reroute the three living spore valves")).toBeVisible();
    await expect(page.getByText(/Only WORK on the green mechanism advances the plumbing objective/)).toBeVisible();
    await completeCurrentEncounter(page, "breach-crown-pump", 2, 0x5eed2026);

    await expect(page.locator("#consequence")).toHaveClass(/active/);
    await expect(page.getByText(/Arc replay accepted this trace/)).toBeVisible();
    await expect(page.locator("#accepted-digest")).toHaveText(/^[a-z0-9]+_[0-9a-f]{64}$/);
    await expect(page.getByText("The defenders were pressure around a water operation, not the operation's objective.")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("accepted-consequence.png"), fullPage: true });

    await page.getByRole("button", { name: "Enter the Root Gate parley" }).click();
    await expect(page.locator("#root")).toHaveClass(/active/);
    await expect(page.getByRole("heading", { name: "Water is access. Access is not sovereignty." })).toBeVisible();
    await page.getByRole("button", { name: /Balanced flow compact/ }).click();
    await expect(page.locator("#compact-result")).toBeVisible();
    await expect(page.locator("#compact-digest")).toHaveText(/^choice1_[0-9a-f]{64}$/);
    await page.getByRole("button", { name: "Open the complete episode record" }).click();

    await expect(page.locator("#record")).toHaveClass(/active/);
    const record = JSON.parse((await page.locator("#record-json").textContent()) ?? "{}");
    expect(record).toMatchObject({
      format: "rodoh-underdrain-episode-record/2",
      status: "complete",
      arcAuthority: { commit: ARC_COMMIT },
      route: "truce-offer",
      compactReceipt: { choiceId: "balanced-flow-compact" },
      structuralEvidence: {
        format: "rodoh-one-am-structural-evidence/1",
        authority: { owner: "Arc", campaignEffectCommitted: true },
        continuation: { persistentStateChanged: true, playableSuccessorId: "root-gate-parley" },
      },
      blindPlayerReceipt: { status: "not-issued-by-runtime", required: true },
    });
    expect(record.worldSourceCommit).toMatch(/^[0-9a-f]{40}$/);
    expect(record.acceptedActions).toHaveLength(2);
    expect(record.structuralEvidence.events.map((event: { kind: string }) => event.kind)).toEqual(
      expect.arrayContaining([
        "meaningful-success",
        "choice-delta",
        "critical-reveal",
        "accepted-consequence",
        "world-change",
        "relationship-change",
        "successor-playable",
      ]),
    );
    await page.screenshot({ path: testInfo.outputPath("complete-record.png"), fullPage: true });
  });

  test("the exact Arc-backed automated matrix qualifies all routes and compacts without inventing a blind receipt", async ({ page }) => {
    await page.goto(`${DEMO}?autotest=1`);
    await expect(page.locator("body")).toHaveAttribute("data-test-status", "pass", { timeout: 60_000 });
    const result = await page.evaluate(() => window.__UNDERDRAIN_TEST_RESULT__);
    expect(result).toMatchObject({
      format: "rodoh-underdrain-automated-pilot-qualification/2",
      status: "pass",
      checks: {
        exactArcCommit: ARC_COMMIT,
        serviceHasNoEnemies: true,
        serviceUsesMechanisms: true,
        pumpUsesMechanisms: true,
        pumpAccepted: true,
        rootGateAccepted: true,
        noWorldInventedOutcome: true,
        blindPlayerReceiptIssuedByRuntime: false,
      },
    });
    expect(result.authoringSha256 ?? result.checks.authoringSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(result.cases).toHaveLength(9);
    expect(new Set(result.cases.map((entry) => entry.route))).toEqual(
      new Set(["emergency-plan", "service-tunnel", "truce-offer"]),
    );
    expect(new Set(result.cases.map((entry) => entry.compact))).toEqual(
      new Set(["town-first-flow", "nursery-first-flow", "balanced-flow-compact"]),
    );
  });

  test("reload resumes the same mechanism and cartridge identity", async ({ page }) => {
    await page.goto(DEMO);
    await page.getByRole("button", { name: "Answer the service call" }).click();
    const before = await page.evaluate(() => ({
      arcCommit: window.UnderdrainRuntime.session.arcCommit,
      cartridgeDigest: window.UnderdrainRuntime.session.cartridgeDigest,
      challengeId: window.UnderdrainRuntime.session.current?.challengeId,
      objectiveId: window.UnderdrainRuntime.session.current?.spec.objectives[0]?.id,
    }));
    await page.getByRole("button", { name: "Pause and return later" }).click();
    await page.reload();
    await expect(page.getByRole("button", { name: "Resume where I stopped" })).toBeVisible();
    await page.getByRole("button", { name: "Resume where I stopped" }).click();
    const after = await page.evaluate(() => ({
      arcCommit: window.UnderdrainRuntime.session.arcCommit,
      cartridgeDigest: window.UnderdrainRuntime.session.cartridgeDigest,
      challengeId: window.UnderdrainRuntime.session.current?.challengeId,
      objectiveId: window.UnderdrainRuntime.session.current?.spec.objectives[0]?.id,
    }));
    expect(after).toEqual(before);
    await expect(page.locator("#action")).toHaveClass(/active/);
  });

  test("keyboard and touch ingress expose the same repair verbs", async ({ page }, testInfo) => {
    await page.goto(DEMO);
    const mobile = testInfo.project.name === "mobile";
    if (mobile) {
      await expect(page.locator(".touch")).toBeVisible();
      await expect(page.getByRole("button", { name: "Move up" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Wrench" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Work on mechanism" })).toBeVisible();
    } else {
      await expect(page.locator(".touch")).toBeHidden();
      await expect(page.getByText(/Move with WASD or arrows/)).toBeVisible();
      await expect(page.getByText(/WORK uses E or F/)).toBeVisible();
    }
  });
});

declare global {
  interface Window {
    __UNDERDRAIN_TEST_RESULT__: {
      format: string;
      status: string;
      cases: Array<{ route: string; compact: string }>;
      checks: Record<string, unknown> & { authoringSha256?: string };
      authoringSha256?: string;
    };
    UnderdrainRuntime: {
      session: {
        arcCommit: string;
        cartridgeDigest: string;
        current: null | {
          challengeId: string;
          state: unknown;
          frames: unknown[];
          spec: { objectives: Array<{ id: string }> };
        };
      };
    };
  }
  function simulateAccepted(
    challengeId: string,
    cycle: number,
    orgSeed: number,
  ): { state: unknown; frames: unknown[] };
  function acceptCurrentAction(): void;
}

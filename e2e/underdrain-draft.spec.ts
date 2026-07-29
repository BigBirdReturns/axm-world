import { expect, test, type Page } from "@playwright/test";

const DEMO = "/axm-world/game/local/playwright-underdrain/index.html";
const ARC_COMMIT = "ea16757fe9df65405b322af13d95351896f43157";
const REPRESENTATION_PLAN = "underdrain-white-label-v1";
const PUMP_PRODUCTION_SHA = "c5810b7362b511a8789e26300517ab0156b2593f99c9b45227765f465ef871ca";

async function completeCurrentEncounter(
  page: Page,
  challengeId: "mrs-kett-service-call" | "breach-crown-pump",
  cycle: number,
  orgSeed: number,
): Promise<void> {
  await page.evaluate(
    ({ challengeId: id, cycle: encounterCycle, orgSeed: seed }) => {
      const simulated = simulateAccepted(id, encounterCycle, seed);
      const current = window.UnderdrainRuntime.session.current as any;
      if (!current || current.challengeId !== id) throw new Error(`Expected active ${id} encounter.`);
      const arc = (window as any).UnderdrainArc;
      for (const input of simulated.frames) {
        const previousIndex = current.state.activeObjectiveIndex;
        current.frames.push(structuredClone(input));
        current.state = arc.step(current.spec, current.state, input);
        handleActionEvents(current.state.events ?? [], previousIndex, current.state.activeObjectiveIndex);
        if (current.state.activeObjectiveIndex !== previousIndex && !current.state.result) {
          current.checkpoint = {
            state: structuredClone(current.state),
            frameLength: current.frames.length,
            objectiveIndex: current.state.activeObjectiveIndex,
          };
          fireObjectiveStartReveals(current.state.activeObjectiveIndex);
        }
        if (current.state.result) break;
      }
      if (!current.state.result) throw new Error(`Qualification replay did not finish ${id}.`);
      acceptCurrentAction();
    },
    { challengeId, cycle, orgSeed },
  );
}

async function expectReworkProduct(page: Page): Promise<void> {
  await expect(page.locator("body")).toHaveAttribute("data-representation-status", "rework");
  await expect(page.locator("body")).toHaveAttribute("data-representation-plan", REPRESENTATION_PLAN);
  await expect(page.locator("#representation-status")).toContainText("ART REWORK · 1/48 production roles");
  await expect(page.getByText(/48 cartridge assets/i)).toHaveCount(0);
  await expect(page.locator('[data-presentation-asset="underdrain:emblem"]').first()).toBeVisible();
  const custody = await page.evaluate(() => ({
    session: window.UnderdrainRuntime.session.representation,
    production: JSON.parse(document.getElementById("underdrain-production")?.textContent ?? "null"),
    presentationSha256: (window as any).__UNDERDRAIN_PRESENTATION_SHA256__,
    productionSha256: (window as any).__UNDERDRAIN_PRODUCTION_SHA256__,
  }));
  expect(custody).toMatchObject({
    session: {
      format: "rodoh-underdrain-representation/3",
      planId: REPRESENTATION_PLAN,
      declaredRoleCount: 48,
      declaredRoleCountMeaning: "representation obligations, not independently authored files",
      productionRoleCount: 1,
      prototypeRoleCount: 47,
      productionSourceCount: 1,
      productionCoverageStatus: "mixed",
      productionCoverageComplete: false,
      releaseClassification: "representation-rework",
    },
    production: {
      format: "rodoh-representation-production/1",
      planId: REPRESENTATION_PLAN,
      status: "mixed",
      productionAssetIds: ["underdrain:scene-pump-seven"],
    },
    presentationSha256: expect.stringMatching(/^[0-9a-f]{64}$/),
    productionSha256: expect.stringMatching(/^[0-9a-f]{64}$/),
  });
}

test.describe("UNDERDRAIN authored continuity under representation rework", () => {
  test("a cold player crosses the authored loop while evidence remains honest about prototype art", async ({ page }, testInfo) => {
    test.setTimeout(80_000);
    await page.goto(DEMO);
    await expect(page).toHaveTitle("UNDERDRAIN: The Bloom Below");
    await expectReworkProduct(page);
    await expect(page.getByRole("heading", { name: "The Bloom Below" })).toBeVisible();
    await expect(page.getByText("You are Rhea Venn, a licensed plumber.")).toBeVisible();
    await expect(page.getByText("Restore Mrs. Kett's water.")).toBeVisible();
    await expect(page.getByText("The opening repair has no enemies.")).toBeVisible();
    await expect(page.locator('#cold [data-presentation-asset="underdrain:scene-kitchen"]').first()).toBeVisible();
    await expect(page.locator('#cold [data-presentation-asset="underdrain:portrait-rhea-venn"]').first()).toBeVisible();
    await expect(page.locator('#cold [data-presentation-asset="underdrain:portrait-morrowcap"]').first()).toBeVisible();
    const remoteAssets = await page.locator('script[src], link[rel="stylesheet"]').evaluateAll((elements) =>
      elements
        .map((element) => element.getAttribute("src") ?? element.getAttribute("href") ?? "")
        .filter((value) => /^https?:\/\//i.test(value)),
    );
    expect(remoteAssets).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath("cold-entry-rework.png"), fullPage: true });

    await page.getByRole("button", { name: "Answer the service call" }).click();
    await expect(page.locator("#action")).toHaveClass(/active/);
    await expect(page.locator("#action-title")).toHaveText("Inspect the living trap joint");
    await expect(page.getByText(/This is a safe repair/)).toBeVisible();
    await expect(page.locator(".command-deck")).toBeVisible();
    await expect(page.locator(".stage")).not.toContainText("Inspect the living trap joint");
    await expect(page.locator("#game")).toHaveAttribute("data-presentation-asset", "underdrain:scene-kitchen");
    await expect(page.locator("#game")).toHaveAttribute("data-representation-assets", /underdrain:body-rhea-venn/);
    await expect(page.locator("#game")).toHaveAttribute("data-representation-assets", /underdrain:mechanism-inspect-living-trap-active/);
    await page.screenshot({ path: testInfo.outputPath("service-prototype-clear-command-deck.png"), fullPage: true });
    await completeCurrentEncounter(page, "mrs-kett-service-call", 1, 0x1a0001);

    await expect(page.locator("#draft")).toHaveClass(/active/);
    await expect(page.getByRole("heading", { name: "Bellwether drafts its plumber." })).toBeVisible();
    await expect(page.getByText("The tissue under the sink was regulating pressure.")).toBeVisible();
    await expect(page.locator('#draft [data-presentation-asset="underdrain:portrait-marta-sump"]').first()).toBeVisible();
    await expect(page.locator('#draft [data-presentation-asset="underdrain:portrait-tess-loam"]').first()).toBeVisible();
    await expect(page.locator('#draft [data-presentation-asset="underdrain:route-truce-offer"]').first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("authored-commitment-prototype.png"), fullPage: true });
    await page.getByRole("radio", { name: /Carry the truce/ }).click();
    await expect(page.getByRole("button", { name: "Enter Pump Seven" })).toBeEnabled();
    await page.getByRole("button", { name: "Enter Pump Seven" }).click();

    await expect(page.locator("#action")).toHaveClass(/active/);
    await expect(page.locator("#action-title")).toHaveText("Inspect and reroute the three living spore valves");
    await expect(page.getByText(/Only WORK on the green mechanism advances the plumbing objective/)).toBeVisible();
    await expect(page.locator("body")).toHaveAttribute("data-pump-scene-art", "ready", { timeout: 15_000 });
    await expect(page.locator("#game")).toHaveAttribute("data-presentation-asset", "underdrain:scene-pump-seven");
    await expect(page.locator("#game")).toHaveAttribute("data-production-asset", "underdrain:scene-pump-seven");
    await expect(page.locator("#game")).toHaveAttribute("data-production-asset-sha256", PUMP_PRODUCTION_SHA);
    await expect(page.locator("#game")).toHaveAttribute("data-representation-assets", /underdrain:mechanism-spore-valve-active/);
    await expect(page.locator("#game")).toHaveAttribute("data-representation-assets", /underdrain:pressure-/);
    await page.screenshot({ path: testInfo.outputPath("pump-seven-one-production-scene.png"), fullPage: true });
    await completeCurrentEncounter(page, "breach-crown-pump", 2, 0x5eed2026);

    await expect(page.locator("#consequence")).toHaveClass(/active/);
    await expect(page.locator("#accepted-label")).toHaveText(/Arc replay accepted this trace/);
    await expect(page.locator("#accepted-digest")).toHaveText(/^[a-z0-9]+_[0-9a-f]{64}$/);
    await expect(page.getByText("The defenders were pressure around a water operation, not the operation's objective.")).toBeVisible();
    await expect(page.locator('#consequence [data-presentation-asset="underdrain:scene-consequence"]').first()).toBeVisible();
    await expect(page.locator('#consequence [data-presentation-asset="underdrain:state-town-water-pressure"]').first()).toBeVisible();
    await expect(page.locator('#consequence [data-presentation-asset="underdrain:state-root-gate-open"]').first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("accepted-consequence-prototype.png"), fullPage: true });

    await page.getByRole("button", { name: "Enter the Root Gate parley" }).click();
    await expect(page.locator("#root")).toHaveClass(/active/);
    await expect(page.getByRole("heading", { name: "Water is access. Access is not sovereignty." })).toBeVisible();
    await expect(page.locator('#root [data-presentation-asset="underdrain:scene-root-gate"]').first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("root-gate-prototype.png"), fullPage: true });
    await page.getByRole("button", { name: /Balanced flow compact/ }).click();
    await expect(page.locator("#compact-result")).toBeVisible();
    await expect(page.locator("#compact-digest")).toHaveText(/^choice1_[0-9a-f]{64}$/);
    const openRecord = page.getByRole("button", { name: "Open the complete episode record" });
    await openRecord.scrollIntoViewIfNeeded();
    await openRecord.click();

    await expect(page.locator("#record")).toHaveClass(/active/);
    await expect(page.locator('#record [data-presentation-asset="underdrain:record-seal"]').first()).toBeVisible();
    await expect(page.locator('#record [data-presentation-asset="underdrain:state-evidence-custody"]').first()).toBeVisible();
    const record = JSON.parse((await page.locator("#record-json").textContent()) ?? "{}");
    expect(record).toMatchObject({
      format: "rodoh-underdrain-episode-record/2",
      status: "complete",
      arcAuthority: { commit: ARC_COMMIT },
      route: "truce-offer",
      compactReceipt: { choiceId: "balanced-flow-compact" },
      representation: {
        format: "rodoh-representation-runtime-evidence/3",
        planId: REPRESENTATION_PLAN,
        presentationSha256: expect.stringMatching(/^[0-9a-f]{64}$/),
        productionSha256: expect.stringMatching(/^[0-9a-f]{64}$/),
        declaredRoleCountMeaning: "representation obligations, not independently authored files",
        productionCoverage: {
          format: "rodoh-representation-production/1",
          status: "mixed",
          productionAssetIds: ["underdrain:scene-pump-seven"],
        },
        productionCoverageComplete: false,
        releaseClassification: "representation-rework",
        renderer: { action: "cartridge-assets", neutralFallbackUsed: false },
      },
      structuralEvidence: {
        format: "rodoh-one-am-structural-evidence/1",
        authority: { owner: "Arc", campaignEffectCommitted: true },
        continuation: { persistentStateChanged: true, playableSuccessorId: "root-gate-parley" },
        representation: {
          planId: REPRESENTATION_PLAN,
          productionCoverageComplete: false,
          releaseClassification: "representation-rework",
        },
      },
      blindPlayerReceipt: { status: "not-issued-by-runtime", required: true },
    });
    expect(record.worldSourceCommit).toMatch(/^[0-9a-f]{40}$/);
    expect(record.acceptedActions).toHaveLength(2);
    expect(record.representation.declaredRoleIds).toHaveLength(48);
    expect(record.representation.productionCoverage.productionAssetIds).toHaveLength(1);
    expect(record.representation.productionCoverage.sources).toHaveLength(1);
    expect(record.representation.mountedRoleIds).toEqual(expect.arrayContaining([
      "underdrain:emblem",
      "underdrain:scene-kitchen",
      "underdrain:scene-pump-seven",
      "underdrain:scene-consequence",
      "underdrain:scene-root-gate",
      "underdrain:record-seal",
      "underdrain:body-rhea-venn",
    ]));
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
    await page.screenshot({ path: testInfo.outputPath("complete-record-honest-rework.png"), fullPage: true });
  });

  test("the Arc-backed matrix reports role coverage without turning it into release acceptance", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto(`${DEMO}?autotest=1`);
    await expectReworkProduct(page);
    await expect.poll(
      () => page.locator("body").getAttribute("data-test-status"),
      { timeout: 60_000 },
    ).toMatch(/^(pass|fail)$/);
    const status = await page.locator("body").getAttribute("data-test-status");
    if (status !== "pass") {
      const diagnostics = (await page.locator("#autotest-results").textContent()) ?? "No automated-suite diagnostics were rendered.";
      throw new Error(`Underdrain automated rework qualification failed:\n${diagnostics}`);
    }
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
        representationPlanId: REPRESENTATION_PLAN,
        presentationSha256: expect.stringMatching(/^[0-9a-f]{64}$/),
        productionSha256: expect.stringMatching(/^[0-9a-f]{64}$/),
        declaredRepresentationRoleCount: 48,
        declaredRoleCountIsNotFileCount: true,
        productionRoleCount: 1,
        prototypeRoleCount: 47,
        productionSourceCount: 1,
        productionPumpSceneBound: PUMP_PRODUCTION_SHA,
        productionCoverageComplete: false,
        releaseClassification: "representation-rework",
        commandDeckOutsideRenderedWorld: true,
        completeSurfaceRolePlan: true,
        representativePrototypeRolesMounted: true,
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

  test("reload resumes the same mechanism and honest rework custody", async ({ page }) => {
    await page.goto(DEMO);
    await expectReworkProduct(page);
    await page.getByRole("button", { name: "Answer the service call" }).click();
    const before = await page.evaluate(() => ({
      arcCommit: window.UnderdrainRuntime.session.arcCommit,
      cartridgeDigest: window.UnderdrainRuntime.session.cartridgeDigest,
      challengeId: window.UnderdrainRuntime.session.current?.challengeId,
      objectiveId: window.UnderdrainRuntime.session.current?.spec.objectives[0]?.id,
      representation: window.UnderdrainRuntime.session.representation,
    }));
    await expect(page.locator("#game")).toHaveAttribute("data-representation-assets", /underdrain:mechanism-inspect-living-trap-active/);
    await page.getByRole("button", { name: "Pause and return later" }).click();
    await page.reload();
    await expectReworkProduct(page);
    await expect(page.locator("#action")).toHaveClass(/active/);
    await expect(page.locator("#game")).toHaveAttribute("data-representation-assets", /underdrain:mechanism-inspect-living-trap-active/);
    const after = await page.evaluate(() => ({
      arcCommit: window.UnderdrainRuntime.session.arcCommit,
      cartridgeDigest: window.UnderdrainRuntime.session.cartridgeDigest,
      challengeId: window.UnderdrainRuntime.session.current?.challengeId,
      objectiveId: window.UnderdrainRuntime.session.current?.spec.objectives[0]?.id,
      representation: window.UnderdrainRuntime.session.representation,
    }));
    expect(after).toEqual(before);
  });

  test("keyboard and touch ingress expose the same repair verbs outside the rendered world", async ({ page }, testInfo) => {
    await page.goto(DEMO);
    await expectReworkProduct(page);
    const mobile = testInfo.project.name === "mobile";
    if (mobile) {
      await page.getByRole("button", { name: "Answer the service call" }).click();
      await expect(page.locator("#action")).toHaveClass(/active/);
      await expect(page.locator(".command-deck .touch")).toBeVisible();
      await expect(page.getByRole("button", { name: "Move up" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Wrench" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Work on mechanism" })).toBeVisible();
      await expect(page.locator("#game")).toHaveAttribute("data-presentation-asset", "underdrain:scene-kitchen");
      expect(await page.locator(".stage .touch").count()).toBe(0);
      expect(await page.locator(".stage .objective-ribbon").count()).toBe(0);
    } else {
      await expect(page.locator(".touch")).toBeHidden();
      await expect(page.getByText(/Move with WASD or arrows/)).toBeVisible();
      await expect(page.getByText(/WORK uses E or F/)).toBeVisible();
    }
  });
});

declare global {
  interface Window {
    __UNDERDRAIN_PRESENTATION_SHA256__: string;
    __UNDERDRAIN_PRODUCTION_SHA256__: string;
    UnderdrainProductionAssets: {
      assets: Record<string, { mediaType: string; width: number; height: number; sha256: string; dataUrl: string }>;
    };
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
        representation: Record<string, unknown>;
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
  function handleActionEvents(events: unknown[], previousIndex: number, currentIndex: number): void;
  function fireObjectiveStartReveals(index: number): void;
  function acceptCurrentAction(): void;
}

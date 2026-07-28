import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { Script } from "node:vm";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");
const DEMO = resolve(ROOT, "demos/underdrain-draft");
const SOURCE = resolve(DEMO, "source");
const WORLD_COMMIT = "a".repeat(40);
const ARC_COMMIT = "ea16757fe9df65405b322af13d95351896f43157";

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function buildStandalone(): { html: string; output: string } {
  const directory = mkdtempSync(join(tmpdir(), "underdrain-v3-"));
  const output = join(directory, "index.html");
  const result = spawnSync(process.execPath, [
    resolve(ROOT, "scripts/demos/build-underdrain-draft.mjs"),
    "--root", DEMO,
    "--output", output,
    "--world-commit", WORLD_COMMIT,
  ], { cwd: ROOT, encoding: "utf8" });
  expect(result.status, result.stderr || result.stdout).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({
    format: "rodoh-underdrain-build/3",
    status: "pass",
    worldCommit: WORLD_COMMIT,
    representationPlanId: "underdrain-white-label-v1",
    representationAssets: 48,
    whiteLabelRepresentation: "embedded-before-boot",
    singleFile: true,
    externalRuntime: false,
  });
  return { html: readFileSync(output, "utf8"), output };
}

const AUTHORING_BYTES = readFileSync(resolve(DEMO, "authoring.json"));
const AUTHORING = JSON.parse(AUTHORING_BYTES.toString("utf8"));
const PRESENTATION_BYTES = readFileSync(resolve(DEMO, "presentation.json"));
const PRESENTATION = JSON.parse(PRESENTATION_BYTES.toString("utf8"));

describe("UNDERDRAIN continuous authored pilot", () => {
  it("builds one executable offline file from exact authority and representation", () => {
    const { html } = buildStandalone();
    expect(html).not.toMatch(/<script[^>]+src=/i);
    expect(html).not.toMatch(/<link[^>]+stylesheet/i);
    expect(html).not.toMatch(/\bfetch\s*\(/);
    expect(html).not.toMatch(/\bWebSocket\b|\bEventSource\b|\bserviceWorker\b/);
    expect(html).not.toMatch(/\bMath\.random\b|\beval\s*\(|\bnew Function\b/);
    expect(html).not.toMatch(/placeholder\s*:\s*(?:true|!0)/);
    expect(html).toContain(WORLD_COMMIT);
    expect(html).toContain(ARC_COMMIT);
    expect(html).toContain(sha256(resolve(DEMO, "presentation.json")));
    const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
    const executable = scripts.find((entry) => !/application\/json/.test(entry[1] ?? ""))?.[2];
    expect(executable).toBeTruthy();
    expect(() => new Script(executable!, { filename: "underdrain-v3-inline.js" })).not.toThrow();
  });

  it("has one Arc-owned authoring source with a safe opening and implemented successor", () => {
    expect(existsSync(resolve(SOURCE, "authoring-block.html"))).toBe(false);
    expect(AUTHORING).toMatchObject({
      format: "rodoh-underdrain-standalone/2",
      id: "underdrain-draft",
      version: "2.0.0",
      classification: "authored-pilot-candidate",
      arcAuthority: "axm-action-receipt/1",
      rootGateAuthority: "axm-authored-choice-receipt/1",
      authoredExperienceAuthority: "axm-authored-experience/1",
      actionObjectiveAuthority: "axm-action-objectives/1",
      challengeOrder: ["mrs-kett-service-call", "breach-crown-pump", "root-gate-parley"],
      experienceOrder: ["mrs-kett-service-call", "pump-seven-operation", "root-gate-parley"],
      oneAmBoundary: {
        safeOpeningHasNoPressureEnemies: true,
        importantRevealOccursDuringPumpPlay: true,
        resultRequiresArcAcceptanceBeforeWorldDelta: true,
        rootGateSuccessorIsAuthored: true,
        rootGateChoiceRequiresArcAcceptance: true,
        independentPlayerReceiptRequired: true,
      },
    });
    expect(AUTHORING.actionObjectives.encounters["mrs-kett-service-call"]["inspect-living-trap"].pressureEnemyCount).toBe(0);
    expect(AUTHORING.actionObjectives.encounters["mrs-kett-service-call"]["restore-kett-water"].pressureEnemyCount).toBe(0);
    expect(AUTHORING.authoredExperiences.experiences["pump-seven-operation"].outcomes.success.nextExperienceIds).toEqual(["root-gate-parley"]);
  });

  it("binds the first-party pilot to a complete Underdrain-owned white-label pack", () => {
    expect(PRESENTATION).toMatchObject({
      format: "rodoh-representation-plan/1",
      id: "underdrain-white-label-v1",
      namespace: "underdrain",
      classification: "authored-pilot-candidate",
      renderer: { action: "cartridge-assets", neutralFallbackUsed: false },
    });
    expect(PRESENTATION.assets).toHaveLength(48);
    expect(PRESENTATION.bindings.people).toHaveLength(6);
    expect(PRESENTATION.bindings.objectives).toHaveLength(5);
    expect(PRESENTATION.bindings.states).toHaveLength(7);
    expect(PRESENTATION.surfaces.map((surface: { id: string }) => surface.id)).toEqual([
      "cold-entry", "authored-commitment", "first-action", "accepted-consequence", "playable-successor", "durable-record",
    ]);
    expect(PRESENTATION.surfaces.every((surface: { desktop: boolean; mobile: boolean }) => surface.desktop && surface.mobile)).toBe(true);
    expect(existsSync(resolve(DEMO, "assets/underdrain-art.js"))).toBe(true);
    expect(existsSync(resolve(DEMO, "assets/provenance.json"))).toBe(true);
  });

  it("binds played mechanisms, in-play revelation, accepted consequence, persistence, Root Gate, and visual continuity", () => {
    const { html } = buildStandalone();
    for (const marker of [
      "const TICK_RATE=30",
      "rodoh-underdrain-session/2",
      "rodoh-underdrain-episode-record/2",
      "rodoh-one-am-structural-evidence/1",
      "rodoh-representation-runtime-evidence/1",
      "rodoh-underdrain-automated-pilot-qualification/2",
      "underdrain-white-label-art/1",
      "underdrain-white-label-v1",
      "underdrain:scene-kitchen",
      "underdrain:scene-pump-seven",
      "underdrain:scene-consequence",
      "underdrain:scene-root-gate",
      "underdrain:record-seal",
      "objective_progress",
      "critical-reveal",
      "accepted-consequence",
      "world-change",
      "relationship-change",
      "successor-playable",
      "root-gate-parley",
      "not-issued-by-runtime",
      "Arc replay accepted this trace.",
      "actionRendererUsesCartridgeAssets",
      "neutralFallbackAbsent",
      "prefers-reduced-motion",
      "forced-colors",
    ]) expect(html).toContain(marker);
    expect(html).not.toContain("campaign effect remained provisional");
    expect(html).not.toContain('"action":"primitive-only"');
    expect(html).not.toContain('"neutralFallbackUsed":true');
    expect(html).toContain("The opening repair has no enemies.");
    expect(html).toContain("Only WORK on the green mechanism advances the plumbing objective.");
    expect(html).toContain("Enter the Root Gate parley");
    expect(html.indexOf("UNDERDRAIN fell back to schematic or neutral representation."))
      .toBeLessThan(html.indexOf("const params=new URLSearchParams(location.search);"));
  });

  it("passes the exact static verifier only with authoring and presentation custody", () => {
    const { output } = buildStandalone();
    const result = spawnSync(process.execPath, [
      resolve(ROOT, "scripts/demos/verify-underdrain-draft.mjs"),
      "--root", DEMO,
      "--html", output,
      "--world-commit", WORLD_COMMIT,
      "--arc-commit", ARC_COMMIT,
      "--authoring-sha256", sha256(resolve(DEMO, "authoring.json")),
      "--presentation-sha256", sha256(resolve(DEMO, "presentation.json")),
    ], { cwd: ROOT, encoding: "utf8" });
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      format: "rodoh-underdrain-static-verification/3",
      status: "pass",
      representation: {
        planId: "underdrain-white-label-v1",
        assets: 48,
        people: 6,
        objectives: 5,
        states: 7,
        surfaces: 6,
        actionRenderer: "cartridge-assets",
        neutralFallbackUsed: false,
      },
      checks: {
        cartridgeOwnedRepresentation: "present-before-boot",
        representationDesktopMobile: "pass",
        representationAccessibility: "pass",
      },
    });
  });

  it("installs file-origin persistence before session boot and states its exact durability", () => {
    const { html } = buildStandalone();
    expect(existsSync(resolve(SOURCE, "storage-adapter.js"))).toBe(true);
    expect(existsSync(resolve(SOURCE, "persistence-surface.js"))).toBe(true);
    expect(html).toContain("rodoh-underdrain-window-name-storage/1");
    expect(html).toContain("rodoh-underdrain-persistence/1");
    expect(html).toContain('mode:"window-name"');
    expect(html).toContain('durability:"current-tab"');
    expect(html).toContain("Download the episode record before closing the tab");
    expect(html.indexOf("rodoh-underdrain-window-name-storage/1")).toBeLessThan(html.indexOf("function loadSession()"));
    expect(html.indexOf("function episodeRecord()"))
      .toBeLessThan(html.indexOf("const decoratedEpisodeRecord"));
  });

  it("keeps the runtime from minting its own blind-player comprehension receipt", () => {
    const app = readFileSync(resolve(SOURCE, "app-01.js"), "utf8");
    expect(app).toContain('blindPlayerReceipt:{status:"not-issued-by-runtime",required:true}');
    expect(app).not.toContain("observedId:");
    expect(app).not.toContain("adjudicatorId:");
  });
});

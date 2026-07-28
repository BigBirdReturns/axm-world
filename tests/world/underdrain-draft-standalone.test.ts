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
const ARC_COMMIT = "395bc539165cc525678ba7eb83434c8cd674437b";

function buildStandalone(): string {
  const directory = mkdtempSync(join(tmpdir(), "underdrain-v2-"));
  const output = join(directory, "index.html");
  const result = spawnSync(process.execPath, [
    resolve(ROOT, "scripts/demos/build-underdrain-draft.mjs"),
    "--root", DEMO,
    "--output", output,
    "--world-commit", WORLD_COMMIT,
  ], { cwd: ROOT, encoding: "utf8" });
  expect(result.status, result.stderr || result.stdout).toBe(0);
  return readFileSync(output, "utf8");
}

const AUTHORING_BYTES = readFileSync(resolve(DEMO, "authoring.json"));
const AUTHORING = JSON.parse(AUTHORING_BYTES.toString("utf8"));

describe("UNDERDRAIN continuous authored pilot", () => {
  it("builds one executable offline file from exact generated authority", () => {
    const html = buildStandalone();
    expect(html).not.toMatch(/<script[^>]+src=/i);
    expect(html).not.toMatch(/<link[^>]+stylesheet/i);
    expect(html).not.toMatch(/\bfetch\s*\(/);
    expect(html).not.toMatch(/\bWebSocket\b|\bEventSource\b|\bserviceWorker\b/);
    expect(html).not.toMatch(/\bMath\.random\b|\beval\s*\(|\bnew Function\b/);
    expect(html).not.toMatch(/placeholder\s*:\s*(?:true|!0)/);
    expect(html).toContain(WORLD_COMMIT);
    expect(html).toContain(ARC_COMMIT);
    const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
    const executable = scripts.find((entry) => !/application\/json/.test(entry[1]))?.[2];
    expect(executable).toBeTruthy();
    expect(() => new Script(executable!, { filename: "underdrain-v2-inline.js" })).not.toThrow();
  });

  it("has one Arc-owned authoring source with a safe opening and implemented successor", () => {
    expect(existsSync(resolve(SOURCE, "authoring-block.html"))).toBe(false);
    expect(AUTHORING).toMatchObject({
      format: "rodoh-underdrain-standalone/2",
      id: "underdrain-draft",
      version: "2.0.0",
      classification: "authored-pilot-candidate",
      arcAuthority: "axm-action-receipt/1",
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

  it("binds played mechanisms, in-play revelation, accepted consequence, persistence, and Root Gate continuity", () => {
    const html = buildStandalone();
    for (const marker of [
      "const TICK_RATE=30",
      "rodoh-underdrain-session/2",
      "rodoh-underdrain-episode-record/2",
      "rodoh-one-am-structural-evidence/1",
      "rodoh-underdrain-automated-pilot-qualification/2",
      "objective_progress",
      "critical-reveal",
      "accepted-consequence",
      "world-change",
      "relationship-change",
      "successor-playable",
      "root-gate-parley",
      "not-issued-by-runtime",
      "Arc replay required",
      "prefers-reduced-motion",
    ]) expect(html).toContain(marker);
    expect(html).toContain("The opening repair has no enemies.");
    expect(html).toContain("Only WORK on the green mechanism advances the plumbing objective.");
    expect(html).toContain("Enter the Root Gate parley");
  });

  it("keeps the runtime from minting its own blind-player comprehension receipt", () => {
    const app = readFileSync(resolve(SOURCE, "app-01.js"), "utf8");
    expect(app).toContain('blindPlayerReceipt:{status:"not-issued-by-runtime",required:true}');
    expect(app).not.toContain("observedId:");
    expect(app).not.toContain("adjudicatorId:");
  });
});

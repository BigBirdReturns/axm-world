#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
function option(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}
function fail(message) {
  console.error(message);
  process.exit(1);
}
function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

const arcRoot = resolve(option("--arc-root") ?? "../axm-arc");
const output = resolve(option("--output") ?? "demos/underdrain-draft/source/arc-capsule.js");
const authorityCommit = option("--arc-commit");
const authoringPath = resolve(option("--authoring") ?? "demos/underdrain-draft/authoring.json");
if (!authorityCommit || !/^[0-9a-f]{40}$/.test(authorityCommit)) fail("--arc-commit must be a 40-character lowercase Git SHA.");
if (!existsSync(resolve(arcRoot, "package.json"))) fail(`Arc checkout is absent: ${arcRoot}`);
if (!existsSync(authoringPath)) fail(`Underdrain authoring is absent: ${authoringPath}`);

const git = spawnSync("git", ["-C", arcRoot, "rev-parse", "HEAD"], { encoding: "utf8" });
if (git.status !== 0) fail(git.stderr || "Unable to read Arc checkout identity.");
const actualCommit = git.stdout.trim();
if (actualCommit !== authorityCommit) fail(`Arc checkout mismatch: expected ${authorityCommit}, got ${actualCommit}.`);

const esbuild = resolve(arcRoot, "node_modules", ".bin", process.platform === "win32" ? "esbuild.cmd" : "esbuild");
if (!existsSync(esbuild)) fail(`Arc's exact dependency install does not provide esbuild: ${esbuild}`);
const authoringBytes = readFileSync(authoringPath);
const authoringSha256 = sha256(authoringBytes);
const entry = resolve(arcRoot, ".rodoh-underdrain-capsule-entry.ts");

const source = `
import {
  UNDERDRAIN_DRAFT_ARC,
  acceptUnderdrainRootGateChoice,
  applyUnderdrainStateEffects,
  initialUnderdrainCampaignState,
} from "./src/demos/underdrain/index.ts";
import {
  actionSeed,
  buildActionReceipt,
  compileActionEncounter,
  compressActionInputs,
  initialActionState,
  stepActionSimulation,
} from "./src/engine/action/index.ts";
import { cartridgeDigest } from "./src/engine/cartridge-digest.ts";

const authorityCommit = ${JSON.stringify(authorityCommit)};
const authoringSha256 = ${JSON.stringify(authoringSha256)};
const arc = UNDERDRAIN_DRAFT_ARC;
const byChallenge = new Map(arc.challenges.map((challenge) => [challenge.id, challenge]));
const challengeFor = (challengeId: string) => {
  const challenge = byChallenge.get(challengeId);
  if (!challenge) throw new Error(\`Unknown Underdrain challenge \${challengeId}.\`);
  return challenge;
};
const clone = <T>(value: T): T => structuredClone(value);

const capsule = {
  authorityCommit,
  get worldSourceCommit() {
    const value = (globalThis as Record<string, unknown>).__UNDERDRAIN_WORLD_COMMIT__;
    if (typeof value !== "string" || !/^[0-9a-f]{40}$/.test(value)) {
      throw new Error("The standalone did not bind an exact World candidate commit.");
    }
    return value;
  },
  cartridgeDigest: cartridgeDigest(arc),
  authoringSha256,
  initialCampaignState: () => clone(initialUnderdrainCampaignState(arc)),
  applyStateEffects: (before: Record<string, unknown>, effects: unknown[]) =>
    clone(applyUnderdrainStateEffects(before as never, effects as never, arc)),
  challengeOutcome: (challengeId: string, outcome: "success" | "partial" | "failure") =>
    clone(challengeFor(challengeId).outcomes[outcome]),
  getSpec: (challengeId: string, difficultyModeId: string | null = null) =>
    clone(compileActionEncounter(arc, challengeFor(challengeId), difficultyModeId)),
  seedFor: (orgSeed: number, cycle: number, challengeId: string, difficultyModeId: string | null = null) =>
    actionSeed(orgSeed, cycle, challengeId, difficultyModeId),
  initial: (spec: Parameters<typeof initialActionState>[0], seed: number) => clone(initialActionState(spec, seed)),
  step: (
    spec: Parameters<typeof stepActionSimulation>[0],
    state: Parameters<typeof stepActionSimulation>[1],
    input: Parameters<typeof stepActionSimulation>[2],
  ) => clone(stepActionSimulation(spec, state, input)),
  acceptAction: (params: {
    challengeId: string;
    difficultyModeId: string | null;
    cycle: number;
    orgSeed: number;
    controlledAgentId: string;
    partyAgentIds: string[];
    frames: Parameters<typeof compressActionInputs>[0];
  }) => {
    const challenge = challengeFor(params.challengeId);
    const trace = compressActionInputs(params.frames);
    const receipt = buildActionReceipt({
      arc,
      challenge,
      difficultyModeId: params.difficultyModeId,
      cycle: params.cycle,
      orgSeed: params.orgSeed,
      controlledAgentId: params.controlledAgentId,
      partyAgentIds: params.partyAgentIds,
      trace,
    });
    const accepted = challenge.outcomes[receipt.result.outcome];
    return clone({
      receipt,
      narrative: accepted.narrative,
      stateEffects: accepted.stateEffects ?? [],
      milestoneFlag: accepted.milestoneFlag ?? null,
    });
  },
  acceptRootGateChoice: (choiceId: "town-first-flow" | "nursery-first-flow" | "balanced-flow-compact", campaignBefore: Record<string, unknown>) =>
    clone(acceptUnderdrainRootGateChoice({ choiceId, campaignBefore: campaignBefore as never, arc })),
};

(globalThis as Record<string, unknown>).UnderdrainArc = Object.freeze(capsule);
`;

try {
  writeFileSync(entry, source, "utf8");
  const built = spawnSync(esbuild, [
    entry,
    "--bundle",
    "--format=iife",
    "--platform=browser",
    "--target=es2022",
    "--minify",
    "--legal-comments=none",
    `--outfile=${output}`,
  ], { cwd: arcRoot, encoding: "utf8", shell: process.platform === "win32" });
  if (built.status !== 0) fail(`${built.stdout}\n${built.stderr}`.trim());
} finally {
  rmSync(entry, { force: true });
}

const bytes = readFileSync(output);
const text = bytes.toString("utf8");
if (!text.includes("UnderdrainArc")) fail("Generated capsule does not publish UnderdrainArc.");
if (text.includes("placeholder:true") || text.includes("placeholder:!0")) fail("Generated capsule retained the placeholder boundary.");
process.stdout.write(`${JSON.stringify({
  format: "rodoh-underdrain-arc-capsule-build/1",
  status: "pass",
  arcCommit: authorityCommit,
  authoringSha256,
  output,
  bytes: bytes.length,
  sha256: sha256(bytes),
}, null, 2)}\n`);

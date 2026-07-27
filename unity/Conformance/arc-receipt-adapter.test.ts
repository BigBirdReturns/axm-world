import { describe, expect, it } from "vitest";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { compileActionEncounter } from "../../src/engine/action/compile.js";
import {
  actionSeed,
  buildActionReceipt,
  verifyActionReceipt,
} from "../../src/engine/action/receipt.js";
import type { Arc, Challenge } from "../../src/engine/types.js";

const specPath = process.env.AXM_ACTION_NATIVE_SPEC;
const candidatePath = process.env.AXM_ACTION_CANDIDATE;
const receiptOutputPath = process.env.AXM_ACTION_RECEIPT_OUT;
const reconciliationOutputPath = process.env.AXM_ACTION_RECONCILIATION_OUT;
const arcModules = import.meta.glob("../../src/arcs/*.{ts,js}", { eager: true });

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing ${name}.`);
  return resolve(value);
}

function requiredInteger(value: string | undefined, name: string): number {
  if (!value) throw new Error(`Missing ${name}.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 0xffff_ffff) {
    throw new Error(`${name} must be an unsigned 32-bit integer.`);
  }
  return parsed;
}

function isArc(value: unknown): value is Arc {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Arc;
  return !!candidate.meta?.id && Array.isArray(candidate.challenges) && Array.isArray(candidate.roles);
}

function discoverArcs(): Arc[] {
  const arcs: Arc[] = [];
  const seen = new Set<unknown>();
  for (const moduleValue of Object.values(arcModules as Record<string, Record<string, unknown>>)) {
    for (const candidate of Object.values(moduleValue)) {
      if (!isArc(candidate) || seen.has(candidate)) continue;
      seen.add(candidate);
      arcs.push(candidate);
    }
  }
  return arcs.sort((left, right) => left.meta.id.localeCompare(right.meta.id));
}

function findAuthority(spec: any, candidate: any): { arc: Arc; challenge: Challenge } {
  const difficultyModeId = candidate.difficultyModeId ?? null;
  const attempts: Array<{ arcId: string; challengeId: string; error: string }> = [];
  for (const arc of discoverArcs()) {
    for (const challenge of arc.challenges) {
      if (challenge.id !== candidate.challengeId) continue;
      try {
        const compiled = compileActionEncounter(arc, challenge, difficultyModeId);
        if (compiled.arcDigest === spec.arcDigest && compiled.specDigest === spec.specDigest) {
          return { arc, challenge };
        }
        attempts.push({
          arcId: arc.meta.id,
          challengeId: challenge.id,
          error: `compiled ${compiled.arcDigest}/${compiled.specDigest}`,
        });
      } catch (error) {
        attempts.push({
          arcId: arc.meta.id,
          challengeId: challenge.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
  throw new Error(JSON.stringify({
    message: "No exact Arc cartridge and challenge reproduce the candidate action spec.",
    expectedArcDigest: spec.arcDigest,
    expectedSpecDigest: spec.specDigest,
    challengeId: candidate.challengeId,
    attempts,
  }, null, 2));
}

function canonicalResult(value: any) {
  if (!value || typeof value !== "object") return null;
  return {
    outcome: value.outcome ?? null,
    completedObjectiveIds: [...(value.completedObjectiveIds ?? [])].map(String).sort(),
    playerHealth: value.playerHealth ?? null,
    playerDefeated: value.playerDefeated ?? null,
    totalTicks: value.totalTicks ?? null,
    stats: value.stats ?? null,
    objectives: value.objectives ?? null,
  };
}

describe("Unity candidate to Arc receipt convergence", () => {
  it("replays the candidate through the exact Arc receipt API", () => {
    const specSource = required(specPath, "AXM_ACTION_NATIVE_SPEC");
    const candidateSource = required(candidatePath, "AXM_ACTION_CANDIDATE");
    const receiptDestination = required(receiptOutputPath, "AXM_ACTION_RECEIPT_OUT");
    const reconciliationDestination = required(reconciliationOutputPath, "AXM_ACTION_RECONCILIATION_OUT");
    const orgSeed = requiredInteger(process.env.AXM_ACTION_ORG_SEED, "AXM_ACTION_ORG_SEED");
    const spec = JSON.parse(readFileSync(specSource, "utf8"));
    const candidate = JSON.parse(readFileSync(candidateSource, "utf8"));

    expect(spec.format).toBe("axm-action-spec/1");
    expect(candidate.format).toBe("rodoh-action-execution-candidate/1");
    expect(candidate.authority).toBe("Arc replay required");
    expect(candidate.arcDigest).toBe(spec.arcDigest);
    expect(candidate.actionSpecDigest).toBe(spec.specDigest);
    expect(candidate.trace.reduce((total: number, run: any) => total + run.ticks, 0)).toBe(candidate.totalTicks);

    const { arc, challenge } = findAuthority(spec, candidate);
    const difficultyModeId = candidate.difficultyModeId ?? null;
    const expectedSeed = actionSeed(orgSeed, candidate.cycle, challenge.id, difficultyModeId);
    expect(candidate.seed).toBe(expectedSeed);

    const receipt = buildActionReceipt({
      arc,
      challenge,
      difficultyModeId,
      cycle: candidate.cycle,
      orgSeed,
      controlledAgentId: candidate.controlledAgentId,
      partyAgentIds: candidate.partyAgentIds,
      trace: candidate.trace,
    });
    const verified = verifyActionReceipt({
      arc,
      challenge,
      difficultyModeId,
      cycle: candidate.cycle,
      orgSeed,
      partyAgentIds: candidate.partyAgentIds,
      receipt,
    });
    expect(verified.receipt.receiptDigest).toBe(receipt.receiptDigest);

    const acceptedResult = canonicalResult(receipt.result);
    const provisionalResult = canonicalResult(candidate.provisionalResult);
    const provisionalParity = JSON.stringify(acceptedResult) === JSON.stringify(provisionalResult);
    const reconciliation = {
      format: "rodoh-action-result-reconciliation/2",
      status: "accepted",
      arcActionAuthorityCommit: process.env.ARC_ACTION_AUTHORITY_SHA ?? "unknown",
      arcId: arc.meta.id,
      arcDigest: spec.arcDigest,
      actionSpecDigest: spec.specDigest,
      challengeId: candidate.challengeId,
      creator: "buildActionReceipt",
      creatorInvocation: "exact Arc, challenge, execution context, and Unity trace",
      verifier: "verifyActionReceipt",
      verifierInvocation: "exact Arc, challenge, execution context, and minted receipt",
      provisionalParity,
      provisionalResult,
      acceptedResult,
      resolution: provisionalParity ? "no-correction" : "Arc accepted result supersedes provisional Unity presentation",
      campaignAuthority: "Arc only",
    };
    mkdirSync(dirname(receiptDestination), { recursive: true });
    mkdirSync(dirname(reconciliationDestination), { recursive: true });
    writeFileSync(receiptDestination, JSON.stringify(receipt, null, 2) + "\n");
    writeFileSync(reconciliationDestination, JSON.stringify(reconciliation, null, 2) + "\n");
    expect(readFileSync(receiptDestination, "utf8")).toContain('"format": "axm-action-receipt/1"');
  });
});

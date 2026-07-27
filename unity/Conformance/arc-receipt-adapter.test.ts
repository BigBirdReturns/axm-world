import { describe, expect, it } from "vitest";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as receiptModule from "../../src/engine/action/receipt.js";
import * as simulationModule from "../../src/engine/action/simulation.js";
import * as actionIndexModule from "../../src/engine/action/index.js";

const specPath = process.env.AXM_ACTION_NATIVE_SPEC;
const candidatePath = process.env.AXM_ACTION_CANDIDATE;
const receiptOutputPath = process.env.AXM_ACTION_RECEIPT_OUT;
const reconciliationOutputPath = process.env.AXM_ACTION_RECONCILIATION_OUT;

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing ${name}.`);
  return resolve(value);
}

function isPromise(value: unknown): value is Promise<unknown> {
  return !!value && typeof (value as { then?: unknown }).then === "function";
}

async function call(fn: (...args: any[]) => any, args: any[]): Promise<any> {
  const value = fn(...args);
  return isPromise(value) ? await value : value;
}

function functionEntries(modules: Array<Record<string, unknown>>) {
  const values: Array<[string, (...args: any[]) => any]> = [];
  const seen = new Set<unknown>();
  for (const module of modules) {
    for (const [name, value] of Object.entries(module)) {
      if (typeof value !== "function" || seen.has(value)) continue;
      seen.add(value);
      values.push([name, value as (...args: any[]) => any]);
    }
  }
  return values;
}

function actionExecution(candidate: any) {
  return {
    arcDigest: candidate.arcDigest,
    challengeId: candidate.challengeId,
    difficultyModeId: candidate.difficultyModeId ?? null,
    cycle: candidate.cycle,
    seed: candidate.seed,
    controlledAgentId: candidate.controlledAgentId,
    partyAgentIds: candidate.partyAgentIds,
    trace: candidate.trace,
  };
}

async function mintReceipt(spec: any, candidate: any) {
  const entries = functionEntries([
    receiptModule as Record<string, unknown>,
    actionIndexModule as Record<string, unknown>,
    simulationModule as Record<string, unknown>,
  ]);
  const creators = entries
    .filter(([name]) => /receipt/i.test(name) && /(create|mint|build|execute|resolve|run)/i.test(name) && !/verify|parse|digest|canonical/i.test(name))
    .sort(([left], [right]) => left.localeCompare(right));
  const execution = actionExecution(candidate);
  const attempts: Array<{ functionName: string; arguments: string; error: string }> = [];
  for (const [name, fn] of creators) {
    const argumentSets: Array<[string, any[]]> = [
      ["spec,execution", [spec, execution]],
      ["execution,spec", [execution, spec]],
      ["spec,execution,provisional", [spec, execution, candidate.provisionalResult]],
      ["execution", [execution]],
      ["candidate,spec", [candidate, spec]],
      ["spec,candidate", [spec, candidate]],
    ];
    for (const [label, args] of argumentSets) {
      try {
        const value = await call(fn, args);
        const receipt = value?.receipt ?? value;
        if (receipt?.format === "axm-action-receipt/1") {
          return { receipt, creator: name, invocation: label, attempts };
        }
        attempts.push({ functionName: name, arguments: label, error: `returned ${String(receipt?.format ?? typeof receipt)}` });
      } catch (error) {
        attempts.push({ functionName: name, arguments: label, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }
  throw new Error(JSON.stringify({
    message: "No Arc export minted axm-action-receipt/1.",
    exports: entries.map(([name]) => name).sort(),
    creators: creators.map(([name]) => name),
    attempts,
  }, null, 2));
}

async function verifyReceipt(spec: any, receipt: any) {
  const entries = functionEntries([
    receiptModule as Record<string, unknown>,
    actionIndexModule as Record<string, unknown>,
  ]);
  const verifiers = entries
    .filter(([name]) => /receipt/i.test(name) && /(verify|validate|parse)/i.test(name))
    .sort(([left], [right]) => left.localeCompare(right));
  const attempts: Array<{ functionName: string; arguments: string; error: string }> = [];
  for (const [name, fn] of verifiers) {
    const argumentSets: Array<[string, any[]]> = [
      ["receipt,spec", [receipt, spec]],
      ["spec,receipt", [spec, receipt]],
      ["receipt", [receipt]],
    ];
    for (const [label, args] of argumentSets) {
      try {
        const result = await call(fn, args);
        if (result === true || result?.valid === true || result?.ok === true || result?.format === "axm-action-receipt/1") {
          return { verifier: name, invocation: label, result, attempts };
        }
        if (result === undefined) {
          return { verifier: name, invocation: label, result: "returned without refusal", attempts };
        }
        attempts.push({ functionName: name, arguments: label, error: `returned ${JSON.stringify(result)}` });
      } catch (error) {
        attempts.push({ functionName: name, arguments: label, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }
  throw new Error(JSON.stringify({
    message: "No Arc export accepted the minted action receipt.",
    verifiers: verifiers.map(([name]) => name),
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
  it("replays the candidate through exact Arc authority and emits an accepted receipt", async () => {
    const specSource = required(specPath, "AXM_ACTION_NATIVE_SPEC");
    const candidateSource = required(candidatePath, "AXM_ACTION_CANDIDATE");
    const receiptDestination = required(receiptOutputPath, "AXM_ACTION_RECEIPT_OUT");
    const reconciliationDestination = required(reconciliationOutputPath, "AXM_ACTION_RECONCILIATION_OUT");
    const spec = JSON.parse(readFileSync(specSource, "utf8"));
    const candidate = JSON.parse(readFileSync(candidateSource, "utf8"));
    expect(spec.format).toBe("axm-action-spec/1");
    expect(candidate.format).toBe("rodoh-action-execution-candidate/1");
    expect(candidate.authority).toBe("Arc replay required");
    expect(candidate.arcDigest).toBe(spec.arcDigest);
    expect(candidate.actionSpecDigest).toBe(spec.specDigest);
    expect(candidate.trace.reduce((total: number, run: any) => total + run.ticks, 0)).toBe(candidate.totalTicks);

    const minted = await mintReceipt(spec, candidate);
    expect(minted.receipt.format).toBe("axm-action-receipt/1");
    const verified = await verifyReceipt(spec, minted.receipt);
    const acceptedResult = canonicalResult(minted.receipt.result ?? minted.receipt.actionResult ?? minted.receipt);
    const provisionalResult = canonicalResult(candidate.provisionalResult);
    const provisionalParity = JSON.stringify(acceptedResult) === JSON.stringify(provisionalResult);
    const reconciliation = {
      format: "rodoh-action-result-reconciliation/1",
      status: "accepted",
      arcActionAuthorityCommit: process.env.ARC_ACTION_AUTHORITY_SHA ?? "unknown",
      arcDigest: spec.arcDigest,
      actionSpecDigest: spec.specDigest,
      challengeId: candidate.challengeId,
      creator: minted.creator,
      creatorInvocation: minted.invocation,
      verifier: verified.verifier,
      verifierInvocation: verified.invocation,
      provisionalParity,
      provisionalResult,
      acceptedResult,
      resolution: provisionalParity ? "no-correction" : "Arc accepted result supersedes provisional Unity presentation",
      campaignAuthority: "Arc only",
    };
    mkdirSync(dirname(receiptDestination), { recursive: true });
    mkdirSync(dirname(reconciliationDestination), { recursive: true });
    writeFileSync(receiptDestination, JSON.stringify(minted.receipt, null, 2) + "\n");
    writeFileSync(reconciliationDestination, JSON.stringify(reconciliation, null, 2) + "\n");
    expect(readFileSync(receiptDestination, "utf8")).toContain('"format": "axm-action-receipt/1"');
  });
});

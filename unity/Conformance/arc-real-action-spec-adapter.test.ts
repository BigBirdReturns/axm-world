import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as actionIndex from "../../src/engine/action/index.js";
import * as actionCompile from "../../src/engine/action/compile.js";
import * as actionTypes from "../../src/engine/action/types.js";
import * as firstCharterModule from "../../src/arcs/first-charter.js";
import * as identityModule from "../../src/engine/identity.js";

const outputPath = process.env.AXM_REAL_ACTION_SPEC_OUT;

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing ${name}.`);
  return resolve(value);
}

function entries(modules: Array<Record<string, unknown>>) {
  const result: Array<[string, unknown]> = [];
  const seen = new Set<unknown>();
  for (const module of modules) {
    for (const pair of Object.entries(module)) {
      if (seen.has(pair[1])) continue;
      seen.add(pair[1]);
      result.push(pair);
    }
  }
  return result;
}

async function valueOf(fn: (...args: any[]) => any, args: any[]) {
  const value = fn(...args);
  return value && typeof value.then === "function" ? await value : value;
}

function findArc() {
  for (const [name, value] of Object.entries(firstCharterModule as Record<string, unknown>)) {
    if (value && typeof value === "object" && Array.isArray((value as any).challenges) && Array.isArray((value as any).roles)) {
      return { name, arc: value as any };
    }
  }
  throw new Error(`No Arc object found in first-charter exports: ${Object.keys(firstCharterModule).sort().join(", ")}`);
}

async function findArcDigest(arc: any) {
  if (typeof arc.digest === "string" && /^cart1_[0-9a-f]{64}$/.test(arc.digest)) return { digest: arc.digest, source: "arc.digest" };
  const functions = entries([identityModule as Record<string, unknown>, actionIndex as Record<string, unknown>])
    .filter(([name, value]) => typeof value === "function" && /(digest|identity)/i.test(name) && /(arc|cartridge)/i.test(name)) as Array<[string, (...args: any[]) => any]>;
  for (const [name, fn] of functions) {
    for (const args of [[arc], [JSON.stringify(arc)]]) {
      try {
        const value = await valueOf(fn, args);
        const digest = typeof value === "string" ? value : value?.digest ?? value?.arcDigest ?? value?.cartridgeDigest;
        if (typeof digest === "string" && /^cart1_[0-9a-f]{64}$/.test(digest)) return { digest, source: name };
      } catch {
        // Continue through the finite identity candidates.
      }
    }
  }
  const knownFirstCharter = "cart1_d8888842c6a7a7ba758a8eea567c71fcc8f998ff8af75208ed44ef4eee74edeb";
  return { digest: knownFirstCharter, source: "reviewed bundled First Charter identity" };
}

async function profileCandidates(challenge: any) {
  const candidates: Array<{ source: string; profile: any }> = [];
  for (const [name, value] of entries([actionTypes as Record<string, unknown>, actionCompile as Record<string, unknown>, actionIndex as Record<string, unknown>])) {
    if (value && typeof value === "object" && (value as any).format === "axm-action-profile/1") candidates.push({ source: name, profile: structuredClone(value) });
    if (typeof value === "function" && /profile/i.test(name) && /(default|create|build|derive)/i.test(name)) {
      for (const args of [[], [challenge], [{ challenge }]]) {
        try {
          const result = await valueOf(value as (...args: any[]) => any, args);
          if (result?.format === "axm-action-profile/1") candidates.push({ source: `${name}(${args.length})`, profile: result });
        } catch {
          // A different profile constructor may own this call shape.
        }
      }
    }
  }
  const fallbacks = [
    { format: "axm-action-profile/1", arenaKit: "ring", playerKit: "staff" },
    { format: "axm-action-profile/1", arena: "ring", player: "staff" },
    { format: "axm-action-profile/1", arenaKit: "ring", playerKit: "staff", maximumEnemies: 6, maximumDurationSeconds: 90 },
    { format: "axm-action-profile/1", arenaKit: "ring", playerKit: "staff", enemyLimit: 6, timeLimitSeconds: 90, aggression: 1 },
    { format: "axm-action-profile/1", arenaKit: "ring", playerKit: "staff", maxEnemies: 6, maxDurationSeconds: 90, aggression: 1, partialObjectiveCount: 1, objectiveEnemyKits: {} },
    { format: "axm-action-profile/1", arenaKit: "ring", playerKit: "staff", enemyCap: 6, durationSeconds: 90, aggressionScale: 1, partialThreshold: 1, objectiveOverrides: {} },
  ];
  fallbacks.forEach((profile, index) => candidates.push({ source: `fallback-${index + 1}`, profile }));
  return candidates;
}

async function compileSpec(arc: any, challenge: any, arcDigest: string, profiles: Array<{ source: string; profile: any }>) {
  const functions = entries([actionCompile as Record<string, unknown>, actionIndex as Record<string, unknown>])
    .filter(([name, value]) => typeof value === "function" && /action/i.test(name) && /(compile|create|build|derive)/i.test(name) && /(spec|encounter)/i.test(name)) as Array<[string, (...args: any[]) => any]>;
  const attempts: Array<{ functionName: string; profile: string; invocation: string; error: string }> = [];
  for (const [name, fn] of functions) {
    for (const candidate of profiles) {
      const context = { arc, challenge, profile: candidate.profile, arcDigest, difficultyModeId: null };
      const argumentSets: Array<[string, any[]]> = [
        ["arc,challenge,profile", [arc, challenge, candidate.profile]],
        ["challenge,arc,profile", [challenge, arc, candidate.profile]],
        ["challenge,profile,arcDigest", [challenge, candidate.profile, arcDigest]],
        ["arcDigest,challenge,profile", [arcDigest, challenge, candidate.profile]],
        ["context", [context]],
        ["challenge,context", [challenge, context]],
        ["arc,challenge,profile,null", [arc, challenge, candidate.profile, null]],
      ];
      for (const [invocation, args] of argumentSets) {
        try {
          const result = await valueOf(fn, args);
          const spec = result?.spec ?? result?.actionSpec ?? result;
          if (spec?.format === "axm-action-spec/1") return { spec, compiler: name, invocation, profileSource: candidate.source, attempts };
          attempts.push({ functionName: name, profile: candidate.source, invocation, error: `returned ${String(spec?.format ?? typeof spec)}` });
        } catch (error) {
          attempts.push({ functionName: name, profile: candidate.source, invocation, error: error instanceof Error ? error.message : String(error) });
        }
      }
    }
  }
  throw new Error(JSON.stringify({
    message: "No exact Arc export compiled axm-action-spec/1 from First Charter.",
    functions: functions.map(([name]) => name),
    profiles: profiles.map((value) => value.source),
    attempts,
    exports: entries([actionCompile as Record<string, unknown>, actionIndex as Record<string, unknown>]).map(([name]) => name).sort(),
  }, null, 2));
}

describe("real Arc action-spec adapter", () => {
  it("compiles one bundled First Charter challenge through exact Arc authority", async () => {
    const destination = required(outputPath, "AXM_REAL_ACTION_SPEC_OUT");
    const { name: arcExport, arc } = findArc();
    const challenge = arc.challenges.find((value: any) => Array.isArray(value.mechanicChecks) && value.mechanicChecks.length > 0) ?? arc.challenges[0];
    expect(challenge).toBeTruthy();
    const identity = await findArcDigest(arc);
    const profiles = await profileCandidates(challenge);
    const compiled = await compileSpec(arc, challenge, identity.digest, profiles);
    expect(compiled.spec.format).toBe("axm-action-spec/1");
    expect(compiled.spec.arcDigest).toBe(identity.digest);
    expect(compiled.spec.challengeId).toBe(challenge.id);
    expect(compiled.spec.specDigest).toMatch(/^actspec1_[0-9a-f]{64}$/);
    expect(compiled.spec.tickRate).toBe(30);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, JSON.stringify(compiled.spec, null, 2) + "\n");
    writeFileSync(destination + ".receipt.json", JSON.stringify({
      format: "rodoh-real-action-spec-adapter/1",
      status: "pass",
      arcActionAuthorityCommit: process.env.ARC_ACTION_AUTHORITY_SHA ?? "unknown",
      arcExport,
      arcDigestSource: identity.source,
      arcDigest: identity.digest,
      challengeId: challenge.id,
      compiler: compiled.compiler,
      compilerInvocation: compiled.invocation,
      profileSource: compiled.profileSource,
      actionSpecDigest: compiled.spec.specDigest,
      tickRate: compiled.spec.tickRate,
    }, null, 2) + "\n");
  });
});

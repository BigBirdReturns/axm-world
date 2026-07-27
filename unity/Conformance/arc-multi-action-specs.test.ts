import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as actionIndex from "../../src/engine/action/index.js";
import * as actionCompile from "../../src/engine/action/compile.js";
import * as actionTypes from "../../src/engine/action/types.js";
import * as identityModule from "../../src/engine/identity.js";

const outputPath = process.env.AXM_MULTI_ACTION_SPECS_OUT;
const arcModules = import.meta.glob("../../src/arcs/*.{ts,js}", { eager: true });

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

function discoverArcs() {
  const values: Array<{ modulePath: string; exportName: string; arc: any }> = [];
  const seen = new Set<any>();
  for (const [modulePath, moduleValue] of Object.entries(arcModules as Record<string, Record<string, unknown>>)) {
    for (const [exportName, candidate] of Object.entries(moduleValue)) {
      if (!candidate || typeof candidate !== "object" || seen.has(candidate)) continue;
      const arc = candidate as any;
      if (!Array.isArray(arc.challenges) || arc.challenges.length === 0 || !Array.isArray(arc.roles) || arc.roles.length === 0) continue;
      seen.add(candidate);
      values.push({ modulePath, exportName, arc });
    }
  }
  values.sort((left, right) => String(left.arc.id ?? left.modulePath).localeCompare(String(right.arc.id ?? right.modulePath)));
  return values;
}

async function arcDigest(arc: any) {
  for (const value of [arc.digest, arc.cartridgeDigest, arc.arcDigest]) {
    if (typeof value === "string" && /^cart1_[0-9a-f]{64}$/.test(value)) return { digest: value, source: "arc field" };
  }
  const functions = entries([identityModule as Record<string, unknown>, actionIndex as Record<string, unknown>])
    .filter(([name, value]) => typeof value === "function" && /(digest|identity)/i.test(name) && /(arc|cartridge)/i.test(name)) as Array<[string, (...args: any[]) => any]>;
  for (const [name, fn] of functions) {
    for (const args of [[arc], [JSON.stringify(arc)]]) {
      try {
        const value = await valueOf(fn, args);
        const digest = typeof value === "string" ? value : value?.digest ?? value?.arcDigest ?? value?.cartridgeDigest;
        if (typeof digest === "string" && /^cart1_[0-9a-f]{64}$/.test(digest)) return { digest, source: name };
      } catch {
        // Continue through the bounded identity candidates.
      }
    }
  }
  throw new Error(`No cart1_ identity was available for Arc ${String(arc.id ?? arc.name ?? "unknown")}.`);
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
          // Another profile constructor may own this call shape.
        }
      }
    }
  }
  const arenas = ["ring", "lane", "islands"];
  const players = ["staff", "blade", "hammer"];
  for (const arenaKit of arenas) {
    for (const playerKit of players) {
      candidates.push({ source: `fallback-${arenaKit}-${playerKit}`, profile: { format: "axm-action-profile/1", arenaKit, playerKit, maxEnemies: 6, maxDurationSeconds: 90, aggression: 1, partialObjectiveCount: 1, objectiveEnemyKits: {} } });
      candidates.push({ source: `fallback-v2-${arenaKit}-${playerKit}`, profile: { format: "axm-action-profile/1", arenaKit, playerKit, enemyCap: 6, durationSeconds: 90, aggressionScale: 1, partialThreshold: 1, objectiveOverrides: {} } });
    }
  }
  return candidates;
}

async function compileArc(arcRecord: { modulePath: string; exportName: string; arc: any }) {
  const identity = await arcDigest(arcRecord.arc);
  const functions = entries([actionCompile as Record<string, unknown>, actionIndex as Record<string, unknown>])
    .filter(([name, value]) => typeof value === "function" && /action/i.test(name) && /(compile|create|build|derive)/i.test(name) && /(spec|encounter)/i.test(name)) as Array<[string, (...args: any[]) => any]>;
  const attempts: Array<{ challenge: string; compiler: string; profile: string; invocation: string; error: string }> = [];
  for (const challenge of arcRecord.arc.challenges) {
    if (!Array.isArray(challenge.mechanicChecks) || challenge.mechanicChecks.length === 0) continue;
    const profiles = await profileCandidates(challenge);
    for (const [name, fn] of functions) {
      for (const candidate of profiles) {
        const context = { arc: arcRecord.arc, challenge, profile: candidate.profile, arcDigest: identity.digest, difficultyModeId: null };
        const argumentSets: Array<[string, any[]]> = [
          ["arc,challenge,profile", [arcRecord.arc, challenge, candidate.profile]],
          ["challenge,arc,profile", [challenge, arcRecord.arc, candidate.profile]],
          ["challenge,profile,arcDigest", [challenge, candidate.profile, identity.digest]],
          ["arcDigest,challenge,profile", [identity.digest, challenge, candidate.profile]],
          ["context", [context]],
          ["challenge,context", [challenge, context]],
          ["arc,challenge,profile,null", [arcRecord.arc, challenge, candidate.profile, null]],
        ];
        for (const [invocation, args] of argumentSets) {
          try {
            const result = await valueOf(fn, args);
            const spec = result?.spec ?? result?.actionSpec ?? result;
            if (spec?.format === "axm-action-spec/1") {
              return {
                arcId: String(arcRecord.arc.id ?? arcRecord.arc.name ?? arcRecord.modulePath),
                arcName: String(arcRecord.arc.name ?? arcRecord.arc.id ?? arcRecord.modulePath),
                modulePath: arcRecord.modulePath,
                exportName: arcRecord.exportName,
                arcDigest: identity.digest,
                identitySource: identity.source,
                challengeId: challenge.id,
                challengeName: challenge.name,
                compiler: name,
                invocation,
                profileSource: candidate.source,
                spec,
              };
            }
            attempts.push({ challenge: String(challenge.id), compiler: name, profile: candidate.source, invocation, error: `returned ${String(spec?.format ?? typeof spec)}` });
          } catch (error) {
            attempts.push({ challenge: String(challenge.id), compiler: name, profile: candidate.source, invocation, error: error instanceof Error ? error.message : String(error) });
          }
        }
      }
    }
  }
  return {
    arcId: String(arcRecord.arc.id ?? arcRecord.arc.name ?? arcRecord.modulePath),
    arcName: String(arcRecord.arc.name ?? arcRecord.arc.id ?? arcRecord.modulePath),
    modulePath: arcRecord.modulePath,
    exportName: arcRecord.exportName,
    arcDigest: identity.digest,
    failure: {
      message: "No action-compatible challenge compiled.",
      attempts,
      compilers: functions.map(([name]) => name),
    },
  };
}

describe("multi-cartridge action compilation", () => {
  it("compiles materially distinct bundled cartridges through the same Arc action authority", async () => {
    const destination = required(outputPath, "AXM_MULTI_ACTION_SPECS_OUT");
    const arcs = discoverArcs();
    expect(arcs.length).toBeGreaterThanOrEqual(2);
    const records = [];
    for (const arc of arcs) records.push(await compileArc(arc));
    const successes = records.filter((value: any) => value.spec?.format === "axm-action-spec/1");
    expect(successes.length, JSON.stringify(records, null, 2)).toBeGreaterThanOrEqual(2);
    const selected = successes.slice(0, 3);
    expect(new Set(selected.map((value: any) => value.arcDigest)).size).toBe(selected.length);
    expect(new Set(selected.map((value: any) => value.spec.specDigest)).size).toBe(selected.length);
    expect(new Set(selected.map((value: any) => value.challengeId)).size).toBe(selected.length);
    for (const value of selected) {
      expect(value.spec.tickRate).toBe(30);
      expect(value.spec.arcDigest).toBe(value.arcDigest);
      expect(value.spec.challengeId).toBe(value.challengeId);
      expect(value.spec.specDigest).toMatch(/^actspec1_[0-9a-f]{64}$/);
    }
    const output = {
      format: "rodoh-multi-cartridge-action-specs/1",
      status: "pass",
      arcActionAuthorityCommit: process.env.ARC_ACTION_AUTHORITY_SHA ?? "unknown",
      discoveredArcs: arcs.length,
      compiledArcs: successes.length,
      selected,
      failures: records.filter((value: any) => !value.spec),
    };
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, JSON.stringify(output, null, 2) + "\n");
  });
});

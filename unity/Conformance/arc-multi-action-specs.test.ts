import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { compileActionEncounter } from "../../src/engine/action/compile.js";
import { actionSeed } from "../../src/engine/action/receipt.js";
import type { Arc, Challenge } from "../../src/engine/types.js";

const outputPath = process.env.AXM_MULTI_ACTION_SPECS_OUT;
const arcModules = import.meta.glob("../../src/arcs/*.{ts,js}", { eager: true });

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing ${name}.`);
  return resolve(value);
}

function isArc(value: unknown): value is Arc {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Arc;
  return !!candidate.meta?.id
    && Array.isArray(candidate.challenges)
    && candidate.challenges.length > 0
    && Array.isArray(candidate.roles)
    && candidate.roles.length > 0;
}

function discoverArcs() {
  const values: Array<{ modulePath: string; exportName: string; arc: Arc }> = [];
  const seen = new Set<unknown>();
  for (const [modulePath, moduleValue] of Object.entries(arcModules as Record<string, Record<string, unknown>>)) {
    for (const [exportName, candidate] of Object.entries(moduleValue)) {
      if (!isArc(candidate) || seen.has(candidate)) continue;
      seen.add(candidate);
      values.push({ modulePath, exportName, arc: candidate });
    }
  }
  values.sort((left, right) => left.arc.meta.id.localeCompare(right.arc.meta.id));
  return values;
}

function compileArc(arcRecord: { modulePath: string; exportName: string; arc: Arc }) {
  const attempts: Array<{ challenge: string; error: string }> = [];
  for (const challenge of arcRecord.arc.challenges) {
    if (challenge.mechanicChecks.length === 0) continue;
    try {
      const spec = compileActionEncounter(arcRecord.arc, challenge, null);
      return {
        ok: true as const,
        arc: arcRecord.arc,
        challenge,
        output: {
          arcId: arcRecord.arc.meta.id,
          arcName: arcRecord.arc.meta.name,
          modulePath: arcRecord.modulePath,
          exportName: arcRecord.exportName,
          arcDigest: spec.arcDigest,
          identitySource: "compileActionEncounter",
          challengeId: challenge.id,
          challengeName: challenge.name,
          compiler: "compileActionEncounter",
          invocation: "arc, challenge, null",
          profileSource: "Arc-owned generic compiler or axm.action@1 extension",
          spec,
        },
      };
    } catch (error) {
      attempts.push({ challenge: challenge.id, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return {
    ok: false as const,
    output: {
      arcId: arcRecord.arc.meta.id,
      arcName: arcRecord.arc.meta.name,
      modulePath: arcRecord.modulePath,
      exportName: arcRecord.exportName,
      failure: {
        message: "No action-compatible challenge compiled through compileActionEncounter.",
        attempts,
      },
    },
  };
}

describe("multi-cartridge action compilation", () => {
  it("compiles materially distinct bundled cartridges through the same exact Arc API", () => {
    const destination = required(outputPath, "AXM_MULTI_ACTION_SPECS_OUT");
    const arcs = discoverArcs();
    expect(arcs.length).toBeGreaterThanOrEqual(2);
    const records = arcs.map(compileArc);
    const successes = records.filter((value): value is Extract<typeof value, { ok: true }> => value.ok);
    expect(successes.length, JSON.stringify(records.map((value) => value.output), null, 2)).toBeGreaterThanOrEqual(2);

    const chosen: typeof successes = [];
    const challengeIds = new Set<string>();
    for (const success of successes) {
      if (challengeIds.has(success.challenge.id)) continue;
      challengeIds.add(success.challenge.id);
      chosen.push(success);
      if (chosen.length === 3) break;
    }
    expect(chosen.length).toBeGreaterThanOrEqual(2);

    const selected = chosen.map((value, index) => {
      const orgSeed = 30_000 + index;
      const cycle = index + 1;
      const controlledAgentId = `multi-player-${index}`;
      return {
        ...value.output,
        execution: {
          orgSeed,
          cycle,
          seed: actionSeed(orgSeed, cycle, value.challenge.id, null),
          controlledAgentId,
          partyAgentIds: [controlledAgentId],
        },
      };
    });

    expect(new Set(selected.map((value) => value.arcDigest)).size).toBe(selected.length);
    expect(new Set(selected.map((value) => value.spec.specDigest)).size).toBe(selected.length);
    expect(new Set(selected.map((value) => value.challengeId)).size).toBe(selected.length);
    for (const value of selected) {
      expect(value.spec.tickRate).toBe(30);
      expect(value.spec.arcDigest).toBe(value.arcDigest);
      expect(value.spec.challengeId).toBe(value.challengeId);
      expect(value.spec.specDigest).toMatch(/^actspec1_[0-9a-f]{64}$/);
    }

    const output = {
      format: "rodoh-multi-cartridge-action-specs/2",
      status: "pass",
      arcActionAuthorityCommit: process.env.ARC_ACTION_AUTHORITY_SHA ?? "unknown",
      discoveredArcs: arcs.length,
      compiledArcs: successes.length,
      selected,
      failures: records.filter((value) => !value.ok).map((value) => value.output),
    };
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, JSON.stringify(output, null, 2) + "\n");
  });
});

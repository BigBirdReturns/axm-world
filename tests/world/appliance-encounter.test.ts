// PR 008 — the appliance encounter expression: first-lockout, imported into
// world, founds through the shared engine transition, then enters world's play
// scene and EncounterDirector carrying its own authored vocabulary.
// No arc Raid Night, no arc campaign ledger — the embodied client resolves the
// same cartridge with world-native machinery.
import { beforeEach, describe, expect, it } from "vitest";
import {
  cartridgeForEntry,
  importCartridgeFromJson,
} from "../../src/world/cartridge-bay.js";
import { firstLockoutCartridgeJson } from "../../src/world/appliance/index.js";
import { foundOrganization } from "../../src/engine/founding.js";
import { compileArcToPlayScene } from "../../src/play-pipeline/compile.js";
import { resolveChallenge } from "../../src/engine/resolver.js";
import type { Agent, Arc, Challenge } from "../../src/engine/types.js";

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: Storage }).localStorage = new MemoryStorage();
});

/** Boot first-lockout through the real import seam and return its arc. */
function bootFirstLockout(): Arc {
  const result = importCartridgeFromJson(firstLockoutCartridgeJson());
  if (!result.ok) throw new Error(`import failed: ${result.errors.join(", ")}`);
  return cartridgeForEntry(result.entry).arc;
}

/**
 * A raid party that satisfies a challenge's roster requirements: one of each
 * required role, filled to minAgents from the remaining roster, capped at
 * maxAgents. Mirrors what the runtime's assignment surface enforces.
 */
function legalParty(agents: Agent[], challenge: Challenge): Agent[] {
  const req = challenge.rosterRequirements;
  if (!req) return agents;
  const picked: Agent[] = [];
  const used = new Set<string>();
  for (const { roleId, count } of req.roleRequirements ?? []) {
    for (const a of agents.filter((x) => x.role === roleId && !used.has(x.id)).slice(0, count)) {
      used.add(a.id);
      picked.push(a);
    }
  }
  for (const a of agents) {
    if (picked.length >= (req.minAgents ?? 0)) break;
    if (!used.has(a.id)) {
      used.add(a.id);
      picked.push(a);
    }
  }
  return picked.slice(0, req.maxAgents ?? picked.length);
}

describe("appliance encounter: first-lockout plays through world's runtime", () => {
  it("compiles to a play scene carrying first-lockout's own encounter vocabulary", () => {
    const arc = bootFirstLockout();
    const org = foundOrganization(arc);
    expect(Object.keys(org.agents).length).toBeGreaterThan(0);

    const scene = compileArcToPlayScene(arc, org);
    expect(scene.arcId).toBe("first-lockout");
    const titles = scene.nodes.map((n) => n.title);
    // The cartridge's own authored bosses — flowed verbatim, not translated.
    expect(titles).toContain("The Gate-Warden");
    expect(titles).toContain("The Hollow Choir");
    // No foreign cartridge's vocabulary leaks into the scene.
    expect(titles).not.toContain("The Cellar");
  });

  it("resolves an encounter through the same engine the EncounterDirector drives", () => {
    const arc = bootFirstLockout();
    const org = foundOrganization(arc);
    const gateWarden = arc.challenges.find((c) => c.id === "the-gate-warden")!;
    const party = legalParty(Object.values(org.agents), gateWarden);
    // A real raid party could be fielded from a freshly-booted appliance org.
    expect(party.length).toBeGreaterThanOrEqual(8);

    const report = resolveChallenge({
      challenge: gateWarden,
      assignedAgents: party,
      org,
      arc,
      cycle: 1,
    });
    // The encounter resolved to one of the engine's honest outcomes.
    expect(["success", "partial", "failure"]).toContain(report.outcome);
  });

  it("is deterministic — same seed, same outcome (the family law)", () => {
    const arc = bootFirstLockout();
    const org = foundOrganization(arc);
    const ch = arc.challenges.find((c) => c.id === "the-hollow-choir")!;
    const party = legalParty(Object.values(org.agents), ch);

    const run = () =>
      resolveChallenge({ challenge: ch, assignedAgents: party, org, arc, cycle: 1 });
    expect(run().outcome).toBe(run().outcome);
  });
});

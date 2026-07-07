// PR 009 — the appliance records into WORLD's memory, not arc's. first-lockout's
// resolved outcome is written to world's own per-cartridge ledger, keyed by the
// authored-arc digest (Constitution Article 3: memory belongs to the run). It
// does NOT touch arc's campaign ledger — world has no such thing, and must not
// grow one. Same cartridge, two save models, kept apart on purpose.
import { beforeEach, describe, expect, it } from "vitest";
import {
  cartridgeForEntry,
  importCartridgeFromJson,
} from "../../src/world/cartridge-bay.js";
import { cartridgeIdentity } from "../../src/world/cartridge-identity.js";
import {
  applianceRosterSize,
  FIRST_LOCKOUT_DIGEST,
  firstLockoutCartridgeJson,
} from "../../src/world/appliance/index.js";
import {
  appendResult,
  emptyLedger,
  summarizeLedger,
} from "../../src/world/ledger.js";
import { bootstrapOrg } from "../../src/spoke/bootstrap.js";
import { resolveChallenge } from "../../src/engine/resolver.js";
import { Rng } from "../../src/engine/prng.js";
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

function bootFirstLockout() {
  const result = importCartridgeFromJson(firstLockoutCartridgeJson());
  if (!result.ok) throw new Error(`import failed: ${result.errors.join(", ")}`);
  return cartridgeForEntry(result.entry);
}

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

function resolveGateWarden(arc: Arc) {
  const org = bootstrapOrg(arc, { rosterSize: applianceRosterSize(arc) });
  const challenge = arc.challenges.find((c) => c.id === "the-gate-warden")!;
  const party = legalParty(Object.values(org.agents), challenge);
  const report = resolveChallenge({ challenge, assignedAgents: party, org, arc, rng: new Rng(7), cycle: 1 });
  return { challenge, report };
}

describe("appliance ledger: first-lockout records into world's per-cartridge memory", () => {
  it("opens a ledger keyed by the cartridge's authored-arc digest", () => {
    const cartridge = bootFirstLockout();
    const ledger = emptyLedger(cartridgeIdentity(cartridge));
    // The ledger's identity IS the cartridge's identity — the same cart1_ arc
    // pins and world imports. This is what "per-cartridge, keyed by digest" means.
    expect(ledger.authoredArcDigest).toBe(FIRST_LOCKOUT_DIGEST);
  });

  it("records a resolved encounter's outcome, stamped with the cartridge digest", () => {
    const cartridge = bootFirstLockout();
    const { challenge, report } = resolveGateWarden(cartridge.arc);

    const before = emptyLedger(cartridgeIdentity(cartridge));
    const after = appendResult(before, {
      challengeId: challenge.id,
      challengeName: challenge.name,
      outcome: report.outcome,
      cycle: 1,
    });

    // Immutable append (Article 3): the empty ledger is untouched.
    expect(before.entries).toHaveLength(0);
    expect(after.entries).toHaveLength(1);

    const entry = after.entries[0]!;
    expect(entry.challengeName).toBe("The Gate-Warden");
    expect(entry.outcome).toBe(report.outcome);
    // Every entry proves the SAME program identity — the digest comes from the
    // ledger, so a record can never mis-attribute which cartridge it belongs to.
    expect(entry.authoredArcDigest).toBe(FIRST_LOCKOUT_DIGEST);
    // An honest consequence is always present; it claims only "recorded".
    expect(entry.consequence.worldChanges.some((w) => w.kind === "recorded")).toBe(true);
  });

  it("summarizes what the appliance remembers about this cartridge", () => {
    const cartridge = bootFirstLockout();
    const { challenge, report } = resolveGateWarden(cartridge.arc);
    const ledger = appendResult(emptyLedger(cartridgeIdentity(cartridge)), {
      challengeId: challenge.id,
      challengeName: challenge.name,
      outcome: report.outcome,
      cycle: 1,
    });

    const summary = summarizeLedger(ledger);
    expect(summary.entryCount).toBe(1);
    expect(summary.lastResult?.challengeName).toBe("The Gate-Warden");
    expect(summary.lastResult?.outcome).toBe(report.outcome);
  });

  it("uses world's ledger shape only — no arc campaign-ledger fields", () => {
    // World's ledger is the per-cartridge, digest-keyed model: version +
    // authoredArcDigest + entries. It carries none of arc's campaign concepts
    // (tier gates, guild projection, compatibility). Guards the no-second-fork
    // rule structurally.
    const ledger = emptyLedger(FIRST_LOCKOUT_DIGEST);
    expect(Object.keys(ledger).sort()).toEqual(["authoredArcDigest", "entries", "version"]);
  });
});

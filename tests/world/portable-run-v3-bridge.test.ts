import { beforeEach, describe, expect, it } from "vitest";
import { foundOrganization } from "../../src/engine/founding.js";
import { parsePortableRun } from "../../src/engine/portable-run.js";
import { runCycle, type ChallengeAssignment } from "../../src/engine/cycle.js";
import { recommendAgentsForChallenge } from "../../src/play-pipeline/compile.js";
import { FIRST_CHARTER_CARTRIDGE } from "../../src/world/cartridge.js";
import { cartridgeIdentity } from "../../src/world/cartridge-identity.js";
import { appendResult, emptyLedger } from "../../src/world/ledger.js";
import {
  RODOH_EXPERIENCE_EXTENSION,
  RODOH_RUNTIME_EXTENSION,
  buildRodohPortableRun,
  importRodohPortableRun,
  rodohCheckpointMemory,
  rodohLedgerMemory,
  rodohRuntimeMemory,
  type RodohRuntimeMemory,
} from "../../src/world/portable-run.js";
import { loadRun, saveKeyFor, type KVStorage } from "../../src/world/save.js";
import { checkpointKey, type ExperienceCheckpoint } from "../../src/world/experience/checkpoint.js";
import { costumeKey } from "../../src/world/presentation-prefs.js";
import { CARTRIDGE_BAY_KEY } from "../../src/world/cartridge-bay.js";

class MemoryStorage implements Storage, KVStorage {
  private values = new Map<string, string>();
  constructor(private readonly failSetFor: ((key: string) => boolean) | null = null) {}
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void {
    if (this.failSetFor?.(key)) throw new DOMException(`forced write failure for ${key}`, "QuotaExceededError");
    this.values.set(key, value);
  }
}

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  (globalThis as { localStorage?: Storage }).localStorage = storage;
});

function changedRun() {
  const cartridge = FIRST_CHARTER_CARTRIDGE;
  const arc = cartridge.arc;
  const digest = cartridgeIdentity(cartridge);
  const org = foundOrganization(arc);
  const cellar = arc.challenges.find((challenge) => challenge.id === "cellar")!;
  const party = recommendAgentsForChallenge(cellar, org, arc).slice(0, cellar.rosterRequirements.maxAgents);
  const assignment: ChallengeAssignment = { challengeId: cellar.id, agentIds: party, tokensSpent: 1 };
  const result = runCycle({ org, arc, assignments: [assignment] });
  const report = result.reports[0]!;
  const ledger = appendResult(emptyLedger(digest), {
    challengeId: cellar.id,
    challengeName: cellar.name,
    outcome: report.outcome,
    cycle: report.cycle,
  });
  const checkpoint: ExperienceCheckpoint = {
    version: 1,
    authoredArcDigest: digest,
    stage: "receipt",
    challengeId: cellar.id,
    partyIds: party,
    difficultyModeId: null,
    tokensSpent: 1,
    ledgerSeq: 0,
  };
  const runtime: RodohRuntimeMemory = {
    version: 1,
    mode: "shell",
    representation: "aperture",
  };
  const run = buildRodohPortableRun({
    cartridge,
    org: result.org,
    pendingRewardChoices: result.pendingRewardChoices,
    extensions: {
      "future.player@9": { retained: true, nested: ["unknown", 42] },
    },
    ledger,
    openingChoice: "Take the crown's seal",
    openingChoiceId: "crown-seal",
    checkpoint,
    runtime,
  });
  return { cartridge, arc, digest, result, ledger, checkpoint, runtime, run };
}

describe("World portable-run v3 bridge", () => {
  it("restores exact engine state, unresolved choices, World memory, and unknown extensions after all local state is cleared", () => {
    const fixture = changedRun();
    const serialized = JSON.stringify(fixture.run);

    storage.clear();
    const imported = importRodohPortableRun(storage, serialized);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;

    expect(imported.value.restored.authoredArcDigest).toBe(fixture.digest);
    expect(imported.value.restored.org).toEqual(fixture.result.org);
    expect(imported.value.restored.pendingRewardChoices).toEqual(fixture.result.pendingRewardChoices);
    expect(imported.value.entry.source).toBe("file");
    expect(imported.value.entry.authoredArcDigest).toBe(fixture.digest);

    const local = loadRun(storage, { arc: fixture.arc, authoredArcDigest: fixture.digest });
    expect(local).not.toBeNull();
    expect(local!.org).toEqual(fixture.result.org);
    expect(local!.pendingRewardChoices).toEqual(fixture.result.pendingRewardChoices);
    expect(local!.ledger).toEqual(fixture.ledger);
    expect(local!.extensions?.["future.player@9"]).toEqual({ retained: true, nested: ["unknown", 42] });

    const challengeIds = new Set(fixture.arc.challenges.map((challenge) => challenge.id));
    const agentIds = new Set(Object.keys(fixture.result.org.agents));
    expect(rodohCheckpointMemory(local!.extensions ?? {}, {
      authoredArcDigest: fixture.digest,
      challengeIds,
      agentIds,
      difficultyModeIds: new Set(),
    })).toEqual(fixture.checkpoint);
    expect(rodohRuntimeMemory(local!.extensions ?? {})).toEqual(fixture.runtime);
    expect(rodohLedgerMemory(local!.extensions ?? {}, fixture.digest)).toEqual(fixture.ledger);

    const reexported = buildRodohPortableRun({
      cartridge: imported.value.cartridge,
      org: local!.org,
      pendingRewardChoices: local!.pendingRewardChoices,
      extensions: local!.extensions ?? {},
      ledger: local!.ledger,
      openingChoice: local!.openingChoice ?? null,
      openingChoiceId: local!.openingChoiceId ?? null,
    });
    const reparsed = parsePortableRun(reexported);
    expect(reparsed.extensions["future.player@9"]).toEqual({ retained: true, nested: ["unknown", 42] });
    expect(rodohRuntimeMemory(reparsed.extensions)?.representation).toBe("aperture");
    expect(reparsed.pendingRewardChoices).toEqual(fixture.result.pendingRewardChoices);
  });

  it("rejects a modified payload before installing or restoring anything", () => {
    const fixture = changedRun();
    const tampered = JSON.parse(JSON.stringify(fixture.run)) as Record<string, unknown>;
    const arc = tampered["arc"] as { meta: { name: string } };
    arc.meta.name = "Tampered Charter";

    const imported = importRodohPortableRun(storage, tampered);
    expect(imported.ok).toBe(false);
    if (imported.ok) return;
    expect(imported.errors.join(" ")).toMatch(/integrity mismatch/i);
    expect(storage.length).toBe(0);
  });

  it("stores the exact shell and Aperture selection as a namespaced extension, never engine law", () => {
    const fixture = changedRun();
    expect(fixture.run.extensions[RODOH_RUNTIME_EXTENSION]).toEqual({
      version: 1,
      mode: "shell",
      representation: "aperture",
    });
    expect(JSON.stringify(fixture.run.arc)).not.toContain("rodoh.runtime");
  });

  it("rejects malformed known Rodoh memory before the first durable write", () => {
    const fixture = changedRun();
    const malformed = buildRodohPortableRun({
      cartridge: fixture.cartridge,
      org: fixture.result.org,
      pendingRewardChoices: fixture.result.pendingRewardChoices,
      extensions: {
        [RODOH_RUNTIME_EXTENSION]: {
          version: 1,
          mode: "shell",
          representation: "invented-view",
        },
      },
      ledger: fixture.ledger,
      openingChoice: "Take the crown's seal",
      openingChoiceId: "crown-seal",
      checkpoint: fixture.checkpoint,
    });

    const imported = importRodohPortableRun(storage, malformed);
    expect(imported.ok).toBe(false);
    if (imported.ok) return;
    expect(imported.errors.join(" ")).toMatch(/invalid rodoh\.runtime@1/i);
    expect(storage.length).toBe(0);
  });

  it("rejects an invalid checkpoint rather than silently degrading exact resume", () => {
    const fixture = changedRun();
    const malformed = buildRodohPortableRun({
      cartridge: fixture.cartridge,
      org: fixture.result.org,
      pendingRewardChoices: fixture.result.pendingRewardChoices,
      extensions: {
        [RODOH_EXPERIENCE_EXTENSION]: {
          version: 1,
          checkpoint: {
            ...fixture.checkpoint,
            challengeId: "not-in-this-cartridge",
          },
        },
      },
      ledger: fixture.ledger,
      openingChoice: "Take the crown's seal",
      openingChoiceId: "crown-seal",
      runtime: fixture.runtime,
    });

    const imported = importRodohPortableRun(storage, malformed);
    expect(imported.ok).toBe(false);
    if (imported.ok) return;
    expect(imported.errors.join(" ")).toMatch(/invalid rodoh\.experience@1/i);
    expect(storage.length).toBe(0);
  });

  it("rolls back the run and shelf when any exact-memory write fails", () => {
    const fixture = changedRun();
    storage = new MemoryStorage((key) => key === checkpointKey(fixture.digest));
    (globalThis as { localStorage?: Storage }).localStorage = storage;
    storage.setItem(saveKeyFor(fixture.digest), "previous-save-bytes");
    storage.setItem(CARTRIDGE_BAY_KEY, "previous-shelf-bytes");

    const imported = importRodohPortableRun(storage, fixture.run);
    expect(imported.ok).toBe(false);
    if (imported.ok) return;
    expect(imported.errors.join(" ")).toMatch(/experience checkpoint/i);
    expect(storage.getItem(saveKeyFor(fixture.digest))).toBe("previous-save-bytes");
    expect(storage.getItem(CARTRIDGE_BAY_KEY)).toBe("previous-shelf-bytes");
    expect(storage.getItem(costumeKey(fixture.arc))).toBeNull();
  });

  it("clears stale local presentation memory when the portable run does not carry it", () => {
    const fixture = changedRun();
    const minimal = buildRodohPortableRun({
      cartridge: fixture.cartridge,
      org: fixture.result.org,
      pendingRewardChoices: fixture.result.pendingRewardChoices,
      extensions: {},
      ledger: fixture.ledger,
      openingChoice: "Take the crown's seal",
      openingChoiceId: "crown-seal",
    });
    storage.setItem(checkpointKey(fixture.digest), JSON.stringify(fixture.checkpoint));
    storage.setItem(costumeKey(fixture.arc), "aperture");

    const imported = importRodohPortableRun(storage, minimal);
    expect(imported.ok).toBe(true);
    expect(storage.getItem(checkpointKey(fixture.digest))).toBeNull();
    expect(storage.getItem(costumeKey(fixture.arc))).toBeNull();
  });

});

import { describe, expect, it } from "vitest";
import {
  checkpointKey,
  hallCheckpoint,
  loadCheckpoint,
  saveCheckpoint,
  type CheckpointStorage,
  type ExperienceCheckpoint,
} from "../../src/world/experience/checkpoint.js";

class MemoryStorage implements CheckpointStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const DIGEST = `cart1_${"a".repeat(64)}`;
const challenges = new Set(["cellar", "bridge"]);
const agents = new Set(["a", "b", "c"]);

describe("experience checkpoint", () => {
  it("round-trips the exact committed encounter input", () => {
    const storage = new MemoryStorage();
    const checkpoint: ExperienceCheckpoint = {
      version: 1,
      authoredArcDigest: DIGEST,
      stage: "committed",
      challengeId: "cellar",
      partyIds: ["a", "c"],
      difficultyModeId: null,
      tokensSpent: 1,
      ledgerSeq: null,
    };
    saveCheckpoint(storage, checkpoint);
    expect(loadCheckpoint(storage, DIGEST, challenges, agents)).toEqual(checkpoint);
  });

  it("never aliases a checkpoint across cartridge identity", () => {
    const storage = new MemoryStorage();
    saveCheckpoint(storage, hallCheckpoint(DIGEST));
    const foreign = `cart1_${"b".repeat(64)}`;
    storage.setItem(checkpointKey(foreign), storage.getItem(checkpointKey(DIGEST))!);
    expect(loadCheckpoint(storage, foreign, challenges, agents)).toBeNull();
  });

  it("rejects stale challenge and party identities instead of repairing them", () => {
    const storage = new MemoryStorage();
    storage.setItem(checkpointKey(DIGEST), JSON.stringify({
      ...hallCheckpoint(DIGEST),
      stage: "briefing",
      challengeId: "missing",
      partyIds: ["unknown"],
    }));
    expect(loadCheckpoint(storage, DIGEST, challenges, agents)).toBeNull();
  });
});

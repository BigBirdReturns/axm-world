import { describe, expect, it } from "vitest";
import {
  buildHolderEstate,
  HOLDER_ESTATE_FORMAT,
  importHolderEstate,
  parseHolderEstate,
  preflightHolderEstate,
  type HolderStorage,
} from "../../src/world/holder-estate.js";
import { CARTRIDGE_BAY_KEY } from "../../src/world/cartridge-bay.js";
import { SAVE_KEY_PREFIX } from "../../src/world/save.js";
import { FIRST_CHARTER, KARAZHAN } from "../../src/arcs/index.js";
import { cartridgeDigest } from "../../src/engine/cartridge-digest.js";
import { foundOrganization } from "../../src/engine/founding.js";
import { serializeGame } from "../../src/engine/save.js";
import type { Arc } from "../../src/engine/types.js";

const DIGEST = cartridgeDigest(FIRST_CHARTER);
const OTHER_DIGEST = cartridgeDigest(KARAZHAN);

class MemoryStorage implements HolderStorage {
  private readonly values = new Map<string, string>();
  private setCount = 0;
  private removeCount = 0;
  failOnSet: number | null = null;
  mutateThenThrowOnSet: number | null = null;
  failOnRemove: number | null = null;
  readonly refusedRemovals = new Set<string>();

  constructor(initial: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(initial)) this.values.set(key, value);
  }

  get length(): number { return this.values.size; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void {
    this.setCount += 1;
    if (this.failOnSet === this.setCount) throw new DOMException("quota", "QuotaExceededError");
    this.values.set(key, value);
    if (this.mutateThenThrowOnSet === this.setCount) throw new Error("adapter mutated then threw");
  }
  removeItem(key: string): void {
    this.removeCount += 1;
    if (this.failOnRemove === this.removeCount) throw new Error("remove failed");
    if (this.refusedRemovals.has(key)) return;
    this.values.delete(key);
  }
  snapshot(): Record<string, string> {
    return Object.fromEntries([...this.values.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
  }
}

function bayEntry(arc: Arc) {
  return {
    arc,
    authoredArcDigest: cartridgeDigest(arc),
    trust: "bundled" as const,
    importedAt: 0,
    source: "bundled" as const,
  };
}

function bayValue(arcs: Arc[] = [FIRST_CHARTER]): string {
  return JSON.stringify({ version: 2, entries: arcs.map(bayEntry) });
}

function runValue(arc: Arc = FIRST_CHARTER): string {
  const digest = cartridgeDigest(arc);
  return JSON.stringify({
    version: 1,
    authoredArcDigest: digest,
    game: serializeGame(foundOrganization(arc, { format: "axm-founding-input/1", seed: 424242 }), arc),
    ledger: { version: 2, authoredArcDigest: digest, entries: [] },
    openingChoice: null,
    openingChoiceId: null,
    extensions: {},
  });
}

function checkpointValue(arc: Arc = FIRST_CHARTER): string {
  const digest = cartridgeDigest(arc);
  return JSON.stringify({
    version: 1,
    authoredArcDigest: digest,
    stage: "hall",
    challengeId: null,
    partyIds: [],
    difficultyModeId: null,
    tokensSpent: 0,
    ledgerSeq: null,
  });
}

function completeStorage(): MemoryStorage {
  return new MemoryStorage({
    [CARTRIDGE_BAY_KEY]: bayValue(),
    [`${SAVE_KEY_PREFIX}${DIGEST}`]: runValue(),
    [`axm-world:experience:v1:${DIGEST}`]: checkpointValue(),
    [`axm-world:costume:v2:${DIGEST}`]: "map",
    "axm-world:sensory:v1": JSON.stringify({ sound: false, reducedMotion: true }),
    "axm-world:locale:v1": "zh-Hant",
    "axm-world:future-memory@9": JSON.stringify({ opaque: [1, "x"] }),
    "unrelated:must-not-travel": "private-to-another-app",
  });
}

describe("rodoh-holder-estate/v1", () => {
  it("exports every World-owned record in canonical order while excluding unrelated storage", () => {
    const estate = buildHolderEstate(completeStorage(), { createdAt: "2026-07-25T00:00:00.000Z" });
    expect(estate.format).toBe(HOLDER_ESTATE_FORMAT);
    expect(estate.records.map((record) => record.key)).toEqual([
      CARTRIDGE_BAY_KEY,
      `axm-world:costume:v2:${DIGEST}`,
      `axm-world:experience:v1:${DIGEST}`,
      "axm-world:future-memory@9",
      "axm-world:locale:v1",
      `axm-world:save:v1:${DIGEST}`,
      "axm-world:sensory:v1",
    ]);
    expect(estate.records.some((record) => record.key === "unrelated:must-not-travel")).toBe(false);
    expect(estate.summary).toMatchObject({
      records: 7,
      cartridgeBayRecords: 1,
      runRecords: 1,
      experienceRecords: 1,
      presentationRecords: 1,
      preferenceRecords: 2,
      opaqueRecords: 1,
    });
    expect(parseHolderEstate(JSON.stringify(estate))).toEqual(estate);
  });

  it("refuses payload or summary tampering before any storage write", () => {
    const estate = buildHolderEstate(completeStorage(), { createdAt: "2026-07-25T00:00:00.000Z" });
    const tampered = structuredClone(estate);
    tampered.records[0]!.value += " ";
    expect(() => parseHolderEstate(tampered)).toThrow(/byteLength|checksum|integrity/i);

    const summaryTamper = structuredClone(estate);
    summaryTamper.summary.records += 1;
    expect(() => parseHolderEstate(summaryTamper)).toThrow(/summary|integrity/i);
  });

  it("refuses duplicate keys in the estate envelope and in interpreted record JSON", () => {
    const estate = buildHolderEstate(completeStorage(), { createdAt: "2026-07-25T00:00:00.000Z" });
    const encoded = JSON.stringify(estate);
    const duplicateEnvelope = encoded.replace(
      `{"format":"${HOLDER_ESTATE_FORMAT}",`,
      `{"format":"${HOLDER_ESTATE_FORMAT}","format":"${HOLDER_ESTATE_FORMAT}",`,
    );
    expect(() => parseHolderEstate(duplicateEnvelope)).toThrow(/Duplicate object key.*format/i);

    const duplicateRun = `{"version":1,"version":1,"authoredArcDigest":"${DIGEST}","game":"{}","ledger":{"version":2,"authoredArcDigest":"${DIGEST}","entries":[]},"openingChoice":null}`;
    const invalidEstate = buildHolderEstate(new MemoryStorage({
      [CARTRIDGE_BAY_KEY]: bayValue(),
      [`${SAVE_KEY_PREFIX}${DIGEST}`]: duplicateRun,
    }), { createdAt: "2026-07-25T00:00:00.000Z" });
    expect(() => parseHolderEstate(JSON.stringify(invalidEstate))).toThrow(/Duplicate object key.*version/i);
  });

  it("preflights merge and exact replacement without changing storage", () => {
    const source = completeStorage();
    const estate = buildHolderEstate(source, { createdAt: "2026-07-25T00:00:00.000Z" });
    const target = new MemoryStorage({
      [CARTRIDGE_BAY_KEY]: JSON.stringify({ version: 2, entries: [{ stale: true }] }),
      [`${SAVE_KEY_PREFIX}${OTHER_DIGEST}`]: runValue(KARAZHAN),
      "other-app:key": "untouched",
    });
    const before = target.snapshot();

    const merge = preflightHolderEstate(target, estate, "merge");
    expect(merge.change).toEqual([CARTRIDGE_BAY_KEY]);
    expect(merge.remove).toEqual([]);
    expect(merge.add).toContain(`${SAVE_KEY_PREFIX}${DIGEST}`);

    const replace = preflightHolderEstate(target, estate, "replace");
    expect(replace.remove).toEqual([`${SAVE_KEY_PREFIX}${OTHER_DIGEST}`]);
    expect(target.snapshot()).toEqual(before);
  });

  it("restores an exact holder estate transactionally and idempotently", () => {
    const estate = buildHolderEstate(completeStorage(), { createdAt: "2026-07-25T00:00:00.000Z" });
    const target = new MemoryStorage({
      [`${SAVE_KEY_PREFIX}${OTHER_DIGEST}`]: runValue(KARAZHAN),
      "other-app:key": "must-survive",
    });

    const restored = importHolderEstate(target, estate, { mode: "replace" });
    expect(restored.ok).toBe(true);
    expect(target.getItem(`${SAVE_KEY_PREFIX}${OTHER_DIGEST}`)).toBeNull();
    expect(target.getItem("other-app:key")).toBe("must-survive");
    for (const record of estate.records) expect(target.getItem(record.key)).toBe(record.value);

    const repeated = importHolderEstate(target, estate, { mode: "replace" });
    expect(repeated.ok).toBe(true);
    if (repeated.ok) {
      expect(repeated.preflight.add).toEqual([]);
      expect(repeated.preflight.change).toEqual([]);
      expect(repeated.preflight.remove).toEqual([]);
      expect(repeated.preflight.unchanged).toHaveLength(estate.records.length);
    }
  });

  it("treats a silently refused exact-replace deletion as failure and restores the prior estate", () => {
    const estate = buildHolderEstate(completeStorage(), { createdAt: "2026-07-25T00:00:00.000Z" });
    const staleKey = `${SAVE_KEY_PREFIX}${OTHER_DIGEST}`;
    const target = new MemoryStorage({
      [CARTRIDGE_BAY_KEY]: JSON.stringify({ version: 2, entries: [{ prior: true }] }),
      [staleKey]: runValue(KARAZHAN),
      "other-app:key": "must-survive",
    });
    const before = target.snapshot();
    target.refusedRemovals.add(staleKey);

    const result = importHolderEstate(target, estate, { mode: "replace" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toMatch(/removal verification failed/i);
      expect(result.rollbackErrors).toEqual([]);
    }
    expect(target.snapshot()).toEqual(before);
  });

  it("rolls back every touched key when a later write fails", () => {
    const estate = buildHolderEstate(completeStorage(), { createdAt: "2026-07-25T00:00:00.000Z" });
    const target = new MemoryStorage({
      [CARTRIDGE_BAY_KEY]: JSON.stringify({ version: 2, entries: [{ prior: true }] }),
      [`${SAVE_KEY_PREFIX}${OTHER_DIGEST}`]: runValue(KARAZHAN),
      "other-app:key": "must-survive",
    });
    const before = target.snapshot();
    target.failOnSet = 3;

    const result = importHolderEstate(target, estate, { mode: "replace" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toMatch(/quota/i);
      expect(result.rollbackErrors).toEqual([]);
    }
    expect(target.snapshot()).toEqual(before);
  });

  it("reports rollback verification when the storage adapter silently retains a newly added key", () => {
    const estate = buildHolderEstate(completeStorage(), { createdAt: "2026-07-25T00:00:00.000Z" });
    const target = new MemoryStorage();
    const firstAddedKey = estate.records[0]!.key;
    target.failOnSet = 2;
    target.refusedRemovals.add(firstAddedKey);

    const result = importHolderEstate(target, estate, { mode: "replace" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toMatch(/quota/i);
      expect(result.rollbackErrors.join(" ")).toMatch(/Rollback verification failed/i);
    }
    expect(target.getItem(firstAddedKey)).toBe(estate.records[0]!.value);
  });

  it("recovers exact state after an adapter mutates a write and then throws", () => {
    const estate = buildHolderEstate(completeStorage(), { createdAt: "2026-07-25T00:00:00.000Z" });
    const target = new MemoryStorage({
      [CARTRIDGE_BAY_KEY]: JSON.stringify({ version: 2, entries: [{ prior: true }] }),
      "other-app:key": "must-survive",
    });
    const before = target.snapshot();
    target.mutateThenThrowOnSet = 2;

    const result = importHolderEstate(target, estate, { mode: "replace" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toMatch(/mutated then threw/i);
      expect(result.rollbackErrors).toEqual([]);
    }
    expect(target.snapshot()).toEqual(before);
  });

  it("refuses a run whose inner engine save cannot resume", () => {
  const values = completeStorage().snapshot();
  const run = JSON.parse(values[`${SAVE_KEY_PREFIX}${DIGEST}`]!) as Record<string, unknown>;
  run.game = "{}";
  values[`${SAVE_KEY_PREFIX}${DIGEST}`] = JSON.stringify(run);
  const estate = buildHolderEstate(new MemoryStorage(values), { createdAt: "2026-07-25T00:00:00.000Z" });
  expect(() => parseHolderEstate(estate)).toThrow(/run slot|serialized game|version/i);
});

it("refuses a checkpoint that the held cartridge and run cannot resume", () => {
  const values = completeStorage().snapshot();
  const checkpoint = JSON.parse(values[`axm-world:experience:v1:${DIGEST}`]!) as Record<string, unknown>;
  checkpoint.stage = "teleport";
  values[`axm-world:experience:v1:${DIGEST}`] = JSON.stringify(checkpoint);
  const estate = buildHolderEstate(new MemoryStorage(values), { createdAt: "2026-07-25T00:00:00.000Z" });
  expect(() => parseHolderEstate(estate)).toThrow(/checkpoint|experience/i);
});

it("refuses a cartridge bay whose declared identity disagrees with its Arc", () => {
  const values = completeStorage().snapshot();
  const bay = JSON.parse(values[CARTRIDGE_BAY_KEY]!) as { entries: Array<Record<string, unknown>> };
  bay.entries[0]!.authoredArcDigest = OTHER_DIGEST;
  values[CARTRIDGE_BAY_KEY] = JSON.stringify(bay);
  const estate = buildHolderEstate(new MemoryStorage(values), { createdAt: "2026-07-25T00:00:00.000Z" });
  expect(() => parseHolderEstate(estate)).toThrow(/cartridge bay|authoredArcDigest/i);
});

it("refuses malformed sensory preferences instead of importing state that reload will discard", () => {
  const values = completeStorage().snapshot();
  values["axm-world:sensory:v1"] = JSON.stringify({ sound: "yes", reducedMotion: true });
  const estate = buildHolderEstate(new MemoryStorage(values), { createdAt: "2026-07-25T00:00:00.000Z" });
  expect(() => parseHolderEstate(estate)).toThrow(/sensory preferences/i);
});

  it("preserves opaque future namespaces but refuses malformed known records", () => {
    const estate = buildHolderEstate(completeStorage(), { createdAt: "2026-07-25T00:00:00.000Z" });
    const opaque = estate.records.find((record) => record.kind === "opaque-world");
    expect(opaque?.value).toBe(JSON.stringify({ opaque: [1, "x"] }));

    const invalidSource = new MemoryStorage({
      [CARTRIDGE_BAY_KEY]: bayValue(),
      [`${SAVE_KEY_PREFIX}${DIGEST}`]: runValue(KARAZHAN),
    });
    const invalidEstate = buildHolderEstate(invalidSource, { createdAt: "2026-07-25T00:00:00.000Z" });
    expect(() => parseHolderEstate(invalidEstate)).toThrow(/run slot identity/i);
  });
});

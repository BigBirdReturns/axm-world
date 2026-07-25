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

const DIGEST = `cart1_${"a".repeat(64)}`;
const OTHER_DIGEST = `cart1_${"b".repeat(64)}`;

class MemoryStorage implements HolderStorage {
  private readonly values = new Map<string, string>();
  private setCount = 0;
  failOnSet: number | null = null;

  constructor(initial: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(initial)) this.values.set(key, value);
  }

  get length(): number {
    return this.values.size;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.setCount += 1;
    if (this.failOnSet === this.setCount) throw new DOMException("quota", "QuotaExceededError");
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  snapshot(): Record<string, string> {
    return Object.fromEntries([...this.values.entries()].sort(([a], [b]) => a.localeCompare(b)));
  }
}

function runValue(digest = DIGEST): string {
  return JSON.stringify({
    version: 1,
    authoredArcDigest: digest,
    game: "{}",
    ledger: { version: 2, authoredArcDigest: digest, entries: [] },
    openingChoice: null,
  });
}

function checkpointValue(digest = DIGEST): string {
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
    [CARTRIDGE_BAY_KEY]: JSON.stringify({ version: 2, entries: [] }),
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

  it("preflights merge and exact replacement without changing storage", () => {
    const source = completeStorage();
    const estate = buildHolderEstate(source, { createdAt: "2026-07-25T00:00:00.000Z" });
    const target = new MemoryStorage({
      [CARTRIDGE_BAY_KEY]: JSON.stringify({ version: 2, entries: [{ stale: true }] }),
      [`${SAVE_KEY_PREFIX}${OTHER_DIGEST}`]: runValue(OTHER_DIGEST),
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
      [`${SAVE_KEY_PREFIX}${OTHER_DIGEST}`]: runValue(OTHER_DIGEST),
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

  it("rolls back every touched key when a later write fails", () => {
    const estate = buildHolderEstate(completeStorage(), { createdAt: "2026-07-25T00:00:00.000Z" });
    const target = new MemoryStorage({
      [CARTRIDGE_BAY_KEY]: JSON.stringify({ version: 2, entries: [{ prior: true }] }),
      [`${SAVE_KEY_PREFIX}${OTHER_DIGEST}`]: runValue(OTHER_DIGEST),
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

  it("preserves opaque future namespaces but refuses malformed known records", () => {
    const estate = buildHolderEstate(completeStorage(), { createdAt: "2026-07-25T00:00:00.000Z" });
    const opaque = estate.records.find((record) => record.kind === "opaque-world");
    expect(opaque?.value).toBe(JSON.stringify({ opaque: [1, "x"] }));

    const invalidSource = new MemoryStorage({
      [`${SAVE_KEY_PREFIX}${DIGEST}`]: runValue(OTHER_DIGEST),
    });
    const invalidEstate = buildHolderEstate(invalidSource, { createdAt: "2026-07-25T00:00:00.000Z" });
    expect(() => parseHolderEstate(invalidEstate)).toThrow(/run slot identity/i);
  });
});

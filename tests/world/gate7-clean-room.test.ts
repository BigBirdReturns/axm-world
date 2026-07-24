import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cartridgeDigest } from "../../src/engine/cartridge-digest.js";
import { parsePortableRun } from "../../src/engine/portable-run.js";
import {
  bayImportPreflight,
  cartridgeForEntry,
  importCartridgeFromJson,
  listCartridges,
  type CartridgeBayStorage,
} from "../../src/world/cartridge-bay.js";
import { programForCartridge } from "../../src/world/program-of-record.js";
import {
  buildRodohPortableRun,
  importRodohPortableRun,
  rodohLedgerMemory,
  rodohOpeningMemory,
  rodohRuntimeMemory,
} from "../../src/world/portable-run.js";
import { cartridgePaletteScope, hasCartridgeMotifs, themeForArc } from "../../src/world/themes/select.js";
import { RODOH_BASE_THEME } from "../../src/world/themes/rodoh.js";

const dir = new URL("../../cartridges/clean-room/", import.meta.url);
const sourceText = readFileSync(new URL("orchard-at-low-tide.source.arc.json", dir), "utf8");
const compiledText = readFileSync(new URL("orchard-at-low-tide.arc.json", dir), "utf8");
const malformedText = readFileSync(new URL("orchard-at-low-tide.invalid.arc.json", dir), "utf8");
const changedRunText = readFileSync(new URL("orchard-at-low-tide.changed.run.json", dir), "utf8");
const manifestText = readFileSync(new URL("manifest.json", dir), "utf8");
const manifest = JSON.parse(manifestText) as {
  format: string;
  status: string;
  programOfRecord: null;
  cartridgeDigest: string;
  runIntegrityDigest: string;
  unknownNamespaces: string[];
  files: Record<string, { sha256: string; bytes: number }>;
};

class MemoryStorage implements CartridgeBayStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
  snapshot(): Record<string, string> { return Object.fromEntries([...this.values.entries()].sort(([a], [b]) => a.localeCompare(b))); }
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

describe("Gate 7 clean-room cartridge in neutral Rodoh", () => {
  it("receives the exact Arc custody set from the accepted creator proof", () => {
    expect(sourceText).toBe(compiledText);
    expect(manifest.format).toBe("rodoh-clean-room-custody/1");
    expect(manifest.status).toBe("unbundled");
    expect(manifest.programOfRecord).toBeNull();
    expect(manifest.cartridgeDigest).toBe("cart1_3be11e31edc0d7674abf930aad1027281089ca5c2ec2a34f4edb83168b6b86bb");
    expect(manifest.runIntegrityDigest).toBe("run3_38678b020e54696f059107664c292b5951bc33dc3f1222ee562ccdefa6c9c8d0");
    expect(manifest.unknownNamespaces).toEqual(["unfamiliar.garden-memory@7", "holder.field-notes@1"]);
    expect(manifest.files.source.sha256).toBe(sha256(sourceText));
    expect(manifest.files.compiled.sha256).toBe(sha256(compiledText));
    expect(manifest.files.malformed.sha256).toBe(sha256(malformedText));
    expect(manifest.files.changedRun.sha256).toBe(sha256(changedRunText));
    expect(manifest.files.source.bytes).toBe(Buffer.byteLength(sourceText, "utf8"));
    expect(manifest.files.changedRun.bytes).toBe(Buffer.byteLength(changedRunText, "utf8"));
  });

  it("imports through the ordinary bay as a holder-owned non-program with neutral presentation", () => {
    const storage = new MemoryStorage();
    const preflight = bayImportPreflight(sourceText, []);
    expect(preflight).toEqual(expect.objectContaining({
      ok: true,
      digest: manifest.cartridgeDigest,
      action: "new",
      existing: null,
      sameIdBundled: null,
    }));

    const imported = importCartridgeFromJson(sourceText, storage);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    expect(imported.entry.source).toBe("file");
    expect(imported.entry.trust).toBe("imported-unsigned");
    expect(imported.entry.authoredArcDigest).toBe(manifest.cartridgeDigest);

    const cartridge = cartridgeForEntry(imported.entry);
    expect(cartridgeDigest(cartridge.arc)).toBe(manifest.cartridgeDigest);
    expect(programForCartridge(cartridge)).toBeNull();
    expect(themeForArc(cartridge.arc)).toBe(RODOH_BASE_THEME);
    expect(cartridgePaletteScope(cartridge.arc)).toBeNull();
    expect(hasCartridgeMotifs(cartridge.arc)).toBe(false);
    expect(cartridge.people).toBeUndefined();
    expect(cartridge.arc.roles.map((role) => role.name)).toEqual([
      "Graftwright",
      "Tide Diver",
      "Lantern Clerk",
      "Rain Custodian",
    ]);
    expect(cartridge.arc.currencyName).toBe("Civic Credit");
    expect(cartridge.arc.materialName).toBe("Rootstock");
    expect(cartridge.arc.tokenName).toBe("Lanterns");
    expect(cartridge.arc.reputationName).toBe("Season Standing");
  });

  it("refuses the malformed fixture without installing or repairing it", () => {
    const storage = new MemoryStorage();
    const before = storage.snapshot();
    const imported = importCartridgeFromJson(malformedText, storage);
    expect(imported.ok).toBe(false);
    if (imported.ok) return;
    expect(imported.errors.join(" ")).toMatch(/minAgents|maxAgents|roster/i);
    expect(storage.snapshot()).toEqual(before);
    expect(listCartridges(storage).some((entry) => entry.arc.meta.id === "orchard-at-low-tide-malformed")).toBe(false);
  });

  it("imports the exact changed run and preserves unknown cartridge and holder memory", () => {
    const storage = new MemoryStorage();
    const imported = importRodohPortableRun(storage, changedRunText);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;

    expect(imported.value.entry.source).toBe("file");
    expect(imported.value.entry.authoredArcDigest).toBe(manifest.cartridgeDigest);
    expect(programForCartridge(imported.value.cartridge)).toBeNull();
    expect(imported.value.restored.arc.extensions?.["unfamiliar.garden-memory@7"]).toEqual({
      opaque: true,
      keeper: "an unaffiliated tool",
      values: ["silt-note", 17, { route: "moon-cistern", unparsed: ["x", "y"] }],
    });
    expect(imported.value.restored.extensions["holder.field-notes@1"]).toEqual({
      status: "changed-run",
      observations: ["the hidden wells entered the census", "the ninth field remains revisable"],
      arbitraryUnknown: { code: 71, nested: [true, "silt"] },
    });
    expect(imported.value.restored.org.cartridgeState).toMatchObject({
      "water-reserve": 4,
      "seed-diversity": 4,
      "public-memory": 3,
      "monopoly-debt": 0,
      "season-charter": "shared",
      "field-census-published": true,
    });
  });

  it("re-exports a restored run without normalizing unknown namespaces", () => {
    const restored = parsePortableRun(changedRunText);
    const cartridge = { manifest: {
      cartridgeVersion: 1 as const,
      id: restored.arc.meta.id,
      name: restored.arc.meta.name,
      domain: restored.arc.meta.domain,
      engineVersion: restored.arc.meta.engineVersion,
      trust: "imported-unsigned" as const,
      signature: null,
    }, arc: restored.arc };
    const rebuilt = buildRodohPortableRun({
      cartridge,
      org: restored.org,
      pendingRewardChoices: restored.pendingRewardChoices,
      extensions: restored.extensions,
      ledger: rodohLedgerMemory(restored.extensions, restored.authoredArcDigest),
      openingChoice: rodohOpeningMemory(restored.extensions)?.openingChoice ?? null,
      openingChoiceId: rodohOpeningMemory(restored.extensions)?.openingChoiceId ?? null,
      runtime: rodohRuntimeMemory(restored.extensions),
    });
    expect(rebuilt.authoredArcDigest).toBe(manifest.cartridgeDigest);
    expect(rebuilt.arc.extensions?.["unfamiliar.garden-memory@7"]).toEqual(
      restored.arc.extensions?.["unfamiliar.garden-memory@7"],
    );
    expect(rebuilt.extensions["holder.field-notes@1"]).toEqual(
      restored.extensions["holder.field-notes@1"],
    );
  });
});

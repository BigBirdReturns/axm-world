import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cartridgeDigest } from "../../src/engine/cartridge-digest.js";
import { evaluateComposition } from "../../src/engine/composition.js";
import { foundOrganization } from "../../src/engine/founding.js";
import { validateArc } from "../../src/engine/schema.js";
import { readCommonShipPocketExtension } from "../../src/common-ship/compiler.js";
import { validateCommonShipPocket } from "../../src/common-ship/schema.js";
import {
  bayImportPreflight,
  cartridgeForEntry,
  importCartridgeFromJson,
  type CartridgeBayStorage,
} from "../../src/world/cartridge-bay.js";
import { programForCartridge } from "../../src/world/program-of-record.js";
import { cartridgePaletteScope, hasCartridgeMotifs, themeForArc } from "../../src/world/themes/select.js";
import { RODOH_BASE_THEME } from "../../src/world/themes/rodoh.js";

const ARC_PATH = process.env["BURN_PROTOCOL_ARC_PATH"];
const SOURCE_PATH = process.env["BURN_PROTOCOL_SOURCE_PATH"];
const CORPUS_PATH = process.env["BURN_PROTOCOL_CORPUS_PATH"];
const RECEIPT_PATH = process.env["BURN_PROTOCOL_PUBLICATION_RECEIPT_PATH"];

const EXPECTED_DIGEST = "cart1_c53f00a2d11568377793a898d298df1dd5b2e35bf8c89f081489c9796808820d";
const EXPECTED_PARENT = "b3b299e14d8c22cde88629eb6bc4d197b8f8015eec7bf46b95f0de2a31b5f0df";
const EXPECTED_CATEGORIES = [
  "role-coverage",
  "temporal-overlap",
  "habitat-compatibility",
  "translation-resilience",
  "handoff-continuity",
  "life-fraction-fairness",
];

class MemoryStorage implements CartridgeBayStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

function requiredPath(value: string | undefined, label: string): string {
  if (!value) throw new Error(`${label} was not supplied by the publication workflow.`);
  return path.resolve(value);
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

describe.skipIf(!ARC_PATH || !SOURCE_PATH || !CORPUS_PATH || !RECEIPT_PATH)(
  "Burn Protocol axm-arc publication in the World receiver",
  () => {
    const arcText = readFileSync(requiredPath(ARC_PATH, "BURN_PROTOCOL_ARC_PATH"), "utf8");
    const sourceText = readFileSync(requiredPath(SOURCE_PATH, "BURN_PROTOCOL_SOURCE_PATH"), "utf8");
    const corpusText = readFileSync(requiredPath(CORPUS_PATH, "BURN_PROTOCOL_CORPUS_PATH"), "utf8");
    const receiptText = readFileSync(requiredPath(RECEIPT_PATH, "BURN_PROTOCOL_PUBLICATION_RECEIPT_PATH"), "utf8");
    const arc = validateArc(JSON.parse(arcText));
    const source = JSON.parse(sourceText);
    const corpus = JSON.parse(corpusText) as {
      classification: string;
      exactParent: { sha256: string; nextTransaction: string };
      corpus: { scriptedPanels: number; illustratedPanels: number };
      publication: { inheritedHistory: string; liveRunAuthority: string; assetPolicy: string };
    };
    const receipt = JSON.parse(receiptText) as {
      status: string;
      cartridgeId: string;
      exactParentSha256: string;
      files: Record<string, { sha256: string; bytes: number }>;
    };

    it("binds the exact metadata receipt while refusing absent estate payloads", () => {
      expect(corpus).toMatchObject({
        classification: "metadata-only-private-branch-probe",
        exactParent: { sha256: EXPECTED_PARENT, nextTransaction: "A13C1" },
        corpus: { scriptedPanels: 780, illustratedPanels: 720 },
        publication: {
          inheritedHistory: "read-only",
          liveRunAuthority: "counterfactual-only",
          assetPolicy: "no-panel-payloads-in-probe",
        },
      });
      expect(receipt).toMatchObject({
        status: "pass",
        cartridgeId: "burn-protocol-disclosure-probe",
        exactParentSha256: EXPECTED_PARENT,
      });
      expect(receipt.files["burn-protocol-v0.58.0.corpus.json"]).toEqual({
        sha256: sha256(corpusText),
        bytes: Buffer.byteLength(corpusText, "utf8"),
      });
      expect(receipt.files["burn-protocol-disclosure-probe.ship.json"]).toEqual({
        sha256: sha256(sourceText),
        bytes: Buffer.byteLength(sourceText, "utf8"),
      });
      expect(receipt.files["burn-protocol-disclosure-probe.arc.json"]).toEqual({
        sha256: sha256(arcText),
        bytes: Buffer.byteLength(arcText, "utf8"),
      });
    });

    it("recovers the exact Common Ship source and content identity", () => {
      expect(validateCommonShipPocket(source)).toEqual({ ok: true, source });
      expect(readCommonShipPocketExtension(arc)).toEqual(source);
      expect(cartridgeDigest(arc)).toBe(EXPECTED_DIGEST);
      expect(arc.meta).toMatchObject({
        id: "burn-protocol-disclosure-probe",
        name: "The Burn Protocol: Disclosure and Repair",
        engineVersion: "1.3.0",
        domain: "godscar-common-ship",
      });
      expect(arc.challenges.map((challenge) => challenge.id)).toEqual([
        "open-the-six-repository-hearing",
        "assign-the-six-withdrawal-mandates",
        "repair-the-first-public-corridor",
        "publish-the-read-only-reconstruction",
      ]);
    });

    it("imports as holder-owned neutral content rather than a bundled program", () => {
      const storage = new MemoryStorage();
      expect(bayImportPreflight(arcText, [])).toEqual(expect.objectContaining({
        ok: true,
        digest: EXPECTED_DIGEST,
        action: "new",
        existing: null,
        sameIdBundled: null,
      }));
      const imported = importCartridgeFromJson(arcText, storage);
      expect(imported.ok).toBe(true);
      if (!imported.ok) return;
      expect(imported.entry.source).toBe("file");
      expect(imported.entry.trust).toBe("imported-unsigned");
      expect(imported.entry.authoredArcDigest).toBe(EXPECTED_DIGEST);
      const cartridge = cartridgeForEntry(imported.entry);
      expect(programForCartridge(cartridge)).toBeNull();
      expect(themeForArc(cartridge.arc)).toBe(RODOH_BASE_THEME);
      expect(cartridgePaletteScope(cartridge.arc)).toBeNull();
      expect(hasCartridgeMotifs(cartridge.arc)).toBe(false);
    });

    it("founds six named actors and makes every governance watch composition-feasible", () => {
      const first = foundOrganization(arc, { format: "axm-founding-input/1", seed: 58_001_301 });
      const second = foundOrganization(arc, { format: "axm-founding-input/1", seed: 58_001_301 });
      expect(second).toEqual(first);
      const agents = Object.values(first.agents);
      expect(agents.map((agent) => agent.id)).toEqual([
        "founder:vance",
        "founder:osyraa",
        "founder:georgiou",
        "founder:saru",
        "founder:sukal",
        "founder:discovery",
      ]);
      expect(Object.keys(first.cartridgeState ?? {}).sort()).toEqual([
        "compatibility-debt",
        "consequence:archive:six-repository-hearing-open",
        "consequence:continuity:read-only-reconstruction-ledger",
        "consequence:jurisdiction:separate-withdrawal-mandates",
        "consequence:route:first-corridor-public-repair",
        "continuity",
        "habitat-integrity",
        "roster-resilience",
        "stores-and-care",
        "temporal-coherence",
        "translation-trust",
        "visibility",
      ]);
      for (const challenge of arc.challenges) {
        const result = evaluateComposition({ arc, challenge, agents });
        expect(result.feasible, result.rejectionReasons.join("\n")).toBe(true);
        expect(result.results.map((entry) => entry.category)).toEqual(EXPECTED_CATEGORIES);
      }
    });
  },
);

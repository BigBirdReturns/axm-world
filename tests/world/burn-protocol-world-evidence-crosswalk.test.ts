import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateArc } from "../../src/engine/schema.js";
import {
  installExternalAssetSession,
  prepareExternalAssetCustody,
  verifyExternalAssetFiles,
  type HolderAssetFile,
} from "../../src/world/external-assets.js";
import { installExternalCorpusCatalog } from "../../src/world/external-assets/corpus-atlas.js";
import {
  buildBurnWorldEvidenceTargetCatalog,
  prepareBurnWorldEvidenceCrosswalk,
} from "../../src/world/external-assets/world-evidence-crosswalk.js";

const ARC_PATH = process.env["BURN_PROTOCOL_ARC_PATH"];
const CORPUS_DIR = process.env["BURN_CORPUS_ATLAS_FIXTURE_DIR"];
const CROSSWALK_DIR = process.env["BURN_WORLD_CROSSWALK_FIXTURE_DIR"];

function text(root: string, name: string): string {
  return readFileSync(path.join(root, name), "utf8");
}

function holderFile(root: string, relativePath: string): HolderAssetFile {
  const bytes = readFileSync(path.join(root, relativePath));
  const blob = new Blob([bytes], { type: "image/png" });
  return {
    name: path.basename(relativePath),
    size: bytes.length,
    type: "image/png",
    webkitRelativePath: relativePath,
    arrayBuffer: () => blob.arrayBuffer(),
  };
}

async function fixture() {
  const corpusRoot = path.resolve(CORPUS_DIR!);
  const crosswalkRoot = path.resolve(CROSSWALK_DIR!);
  const arc = validateArc(JSON.parse(readFileSync(path.resolve(ARC_PATH!), "utf8")));
  const custody = await prepareExternalAssetCustody({
    overlayText: text(corpusRoot, "burn-protocol-handoff-publication-overlay.json"),
    receiptText: text(corpusRoot, "handoff-publication-activation-receipt.json"),
    indexText: text(corpusRoot, "corpus-asset-index.json"),
  });
  const verification = await verifyExternalAssetFiles(
    custody,
    [holderFile(corpusRoot, "assets/E12-C3-P01.png")],
  );
  const session = installExternalAssetSession(custody, verification);
  const catalog = installExternalCorpusCatalog(custody);
  const targets = await buildBurnWorldEvidenceTargetCatalog(arc);
  return { corpusRoot, crosswalkRoot, arc, custody, session, catalog, targets };
}

describe.skipIf(!ARC_PATH || !CORPUS_DIR || !CROSSWALK_DIR)(
  "Burn Protocol explicit world evidence crosswalk",
  () => {
    it("derives target identifiers from the exact authored Arc rather than a presentation copy", async () => {
      const { targets } = await fixture();
      expect(targets).toMatchObject({
        format: "burn-protocol-world-evidence-target-catalog/1",
        cartridgeId: "burn-protocol-disclosure-probe",
        authoredArcDigest: "cart1_870f3dfcab909fc9aace115e2c46cd30268339f80bc87a14f0eebcc4e2c28c3e",
      });
      expect(targets.targets.filter((target) => target.kind === "watch").map((target) => target.id)).toEqual([
        "assign-the-six-withdrawal-mandates",
        "open-the-six-repository-hearing",
        "publish-the-read-only-reconstruction",
        "repair-the-first-public-corridor",
      ]);
      expect(targets.targets).toEqual(expect.arrayContaining([
        expect.objectContaining({ kind: "actor", id: "vance", label: "Admiral Vance" }),
        expect.objectContaining({ kind: "faction", id: "starfleet", label: "Starfleet" }),
        expect.objectContaining({ kind: "state", id: "consequence:route:first-corridor-public-repair" }),
        expect.objectContaining({ kind: "pressure", id: "public-reconstruction" }),
      ]));
    });

    it("accepts only explicit links bound to the exact Arc, overlay, index, target catalog, and evidence tier", async () => {
      const { crosswalkRoot, session, catalog, targets } = await fixture();
      const prepared = await prepareBurnWorldEvidenceCrosswalk({
        text: text(crosswalkRoot, "burn-protocol-world-evidence-crosswalk.json"),
        catalog: targets,
        corpus: catalog,
        session,
      });
      expect(prepared).toMatchObject({
        format: "burn-protocol-world-evidence-crosswalk/1",
        evidenceTier: "mechanism-fixture",
        linkedAssets: 6,
        linkedTargets: 6,
        verifiedLinks: 2,
        authority: {
          relationship: "explicit-read-only-cross-reference",
          worldChanges: "none",
          canonChanges: "none",
          persistence: "process-local",
          inference: "forbidden",
        },
      });
      expect(prepared.links.filter((link) => link.verified).map((link) => link.id).sort()).toEqual([
        "fixture-link-hearing-record",
        "fixture-link-vance",
      ]);
      expect(prepared.links.find((link) => link.id === "fixture-link-hearing-pressure")).toMatchObject({
        assetPath: "evidence/contact-sheet.png",
        verified: false,
        objectUrl: null,
      });
    });

    it("refuses an invented world target even when the crosswalk integrity is internally valid", async () => {
      const { crosswalkRoot, session, catalog, targets } = await fixture();
      await expect(prepareBurnWorldEvidenceCrosswalk({
        text: text(crosswalkRoot, "burn-protocol-world-evidence-crosswalk-unknown-target.json"),
        catalog: targets,
        corpus: catalog,
        session,
      })).rejects.toThrow(/unknown authored target/);
    });

    it("refuses an asset path outside the admitted corpus", async () => {
      const { crosswalkRoot, session, catalog, targets } = await fixture();
      await expect(prepareBurnWorldEvidenceCrosswalk({
        text: text(crosswalkRoot, "burn-protocol-world-evidence-crosswalk-unknown-asset.json"),
        catalog: targets,
        corpus: catalog,
        session,
      })).rejects.toThrow(/outside the admitted corpus/);
    });

    it("refuses changed crosswalk content and a crosswalk bound to another index", async () => {
      const { crosswalkRoot, session, catalog, targets } = await fixture();
      await expect(prepareBurnWorldEvidenceCrosswalk({
        text: text(crosswalkRoot, "burn-protocol-world-evidence-crosswalk-tampered.json"),
        catalog: targets,
        corpus: catalog,
        session,
      })).rejects.toThrow(/integrity/);
      await expect(prepareBurnWorldEvidenceCrosswalk({
        text: text(crosswalkRoot, "burn-protocol-world-evidence-crosswalk-wrong-index.json"),
        catalog: targets,
        corpus: catalog,
        session,
      })).rejects.toThrow(/different corpus asset index/);
    });
  },
);

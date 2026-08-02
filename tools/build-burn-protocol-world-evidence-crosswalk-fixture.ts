import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { compareCodepoints } from "../src/engine/determinism.js";
import { validateArc } from "../src/engine/schema.js";
import {
  BURN_WORLD_EVIDENCE_CROSSWALK_FORMAT,
  buildBurnWorldEvidenceTargetCatalog,
} from "../src/world/external-assets/world-evidence-crosswalk.js";

const argv = process.argv.slice(2);

function fail(message: string): never {
  throw new Error(message);
}

function option(name: string): string | null {
  const index = argv.indexOf(name);
  if (index === -1) return null;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) fail(`Missing value for ${name}.`);
  return value;
}

function requiredOption(name: string): string {
  return option(name) ?? fail(`${name} is required.`);
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") {
    const input = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(input)
        .sort(compareCodepoints)
        .filter((key) => input[key] !== undefined)
        .map((key) => [key, canonical(input[key])]),
    );
  }
  return value;
}

function canonicalString(value: unknown): string {
  return JSON.stringify(canonical(value));
}

function pretty(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function withIntegrity<T extends Record<string, unknown>>(core: T): T & {
  integrity: { algorithm: "sha256"; digest: string };
} {
  return {
    ...core,
    integrity: {
      algorithm: "sha256",
      digest: `crosswalk1_${sha256(canonicalString(core))}`,
    },
  };
}

function writeJson(output: string, name: string, value: unknown): {
  path: string;
  sha256: string;
  bytes: number;
} {
  const text = pretty(value);
  const path = resolve(output, name);
  writeFileSync(path, text, "utf8");
  return { path, sha256: sha256(text), bytes: Buffer.byteLength(text) };
}

const output = resolve(requiredOption("--output"));
const arcPath = resolve(requiredOption("--arc"));
const corpusRoot = resolve(requiredOption("--corpus-fixture"));
mkdirSync(output, { recursive: true });

const arc = validateArc(JSON.parse(readFileSync(arcPath, "utf8")));
const targetCatalog = await buildBurnWorldEvidenceTargetCatalog(arc);
const overlayText = readFileSync(resolve(corpusRoot, "burn-protocol-handoff-publication-overlay.json"), "utf8");
const indexText = readFileSync(resolve(corpusRoot, "corpus-asset-index.json"), "utf8");
const overlay = JSON.parse(overlayText) as { evidenceTier: string };

const authority = {
  relationship: "explicit-read-only-cross-reference",
  worldChanges: "none",
  canonChanges: "none",
  persistence: "process-local",
  inference: "forbidden",
} as const;

const core = {
  format: BURN_WORLD_EVIDENCE_CROSSWALK_FORMAT,
  authoredArcDigest: targetCatalog.authoredArcDigest,
  overlaySha256: sha256(overlayText),
  indexSha256: sha256(indexText),
  targetCatalogSha256: targetCatalog.sha256,
  evidenceTier: overlay.evidenceTier,
  source: {
    kind: "holder-authored",
    label: "Deterministic explicit-link fixture for the Burn world evidence crosswalk",
    sha256: null,
  },
  authority,
  links: [
    {
      id: "fixture-link-hearing-precondition",
      assetPath: "assets/E12-C2-P20.png",
      target: { kind: "watch", id: "open-the-six-repository-hearing" },
      relation: "precedes",
      statement: "The explicitly named source image is presented as prior context for opening the six-repository hearing.",
      sourceLocator: "fixture crosswalk line 1",
    },
    {
      id: "fixture-link-hearing-record",
      assetPath: "assets/E12-C3-P01.png",
      target: { kind: "watch", id: "open-the-six-repository-hearing" },
      relation: "documents",
      statement: "The holder-authored fixture explicitly links this selected panel to the hearing watch.",
      sourceLocator: "fixture crosswalk line 2",
    },
    {
      id: "fixture-link-vance",
      assetPath: "assets/E12-C3-P01.png",
      target: { kind: "actor", id: "vance" },
      relation: "depicts",
      statement: "The holder-authored fixture explicitly identifies Admiral Vance as a target of this panel link.",
      sourceLocator: "fixture crosswalk line 3",
    },
    {
      id: "fixture-link-starfleet",
      assetPath: "assets/E12-C3-P02.png",
      target: { kind: "faction", id: "starfleet" },
      relation: "contradicts",
      statement: "The explicit fixture claim records tension with Starfleet's inherited official record.",
      sourceLocator: "fixture crosswalk line 4",
    },
    {
      id: "fixture-link-route-consequence",
      assetPath: "assets/E12-C3-PLATE-01.png",
      target: { kind: "state", id: "consequence:route:first-corridor-public-repair" },
      relation: "receipts",
      statement: "The plate is explicitly cross-referenced to the public and reversible corridor-repair consequence.",
      sourceLocator: "fixture crosswalk line 5",
    },
    {
      id: "fixture-link-reconstruction-pressure",
      assetPath: "assets/EP13/CH1/PANEL-01.png",
      target: { kind: "pressure", id: "public-reconstruction" },
      relation: "contextualizes",
      statement: "The explicit fixture link places this manifest record beside the public-reconstruction pressure.",
      sourceLocator: "fixture crosswalk line 6",
    },
    {
      id: "fixture-link-hearing-pressure",
      assetPath: "evidence/contact-sheet.png",
      target: { kind: "pressure", id: "six-repository-hearing" },
      relation: "contextualizes",
      statement: "The contact sheet remains manifest-only while explicitly linked to the six-repository hearing pressure.",
      sourceLocator: "fixture crosswalk line 7",
    },
  ],
} as const;

const valid = withIntegrity(core as unknown as Record<string, unknown>);
const validRecord = writeJson(output, "burn-protocol-world-evidence-crosswalk.json", valid);

const unknownTargetCore = {
  ...core,
  links: core.links.map((link, index) => index === 0
    ? { ...link, target: { kind: "watch", id: "invented-sovereign-watch" } }
    : link),
};
const unknownTargetRecord = writeJson(
  output,
  "burn-protocol-world-evidence-crosswalk-unknown-target.json",
  withIntegrity(unknownTargetCore as unknown as Record<string, unknown>),
);

const unknownAssetCore = {
  ...core,
  links: core.links.map((link, index) => index === 0
    ? { ...link, assetPath: "assets/E99-C9-P99.png" }
    : link),
};
const unknownAssetRecord = writeJson(
  output,
  "burn-protocol-world-evidence-crosswalk-unknown-asset.json",
  withIntegrity(unknownAssetCore as unknown as Record<string, unknown>),
);

const tampered = JSON.parse(JSON.stringify(valid)) as Record<string, unknown>;
const tamperedLinks = tampered["links"] as Array<Record<string, unknown>>;
tamperedLinks[0]!["statement"] = "Changed after the integrity receipt was issued.";
const tamperedRecord = writeJson(
  output,
  "burn-protocol-world-evidence-crosswalk-tampered.json",
  tampered,
);

const wrongIndexCore = { ...core, indexSha256: "0".repeat(64) };
const wrongIndexRecord = writeJson(
  output,
  "burn-protocol-world-evidence-crosswalk-wrong-index.json",
  withIntegrity(wrongIndexCore as unknown as Record<string, unknown>),
);

const catalogRecord = writeJson(output, "burn-protocol-world-evidence-target-catalog.json", targetCatalog);
const summary = writeJson(output, "crosswalk-fixture-set.json", {
  format: "burn-protocol-world-evidence-crosswalk-fixture/1",
  classification: "synthetic-explicit-links-mechanism-only",
  arc: { path: arcPath, id: arc.meta.id, digest: targetCatalog.authoredArcDigest },
  corpusFixture: corpusRoot,
  targetCatalog: { ...catalogRecord, targets: targetCatalog.targets.length },
  valid: validRecord,
  refusals: {
    unknownTarget: unknownTargetRecord,
    unknownAsset: unknownAssetRecord,
    tamperedIntegrity: tamperedRecord,
    wrongIndex: wrongIndexRecord,
  },
});

writeFileSync(
  resolve(output, "SHA256SUMS"),
  `${[catalogRecord, validRecord, unknownTargetRecord, unknownAssetRecord, tamperedRecord, wrongIndexRecord, summary]
    .map((record) => `${record.sha256}  ${basename(record.path)}`)
    .join("\n")}\n`,
  "utf8",
);

console.log(pretty({
  format: "burn-protocol-world-evidence-crosswalk-fixture/1",
  output,
  targetCatalogSha256: targetCatalog.sha256,
  targetCount: targetCatalog.targets.length,
  valid: validRecord,
}).trimEnd());

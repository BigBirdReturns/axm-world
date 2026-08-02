import { z } from "zod";
import { cartridgeDigest } from "../../engine/cartridge-digest.js";
import { compareCodepoints } from "../../engine/determinism.js";
import { parseBoundedJson } from "../../engine/bounded-json.js";
import type { Arc } from "../../engine/types.js";
import {
  BURN_PROTOCOL_AUTHORED_DIGEST,
  BURN_PROTOCOL_CARTRIDGE_ID,
  normalizeExternalAssetPath,
  sha256Text,
  type ExternalAssetIndexEntry,
  type ExternalAssetSession,
} from "../external-assets.js";
import type { ExternalCorpusCatalog } from "./corpus-atlas.js";

export const BURN_WORLD_EVIDENCE_CROSSWALK_FORMAT =
  "burn-protocol-world-evidence-crosswalk/1" as const;
export const BURN_WORLD_EVIDENCE_TARGET_CATALOG_FORMAT =
  "burn-protocol-world-evidence-target-catalog/1" as const;
export const BURN_WORLD_EVIDENCE_CROSSWALK_MAX_BYTES = 4 * 1024 * 1024;
export const BURN_WORLD_EVIDENCE_CROSSWALK_MAX_LINKS = 10_000;

export type BurnWorldEvidenceTargetKind =
  | "watch"
  | "actor"
  | "faction"
  | "state"
  | "pressure";

export type BurnWorldEvidenceRelation =
  | "depicts"
  | "documents"
  | "contextualizes"
  | "contradicts"
  | "receipts"
  | "precedes"
  | "follows"
  | "conditions"
  | "repairs";

export interface BurnWorldEvidenceTarget {
  kind: BurnWorldEvidenceTargetKind;
  id: string;
  label: string;
  description: string;
}

export interface BurnWorldEvidenceTargetCatalog {
  format: typeof BURN_WORLD_EVIDENCE_TARGET_CATALOG_FORMAT;
  cartridgeId: typeof BURN_PROTOCOL_CARTRIDGE_ID;
  authoredArcDigest: typeof BURN_PROTOCOL_AUTHORED_DIGEST;
  sha256: string;
  targets: BurnWorldEvidenceTarget[];
}

export interface BurnWorldEvidenceCrosswalkLink {
  id: string;
  assetPath: string;
  target: { kind: BurnWorldEvidenceTargetKind; id: string };
  relation: BurnWorldEvidenceRelation;
  statement: string;
  sourceLocator: string | null;
}

export interface PreparedBurnWorldEvidenceLink extends BurnWorldEvidenceCrosswalkLink {
  asset: ExternalAssetIndexEntry;
  targetRecord: BurnWorldEvidenceTarget;
  verified: boolean;
  objectUrl: string | null;
  selectedPath: string | null;
}

export interface PreparedBurnWorldEvidenceCrosswalk {
  format: typeof BURN_WORLD_EVIDENCE_CROSSWALK_FORMAT;
  authoredArcDigest: typeof BURN_PROTOCOL_AUTHORED_DIGEST;
  overlaySha256: string;
  indexSha256: string;
  targetCatalogSha256: string;
  crosswalkSha256: string;
  evidenceTier: string;
  source: {
    kind: "production-contract-derived" | "script-derived" | "holder-authored";
    label: string;
    sha256: string | null;
  };
  authority: {
    relationship: "explicit-read-only-cross-reference";
    worldChanges: "none";
    canonChanges: "none";
    persistence: "process-local";
    inference: "forbidden";
  };
  links: PreparedBurnWorldEvidenceLink[];
  linkedAssets: number;
  linkedTargets: number;
  verifiedLinks: number;
}

const SHA256 = /^[0-9a-f]{64}$/;
const CROSSWALK_DIGEST = /^crosswalk1_[0-9a-f]{64}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9:._-]{0,191}$/;
const TARGET_KINDS = ["watch", "actor", "faction", "state", "pressure"] as const;
const RELATIONS = [
  "depicts",
  "documents",
  "contextualizes",
  "contradicts",
  "receipts",
  "precedes",
  "follows",
  "conditions",
  "repairs",
] as const;

const crosswalkSchema = z.object({
  format: z.literal(BURN_WORLD_EVIDENCE_CROSSWALK_FORMAT),
  authoredArcDigest: z.literal(BURN_PROTOCOL_AUTHORED_DIGEST),
  overlaySha256: z.string().regex(SHA256),
  indexSha256: z.string().regex(SHA256),
  targetCatalogSha256: z.string().regex(SHA256),
  evidenceTier: z.string().min(1).max(128),
  source: z.object({
    kind: z.enum(["production-contract-derived", "script-derived", "holder-authored"]),
    label: z.string().min(1).max(512),
    sha256: z.string().regex(SHA256).nullable(),
  }),
  authority: z.object({
    relationship: z.literal("explicit-read-only-cross-reference"),
    worldChanges: z.literal("none"),
    canonChanges: z.literal("none"),
    persistence: z.literal("process-local"),
    inference: z.literal("forbidden"),
  }),
  links: z.array(z.object({
    id: z.string().regex(SAFE_ID),
    assetPath: z.string().min(1).max(2_048),
    target: z.object({
      kind: z.enum(TARGET_KINDS),
      id: z.string().regex(SAFE_ID),
    }),
    relation: z.enum(RELATIONS),
    statement: z.string().min(1).max(4_096),
    sourceLocator: z.string().min(1).max(1_024).nullable(),
  })).min(1).max(BURN_WORLD_EVIDENCE_CROSSWALK_MAX_LINKS),
  integrity: z.object({
    algorithm: z.literal("sha256"),
    digest: z.string().regex(CROSSWALK_DIGEST),
  }),
}).superRefine((value, context) => {
  if (value.source.kind !== "holder-authored" && value.source.sha256 === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["source", "sha256"],
      message: "Derived crosswalks require the exact source SHA-256.",
    });
  }
});

type ParsedCrosswalk = z.infer<typeof crosswalkSchema>;

const targetCatalogs = new Map<string, BurnWorldEvidenceTargetCatalog>();
const targetListeners = new Map<string, Set<() => void>>();
const crosswalks = new Map<string, PreparedBurnWorldEvidenceCrosswalk>();
const crosswalkListeners = new Map<string, Set<() => void>>();

function notify(
  listeners: Map<string, Set<() => void>>,
  authoredArcDigest: string,
): void {
  for (const listener of listeners.get(authoredArcDigest) ?? []) listener();
}

function plainObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringField(value: unknown, key: string): string | null {
  const record = plainObject(value);
  const field = record?.[key];
  return typeof field === "string" && field.length > 0 ? field : null;
}

function recordArray(value: unknown, key: string): Record<string, unknown>[] {
  const record = plainObject(value);
  const array = record?.[key];
  return Array.isArray(array)
    ? array.map(plainObject).filter((entry): entry is Record<string, unknown> => entry !== null)
    : [];
}

function targetRank(kind: BurnWorldEvidenceTargetKind): number {
  switch (kind) {
    case "watch": return 0;
    case "actor": return 1;
    case "faction": return 2;
    case "state": return 3;
    case "pressure": return 4;
  }
}

function compareTargets(left: BurnWorldEvidenceTarget, right: BurnWorldEvidenceTarget): number {
  return targetRank(left.kind) - targetRank(right.kind)
    || compareCodepoints(left.id, right.id);
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

function targetKey(target: Pick<BurnWorldEvidenceTarget, "kind" | "id">): string {
  return `${target.kind}\u0000${target.id}`;
}

function sourceExtension(arc: Arc): Record<string, unknown> {
  const raw = arc.extensions?.["godscar.common-ship@1"];
  const source = plainObject(raw);
  if (!source || source["format"] !== "common-ship-pocket/1") {
    throw new Error("The Burn cartridge has no exact Common Ship source extension.");
  }
  return source;
}

function pushTarget(
  targets: BurnWorldEvidenceTarget[],
  target: BurnWorldEvidenceTarget,
): void {
  if (!SAFE_ID.test(target.id)) {
    throw new Error(`World evidence target has an unsafe id: ${target.kind}:${target.id}.`);
  }
  targets.push(target);
}

/** Build the presentation-only target registry from the exact authored Arc.
 * The registry contains labels and identifiers only. It has no organization
 * state, report, save, or interaction authority. */
export async function buildBurnWorldEvidenceTargetCatalog(
  arc: Arc,
): Promise<BurnWorldEvidenceTargetCatalog> {
  if (arc.meta.id !== BURN_PROTOCOL_CARTRIDGE_ID) {
    throw new Error(`World evidence targets are defined only for ${BURN_PROTOCOL_CARTRIDGE_ID}.`);
  }
  const digest = cartridgeDigest(arc);
  if (digest !== BURN_PROTOCOL_AUTHORED_DIGEST) {
    throw new Error("World evidence targets require the calibrated Burn cartridge revision.");
  }
  const source = sourceExtension(arc);
  const targets: BurnWorldEvidenceTarget[] = [];

  for (const challenge of arc.challenges) {
    pushTarget(targets, {
      kind: "watch",
      id: challenge.id,
      label: challenge.name,
      description: challenge.description,
    });
  }
  for (const actor of recordArray(source, "cast")) {
    const id = stringField(actor, "id");
    const label = stringField(actor, "name");
    if (!id || !label) throw new Error("Common Ship cast contains an incomplete actor target.");
    pushTarget(targets, {
      kind: "actor",
      id,
      label,
      description: stringField(actor, "description") ?? "",
    });
  }
  for (const faction of recordArray(source, "factionReceipts")) {
    const id = stringField(faction, "factionId");
    const label = stringField(faction, "factionName");
    if (!id || !label) throw new Error("Common Ship faction receipts contain an incomplete faction target.");
    pushTarget(targets, {
      kind: "faction",
      id,
      label,
      description: stringField(faction, "publicGood") ?? "",
    });
  }
  for (const state of arc.stateDefinitions ?? []) {
    pushTarget(targets, {
      kind: "state",
      id: state.id,
      label: state.label,
      description: state.description,
    });
  }
  for (const pressure of recordArray(source, "pressures")) {
    const id = stringField(pressure, "id");
    const label = stringField(pressure, "label");
    if (!id || !label) throw new Error("Common Ship pressures contain an incomplete pressure target.");
    pushTarget(targets, {
      kind: "pressure",
      id,
      label,
      description: stringField(pressure, "description") ?? "",
    });
  }

  targets.sort(compareTargets);
  const seen = new Set<string>();
  for (const target of targets) {
    const key = targetKey(target);
    if (seen.has(key)) throw new Error(`World evidence target is duplicated: ${target.kind}:${target.id}.`);
    seen.add(key);
  }
  const core = {
    format: BURN_WORLD_EVIDENCE_TARGET_CATALOG_FORMAT,
    cartridgeId: BURN_PROTOCOL_CARTRIDGE_ID,
    authoredArcDigest: BURN_PROTOCOL_AUTHORED_DIGEST,
    targets,
  } as const;
  return {
    ...core,
    sha256: await sha256Text(canonicalString(core)),
  };
}

export function installBurnWorldEvidenceTargetCatalog(
  catalog: BurnWorldEvidenceTargetCatalog,
): void {
  targetCatalogs.set(catalog.authoredArcDigest, catalog);
  notify(targetListeners, catalog.authoredArcDigest);
}

export function getBurnWorldEvidenceTargetCatalog(
  authoredArcDigest: string,
): BurnWorldEvidenceTargetCatalog | null {
  return targetCatalogs.get(authoredArcDigest) ?? null;
}

export function clearBurnWorldEvidenceTargetCatalog(authoredArcDigest: string): void {
  targetCatalogs.delete(authoredArcDigest);
  notify(targetListeners, authoredArcDigest);
}

export function subscribeBurnWorldEvidenceTargetCatalog(
  authoredArcDigest: string,
  listener: () => void,
): () => void {
  const current = targetListeners.get(authoredArcDigest) ?? new Set<() => void>();
  current.add(listener);
  targetListeners.set(authoredArcDigest, current);
  return () => {
    current.delete(listener);
    if (current.size === 0) targetListeners.delete(authoredArcDigest);
  };
}

function parseCrosswalk(text: string): ParsedCrosswalk {
  let raw: unknown;
  try {
    raw = parseBoundedJson(text, {
      maxBytes: BURN_WORLD_EVIDENCE_CROSSWALK_MAX_BYTES,
      maxDepth: 48,
      maxNodes: BURN_WORLD_EVIDENCE_CROSSWALK_MAX_LINKS * 16 + 1_000,
      maxArrayItems: BURN_WORLD_EVIDENCE_CROSSWALK_MAX_LINKS,
      maxObjectMembers: BURN_WORLD_EVIDENCE_CROSSWALK_MAX_LINKS * 8 + 500,
      maxStringBytes: 2 * 1024 * 1024,
      maxNumberCharacters: 128,
    });
  } catch (error) {
    throw new Error(`World evidence crosswalk is not valid bounded JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  try {
    return crosswalkSchema.parse(raw);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`World evidence crosswalk does not match its format:\n${error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`).join("\n")}`);
    }
    throw error;
  }
}

function verifiedAssets(session: ExternalAssetSession): Map<string, ExternalAssetSession["assets"][number]> {
  return new Map(session.assets.map((asset) => [asset.path, asset]));
}

export async function prepareBurnWorldEvidenceCrosswalk(input: {
  text: string;
  catalog: BurnWorldEvidenceTargetCatalog;
  corpus: ExternalCorpusCatalog;
  session: ExternalAssetSession;
}): Promise<PreparedBurnWorldEvidenceCrosswalk> {
  const parsed = parseCrosswalk(input.text);
  if (parsed.overlaySha256 !== input.session.overlaySha256
      || parsed.overlaySha256 !== input.corpus.overlaySha256) {
    throw new Error("World evidence crosswalk identifies a different custody overlay.");
  }
  if (parsed.indexSha256 !== input.session.indexSha256
      || parsed.indexSha256 !== input.corpus.indexSha256) {
    throw new Error("World evidence crosswalk identifies a different corpus asset index.");
  }
  if (parsed.targetCatalogSha256 !== input.catalog.sha256) {
    throw new Error("World evidence crosswalk identifies a different authored target catalog.");
  }
  if (parsed.authoredArcDigest !== input.session.authoredArcDigest
      || parsed.authoredArcDigest !== input.corpus.authoredArcDigest
      || parsed.authoredArcDigest !== input.catalog.authoredArcDigest) {
    throw new Error("World evidence crosswalk identifies a different authored cartridge.");
  }
  if (parsed.evidenceTier !== input.session.evidenceTier
      || parsed.evidenceTier !== input.corpus.evidenceTier) {
    throw new Error("World evidence crosswalk changes the external evidence tier.");
  }

  const { integrity: _integrity, ...core } = parsed;
  const expectedIntegrity = `crosswalk1_${await sha256Text(canonicalString(core))}`;
  if (parsed.integrity.digest !== expectedIntegrity) {
    throw new Error("World evidence crosswalk integrity does not match its canonical content.");
  }

  const assets = new Map(input.corpus.assets.map((asset) => [asset.path, asset]));
  const targets = new Map(input.catalog.targets.map((target) => [targetKey(target), target]));
  const verified = verifiedAssets(input.session);
  const linkIds = new Set<string>();
  const linkClaims = new Set<string>();
  const links = parsed.links.map((link): PreparedBurnWorldEvidenceLink => {
    if (linkIds.has(link.id)) throw new Error(`World evidence crosswalk duplicates link id ${link.id}.`);
    linkIds.add(link.id);
    const assetPath = normalizeExternalAssetPath(link.assetPath);
    const asset = assets.get(assetPath);
    if (!asset) throw new Error(`World evidence link ${link.id} names an asset outside the admitted corpus: ${assetPath}.`);
    const targetRecord = targets.get(targetKey(link.target));
    if (!targetRecord) {
      throw new Error(`World evidence link ${link.id} names an unknown authored target: ${link.target.kind}:${link.target.id}.`);
    }
    const duplicateKey = `${assetPath}\u0000${link.target.kind}\u0000${link.target.id}\u0000${link.relation}\u0000${link.statement}`;
    if (linkClaims.has(duplicateKey)) throw new Error(`World evidence crosswalk duplicates the claim in ${link.id}.`);
    linkClaims.add(duplicateKey);
    const selected = verified.get(assetPath) ?? null;
    return {
      ...link,
      assetPath,
      asset,
      targetRecord,
      verified: selected !== null,
      objectUrl: selected?.objectUrl ?? null,
      selectedPath: selected?.selectedPath ?? null,
    };
  });

  links.sort((left, right) =>
    targetRank(left.target.kind) - targetRank(right.target.kind)
    || compareCodepoints(left.target.id, right.target.id)
    || compareCodepoints(left.assetPath, right.assetPath)
    || compareCodepoints(left.id, right.id)
  );

  return {
    format: BURN_WORLD_EVIDENCE_CROSSWALK_FORMAT,
    authoredArcDigest: parsed.authoredArcDigest,
    overlaySha256: parsed.overlaySha256,
    indexSha256: parsed.indexSha256,
    targetCatalogSha256: parsed.targetCatalogSha256,
    crosswalkSha256: await sha256Text(input.text),
    evidenceTier: parsed.evidenceTier,
    source: parsed.source,
    authority: parsed.authority,
    links,
    linkedAssets: new Set(links.map((link) => link.assetPath)).size,
    linkedTargets: new Set(links.map((link) => targetKey(link.target))).size,
    verifiedLinks: links.filter((link) => link.verified).length,
  };
}

export function installBurnWorldEvidenceCrosswalk(
  crosswalk: PreparedBurnWorldEvidenceCrosswalk,
): void {
  crosswalks.set(crosswalk.authoredArcDigest, crosswalk);
  notify(crosswalkListeners, crosswalk.authoredArcDigest);
}

export function getBurnWorldEvidenceCrosswalk(
  authoredArcDigest: string,
): PreparedBurnWorldEvidenceCrosswalk | null {
  return crosswalks.get(authoredArcDigest) ?? null;
}

export function clearBurnWorldEvidenceCrosswalk(authoredArcDigest: string): void {
  crosswalks.delete(authoredArcDigest);
  notify(crosswalkListeners, authoredArcDigest);
}

export function subscribeBurnWorldEvidenceCrosswalk(
  authoredArcDigest: string,
  listener: () => void,
): () => void {
  const current = crosswalkListeners.get(authoredArcDigest) ?? new Set<() => void>();
  current.add(listener);
  crosswalkListeners.set(authoredArcDigest, current);
  return () => {
    current.delete(listener);
    if (current.size === 0) crosswalkListeners.delete(authoredArcDigest);
  };
}

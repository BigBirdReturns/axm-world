import {
  DEMONSTRATION_PROGRAM_FORMAT,
  DEMONSTRATION_PROPOSAL_FORMAT,
  type CompiledDemonstration,
  type DemonstrationAspect,
  type DemonstrationChapter,
  type DemonstrationEdition,
  type DemonstrationEvidence,
  type DemonstrationEvidenceKind,
  type DemonstrationProgram,
  type DemonstrationProposal,
  type DemonstrationValidationOptions,
} from "./contracts.js";
import { canonicalJson, sha256Hex } from "../fabric/runtime/revision.js";

const ID_PATTERN = /^[a-z0-9][a-z0-9:._/-]{1,127}$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const ASPECTS: readonly DemonstrationAspect[] = ["16:9", "4:5", "9:16"];
const EVIDENCE_KINDS: readonly DemonstrationEvidenceKind[] = [
  "runtime",
  "source",
  "workflow",
  "artifact",
  "boundary",
];

function fail(message: string): never {
  throw new Error(`Demonstration contract refused: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function expectRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) fail(`${label} must be an object`);
  return value;
}

function expectArray(value: unknown, label: string, maximum: number): readonly unknown[] {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  if (value.length === 0) fail(`${label} must not be empty`);
  if (value.length > maximum) fail(`${label} exceeds ${maximum} entries`);
  return value;
}

function expectString(
  value: unknown,
  label: string,
  maximumLength: number,
  minimumLength = 1,
): string {
  if (typeof value !== "string") fail(`${label} must be a string`);
  const normalized = value.trim();
  if (normalized.length < minimumLength) fail(`${label} is too short`);
  if (normalized.length > maximumLength) fail(`${label} exceeds ${maximumLength} characters`);
  return normalized;
}

function expectId(value: unknown, label: string): string {
  const id = expectString(value, label, 128, 2);
  if (!ID_PATTERN.test(id)) fail(`${label} is not a bounded identifier`);
  return id;
}

function expectBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") fail(`${label} must be boolean`);
  return value;
}

function expectNumber(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(`${label} must be a finite number`);
  }
  if (value < minimum || value > maximum) {
    fail(`${label} must be between ${minimum} and ${maximum}`);
  }
  return value;
}

function expectEnum<T extends string>(
  value: unknown,
  label: string,
  allowed: readonly T[],
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    fail(`${label} must be one of ${allowed.join(", ")}`);
  }
  return value as T;
}

function expectStringArray(
  value: unknown,
  label: string,
  maximumEntries: number,
  maximumLength: number,
): readonly string[] {
  const array = expectArray(value, label, maximumEntries);
  const strings = array.map((entry, index) => (
    expectString(entry, `${label}[${index}]`, maximumLength)
  ));
  const duplicates = strings.filter((entry, index) => strings.indexOf(entry) !== index);
  if (duplicates.length > 0) fail(`${label} contains duplicate ${duplicates[0]}`);
  return strings;
}

function assertKnownKeys(
  record: Record<string, unknown>,
  label: string,
  allowed: readonly string[],
): void {
  const unknown = Object.keys(record).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) fail(`${label} contains unsupported field ${unknown[0]}`);
}

function assertUniqueIds(items: readonly { readonly id: string }[], label: string): void {
  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.id)) fail(`${label} contains duplicate id ${item.id}`);
    ids.add(item.id);
  }
}

function parseEvidence(value: unknown, index: number): DemonstrationEvidence {
  const label = `evidence[${index}]`;
  const record = expectRecord(value, label);
  assertKnownKeys(record, label, ["id", "kind", "tier", "title", "claim", "locator"]);
  return {
    id: expectId(record.id, `${label}.id`),
    kind: expectEnum(record.kind, `${label}.kind`, EVIDENCE_KINDS),
    tier: expectString(record.tier, `${label}.tier`, 120),
    title: expectString(record.title, `${label}.title`, 160),
    claim: expectString(record.claim, `${label}.claim`, 420),
    locator: expectString(record.locator, `${label}.locator`, 320),
  };
}

function parseChapter<TScene extends string, TWorldMoment extends string>(
  value: unknown,
  index: number,
  options: DemonstrationValidationOptions<TScene, TWorldMoment>,
): DemonstrationChapter<TScene, TWorldMoment> {
  const label = `chapters[${index}]`;
  const record = expectRecord(value, label);
  assertKnownKeys(record, label, [
    "id",
    "indexLabel",
    "eyebrow",
    "title",
    "body",
    "claim",
    "scene",
    "durationMs",
    "worldMoment",
    "evidenceRefs",
    "focusTags",
  ]);
  const minimum = options.minimumChapterDurationMs ?? 1_500;
  const maximum = options.maximumChapterDurationMs ?? 120_000;
  return {
    id: expectId(record.id, `${label}.id`),
    indexLabel: expectString(record.indexLabel, `${label}.indexLabel`, 8),
    eyebrow: expectString(record.eyebrow, `${label}.eyebrow`, 80),
    title: expectString(record.title, `${label}.title`, 180),
    body: expectString(record.body, `${label}.body`, 640),
    claim: expectString(record.claim, `${label}.claim`, 180),
    scene: expectEnum(record.scene, `${label}.scene`, options.allowedScenes),
    durationMs: Math.round(expectNumber(record.durationMs, `${label}.durationMs`, minimum, maximum)),
    worldMoment: expectEnum(
      record.worldMoment,
      `${label}.worldMoment`,
      options.allowedWorldMoments,
    ),
    evidenceRefs: expectStringArray(record.evidenceRefs, `${label}.evidenceRefs`, 16, 128),
    focusTags: expectStringArray(record.focusTags, `${label}.focusTags`, 12, 40),
  };
}

function parseEdition(value: unknown, index: number): DemonstrationEdition {
  const label = `editions[${index}]`;
  const record = expectRecord(value, label);
  assertKnownKeys(record, label, [
    "id",
    "label",
    "audience",
    "summary",
    "chapterIds",
    "durationScale",
    "autoplay",
    "loop",
    "clean",
    "sound",
    "aspect",
  ]);
  return {
    id: expectId(record.id, `${label}.id`),
    label: expectString(record.label, `${label}.label`, 80),
    audience: expectString(record.audience, `${label}.audience`, 160),
    summary: expectString(record.summary, `${label}.summary`, 280),
    chapterIds: expectStringArray(record.chapterIds, `${label}.chapterIds`, 32, 128),
    durationScale: expectNumber(record.durationScale, `${label}.durationScale`, 0.4, 2.5),
    autoplay: expectBoolean(record.autoplay, `${label}.autoplay`),
    loop: expectBoolean(record.loop, `${label}.loop`),
    clean: expectBoolean(record.clean, `${label}.clean`),
    sound: expectBoolean(record.sound, `${label}.sound`),
    aspect: expectEnum(record.aspect, `${label}.aspect`, ASPECTS),
  };
}

export function validateDemonstrationProgram<
  TScene extends string,
  TWorldMoment extends string,
>(
  value: unknown,
  options: DemonstrationValidationOptions<TScene, TWorldMoment>,
): DemonstrationProgram<TScene, TWorldMoment> {
  const record = expectRecord(value, "program");
  assertKnownKeys(record, "program", [
    "format",
    "id",
    "version",
    "productId",
    "title",
    "description",
    "defaultEditionId",
    "evidence",
    "chapters",
    "editions",
    "policy",
  ]);
  if (record.format !== DEMONSTRATION_PROGRAM_FORMAT) {
    fail(`program.format must equal ${DEMONSTRATION_PROGRAM_FORMAT}`);
  }

  const evidence = expectArray(record.evidence, "program.evidence", 96)
    .map((entry, index) => parseEvidence(entry, index));
  const chapters = expectArray(record.chapters, "program.chapters", 32)
    .map((entry, index) => parseChapter(entry, index, options));
  const editions = expectArray(record.editions, "program.editions", 16)
    .map((entry, index) => parseEdition(entry, index));
  assertUniqueIds(evidence, "program.evidence");
  assertUniqueIds(chapters, "program.chapters");
  assertUniqueIds(editions, "program.editions");

  const evidenceIds = new Set(evidence.map((entry) => entry.id));
  for (const chapter of chapters) {
    for (const reference of chapter.evidenceRefs) {
      if (!evidenceIds.has(reference)) {
        fail(`chapter ${chapter.id} references unknown evidence ${reference}`);
      }
    }
  }

  const chapterIds = new Set(chapters.map((entry) => entry.id));
  for (const edition of editions) {
    for (const chapterId of edition.chapterIds) {
      if (!chapterIds.has(chapterId)) {
        fail(`edition ${edition.id} references unknown chapter ${chapterId}`);
      }
    }
  }

  const defaultEditionId = expectId(record.defaultEditionId, "program.defaultEditionId");
  if (!editions.some((edition) => edition.id === defaultEditionId)) {
    fail(`default edition ${defaultEditionId} does not exist`);
  }

  const version = expectString(record.version, "program.version", 48);
  if (!VERSION_PATTERN.test(version)) fail("program.version must be semantic-version shaped");

  const policyRecord = expectRecord(record.policy, "program.policy");
  assertKnownKeys(policyRecord, "program.policy", [
    "proposalOnly",
    "claimTextMutable",
    "evidenceMutable",
    "runtimeCodeGeneration",
    "providerRuntimeDependency",
    "telemetryDefault",
    "publishDefault",
  ]);
  if (policyRecord.proposalOnly !== true) fail("program.policy.proposalOnly must remain true");
  if (policyRecord.claimTextMutable !== false) {
    fail("program.policy.claimTextMutable must remain false");
  }
  if (policyRecord.evidenceMutable !== false) {
    fail("program.policy.evidenceMutable must remain false");
  }
  if (policyRecord.runtimeCodeGeneration !== false) {
    fail("program.policy.runtimeCodeGeneration must remain false");
  }
  if (policyRecord.providerRuntimeDependency !== false) {
    fail("program.policy.providerRuntimeDependency must remain false");
  }
  if (policyRecord.telemetryDefault !== "off") {
    fail("program.policy.telemetryDefault must remain off");
  }
  if (policyRecord.publishDefault !== "local") {
    fail("program.policy.publishDefault must remain local");
  }

  return {
    format: DEMONSTRATION_PROGRAM_FORMAT,
    id: expectId(record.id, "program.id"),
    version,
    productId: expectId(record.productId, "program.productId"),
    title: expectString(record.title, "program.title", 180),
    description: expectString(record.description, "program.description", 640),
    defaultEditionId,
    evidence,
    chapters,
    editions,
    policy: {
      proposalOnly: true,
      claimTextMutable: false,
      evidenceMutable: false,
      runtimeCodeGeneration: false,
      providerRuntimeDependency: false,
      telemetryDefault: "off",
      publishDefault: "local",
    },
  };
}

export function validateDemonstrationProposal<
  TScene extends string,
  TWorldMoment extends string,
>(
  value: unknown,
  program: DemonstrationProgram<TScene, TWorldMoment>,
): DemonstrationProposal {
  const record = expectRecord(value, "proposal");
  assertKnownKeys(record, "proposal", [
    "format",
    "id",
    "programId",
    "baseVersion",
    "editionId",
    "chapterIds",
    "durationScale",
    "autoplay",
    "loop",
    "clean",
    "sound",
    "aspect",
    "focus",
    "direction",
  ]);
  if (record.format !== DEMONSTRATION_PROPOSAL_FORMAT) {
    fail(`proposal.format must equal ${DEMONSTRATION_PROPOSAL_FORMAT}`);
  }
  const programId = expectId(record.programId, "proposal.programId");
  if (programId !== program.id) fail(`proposal targets ${programId}, expected ${program.id}`);
  const baseVersion = expectString(record.baseVersion, "proposal.baseVersion", 48);
  if (baseVersion !== program.version) {
    fail(`proposal targets version ${baseVersion}, expected ${program.version}`);
  }
  const editionId = expectId(record.editionId, "proposal.editionId");
  if (!program.editions.some((edition) => edition.id === editionId)) {
    fail(`proposal references unknown edition ${editionId}`);
  }

  let chapterIds: readonly string[] | undefined;
  if (record.chapterIds !== undefined) {
    chapterIds = expectStringArray(record.chapterIds, "proposal.chapterIds", 32, 128);
    const known = new Set(program.chapters.map((chapter) => chapter.id));
    for (const chapterId of chapterIds) {
      if (!known.has(chapterId)) fail(`proposal references unknown chapter ${chapterId}`);
    }
  }

  const optionalBoolean = (key: "autoplay" | "loop" | "clean" | "sound"): boolean | undefined => (
    record[key] === undefined ? undefined : expectBoolean(record[key], `proposal.${key}`)
  );

  return {
    format: DEMONSTRATION_PROPOSAL_FORMAT,
    id: expectId(record.id, "proposal.id"),
    programId,
    baseVersion,
    editionId,
    ...(chapterIds ? { chapterIds } : {}),
    ...(record.durationScale === undefined
      ? {}
      : { durationScale: expectNumber(record.durationScale, "proposal.durationScale", 0.4, 2.5) }),
    ...(record.autoplay === undefined ? {} : { autoplay: optionalBoolean("autoplay")! }),
    ...(record.loop === undefined ? {} : { loop: optionalBoolean("loop")! }),
    ...(record.clean === undefined ? {} : { clean: optionalBoolean("clean")! }),
    ...(record.sound === undefined ? {} : { sound: optionalBoolean("sound")! }),
    ...(record.aspect === undefined
      ? {}
      : { aspect: expectEnum(record.aspect, "proposal.aspect", ASPECTS) }),
    ...(record.focus === undefined
      ? {}
      : { focus: expectString(record.focus, "proposal.focus", 120) }),
    ...(record.direction === undefined
      ? {}
      : { direction: expectString(record.direction, "proposal.direction", 600) }),
  };
}

export function createEditionProposal<
  TScene extends string,
  TWorldMoment extends string,
>(
  program: DemonstrationProgram<TScene, TWorldMoment>,
  editionId = program.defaultEditionId,
): DemonstrationProposal {
  if (!program.editions.some((edition) => edition.id === editionId)) {
    fail(`cannot create proposal for unknown edition ${editionId}`);
  }
  return {
    format: DEMONSTRATION_PROPOSAL_FORMAT,
    id: `proposal:${editionId}:base`,
    programId: program.id,
    baseVersion: program.version,
    editionId,
  };
}

export function compileDemonstrationProgram<
  TScene extends string,
  TWorldMoment extends string,
>(
  program: DemonstrationProgram<TScene, TWorldMoment>,
  proposalValue: unknown,
): CompiledDemonstration<TScene, TWorldMoment> {
  const proposal = validateDemonstrationProposal(proposalValue, program);
  const edition = program.editions.find((entry) => entry.id === proposal.editionId);
  if (!edition) fail(`edition ${proposal.editionId} disappeared during compilation`);

  const chapterIds = proposal.chapterIds ?? edition.chapterIds;
  const chapterById = new Map(program.chapters.map((chapter) => [chapter.id, chapter] as const));
  const durationScale = proposal.durationScale ?? edition.durationScale;
  const chapters = chapterIds.map((chapterId) => {
    const chapter = chapterById.get(chapterId);
    if (!chapter) fail(`chapter ${chapterId} disappeared during compilation`);
    return {
      ...chapter,
      durationMs: Math.max(1_500, Math.min(120_000, Math.round(chapter.durationMs * durationScale))),
    };
  });

  const evidenceById = new Map(program.evidence.map((entry) => [entry.id, entry] as const));
  const evidenceIds = new Set<string>();
  const evidence: DemonstrationEvidence[] = [];
  for (const chapter of chapters) {
    for (const reference of chapter.evidenceRefs) {
      if (evidenceIds.has(reference)) continue;
      const entry = evidenceById.get(reference);
      if (!entry) fail(`evidence ${reference} disappeared during compilation`);
      evidenceIds.add(reference);
      evidence.push(entry);
    }
  }

  return {
    programId: program.id,
    programVersion: program.version,
    productId: program.productId,
    title: program.title,
    edition,
    proposal,
    chapters,
    evidence,
    totalDurationMs: chapters.reduce((total, chapter) => total + chapter.durationMs, 0),
    autoplay: proposal.autoplay ?? edition.autoplay,
    loop: proposal.loop ?? edition.loop,
    clean: proposal.clean ?? edition.clean,
    sound: proposal.sound ?? edition.sound,
    aspect: proposal.aspect ?? edition.aspect,
    policy: program.policy,
  };
}

export async function computeDemonstrationDigest(
  compiled: CompiledDemonstration,
): Promise<string> {
  return sha256Hex(canonicalJson(compiled));
}

function encodeBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x4000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x4000));
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function decodeBase64Url(value: string): string {
  if (value.length > 16_384) fail("encoded proposal exceeds 16,384 characters");
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    fail("encoded proposal is not valid base64url");
  }
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (bytes.byteLength > 12_288) fail("decoded proposal exceeds 12,288 bytes");
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export function encodeDemonstrationProposal(proposal: DemonstrationProposal): string {
  return encodeBase64Url(canonicalJson(proposal));
}

export function decodeDemonstrationProposal<
  TScene extends string,
  TWorldMoment extends string,
>(
  encoded: string,
  program: DemonstrationProgram<TScene, TWorldMoment>,
): DemonstrationProposal {
  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeBase64Url(encoded));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Demonstration contract refused:")) {
      throw error;
    }
    fail("encoded proposal is not valid UTF-8 JSON");
  }
  return validateDemonstrationProposal(parsed, program);
}

export function proposalUrl(
  base: string | URL,
  proposal: DemonstrationProposal,
  chapterId?: string,
): URL {
  const url = new URL(String(base));
  url.searchParams.set("proposal", encodeDemonstrationProposal(proposal));
  url.searchParams.delete("edition");
  if (chapterId) url.searchParams.set("chapter", chapterId);
  return url;
}

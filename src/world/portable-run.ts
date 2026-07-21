// Rodoh adapter for the shared axm-cartridge-run/v3 envelope.
//
// Arc owns validation, engine state, pending engine choices, and envelope
// integrity. Rodoh owns presentation, ledger, guided checkpoint, and current
// representation as namespaced extensions. Unknown namespaces are retained.

import {
  buildPortableRun,
  isPortableRunV3,
  normalizePortableRunExtensions,
  parsePortableRun,
  type JsonValue,
  type PortableRunExtensions,
  type PortableRunV3,
  type RestoredPortableRunV3,
} from "../engine/portable-run.js";
import type { PendingRewardChoice } from "../engine/cycle.js";
import type { Arc, Organization } from "../engine/types.js";
import { emptyLedger, type Ledger } from "./ledger.js";
import {
  CARTRIDGE_BAY_KEY,
  installImportedCartridge,
  type CartridgeBayEntry,
} from "./cartridge-bay.js";
import { parseCartridge, type AuthoredPerson, type Cartridge } from "./cartridge.js";
import {
  ledgerMatchesDigest,
  normalizeLedgerForDigest,
  saveKeyFor,
  saveRun,
  type KVStorage,
} from "./save.js";
import {
  checkpointKey,
  clearCheckpoint,
  saveCheckpoint,
  validateCheckpoint,
  type ExperienceCheckpoint,
} from "./experience/checkpoint.js";
import { clearCostume, costumeKey, isCostumeId, saveCostume, type CostumeId } from "./presentation-prefs.js";
import type { StorageWriteResult } from "./storage-result.js";

export const RODOH_LEDGER_EXTENSION = "rodoh.ledger@2";
export const RODOH_OPENING_EXTENSION = "rodoh.opening@1";
export const RODOH_EXPERIENCE_EXTENSION = "rodoh.experience@1";
export const RODOH_RUNTIME_EXTENSION = "rodoh.runtime@1";
export const RODOH_CARTRIDGE_EXTENSION = "rodoh.cartridge@1";

export type RodohRuntimeMode = "guided" | "shell";

export interface RodohRuntimeMemory {
  version: 1;
  mode: RodohRuntimeMode;
  representation: CostumeId;
}

export interface RodohOpeningMemory {
  version: 1;
  openingChoice: string | null;
  openingChoiceId: string | null;
}

export interface RodohCartridgeMemory {
  version: 1;
  people?: AuthoredPerson[];
  preferredCostume?: CostumeId;
  signature?: string | null;
}

export interface RodohExtensionState {
  ledger: Ledger;
  openingChoice: string | null;
  openingChoiceId: string | null;
  checkpoint: ExperienceCheckpoint | null;
  runtime: RodohRuntimeMemory | null;
  cartridge: RodohCartridgeMemory | null;
}

function json(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function rodohRuntimeExtensionValue(memory: RodohRuntimeMemory): JsonValue {
  return json(memory);
}

export function rodohExperienceExtensionValue(checkpoint: ExperienceCheckpoint): JsonValue {
  return json({ version: 1, checkpoint });
}

export function rodohRuntimeMemory(
  extensions: PortableRunExtensions,
  fallback: RodohRuntimeMemory | null = null,
): RodohRuntimeMemory | null {
  const raw = record(extensions[RODOH_RUNTIME_EXTENSION]);
  if (!raw || raw["version"] !== 1) return fallback;
  const mode = raw["mode"];
  const representation = raw["representation"];
  if ((mode !== "guided" && mode !== "shell") || !isCostumeId(typeof representation === "string" ? representation : null)) {
    return fallback;
  }
  return { version: 1, mode: mode as RodohRuntimeMode, representation: representation as CostumeId };
}

export function rodohOpeningMemory(extensions: PortableRunExtensions): RodohOpeningMemory | null {
  const raw = record(extensions[RODOH_OPENING_EXTENSION]);
  if (!raw || raw["version"] !== 1) return null;
  const openingChoice = raw["openingChoice"];
  const openingChoiceId = raw["openingChoiceId"];
  if (openingChoice !== null && typeof openingChoice !== "string") return null;
  if (openingChoiceId !== null && typeof openingChoiceId !== "string") return null;
  return { version: 1, openingChoice, openingChoiceId };
}

export function rodohCartridgeMemory(extensions: PortableRunExtensions): RodohCartridgeMemory | null {
  const raw = record(extensions[RODOH_CARTRIDGE_EXTENSION]);
  if (!raw || raw["version"] !== 1) return null;
  const people = raw["people"];
  if (people !== undefined && !Array.isArray(people)) return null;
  const normalizedPeople: AuthoredPerson[] | undefined = people === undefined
    ? undefined
    : people.flatMap((item) => {
        const person = record(item);
        if (!person) return [];
        const fields = ["id", "name", "role", "bio", "greeting", "fulfilledLine"] as const;
        if (!fields.every((field) => typeof person[field] === "string")) return [];
        return [{
          id: person["id"] as string,
          name: person["name"] as string,
          role: person["role"] as string,
          bio: person["bio"] as string,
          greeting: person["greeting"] as string,
          fulfilledLine: person["fulfilledLine"] as string,
        }];
      });
  if (Array.isArray(people) && normalizedPeople?.length !== people.length) return null;
  const preferredCostumeValue = raw["preferredCostume"];
  if (preferredCostumeValue !== undefined
      && (typeof preferredCostumeValue !== "string" || !isCostumeId(preferredCostumeValue))) return null;
  const preferredCostume = preferredCostumeValue as CostumeId | undefined;
  const signatureValue = raw["signature"];
  if (signatureValue !== undefined && signatureValue !== null && typeof signatureValue !== "string") return null;
  const signature = signatureValue as string | null | undefined;
  return {
    version: 1,
    ...(normalizedPeople ? { people: normalizedPeople } : {}),
    ...(preferredCostume ? { preferredCostume } : {}),
    ...(signature !== undefined ? { signature } : {}),
  };
}

export function rodohLedgerMemory(
  extensions: PortableRunExtensions,
  authoredArcDigest: string,
): Ledger {
  const raw = record(extensions[RODOH_LEDGER_EXTENSION]);
  if (!raw || raw["version"] !== 2 || !ledgerMatchesDigest(raw["ledger"], authoredArcDigest)) {
    return emptyLedger(authoredArcDigest);
  }
  return normalizeLedgerForDigest(raw["ledger"], authoredArcDigest);
}

export function rodohCheckpointMemory(
  extensions: PortableRunExtensions,
  params: {
    authoredArcDigest: string;
    challengeIds: ReadonlySet<string>;
    agentIds: ReadonlySet<string>;
    difficultyModeIds?: ReadonlySet<string>;
  },
): ExperienceCheckpoint | null {
  const raw = record(extensions[RODOH_EXPERIENCE_EXTENSION]);
  if (!raw || raw["version"] !== 1) return null;
  return validateCheckpoint(
    raw["checkpoint"],
    params.authoredArcDigest,
    params.challengeIds,
    params.agentIds,
    params.difficultyModeIds ?? new Set(),
  );
}

export function withRodohExtensions(
  base: PortableRunExtensions,
  params: {
    cartridge: Cartridge;
    ledger: Ledger;
    openingChoice: string | null;
    openingChoiceId: string | null;
    checkpoint?: ExperienceCheckpoint | null;
    runtime?: RodohRuntimeMemory | null;
  },
): PortableRunExtensions {
  const next: Record<string, JsonValue> = {
    ...normalizePortableRunExtensions(base),
    [RODOH_LEDGER_EXTENSION]: json({ version: 2, ledger: params.ledger }),
    [RODOH_OPENING_EXTENSION]: json({
      version: 1,
      openingChoice: params.openingChoice,
      openingChoiceId: params.openingChoiceId,
    }),
    [RODOH_CARTRIDGE_EXTENSION]: json({
      version: 1,
      ...(params.cartridge.people ? { people: params.cartridge.people } : {}),
      ...(params.cartridge.manifest.preferredCostume
        ? { preferredCostume: params.cartridge.manifest.preferredCostume }
        : {}),
      signature: params.cartridge.manifest.signature ?? null,
    }),
  };
  if (params.checkpoint !== undefined) {
    if (params.checkpoint) next[RODOH_EXPERIENCE_EXTENSION] = json({ version: 1, checkpoint: params.checkpoint });
    else delete next[RODOH_EXPERIENCE_EXTENSION];
  }
  if (params.runtime !== undefined) {
    if (params.runtime) next[RODOH_RUNTIME_EXTENSION] = json(params.runtime);
    else delete next[RODOH_RUNTIME_EXTENSION];
  }
  return normalizePortableRunExtensions(next);
}

export function buildRodohPortableRun(params: {
  cartridge: Cartridge;
  org: Organization;
  pendingRewardChoices?: PendingRewardChoice[];
  extensions: PortableRunExtensions;
  ledger: Ledger;
  openingChoice: string | null;
  openingChoiceId: string | null;
  checkpoint?: ExperienceCheckpoint | null;
  runtime?: RodohRuntimeMemory | null;
}): PortableRunV3 {
  return buildPortableRun({
    arc: params.cartridge.arc,
    org: params.org,
    pendingRewardChoices: params.pendingRewardChoices ?? [],
    extensions: withRodohExtensions(params.extensions, params),
  });
}

export interface ImportedRodohRun {
  restored: RestoredPortableRunV3;
  entry: CartridgeBayEntry;
  cartridge: Cartridge;
  checkpoint: ExperienceCheckpoint | null;
  runtime: RodohRuntimeMemory | null;
}

export type ImportRodohRunResult =
  | { ok: true; value: ImportedRodohRun }
  | { ok: false; errors: string[] };

function fail(error: unknown): ImportRodohRunResult {
  return { ok: false, errors: [error instanceof Error ? error.message : String(error)] };
}

function hasExtension(extensions: PortableRunExtensions, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(extensions, key);
}

function extensionError(key: string): Error {
  return new Error(`Portable run contains an invalid ${key} extension.`);
}

interface PreparedRodohImport {
  cartridge: Cartridge;
  ledger: Ledger;
  opening: RodohOpeningMemory | null;
  checkpoint: ExperienceCheckpoint | null;
  runtime: RodohRuntimeMemory | null;
}

/** Validate every Rodoh-owned namespace before the first durable write. Unknown
 * namespaces remain opaque and lossless; known namespaces fail closed so an
 * import can never quietly discard memory it claims to understand. */
function prepareRodohImport(restored: RestoredPortableRunV3): PreparedRodohImport {
  const extensions = restored.extensions;

  const cartridgeMemory = rodohCartridgeMemory(extensions);
  if (hasExtension(extensions, RODOH_CARTRIDGE_EXTENSION) && !cartridgeMemory) {
    throw extensionError(RODOH_CARTRIDGE_EXTENSION);
  }

  const opening = rodohOpeningMemory(extensions);
  if (hasExtension(extensions, RODOH_OPENING_EXTENSION) && !opening) {
    throw extensionError(RODOH_OPENING_EXTENSION);
  }

  let ledger = emptyLedger(restored.authoredArcDigest);
  if (hasExtension(extensions, RODOH_LEDGER_EXTENSION)) {
    const raw = record(extensions[RODOH_LEDGER_EXTENSION]);
    if (!raw || raw["version"] !== 2 || !ledgerMatchesDigest(raw["ledger"], restored.authoredArcDigest)) {
      throw extensionError(RODOH_LEDGER_EXTENSION);
    }
    ledger = normalizeLedgerForDigest(raw["ledger"], restored.authoredArcDigest);
  }

  const challengeIds = new Set(restored.arc.challenges.map((challenge) => challenge.id));
  const agentIds = new Set(Object.keys(restored.org.agents));
  const difficultyModeIds = new Set(restored.arc.difficultyModes.map((mode) => mode.id));
  const checkpoint = rodohCheckpointMemory(extensions, {
    authoredArcDigest: restored.authoredArcDigest,
    challengeIds,
    agentIds,
    difficultyModeIds,
  });
  if (hasExtension(extensions, RODOH_EXPERIENCE_EXTENSION) && !checkpoint) {
    throw extensionError(RODOH_EXPERIENCE_EXTENSION);
  }

  const runtime = rodohRuntimeMemory(extensions);
  if (hasExtension(extensions, RODOH_RUNTIME_EXTENSION) && !runtime) {
    throw extensionError(RODOH_RUNTIME_EXTENSION);
  }

  const cartridge = parseCartridge({
    manifest: {
      preferredCostume: cartridgeMemory?.preferredCostume,
      signature: cartridgeMemory?.signature,
    },
    arc: restored.arc,
    ...(cartridgeMemory?.people ? { people: cartridgeMemory.people } : {}),
  }, "imported-unsigned");

  return { cartridge, ledger, opening, checkpoint, runtime };
}

interface StoredSnapshot {
  key: string;
  value: string | null;
}

function captureSnapshots(storage: KVStorage, keys: string[]): StoredSnapshot[] {
  return [...new Set(keys)].map((key) => ({ key, value: storage.getItem(key) }));
}

function restoreSnapshots(storage: KVStorage, snapshots: StoredSnapshot[]): string[] {
  const errors: string[] = [];
  for (const snapshot of [...snapshots].reverse()) {
    try {
      if (snapshot.value === null) storage.removeItem(snapshot.key);
      else storage.setItem(snapshot.key, snapshot.value);
    } catch (error) {
      errors.push(`Rollback failed for ${snapshot.key}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return errors;
}

function requireWrite(result: StorageWriteResult): void {
  if (!result.ok) throw new Error(result.message);
}

export function importRodohPortableRun(
  storage: KVStorage,
  input: string | unknown,
): ImportRodohRunResult {
  let restored: RestoredPortableRunV3;
  let prepared: PreparedRodohImport;
  try {
    restored = parsePortableRun(input);
    prepared = prepareRodohImport(restored);
  } catch (error) {
    return fail(error);
  }

  const snapshots: StoredSnapshot[] = [];
  try {
    snapshots.push(...captureSnapshots(storage, [
      CARTRIDGE_BAY_KEY,
      saveKeyFor(restored.authoredArcDigest),
      checkpointKey(restored.authoredArcDigest),
      costumeKey(restored.arc),
    ]));

    requireWrite(saveRun(storage, {
      arc: restored.arc,
      authoredArcDigest: restored.authoredArcDigest,
      state: {
        org: restored.org,
        ledger: prepared.ledger,
        pendingRewardChoices: restored.pendingRewardChoices,
        openingChoice: prepared.opening?.openingChoice ?? null,
        openingChoiceId: prepared.opening?.openingChoiceId ?? null,
        extensions: restored.extensions,
      },
    }));

    if (prepared.checkpoint) requireWrite(saveCheckpoint(storage, prepared.checkpoint));
    else requireWrite(clearCheckpoint(storage, restored.authoredArcDigest));

    if (prepared.runtime) requireWrite(saveCostume(restored.arc, prepared.runtime.representation, storage));
    else requireWrite(clearCostume(restored.arc, storage));

    // Install the validated cartridge only after every exact-run write has
    // succeeded. The entire operation rolls back if shelf custody fails.
    const installed = installImportedCartridge(prepared.cartridge, storage);
    if (!installed.ok) throw new Error(installed.errors.join(" "));

    return {
      ok: true,
      value: {
        restored,
        entry: installed.entry,
        cartridge: prepared.cartridge,
        checkpoint: prepared.checkpoint,
        runtime: prepared.runtime,
      },
    };
  } catch (error) {
    const rollbackErrors = restoreSnapshots(storage, snapshots);
    return {
      ok: false,
      errors: [error instanceof Error ? error.message : String(error), ...rollbackErrors],
    };
  }
}

export function isRodohPortableRun(input: unknown): boolean {
  return isPortableRunV3(input);
}

export function downloadPortableRun(run: PortableRunV3): void {
  const blob = new Blob([JSON.stringify(run, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${run.arc.meta.id}.run.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function storageResultErrors(result: StorageWriteResult): string[] {
  return result.ok ? [] : [result.message];
}

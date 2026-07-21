import { storageWriteFailure, type StorageWriteResult } from "../storage-result.js";

export type ExperienceStage = "hall" | "briefing" | "committed" | "receipt";

export interface ExperienceCheckpoint {
  version: 1;
  authoredArcDigest: string;
  stage: ExperienceStage;
  challengeId: string | null;
  partyIds: string[];
  difficultyModeId: string | null;
  tokensSpent: number;
  ledgerSeq: number | null;
}

export interface CheckpointStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const PREFIX = "axm-world:experience:v1:";
const STAGES = new Set<ExperienceStage>(["hall", "briefing", "committed", "receipt"]);

export function checkpointKey(authoredArcDigest: string): string {
  return `${PREFIX}${authoredArcDigest}`;
}

export function hallCheckpoint(authoredArcDigest: string): ExperienceCheckpoint {
  return {
    version: 1,
    authoredArcDigest,
    stage: "hall",
    challengeId: null,
    partyIds: [],
    difficultyModeId: null,
    tokensSpent: 0,
    ledgerSeq: null,
  };
}

export function saveCheckpoint(storage: CheckpointStorage, checkpoint: ExperienceCheckpoint): StorageWriteResult {
  try {
    storage.setItem(checkpointKey(checkpoint.authoredArcDigest), JSON.stringify(checkpoint));
    return { ok: true };
  } catch (error) {
    return storageWriteFailure(error, "Saving the experience checkpoint");
  }
}

export function clearCheckpoint(storage: CheckpointStorage, authoredArcDigest: string): StorageWriteResult {
  try {
    storage.removeItem(checkpointKey(authoredArcDigest));
    return { ok: true };
  } catch (error) {
    return storageWriteFailure(error, "Clearing the experience checkpoint");
  }
}

/** Validate a checkpoint from local storage or a portable-run extension without
 * repairing stale identities. Exact resume is preferable to a guessed resume. */
export function validateCheckpoint(
  input: unknown,
  authoredArcDigest: string,
  validChallengeIds: ReadonlySet<string>,
  validAgentIds: ReadonlySet<string>,
  validDifficultyModeIds: ReadonlySet<string> = new Set(),
): ExperienceCheckpoint | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const value = input as Partial<ExperienceCheckpoint>;
  if (value.version !== 1 || value.authoredArcDigest !== authoredArcDigest) return null;
  if (!value.stage || !STAGES.has(value.stage)) return null;
  if (!Array.isArray(value.partyIds) || new Set(value.partyIds).size !== value.partyIds.length) return null;
  if (!value.partyIds.every((id) => typeof id === "string" && validAgentIds.has(id))) return null;
  if (!Number.isSafeInteger(value.tokensSpent) || (value.tokensSpent ?? -1) < 0) return null;
  const requiresChallenge = value.stage !== "hall";
  if (requiresChallenge && (typeof value.challengeId !== "string" || !validChallengeIds.has(value.challengeId))) return null;
  if (!requiresChallenge && value.challengeId !== null) return null;
  if (value.difficultyModeId !== null) {
    if (typeof value.difficultyModeId !== "string" || !validDifficultyModeIds.has(value.difficultyModeId)) return null;
  }
  if (value.ledgerSeq !== null && (!Number.isSafeInteger(value.ledgerSeq) || (value.ledgerSeq ?? -1) < 0)) return null;
  return {
    version: 1,
    authoredArcDigest,
    stage: value.stage,
    challengeId: value.challengeId ?? null,
    partyIds: [...value.partyIds],
    difficultyModeId: value.difficultyModeId ?? null,
    tokensSpent: value.tokensSpent as number,
    ledgerSeq: value.ledgerSeq ?? null,
  };
}

export function loadCheckpoint(
  storage: CheckpointStorage,
  authoredArcDigest: string,
  validChallengeIds: ReadonlySet<string>,
  validAgentIds: ReadonlySet<string>,
  validDifficultyModeIds: ReadonlySet<string> = new Set(),
): ExperienceCheckpoint | null {
  const raw = storage.getItem(checkpointKey(authoredArcDigest));
  if (!raw) return null;
  try {
    return validateCheckpoint(
      JSON.parse(raw) as unknown,
      authoredArcDigest,
      validChallengeIds,
      validAgentIds,
      validDifficultyModeIds,
    );
  } catch {
    return null;
  }
}

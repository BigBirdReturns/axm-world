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

export function saveCheckpoint(storage: CheckpointStorage, checkpoint: ExperienceCheckpoint): void {
  storage.setItem(checkpointKey(checkpoint.authoredArcDigest), JSON.stringify(checkpoint));
}

export function clearCheckpoint(storage: CheckpointStorage, authoredArcDigest: string): void {
  storage.removeItem(checkpointKey(authoredArcDigest));
}

export function loadCheckpoint(
  storage: CheckpointStorage,
  authoredArcDigest: string,
  validChallengeIds: ReadonlySet<string>,
  validAgentIds: ReadonlySet<string>,
): ExperienceCheckpoint | null {
  const raw = storage.getItem(checkpointKey(authoredArcDigest));
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ExperienceCheckpoint>;
    if (value.version !== 1 || value.authoredArcDigest !== authoredArcDigest) return null;
    if (!value.stage || !["hall", "briefing", "committed", "receipt"].includes(value.stage)) return null;
    if (!Array.isArray(value.partyIds) || new Set(value.partyIds).size !== value.partyIds.length) return null;
    if (!value.partyIds.every((id) => typeof id === "string" && validAgentIds.has(id))) return null;
    if (!Number.isSafeInteger(value.tokensSpent) || (value.tokensSpent ?? -1) < 0) return null;
    const requiresChallenge = value.stage !== "hall";
    if (requiresChallenge && (typeof value.challengeId !== "string" || !validChallengeIds.has(value.challengeId))) return null;
    if (!requiresChallenge && value.challengeId !== null) return null;
    if (value.difficultyModeId !== null && typeof value.difficultyModeId !== "string") return null;
    if (value.ledgerSeq !== null && (!Number.isSafeInteger(value.ledgerSeq) || (value.ledgerSeq ?? -1) < 0)) return null;
    return value as ExperienceCheckpoint;
  } catch {
    return null;
  }
}

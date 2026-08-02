import {
  canonicalStoryCursorForPanel,
  initialCanonicalStoryCursor,
  type CanonicalStoryCursor,
  type CanonicalStorySource,
} from "../../canonical-story/index.js";

export const CANONICAL_STORY_SESSION_FORMAT = "rodoh-canonical-story-session/1" as const;
const PREFIX = "axm-world:canonical-story:v1:";

export interface CanonicalStorySession {
  format: typeof CANONICAL_STORY_SESSION_FORMAT;
  authoredArcDigest: string;
  cursor: CanonicalStoryCursor;
}

export interface CanonicalStorySessionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function canonicalStorySessionKey(authoredArcDigest: string): string {
  return `${PREFIX}${authoredArcDigest}`;
}

export function initialCanonicalStorySession(
  story: CanonicalStorySource,
  authoredArcDigest: string,
): CanonicalStorySession {
  return {
    format: CANONICAL_STORY_SESSION_FORMAT,
    authoredArcDigest,
    cursor: initialCanonicalStoryCursor(story).cursor,
  };
}

export function validateCanonicalStorySession(
  value: unknown,
  story: CanonicalStorySource,
  authoredArcDigest: string,
): CanonicalStorySession | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<CanonicalStorySession>;
  if (candidate.format !== CANONICAL_STORY_SESSION_FORMAT
      || candidate.authoredArcDigest !== authoredArcDigest
      || !candidate.cursor
      || typeof candidate.cursor !== "object") return null;
  const panelId = (candidate.cursor as Partial<CanonicalStoryCursor>).panelId;
  if (typeof panelId !== "string") return null;
  try {
    return {
      format: CANONICAL_STORY_SESSION_FORMAT,
      authoredArcDigest,
      cursor: canonicalStoryCursorForPanel(story, panelId),
    };
  } catch {
    return null;
  }
}

export function loadCanonicalStorySession(
  storage: CanonicalStorySessionStorage,
  story: CanonicalStorySource,
  authoredArcDigest: string,
): CanonicalStorySession {
  const raw = storage.getItem(canonicalStorySessionKey(authoredArcDigest));
  if (!raw) return initialCanonicalStorySession(story, authoredArcDigest);
  try {
    return validateCanonicalStorySession(JSON.parse(raw) as unknown, story, authoredArcDigest)
      ?? initialCanonicalStorySession(story, authoredArcDigest);
  } catch {
    return initialCanonicalStorySession(story, authoredArcDigest);
  }
}

export function saveCanonicalStorySession(
  storage: CanonicalStorySessionStorage,
  session: CanonicalStorySession,
): void {
  storage.setItem(canonicalStorySessionKey(session.authoredArcDigest), JSON.stringify(session));
}

export function clearCanonicalStorySession(
  storage: CanonicalStorySessionStorage,
  authoredArcDigest: string,
): void {
  storage.removeItem(canonicalStorySessionKey(authoredArcDigest));
}

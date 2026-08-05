import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { canonicalStoryDigest } from "../../canonical-story/digest.js";
import type { CanonicalStorySource } from "../../canonical-story/index.js";
import type { CanonicalStoryTimedMedia } from "../../canonical-story/timed-media.js";
import {
  loadApertureHostSession,
  saveApertureHostSession,
  type ApertureHostSessionRestoration,
  type ApertureHostSessionScope,
  type ApertureHostSessionStorage,
  type ApertureHostSurface,
} from "./session.js";

export const APERTURE_DAEMON_PROJECTION_FORMAT = "axm-aperture-world-projection/1" as const;

export type ApertureDaemonState =
  | "ready"
  | "unavailable"
  | "partial"
  | "stale"
  | "ambiguous"
  | "conflict"
  | "refused"
  | "unsupported";

export type ApertureAnchorState =
  | "unbound"
  | "ambiguous"
  | "conflict"
  | "stale"
  | "resolved"
  | "refused";

export type ApertureClockMode = "direct" | "session" | "acoustic" | "predicted" | "manual" | "none";
export type AperturePlaybackState = "playing" | "paused" | "buffering" | "stopped" | "idle" | "unknown";
export type ApertureIdentityStanding = "none" | "nominated" | "user_bound" | "matched" | "verified";
export type ApertureSelectionMode = "bridge" | "drop" | "stay" | "barely_seen";

export interface ApertureAnchorCoordinate {
  format: "axm-aperture-world-anchor-coordinate/1";
  source_format: "axm-aperture-playback-anchor/1";
  source_authority: "resolved_playback_state_only";
  anchor_id: string;
  state: ApertureAnchorState;
  work_id: string | null;
  edition_id: string | null;
  identity_standing: ApertureIdentityStanding;
  identity_confidence_ppm: number;
  clock: {
    state: AperturePlaybackState;
    canonical_position_us: number | null;
    provider_position_us: number | null;
    duration_us: number | null;
    rate_numerator: number;
    rate_denominator: number;
    mode: ApertureClockMode;
    confidence_ppm: number;
    precision_us: number | null;
    observed_at_us: number;
  };
  anchor_digest: string;
}

export interface ApertureAnswerCoordinate {
  format: "axm-aperture-world-answer-coordinate/1";
  source_plan_format: "axm-aperture-answer-plan/1";
  source_receipt_format: "axm-aperture-answer-receipt/1" | null;
  plan_id: string;
  receipt_id: string | null;
  story_package_id: string;
  anchor_id: string;
  story_digest: string;
  delivered_fact_count: number;
  withheld_fact_count: number;
  knowledge_event_count: number;
  plan_digest: string;
  receipt_digest: string | null;
}

export interface ApertureSelectionCoordinate {
  format: "axm-aperture-world-selection-coordinate/1";
  source_format: "axm-aperture-selection-receipt/1";
  source_authority: "selection_receipt_only";
  selection_id: string;
  story_package_id: string;
  work_id: string;
  mode: ApertureSelectionMode;
  selected_candidate_id: string;
  scene_id: string;
  canonical_start_us: number;
  canonical_end_us: number;
  candidate_count: number;
  reason_codes: string[];
  same_work_only: true;
  selection_digest: string;
}

export interface ApertureDaemonProjection {
  format: typeof APERTURE_DAEMON_PROJECTION_FORMAT;
  authority: "external_daemon_projection_only";
  state: ApertureDaemonState;
  observed_at_us: number;
  canonical_story_id: string | null;
  canonical_story_digest: string | null;
  story_package_id: string | null;
  story_package_digest: string | null;
  viewer_profile_id: string | null;
  viewer_profile_digest: string | null;
  continuity_id: string | null;
  work_id: string | null;
  anchor: ApertureAnchorCoordinate | null;
  answer: ApertureAnswerCoordinate | null;
  selection: ApertureSelectionCoordinate | null;
  access_receipt_ids: string[];
  state_codes: string[];
  projection_digest: string;
}

export type ApertureDaemonProjectionValidation =
  | { ok: true; projection: ApertureDaemonProjection; warnings: string[] }
  | { ok: false; errors: string[] };

interface Props {
  story: CanonicalStorySource;
  timedMedia: CanonicalStoryTimedMedia;
  daemonProjection?: unknown;
  storage?: ApertureHostSessionStorage | null;
}

const SHA256 = /^[0-9a-f]{64}$/;
const ANCHOR_ID = /^anchor1_[0-9a-f]{64}$/;
const ANSWER_PLAN_ID = /^answerplan1_[0-9a-f]{64}$/;
const ANSWER_RECEIPT_ID = /^answerreceipt1_[0-9a-f]{64}$/;
const SELECTION_ID = /^selection1_[0-9a-f]{64}$/;
const NON_EMPTY = /\S/;
const DAEMON_STATES = new Set<ApertureDaemonState>([
  "ready",
  "unavailable",
  "partial",
  "stale",
  "ambiguous",
  "conflict",
  "refused",
  "unsupported",
]);
const ANCHOR_STATES = new Set<ApertureAnchorState>([
  "unbound",
  "ambiguous",
  "conflict",
  "stale",
  "resolved",
  "refused",
]);
const CLOCK_MODES = new Set<ApertureClockMode>([
  "direct",
  "session",
  "acoustic",
  "predicted",
  "manual",
  "none",
]);
const PLAYBACK_STATES = new Set<AperturePlaybackState>([
  "playing",
  "paused",
  "buffering",
  "stopped",
  "idle",
  "unknown",
]);
const IDENTITY_STANDINGS = new Set<ApertureIdentityStanding>([
  "none",
  "nominated",
  "user_bound",
  "matched",
  "verified",
]);
const SELECTION_MODES = new Set<ApertureSelectionMode>([
  "bridge",
  "drop",
  "stay",
  "barely_seen",
]);
const ROOT_KEYS = new Set([
  "format",
  "authority",
  "state",
  "observed_at_us",
  "canonical_story_id",
  "canonical_story_digest",
  "story_package_id",
  "story_package_digest",
  "viewer_profile_id",
  "viewer_profile_digest",
  "continuity_id",
  "work_id",
  "anchor",
  "answer",
  "selection",
  "access_receipt_ids",
  "state_codes",
  "projection_digest",
]);
const ANCHOR_KEYS = new Set([
  "format",
  "source_format",
  "source_authority",
  "anchor_id",
  "state",
  "work_id",
  "edition_id",
  "identity_standing",
  "identity_confidence_ppm",
  "clock",
  "anchor_digest",
]);
const CLOCK_KEYS = new Set([
  "state",
  "canonical_position_us",
  "provider_position_us",
  "duration_us",
  "rate_numerator",
  "rate_denominator",
  "mode",
  "confidence_ppm",
  "precision_us",
  "observed_at_us",
]);
const ANSWER_KEYS = new Set([
  "format",
  "source_plan_format",
  "source_receipt_format",
  "plan_id",
  "receipt_id",
  "story_package_id",
  "anchor_id",
  "story_digest",
  "delivered_fact_count",
  "withheld_fact_count",
  "knowledge_event_count",
  "plan_digest",
  "receipt_digest",
]);
const SELECTION_KEYS = new Set([
  "format",
  "source_format",
  "source_authority",
  "selection_id",
  "story_package_id",
  "work_id",
  "mode",
  "selected_candidate_id",
  "scene_id",
  "canonical_start_us",
  "canonical_end_us",
  "candidate_count",
  "reason_codes",
  "same_work_only",
  "selection_digest",
]);

const card: CSSProperties = {
  border: "1px solid #4c4b39",
  background: "rgba(14,16,12,0.97)",
  borderRadius: 8,
  padding: "clamp(12px, 2.5vw, 18px)",
  display: "grid",
  gap: 12,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  path: string,
  errors: string[],
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) errors.push(`${path}: unknown field ${key}`);
  }
  for (const key of allowed) {
    if (!(key in value)) errors.push(`${path}: missing field ${key}`);
  }
}

function stringValue(value: unknown, path: string, errors: string[], nullable = false): value is string | null {
  if (value === null && nullable) return true;
  if (typeof value !== "string" || !NON_EMPTY.test(value)) {
    errors.push(`${path}: expected ${nullable ? "a non-empty string or null" : "a non-empty string"}`);
    return false;
  }
  return true;
}

function digestValue(value: unknown, path: string, errors: string[], nullable = false): value is string | null {
  if (value === null && nullable) return true;
  if (typeof value !== "string" || !SHA256.test(value)) {
    errors.push(`${path}: expected ${nullable ? "a lowercase SHA-256 or null" : "a lowercase SHA-256"}`);
    return false;
  }
  return true;
}

function integerValue(
  value: unknown,
  path: string,
  errors: string[],
  minimum = 0,
  nullable = false,
): value is number | null {
  if (value === null && nullable) return true;
  if (!Number.isSafeInteger(value) || Number(value) < minimum) {
    errors.push(`${path}: expected ${nullable ? "a safe integer or null" : "a safe integer"} >= ${minimum}`);
    return false;
  }
  return true;
}

function ppm(value: unknown, path: string, errors: string[]): value is number {
  if (!integerValue(value, path, errors) || Number(value) > 1_000_000) {
    if (Number.isSafeInteger(value) && Number(value) > 1_000_000) {
      errors.push(`${path}: confidence exceeds 1000000 ppm`);
    }
    return false;
  }
  return true;
}

function stringList(value: unknown, path: string, errors: string[]): value is string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || !NON_EMPTY.test(entry))) {
    errors.push(`${path}: expected non-empty string values`);
    return false;
  }
  if (new Set(value).size !== value.length) errors.push(`${path}: duplicate values are not permitted`);
  return true;
}

function parseAnchor(value: unknown, path: string, errors: string[]): ApertureAnchorCoordinate | null {
  if (value === null) return null;
  if (!isRecord(value)) {
    errors.push(`${path}: expected an object or null`);
    return null;
  }
  exactKeys(value, ANCHOR_KEYS, path, errors);
  if (value.format !== "axm-aperture-world-anchor-coordinate/1") errors.push(`${path}.format: unsupported format`);
  if (value.source_format !== "axm-aperture-playback-anchor/1") errors.push(`${path}.source_format: unsupported source format`);
  if (value.source_authority !== "resolved_playback_state_only") errors.push(`${path}.source_authority: authority upgrade refused`);
  if (typeof value.anchor_id !== "string" || !ANCHOR_ID.test(value.anchor_id)) errors.push(`${path}.anchor_id: invalid anchor identity`);
  if (typeof value.state !== "string" || !ANCHOR_STATES.has(value.state as ApertureAnchorState)) errors.push(`${path}.state: unsupported state`);
  stringValue(value.work_id, `${path}.work_id`, errors, true);
  stringValue(value.edition_id, `${path}.edition_id`, errors, true);
  if (typeof value.identity_standing !== "string" || !IDENTITY_STANDINGS.has(value.identity_standing as ApertureIdentityStanding)) errors.push(`${path}.identity_standing: unsupported standing`);
  ppm(value.identity_confidence_ppm, `${path}.identity_confidence_ppm`, errors);
  digestValue(value.anchor_digest, `${path}.anchor_digest`, errors);

  if (!isRecord(value.clock)) {
    errors.push(`${path}.clock: expected an object`);
  } else {
    exactKeys(value.clock, CLOCK_KEYS, `${path}.clock`, errors);
    if (typeof value.clock.state !== "string" || !PLAYBACK_STATES.has(value.clock.state as AperturePlaybackState)) errors.push(`${path}.clock.state: unsupported state`);
    integerValue(value.clock.canonical_position_us, `${path}.clock.canonical_position_us`, errors, 0, true);
    integerValue(value.clock.provider_position_us, `${path}.clock.provider_position_us`, errors, 0, true);
    integerValue(value.clock.duration_us, `${path}.clock.duration_us`, errors, 1, true);
    integerValue(value.clock.rate_numerator, `${path}.clock.rate_numerator`, errors, 0);
    integerValue(value.clock.rate_denominator, `${path}.clock.rate_denominator`, errors, 1);
    if (typeof value.clock.mode !== "string" || !CLOCK_MODES.has(value.clock.mode as ApertureClockMode)) errors.push(`${path}.clock.mode: unsupported mode`);
    ppm(value.clock.confidence_ppm, `${path}.clock.confidence_ppm`, errors);
    integerValue(value.clock.precision_us, `${path}.clock.precision_us`, errors, 1, true);
    integerValue(value.clock.observed_at_us, `${path}.clock.observed_at_us`, errors);
  }
  return value as unknown as ApertureAnchorCoordinate;
}

function parseAnswer(value: unknown, path: string, errors: string[]): ApertureAnswerCoordinate | null {
  if (value === null) return null;
  if (!isRecord(value)) {
    errors.push(`${path}: expected an object or null`);
    return null;
  }
  exactKeys(value, ANSWER_KEYS, path, errors);
  if (value.format !== "axm-aperture-world-answer-coordinate/1") errors.push(`${path}.format: unsupported format`);
  if (value.source_plan_format !== "axm-aperture-answer-plan/1") errors.push(`${path}.source_plan_format: unsupported source format`);
  if (value.source_receipt_format !== null && value.source_receipt_format !== "axm-aperture-answer-receipt/1") errors.push(`${path}.source_receipt_format: unsupported source format`);
  if (typeof value.plan_id !== "string" || !ANSWER_PLAN_ID.test(value.plan_id)) errors.push(`${path}.plan_id: invalid plan identity`);
  if (value.receipt_id !== null && (typeof value.receipt_id !== "string" || !ANSWER_RECEIPT_ID.test(value.receipt_id))) errors.push(`${path}.receipt_id: invalid receipt identity`);
  stringValue(value.story_package_id, `${path}.story_package_id`, errors);
  if (typeof value.anchor_id !== "string" || !ANCHOR_ID.test(value.anchor_id)) errors.push(`${path}.anchor_id: invalid anchor identity`);
  digestValue(value.story_digest, `${path}.story_digest`, errors);
  integerValue(value.delivered_fact_count, `${path}.delivered_fact_count`, errors);
  integerValue(value.withheld_fact_count, `${path}.withheld_fact_count`, errors);
  integerValue(value.knowledge_event_count, `${path}.knowledge_event_count`, errors);
  digestValue(value.plan_digest, `${path}.plan_digest`, errors);
  digestValue(value.receipt_digest, `${path}.receipt_digest`, errors, true);
  if ((value.receipt_id === null) !== (value.source_receipt_format === null)
      || (value.receipt_id === null) !== (value.receipt_digest === null)) {
    errors.push(`${path}: receipt identity, format, and digest must be present together`);
  }
  return value as unknown as ApertureAnswerCoordinate;
}

function parseSelection(value: unknown, path: string, errors: string[]): ApertureSelectionCoordinate | null {
  if (value === null) return null;
  if (!isRecord(value)) {
    errors.push(`${path}: expected an object or null`);
    return null;
  }
  exactKeys(value, SELECTION_KEYS, path, errors);
  if (value.format !== "axm-aperture-world-selection-coordinate/1") errors.push(`${path}.format: unsupported format`);
  if (value.source_format !== "axm-aperture-selection-receipt/1") errors.push(`${path}.source_format: unsupported source format`);
  if (value.source_authority !== "selection_receipt_only") errors.push(`${path}.source_authority: authority upgrade refused`);
  if (typeof value.selection_id !== "string" || !SELECTION_ID.test(value.selection_id)) errors.push(`${path}.selection_id: invalid selection identity`);
  stringValue(value.story_package_id, `${path}.story_package_id`, errors);
  stringValue(value.work_id, `${path}.work_id`, errors);
  if (typeof value.mode !== "string" || !SELECTION_MODES.has(value.mode as ApertureSelectionMode)) errors.push(`${path}.mode: unsupported selection mode`);
  stringValue(value.selected_candidate_id, `${path}.selected_candidate_id`, errors);
  stringValue(value.scene_id, `${path}.scene_id`, errors);
  integerValue(value.canonical_start_us, `${path}.canonical_start_us`, errors);
  integerValue(value.canonical_end_us, `${path}.canonical_end_us`, errors, 1);
  if (Number.isSafeInteger(value.canonical_start_us)
      && Number.isSafeInteger(value.canonical_end_us)
      && Number(value.canonical_end_us) <= Number(value.canonical_start_us)) errors.push(`${path}: canonical interval is reversed or empty`);
  integerValue(value.candidate_count, `${path}.candidate_count`, errors, 1);
  stringList(value.reason_codes, `${path}.reason_codes`, errors);
  if (value.same_work_only !== true) errors.push(`${path}.same_work_only: cross-work selection refused`);
  digestValue(value.selection_digest, `${path}.selection_digest`, errors);
  return value as unknown as ApertureSelectionCoordinate;
}

export function validateApertureDaemonProjection(
  value: unknown,
  story: CanonicalStorySource,
  timedMedia: CanonicalStoryTimedMedia,
): ApertureDaemonProjectionValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isRecord(value)) return { ok: false, errors: ["root: expected a daemon projection object"] };
  exactKeys(value, ROOT_KEYS, "root", errors);
  if (value.format !== APERTURE_DAEMON_PROJECTION_FORMAT) errors.push("format: unsupported daemon projection format");
  if (value.authority !== "external_daemon_projection_only") errors.push("authority: World refuses daemon authority promotion");
  if (typeof value.state !== "string" || !DAEMON_STATES.has(value.state as ApertureDaemonState)) errors.push("state: unsupported daemon state");
  integerValue(value.observed_at_us, "observed_at_us", errors);
  stringValue(value.canonical_story_id, "canonical_story_id", errors, true);
  digestValue(value.canonical_story_digest, "canonical_story_digest", errors, true);
  stringValue(value.story_package_id, "story_package_id", errors, true);
  digestValue(value.story_package_digest, "story_package_digest", errors, true);
  stringValue(value.viewer_profile_id, "viewer_profile_id", errors, true);
  digestValue(value.viewer_profile_digest, "viewer_profile_digest", errors, true);
  stringValue(value.continuity_id, "continuity_id", errors, true);
  stringValue(value.work_id, "work_id", errors, true);
  const anchor = parseAnchor(value.anchor, "anchor", errors);
  const answer = parseAnswer(value.answer, "answer", errors);
  const selection = parseSelection(value.selection, "selection", errors);
  stringList(value.access_receipt_ids, "access_receipt_ids", errors);
  stringList(value.state_codes, "state_codes", errors);
  digestValue(value.projection_digest, "projection_digest", errors);

  const state = typeof value.state === "string" && DAEMON_STATES.has(value.state as ApertureDaemonState)
    ? value.state as ApertureDaemonState
    : null;
  const identityValues = [
    value.canonical_story_id,
    value.canonical_story_digest,
    value.story_package_id,
    value.story_package_digest,
    value.viewer_profile_id,
    value.viewer_profile_digest,
    value.work_id,
  ];
  const hasCompleteIdentity = identityValues.every((entry) => typeof entry === "string" && NON_EMPTY.test(entry));
  const hasAnyIdentity = identityValues.some((entry) => entry !== null);

  if (state === "ready" && !hasCompleteIdentity) errors.push("ready state requires complete story, package, viewer, and work identity");
  if ((state === "unavailable" || state === "unsupported") && hasAnyIdentity) errors.push(`${state} state must not retain partial authority identity`);
  if ((state === "unavailable" || state === "unsupported")
      && (anchor !== null || answer !== null || selection !== null)) errors.push(`${state} state must not retain anchor, answer, or selection coordinates`);
  if (state !== "unavailable" && state !== "unsupported" && !hasCompleteIdentity) errors.push(`${state ?? "unknown"} state requires complete scope identity`);

  const expectedStoryDigest = canonicalStoryDigest(story);
  if (timedMedia.storyDigest !== expectedStoryDigest) errors.push("timed media does not match the independently derived canonical story digest");
  if (value.canonical_story_id !== null && value.canonical_story_id !== story.identity.id) errors.push("canonical_story_id does not match the verified canonical story");
  if (value.canonical_story_digest !== null && value.canonical_story_digest !== expectedStoryDigest) errors.push("canonical_story_digest does not match the verified canonical story");

  if (anchor) {
    if (value.work_id !== null && anchor.work_id !== null && anchor.work_id !== value.work_id) errors.push("anchor work_id conflicts with daemon projection work_id");
    if (state === "ready" && anchor.state !== "resolved") errors.push("ready state requires a resolved anchor");
    if (anchor.state === "resolved" && anchor.clock.canonical_position_us === null) errors.push("resolved anchor requires canonical position");
    if (anchor.identity_standing !== "verified" || anchor.clock.mode !== "direct") {
      warnings.push("anchor is not verified direct evidence");
    }
    if (["manual", "predicted", "acoustic"].includes(anchor.clock.mode)) {
      warnings.push(`anchor clock is ${anchor.clock.mode}`);
    }
  } else if (state === "ready") {
    errors.push("ready state requires an anchor coordinate");
  }

  if (answer) {
    if (value.story_package_id !== null && answer.story_package_id !== value.story_package_id) errors.push("answer story package conflicts with daemon projection");
    if (value.canonical_story_digest !== null && answer.story_digest !== value.canonical_story_digest) errors.push("answer story digest conflicts with daemon projection");
    if (anchor && answer.anchor_id !== anchor.anchor_id) {
      if (state === "stale") warnings.push("answer coordinate is bound to an older anchor");
      else errors.push("answer anchor does not match the current anchor");
    }
  }

  if (selection) {
    if (value.story_package_id !== null && selection.story_package_id !== value.story_package_id) errors.push("selection story package conflicts with daemon projection");
    if (value.work_id !== null && selection.work_id !== value.work_id) errors.push("selection work conflicts with daemon projection");
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    projection: structuredClone(value) as unknown as ApertureDaemonProjection,
    warnings: [...new Set(warnings)],
  };
}

function formatTime(valueUs: number | null): string {
  if (valueUs === null) return "Unavailable";
  const totalSeconds = Math.floor(valueUs / 1_000_000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function confidence(value: number): string {
  return `${(value / 10_000).toFixed(2)}%`;
}

function daemonStateLabel(state: ApertureDaemonState): string {
  if (state === "ready") return "Ready coordinates";
  if (state === "unavailable") return "Daemon unavailable";
  if (state === "partial") return "Partial coordinates";
  if (state === "stale") return "Stale coordinates";
  if (state === "ambiguous") return "Ambiguous anchor";
  if (state === "conflict") return "Conflicting evidence";
  if (state === "refused") return "Daemon projection refused";
  return "Unsupported daemon state";
}

function storageFromEnvironment(): ApertureHostSessionStorage | null {
  if (typeof globalThis !== "object") return null;
  const candidate = (globalThis as { localStorage?: ApertureHostSessionStorage }).localStorage;
  return candidate ?? null;
}

function availableSurfaces(projection: ApertureDaemonProjection): ApertureHostSurface[] {
  const surfaces: ApertureHostSurface[] = [];
  if (projection.anchor) surfaces.push("position");
  if (projection.answer) surfaces.push("answer");
  if (projection.selection) surfaces.push("selection");
  surfaces.push("provenance");
  return surfaces;
}

function scopeFor(projection: ApertureDaemonProjection): ApertureHostSessionScope | null {
  if (!projection.story_package_digest || !projection.viewer_profile_digest) return null;
  return {
    storyPackageDigest: projection.story_package_digest,
    viewerProfileDigest: projection.viewer_profile_digest,
  };
}

function PositionSurface({ projection }: { projection: ApertureDaemonProjection }): JSX.Element {
  const anchor = projection.anchor;
  if (!anchor) return <p data-testid="aperture-host-position-empty">No anchor coordinate was supplied.</p>;
  return (
    <div data-testid="aperture-host-position" style={{ display: "grid", gap: 7 }}>
      <strong>{anchor.work_id ?? "Unbound work"}</strong>
      <span>{anchor.edition_id ?? "Unbound edition"}</span>
      <span>Anchor {anchor.state} · {anchor.identity_standing} · {confidence(anchor.identity_confidence_ppm)}</span>
      <span>Canonical {formatTime(anchor.clock.canonical_position_us)} · provider {formatTime(anchor.clock.provider_position_us)}</span>
      <span>Clock {anchor.clock.mode} · {confidence(anchor.clock.confidence_ppm)} · precision {anchor.clock.precision_us === null ? "unavailable" : `${anchor.clock.precision_us} us`}</span>
      <code style={{ overflowWrap: "anywhere" }}>{anchor.anchor_id}</code>
    </div>
  );
}

function AnswerSurface({ projection }: { projection: ApertureDaemonProjection }): JSX.Element {
  const answer = projection.answer;
  if (!answer) return <p data-testid="aperture-host-answer-empty">No answer plan coordinate was supplied.</p>;
  return (
    <div data-testid="aperture-host-answer" style={{ display: "grid", gap: 7 }}>
      <strong>{answer.receipt_id ? "Delivered answer receipt" : "Planned structured answer"}</strong>
      <span>{answer.delivered_fact_count} delivered facts · {answer.withheld_fact_count} withheld facts</span>
      <span>{answer.knowledge_event_count} attributed knowledge events</span>
      <code style={{ overflowWrap: "anywhere" }}>{answer.plan_id}</code>
      {answer.receipt_id && <code style={{ overflowWrap: "anywhere" }}>{answer.receipt_id}</code>}
      <small>World displays coordinates only. It stores no answer body or fact.</small>
    </div>
  );
}

function SelectionSurface({ projection }: { projection: ApertureDaemonProjection }): JSX.Element {
  const selection = projection.selection;
  if (!selection) return <p data-testid="aperture-host-selection-empty">No selection receipt coordinate was supplied.</p>;
  return (
    <div data-testid="aperture-host-selection" style={{ display: "grid", gap: 7 }}>
      <strong>{selection.mode.replace("_", " ")} · {selection.scene_id}</strong>
      <span>{formatTime(selection.canonical_start_us)}–{formatTime(selection.canonical_end_us)} · {selection.candidate_count} candidates</span>
      <span>{selection.reason_codes.join(" · ")}</span>
      <code style={{ overflowWrap: "anywhere" }}>{selection.selection_id}</code>
      <small>Selection is a receipt only. This host has no seek or player command.</small>
    </div>
  );
}

function ProvenanceSurface({ projection }: { projection: ApertureDaemonProjection }): JSX.Element {
  return (
    <div data-testid="aperture-host-provenance" style={{ display: "grid", gap: 7 }}>
      <span>Package {projection.story_package_id ?? "unavailable"}</span>
      <code style={{ overflowWrap: "anywhere" }}>{projection.story_package_digest ?? "no-package-digest"}</code>
      <span>Viewer {projection.viewer_profile_id ?? "unavailable"}</span>
      <code style={{ overflowWrap: "anywhere" }}>{projection.viewer_profile_digest ?? "no-viewer-digest"}</code>
      <span>{projection.access_receipt_ids.length} body-minimized access receipts</span>
      <span>{projection.state_codes.length > 0 ? projection.state_codes.join(" · ") : "No daemon state codes"}</span>
      <code style={{ overflowWrap: "anywhere" }}>{projection.projection_digest}</code>
    </div>
  );
}

function Refusal({ errors }: { errors: string[] }): JSX.Element {
  return (
    <section
      style={{ ...card, borderColor: "#83463f" }}
      role="alert"
      data-testid="aperture-host-refusal"
      data-daemon-state="refused"
    >
      <strong>Aperture daemon projection refused</strong>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        {errors.map((error) => <li key={error}>{error}</li>)}
      </ul>
      <small>World did not repair, store, or act on this projection.</small>
    </section>
  );
}

function Unavailable(): JSX.Element {
  return (
    <section
      style={{ ...card, borderColor: "#5b594d" }}
      role="status"
      data-testid="aperture-host"
      data-daemon-state="unavailable"
      data-session-restoration="fresh"
    >
      <strong>Aperture · daemon unavailable</strong>
      <p style={{ margin: 0 }}>Arc-reviewed story context remains available. No provider, viewer, answer, selection, or playback state was supplied by the external daemon.</p>
      <small>This state creates no ApertureHost session.</small>
    </section>
  );
}

function ValidatedApertureHost(props: {
  projection: ApertureDaemonProjection;
  warnings: string[];
  storage?: ApertureHostSessionStorage | null;
}): JSX.Element {
  const { projection, warnings, storage } = props;
  const surfaces = availableSurfaces(projection);
  const scope = scopeFor(projection);
  const resolvedStorage = storage === undefined ? storageFromEnvironment() : storage;
  const scopeKey = scope ? `${scope.storyPackageDigest}:${scope.viewerProfileDigest}` : "unscoped";
  const surfacesKey = surfaces.join("|");
  const loaded = useMemo(() => {
    if (!scope || !resolvedStorage) {
      return {
        session: null,
        restoration: "fresh" as ApertureHostSessionRestoration,
        reason: "none" as const,
      };
    }
    return loadApertureHostSession(resolvedStorage, scope, surfaces);
  }, [resolvedStorage, scopeKey, surfacesKey]);
  const initialSurface = loaded.session?.activeSurface ?? surfaces[0] ?? "provenance";
  const [localState, setLocalState] = useState({ scopeKey, activeSurface: initialSurface });
  const activeSurface = localState.scopeKey === scopeKey && surfaces.includes(localState.activeSurface)
    ? localState.activeSurface
    : initialSurface;

  useEffect(() => {
    if (localState.scopeKey !== scopeKey || !surfaces.includes(localState.activeSurface)) {
      setLocalState({ scopeKey, activeSurface: initialSurface });
    }
  }, [initialSurface, localState.activeSurface, localState.scopeKey, scopeKey, surfacesKey]);

  useEffect(() => {
    if (!scope || !resolvedStorage || localState.scopeKey !== scopeKey) return;
    saveApertureHostSession(resolvedStorage, {
      format: "rodoh-aperture-host-session/1",
      storyPackageDigest: scope.storyPackageDigest,
      viewerProfileDigest: scope.viewerProfileDigest,
      activeSurface,
    });
  }, [activeSurface, localState.scopeKey, resolvedStorage, scopeKey]);

  const selectSurface = (surface: ApertureHostSurface) => {
    if (!surfaces.includes(surface)) return;
    setLocalState({ scopeKey, activeSurface: surface });
  };

  const sessionRestoration = scope ? loaded.restoration : "fresh";
  const stateRole = ["conflict", "refused", "stale"].includes(projection.state) ? "alert" : "status";
  return (
    <section
      style={{ ...card, borderColor: projection.state === "ready" ? "#626b43" : "#7a673a" }}
      role={stateRole}
      data-testid="aperture-host"
      data-daemon-state={projection.state}
      data-session-restoration={sessionRestoration}
      data-active-surface={activeSurface}
      data-story-package-digest={projection.story_package_digest ?? ""}
      data-viewer-profile-digest={projection.viewer_profile_digest ?? ""}
    >
      <header>
        <strong style={{ font: "800 19px 'Barlow Condensed', sans-serif" }}>
          Aperture · {daemonStateLabel(projection.state)}
        </strong>
        <p style={{ margin: "5px 0 0", color: "#aaa691", fontSize: 10, lineHeight: 1.5 }}>
          External daemon projection · World presentation only · no ledger or playback authority
        </p>
      </header>

      {(projection.state !== "ready" || warnings.length > 0) && (
        <div data-testid="aperture-host-degradation" style={{ border: "1px solid #6c5a31", padding: 9 }}>
          <strong>{daemonStateLabel(projection.state)}</strong>
          {projection.state_codes.map((code) => <div key={code}>{code}</div>)}
          {warnings.map((warning) => <div key={warning}>{warning}</div>)}
        </div>
      )}

      {scope && (
        <nav aria-label="Aperture read-only surfaces" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {surfaces.map((surface) => (
            <button
              type="button"
              key={surface}
              onClick={() => selectSurface(surface)}
              aria-pressed={activeSurface === surface}
              data-testid={`aperture-host-tab-${surface}`}
              style={{
                border: `1px solid ${activeSurface === surface ? "#b6a963" : "#484638"}`,
                background: activeSurface === surface ? "#302d1c" : "#171812",
                color: "#ece4d4",
                padding: "7px 10px",
                cursor: "pointer",
              }}
            >
              {surface}
            </button>
          ))}
        </nav>
      )}

      {sessionRestoration === "reset" && (
        <p data-testid="aperture-host-session-reset" style={{ margin: 0, color: "#d4b973" }}>
          A stale or invalid local presentation session was reset. No daemon or viewer record changed.
        </p>
      )}

      {activeSurface === "position" && <PositionSurface projection={projection} />}
      {activeSurface === "answer" && <AnswerSurface projection={projection} />}
      {activeSurface === "selection" && <SelectionSurface projection={projection} />}
      {activeSurface === "provenance" && <ProvenanceSurface projection={projection} />}

      <footer style={{ borderTop: "1px solid #34352a", paddingTop: 9, color: "#898676", fontSize: 9, lineHeight: 1.55 }}>
        Package and viewer digests scope only this host’s presentation preference. Canonical story, timed-media, exposure, knowledge, answer, selection, and playback records remain external and unchanged.
      </footer>
    </section>
  );
}

export function ApertureHost({ story, timedMedia, daemonProjection, storage }: Props): JSX.Element {
  if (daemonProjection === undefined || daemonProjection === null) return <Unavailable />;
  const validation = validateApertureDaemonProjection(daemonProjection, story, timedMedia);
  if (!validation.ok) return <Refusal errors={validation.errors} />;
  return (
    <ValidatedApertureHost
      projection={validation.projection}
      warnings={validation.warnings}
      storage={storage}
    />
  );
}

import type { InfiniteFabricWorld } from "../contracts.js";
import { IndexedDbFabricWorldStore } from "../runtime/persistent-store.js";
import { sealWorldRevision } from "../runtime/revision.js";
import { createFirstCharterTinyWorld } from "../tiny-world/first-charter-world.js";
import {
  CLASSIC_TRIAL_IDS,
  type ClassicTrialId,
} from "./catalog.js";

const PROGRESS_KEY = "axm:first-charter:classic-trials:v0";

export interface ClassicSuiteProgress {
  format: "axm-first-charter-classic-suite-progress/0";
  completed: ClassicTrialId[];
  highScores: Partial<Record<ClassicTrialId, number>>;
  attempts: Partial<Record<ClassicTrialId, number>>;
  lastTrialId: ClassicTrialId | null;
  updatedAt: string;
}

export interface ClassicTrialCompletionResult {
  progress: ClassicSuiteProgress;
  worldRevisionSha256?: string;
  worldLedgerEventId?: string;
  warning?: string;
}

function emptyProgress(): ClassicSuiteProgress {
  return {
    format: "axm-first-charter-classic-suite-progress/0",
    completed: [],
    highScores: {},
    attempts: {},
    lastTrialId: null,
    updatedAt: new Date(0).toISOString(),
  };
}

function isTrialId(value: unknown): value is ClassicTrialId {
  return typeof value === "string" && (CLASSIC_TRIAL_IDS as readonly string[]).includes(value);
}

function sanitizeScoreMap(value: unknown): Partial<Record<ClassicTrialId, number>> {
  if (!value || typeof value !== "object") return {};
  const out: Partial<Record<ClassicTrialId, number>> = {};
  for (const [key, score] of Object.entries(value)) {
    if (isTrialId(key) && typeof score === "number" && Number.isFinite(score) && score >= 0) {
      out[key] = Math.floor(score);
    }
  }
  return out;
}

export function loadClassicSuiteProgress(storage: Storage = localStorage): ClassicSuiteProgress {
  const raw = storage.getItem(PROGRESS_KEY);
  if (!raw) return emptyProgress();
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const completed = Array.isArray(parsed.completed)
      ? parsed.completed.filter(isTrialId)
      : [];
    const uniqueCompleted = CLASSIC_TRIAL_IDS.filter((id) => completed.includes(id));
    return {
      format: "axm-first-charter-classic-suite-progress/0",
      completed: uniqueCompleted,
      highScores: sanitizeScoreMap(parsed.highScores),
      attempts: sanitizeScoreMap(parsed.attempts),
      lastTrialId: isTrialId(parsed.lastTrialId) ? parsed.lastTrialId : null,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
    };
  } catch {
    return emptyProgress();
  }
}

export function saveClassicSuiteProgress(
  progress: ClassicSuiteProgress,
  storage: Storage = localStorage,
): void {
  storage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export function recordClassicTrialAttempt(
  trialId: ClassicTrialId,
  storage: Storage = localStorage,
): ClassicSuiteProgress {
  const current = loadClassicSuiteProgress(storage);
  const next: ClassicSuiteProgress = {
    ...current,
    attempts: {
      ...current.attempts,
      [trialId]: (current.attempts[trialId] ?? 0) + 1,
    },
    lastTrialId: trialId,
    updatedAt: new Date().toISOString(),
  };
  saveClassicSuiteProgress(next, storage);
  return next;
}

function completedQuestState(world: InfiniteFabricWorld, completed: readonly ClassicTrialId[]): void {
  const quest = world.cells
    .flatMap((cell) => cell.entities)
    .find((entity) => entity.id === "entity:quest:first-contract");
  if (!quest) return;
  quest.state.classicTrialsCompleted = [...completed];
  quest.state.classicTrialsTotal = CLASSIC_TRIAL_IDS.length;
  quest.state.classicSuiteComplete = completed.length === CLASSIC_TRIAL_IDS.length;
  if (completed.length === CLASSIC_TRIAL_IDS.length) quest.state.status = "resolved";
}

async function recordCompletionInWorld(
  trialId: ClassicTrialId,
  score: number,
  completed: readonly ClassicTrialId[],
): Promise<{ revisionSha256: string; eventId: string }> {
  const store = new IndexedDbFabricWorldStore();
  try {
    await store.open();
    let world = await store.current("world:tiny-planet");
    if (!world) {
      world = await createFirstCharterTinyWorld();
      await store.put(world);
    }

    const duplicate = world.ledger.events.find((event) =>
      event.type === "story.classic-trial.completed"
      && event.data.trialId === trialId);
    if (duplicate) {
      return { revisionSha256: world.revisionSha256, eventId: duplicate.id };
    }

    const parentRevisionSha256 = world.revisionSha256;
    const next = structuredClone(world) as InfiniteFabricWorld;
    completedQuestState(next, completed);
    const eventId = `event:story:classic-trial:${trialId}`;
    next.ledger.events.push({
      id: eventId,
      sequence: next.ledger.events.length,
      type: "story.classic-trial.completed",
      actorRef: "player:home",
      targetRefs: [`trial:${trialId}`, "story:first-charter:classic-suite"],
      data: {
        trialId,
        score,
        completedCount: completed.length,
        suiteComplete: completed.length === CLASSIC_TRIAL_IDS.length,
      },
      worldRevisionSha256: parentRevisionSha256,
    });
    if (completed.length === CLASSIC_TRIAL_IDS.length) {
      next.ledger.events.push({
        id: "event:story:classic-suite:completed",
        sequence: next.ledger.events.length,
        type: "story.classic-suite.completed",
        actorRef: "player:home",
        targetRefs: ["story:first-charter:classic-suite"],
        data: {
          sealsRestored: CLASSIC_TRIAL_IDS.length,
          archiveOpen: true,
        },
        worldRevisionSha256: parentRevisionSha256,
      });
    }

    const sealed = await sealWorldRevision(next);
    await store.put(sealed, parentRevisionSha256);
    return { revisionSha256: sealed.revisionSha256, eventId };
  } finally {
    store.close();
  }
}

export async function recordClassicTrialCompletion(
  trialId: ClassicTrialId,
  score: number,
  storage: Storage = localStorage,
): Promise<ClassicTrialCompletionResult> {
  const current = loadClassicSuiteProgress(storage);
  const completed = current.completed.includes(trialId)
    ? current.completed
    : CLASSIC_TRIAL_IDS.filter((id) => current.completed.includes(id) || id === trialId);
  const next: ClassicSuiteProgress = {
    ...current,
    completed,
    highScores: {
      ...current.highScores,
      [trialId]: Math.max(score, current.highScores[trialId] ?? 0),
    },
    lastTrialId: trialId,
    updatedAt: new Date().toISOString(),
  };
  saveClassicSuiteProgress(next, storage);

  try {
    const world = await recordCompletionInWorld(trialId, score, completed);
    return {
      progress: next,
      worldRevisionSha256: world.revisionSha256,
      worldLedgerEventId: world.eventId,
    };
  } catch (error) {
    return {
      progress: next,
      warning: error instanceof Error ? error.message : String(error),
    };
  }
}

export function resetClassicSuiteProgress(storage: Storage = localStorage): void {
  storage.removeItem(PROGRESS_KEY);
}

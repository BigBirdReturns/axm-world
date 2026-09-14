import { cartridgeDigest } from "../../engine/cartridge-digest.js";
import {
  buildStrategyBoardRuntimeRun,
  parseRuntimeRun,
  type RuntimeRunV1,
} from "../../engine/runtime-run.js";
import {
  advanceStrategyPhase,
  applyLegalStrategyAction,
  initialStrategyExecutionState,
  type StrategyExecutionState,
  type StrategyInput,
} from "../../engine/strategy-board/index.js";
import {
  nextStrategyBoardDriverInput,
  type StrategyBoardDriverContract,
} from "../../engine/strategy-board/driver.js";
import { requireSelectedStrategyBoardProgram, type StrategyBoardProgram } from "../../engine/strategy-board/program.js";
import type { Arc } from "../../engine/types.js";
import type { KVStorage } from "../save.js";
import { storageWriteFailure, type StorageWriteResult } from "../storage-result.js";

export const STRATEGY_RUNTIME_RUN_KEY_PREFIX = "axm-world:runtime-run:v1:";
const AUTOMATIC_PHASES = new Set(["quarterStart", "milestoneAttempt", "receiptLedger"]);

export interface StrategyBoardSession {
  run: RuntimeRunV1;
  state: StrategyExecutionState;
  seatIds: string[];
  inputs: StrategyInput[];
}

export function strategyRuntimeRunKeyFor(authoredArcDigest: string): string {
  return `${STRATEGY_RUNTIME_RUN_KEY_PREFIX}${authoredArcDigest}`;
}
function applyInput(
  program: StrategyBoardProgram,
  state: StrategyExecutionState,
  input: StrategyInput,
): StrategyExecutionState {
  return input.type === "advance"
    ? advanceStrategyPhase(program.definition, state, input.destinationSpaceId)
    : applyLegalStrategyAction(program.definition, state, input);
}

function settleAutomatic(
  program: StrategyBoardProgram,
  driver: StrategyBoardDriverContract | null,
  state: StrategyExecutionState,
  inputs: StrategyInput[],
): { state: StrategyExecutionState; inputs: StrategyInput[] } {
  let next = state;
  const trace = [...inputs];
  let guard = 0;
  while (!next.execution.terminal) {
    if (++guard > 64) throw new Error("Strategy-board automatic circulation exceeded its bound.");
    if (AUTOMATIC_PHASES.has(next.phase)) {
      const input: StrategyInput = { type: "advance" };
      next = applyInput(program, next, input);
      trace.push(input);
      continue;
    }
    const input = driver
      ? nextStrategyBoardDriverInput(program.definition, next, driver)
      : null;
    if (!input) break;
    next = applyInput(program, next, input);
    trace.push(structuredClone(input));
  }
  return { state: next, inputs: trace };
}

function materialize(
  arc: Arc,
  seatIds: string[],
  inputs: StrategyInput[],
  extensions: RuntimeRunV1["extensions"] = {},
): StrategyBoardSession {
  const run = buildStrategyBoardRuntimeRun({ arc, seatIds, inputs, extensions });
  const restored = parseRuntimeRun(run);
  return {
    run: restored.run,
    state: restored.state,
    seatIds: [...restored.run.runtime.seatIds],
    inputs: structuredClone(restored.run.runtime.inputs),
  };
}
export function createStrategyBoardSession(
  arc: Arc,
  program: StrategyBoardProgram,
  seatIds: string[],
  driver: StrategyBoardDriverContract | null = null,
): StrategyBoardSession {
  const initial = initialStrategyExecutionState(program.definition, seatIds, program.executionRules);
  const settled = settleAutomatic(program, driver, initial, []);
  return materialize(arc, seatIds, settled.inputs);
}

export function settleStrategyBoardSession(
  arc: Arc,
  program: StrategyBoardProgram,
  session: StrategyBoardSession,
  driver: StrategyBoardDriverContract | null,
): StrategyBoardSession {
  const settled = settleAutomatic(program, driver, session.state, session.inputs);
  return settled.inputs.length === session.inputs.length
    ? session
    : materialize(arc, session.seatIds, settled.inputs, session.run.extensions);
}

export function applyStrategyBoardSessionInput(
  arc: Arc,
  program: StrategyBoardProgram,
  session: StrategyBoardSession,
  input: StrategyInput,
  driver: StrategyBoardDriverContract | null = null,
): StrategyBoardSession {
  const next = applyInput(program, session.state, input);
  const trace = [...session.inputs, structuredClone(input)];
  const settled = settleAutomatic(program, driver, next, trace);
  return materialize(arc, session.seatIds, settled.inputs, session.run.extensions);
}

export function saveStrategyBoardSession(
  storage: KVStorage,
  session: StrategyBoardSession,
): StorageWriteResult {
  try {
    storage.setItem(strategyRuntimeRunKeyFor(session.run.authoredArcDigest), JSON.stringify(session.run));
    return { ok: true };
  } catch (error) {
    return storageWriteFailure(error, "Saving the Strategy Board runtime run");
  }
}
export type StrategyBoardSessionLoadResult =
  | { kind: "none" }
  | { kind: "ok"; session: StrategyBoardSession }
  | { kind: "invalid"; error: string };

export function inspectStrategyBoardSession(
  storage: KVStorage,
  arc: Arc,
): StrategyBoardSessionLoadResult {
  const digest = cartridgeDigest(arc);
  const raw = storage.getItem(strategyRuntimeRunKeyFor(digest));
  if (!raw) return { kind: "none" };
  try {
    const restored = parseRuntimeRun(raw);
    if (restored.authoredArcDigest !== digest) {
      return { kind: "invalid", error: "Stored Strategy Board run names a different cartridge identity." };
    }
    return { kind: "ok", session: {
      run: restored.run,
      state: restored.state,
      seatIds: [...restored.run.runtime.seatIds],
      inputs: structuredClone(restored.run.runtime.inputs),
    } };
  } catch (error) {
    return { kind: "invalid", error: error instanceof Error ? error.message : String(error) };
  }
}

export function loadStrategyBoardSession(storage: KVStorage, arc: Arc): StrategyBoardSession | null {
  const result = inspectStrategyBoardSession(storage, arc);
  return result.kind === "ok" ? result.session : null;
}

export function clearStrategyBoardSession(
  storage: KVStorage,
  authoredArcDigest: string,
): StorageWriteResult {
  try {
    storage.removeItem(strategyRuntimeRunKeyFor(authoredArcDigest));
    return { ok: true };
  } catch (error) {
    return storageWriteFailure(error, "Clearing the Strategy Board runtime run");
  }
}

export function downloadStrategyBoardRuntimeRun(run: RuntimeRunV1): void {
  const blob = new Blob([`${JSON.stringify(run, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${run.arc.meta.id}.runtime.run.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

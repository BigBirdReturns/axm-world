import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { validateArc } from "../../src/engine/schema.js";
import {
  RUNTIME_FAMILY_EXTENSION_KEY,
  RUNTIME_FAMILY_FORMAT,
} from "../../src/engine/runtime-family.js";
import { parseRuntimeRun } from "../../src/engine/runtime-run.js";
import type { KVStorage } from "../../src/world/save.js";
import { StrategyBoardRuntime } from "../../src/world/runtime/StrategyBoardRuntime.js";
import {
  applyStrategyBoardSessionInput,
  createStrategyBoardSession,
  inspectStrategyBoardSession,
  loadStrategyBoardSession,
  saveStrategyBoardSession,
  strategyRuntimeRunKeyFor,
} from "../../src/world/runtime/strategy-board-session.js";
import { DISPATCH_RUNTIME_ARC } from "../fixtures/runtime-family-arc.js";
import {
  STRATEGY_BOARD_TEST_PROGRAM,
  strategyBoardProgramExtension,
} from "../fixtures/strategy-board-program.js";
const program = STRATEGY_BOARD_TEST_PROGRAM;
const arc = validateArc({
  ...structuredClone(DISPATCH_RUNTIME_ARC),
  meta: { ...DISPATCH_RUNTIME_ARC.meta, id: "world-strategy-runtime", name: "World Strategy Runtime" },
  extensions: {
    [RUNTIME_FAMILY_EXTENSION_KEY]: { format: RUNTIME_FAMILY_FORMAT, family: "strategy-board" },
    ...strategyBoardProgramExtension(),
  },
});

class MemoryStorage implements KVStorage {
  private values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

class FailingStorage extends MemoryStorage {
  override setItem(): void { throw new Error("quota refused"); }
}

describe("generic Strategy Board World host custody", () => {
  it("starts at the first player decision and records resolver-only advances", () => {
    const session = createStrategyBoardSession(arc, program, ["seat-1", "seat-2"]);
    expect(session.state.phase).toBe("movementResolution");
    expect(session.state.quarter).toBe(1);
    expect(session.state.activeSeatIndex).toBe(0);
    expect(session.inputs).toEqual([{ type: "advance" }]);
    expect(parseRuntimeRun(session.run).state).toEqual(session.state);
  });

  it("persists an exact replay trace across movement, purchase, action, reaction and resume", () => {
    let session = createStrategyBoardSession(arc, program, ["seat-1", "seat-2"]);
    session = applyStrategyBoardSessionInput(arc, program, session, { type: "advance", destinationSpaceId: "market" });
    session = applyStrategyBoardSessionInput(arc, program, session, {
      type: "action", seatId: "seat-1", kind: "purchase", refId: "lease",
    });
    session = applyStrategyBoardSessionInput(arc, program, session, {
      type: "action", seatId: "seat-1", kind: "programAction", refId: "invest",
    });
    session = applyStrategyBoardSessionInput(arc, program, session, {
      type: "action", seatId: "seat-2", kind: "pass", refId: null,
    });

    expect(session.state.phase).toBe("movementResolution");
    expect(session.state.activeSeatIndex).toBe(1);
    expect(session.state.ownership.lease).toBe("seat-1");
    expect(session.state.seats[0]!.balances).toEqual({ coin: 7, standing: 1 });
    expect(session.state.execution.ledger.map((event) => event.kind)).toEqual(["purchase", "programActionCost", "programActionYield"]);

    const storage = new MemoryStorage();
    expect(saveStrategyBoardSession(storage, session)).toEqual({ ok: true });
    expect(loadStrategyBoardSession(storage, arc)).toEqual(session);
  });
  it("fails closed on corrupt held runtime memory instead of silently starting over", () => {
    const storage = new MemoryStorage();
    const session = createStrategyBoardSession(arc, program, ["seat-1", "seat-2"]);
    expect(saveStrategyBoardSession(storage, session)).toEqual({ ok: true });
    const key = strategyRuntimeRunKeyFor(session.run.authoredArcDigest);
    const corrupted = JSON.parse(storage.getItem(key)!) as Record<string, any>;
    corrupted.runtime.inputs.push({ type: "advance", destinationSpaceId: "missing" });
    storage.setItem(key, JSON.stringify(corrupted));
    expect(inspectStrategyBoardSession(storage, arc)).toMatchObject({ kind: "invalid" });

    const html = renderToStaticMarkup(createElement(StrategyBoardRuntime, {
      arc, program, storage, onExit: () => undefined,
    }));
    expect(html).toContain('data-testid="strategy-board-runtime-refusal"');
    expect(html).toContain("Stored Strategy Board run refused");
    expect(html).not.toContain('data-testid="strategy-space-home"');
  });

  it("does not claim durability when storage rejects a write", () => {
    const session = createStrategyBoardSession(arc, program, ["seat-1", "seat-2"]);
    const result = saveStrategyBoardSession(new FailingStorage(), session);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("quota refused");
  });
  it("renders the generic host directly with exportable runtime custody", () => {
    const html = renderToStaticMarkup(createElement(StrategyBoardRuntime, {
      arc, program, storage: null, onExit: () => undefined,
    }));
    expect(html).toContain('data-testid="strategy-board-runtime"');
    expect(html).toContain('data-testid="strategy-space-home"');
    expect(html).toContain('data-testid="strategy-space-market"');
    expect(html).toContain('data-testid="strategy-export-run"');
    expect(html).toContain('data-reachable="true"');
    expect(html).not.toContain('data-testid="engine-shell"');
  });
});

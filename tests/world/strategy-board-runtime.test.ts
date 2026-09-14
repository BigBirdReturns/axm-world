import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  applyLegalStrategyAction,
  advanceStrategyPhase,
  listExecutableStrategyActions,
} from "../../src/engine/strategy-board/index.js";
import {
  createStrategyBoardRuntimeState,
  settleAutomaticStrategyPhases,
  StrategyBoardRuntime,
} from "../../src/world/runtime/StrategyBoardRuntime.js";
import { STRATEGY_BOARD_TEST_PROGRAM } from "../fixtures/strategy-board-program.js";

const program = STRATEGY_BOARD_TEST_PROGRAM;

describe("generic Strategy Board World host", () => {
  it("enters at the first player choice rather than exposing resolver phases", () => {
    const state = createStrategyBoardRuntimeState(program);
    expect(state.phase).toBe("movementResolution");
    expect(state.quarter).toBe(1);
    expect(state.activeSeatIndex).toBe(0);
    expect(state.execution.positions).toEqual({ "seat-1": "home", "seat-2": "home" });
    expect(state.execution.ledger).toEqual([]);
  });
  it("runs one turn through authored movement, purchase, action, reaction and receipts", () => {
    let state = createStrategyBoardRuntimeState(program);
    state = advanceStrategyPhase(program.definition, state, "market");
    expect(state.phase).toBe("buyAuctionPass");
    expect(listExecutableStrategyActions(program.definition, state).map((action) => action.kind)).toEqual(["purchase", "pass"]);

    state = applyLegalStrategyAction(program.definition, state, {
      type: "action", seatId: "seat-1", kind: "purchase", refId: "lease",
    });
    expect(state.ownership.lease).toBe("seat-1");
    expect(state.seats[0]!.balances.coin).toBe(8);

    state = applyLegalStrategyAction(program.definition, state, {
      type: "action", seatId: "seat-1", kind: "programAction", refId: "invest",
    });
    expect(state.seats[0]!.balances).toEqual({ coin: 7, standing: 1 });
    expect(state.phase).toBe("reactionInterference");

    state = applyLegalStrategyAction(program.definition, state, {
      type: "action", seatId: "seat-2", kind: "pass", refId: null,
    });
    state = settleAutomaticStrategyPhases(program, state);
    expect(state.phase).toBe("movementResolution");
    expect(state.activeSeatIndex).toBe(1);
    expect(state.execution.ledger.map((event) => event.kind)).toEqual(["purchase", "programActionCost", "programActionYield"]);
  });
  it("renders the generic board directly", () => {
    const html = renderToStaticMarkup(createElement(StrategyBoardRuntime, {
      program,
      onExit: () => undefined,
    }));
    expect(html).toContain('data-testid="strategy-board-runtime"');
    expect(html).toContain('data-testid="strategy-space-home"');
    expect(html).toContain('data-testid="strategy-space-market"');
    expect(html).toContain('data-reachable="true"');
    expect(html).not.toContain('data-testid="engine-shell"');
  });
});

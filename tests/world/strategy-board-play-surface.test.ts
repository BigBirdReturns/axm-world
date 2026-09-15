import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { validateArc } from "../../src/engine/schema.js";
import { RUNTIME_FAMILY_EXTENSION_KEY, RUNTIME_FAMILY_FORMAT } from "../../src/engine/runtime-family.js";
import { StrategyBoardRuntime } from "../../src/world/runtime/StrategyBoardRuntime.js";
import { DISPATCH_RUNTIME_ARC } from "../fixtures/runtime-family-arc.js";
import {
  STRATEGY_BOARD_TEST_PROGRAM,
  strategyBoardProgramExtension,
} from "../fixtures/strategy-board-program.js";

const arc = validateArc({
  ...structuredClone(DISPATCH_RUNTIME_ARC),
  meta: { ...DISPATCH_RUNTIME_ARC.meta, id: "strategy-play-surface" },
  extensions: {
    [RUNTIME_FAMILY_EXTENSION_KEY]: { format: RUNTIME_FAMILY_FORMAT, family: "strategy-board" },
    ...strategyBoardProgramExtension(),
  },
});

describe("Strategy Board play surface", () => {
  it("puts stakes and the current decision ahead of implementation telemetry", () => {
    const html = renderToStaticMarkup(createElement(StrategyBoardRuntime, {
      arc,
      program: STRATEGY_BOARD_TEST_PROGRAM,
      storage: null,
      onExit: () => undefined,
    }));

    expect(html).toContain('data-testid="strategy-race"');
    expect(html).toContain('data-testid="strategy-turn-prompt"');
    expect(html).toContain("Reach your ending before the other side reaches theirs.");
    expect(html).toContain("Choose where to exert pressure");
    expect(html).toContain("Operator");
    expect(html).toContain('data-reachable="true"');
    expect(html).toContain('data-testid="strategy-move-hold"');
    expect(html).toContain("Hold at Home");
    expect(html).not.toContain("Active: seat-1");
    expect(html).not.toContain("Acting: seat-1");
  });
});

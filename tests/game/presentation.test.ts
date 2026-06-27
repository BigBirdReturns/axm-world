import { describe, expect, it } from "vitest";
import { FIRST_CHARTER } from "../../src/arcs/index.js";
import { STATE_ARC } from "../fixtures/state-arc.js";
import {
  isPresentationId,
  preferredPresentationForArc,
  presentationOption,
} from "../../src/game/lib/presentation.js";

describe("presentation costumes", () => {
  it("prefers the reusable table costume for tiered management arcs", () => {
    expect(preferredPresentationForArc(FIRST_CHARTER)).toBe("table");
  });

  it("falls back to the flat map for arcs without a progression board", () => {
    expect(preferredPresentationForArc(STATE_ARC)).toBe("map");
  });

  it("validates and resolves presentation identifiers", () => {
    expect(isPresentationId("globe")).toBe(true);
    expect(isPresentationId("planet")).toBe(false);
    expect(presentationOption("table").dimensionality).toBe("2.5D");
  });
});

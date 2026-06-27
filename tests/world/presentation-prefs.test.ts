import { describe, expect, it } from "vitest";
import { FIRST_CHARTER } from "../../src/arcs/index.js";
import { isCostumeId, preferredCostumeForArc } from "../../src/world/presentation-prefs.js";

describe("costume preference", () => {
  it("prefers the board for tiered management arcs", () => {
    expect(preferredCostumeForArc(FIRST_CHARTER)).toBe("board");
  });

  it("validates costume identifiers", () => {
    expect(isCostumeId("globe")).toBe(true);
    expect(isCostumeId("board")).toBe(true);
    expect(isCostumeId("planet")).toBe(false);
    expect(isCostumeId(null)).toBe(false);
  });
});

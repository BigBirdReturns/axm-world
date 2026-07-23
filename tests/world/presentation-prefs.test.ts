import { describe, expect, it } from "vitest";
import { FIRST_CHARTER, LAMP_DISTRICT } from "../../src/arcs/index.js";
import { isCostumeId, preferredCostumeForArc } from "../../src/world/presentation-prefs.js";

describe("costume preference", () => {
  it("prefers the board for tiered management arcs", () => {
    expect(preferredCostumeForArc(FIRST_CHARTER)).toBe("board");
  });

  it("prefers the Underworld for Dark Tomb cartridges", () => {
    expect(preferredCostumeForArc(LAMP_DISTRICT)).toBe("underworld");
  });

  it("validates costume identifiers", () => {
    expect(isCostumeId("globe")).toBe(true);
    expect(isCostumeId("board")).toBe(true);
    expect(isCostumeId("underworld")).toBe(true);
    expect(isCostumeId("planet")).toBe(false);
    expect(isCostumeId(null)).toBe(false);
  });
});

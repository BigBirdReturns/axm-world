import { describe, expect, it } from "vitest";
import { FIRST_CHARTER, KARAZHAN } from "../../src/arcs/index.js";
import { isCostumeId, preferredCostumeForArc } from "../../src/world/presentation-prefs.js";

describe("costume preference", () => {
  it("lets each cartridge theme choose its honest first-minute representation", () => {
    expect(preferredCostumeForArc(FIRST_CHARTER)).toBe("globe");
    expect(preferredCostumeForArc(KARAZHAN)).toBe("board");
  });

  it("validates costume identifiers", () => {
    expect(isCostumeId("globe")).toBe(true);
    expect(isCostumeId("board")).toBe(true);
    expect(isCostumeId("planet")).toBe(false);
    expect(isCostumeId(null)).toBe(false);
  });
});

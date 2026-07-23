import { describe, expect, it } from "vitest";
import { LAMP_DISTRICT } from "../../src/arcs/lamp-district.js";
import {
  BUNDLED_CARTRIDGES,
  LAMP_DISTRICT_CARTRIDGE,
  LAMP_DISTRICT_PEOPLE,
} from "../../src/world/cartridge.js";
import { PROGRAM_004, programForCartridge } from "../../src/world/program-of-record.js";
import { preferredCostumeForArc } from "../../src/world/presentation-prefs.js";
import { cartridgePaletteScope, themeForArc } from "../../src/world/themes/select.js";

describe("Lamp District World cartridge", () => {
  it("remains the fourth first-party cartridge with authored residents", () => {
    expect(BUNDLED_CARTRIDGES.map((cartridge) => cartridge.manifest.id)).toEqual([
      "first-charter",
      "karazhan",
      "kind-gods-of-ilyon",
      "lamp-district",
      "relief-circuit",
    ]);
    expect(LAMP_DISTRICT_CARTRIDGE.arc).toBe(LAMP_DISTRICT);
    expect(LAMP_DISTRICT_PEOPLE.map((person) => person.id)).toEqual(["anja-vei", "black-lamp-nine"]);
  });

  it("binds Program 004 to the exact cartridge and Underworld surface", () => {
    expect(PROGRAM_004.programId).toBe("program-004");
    expect(PROGRAM_004.cartridgeId).toBe("lamp-district");
    expect(PROGRAM_004.runtimeSurfaces).toContain("underworld");
    expect(PROGRAM_004.entryExperience).toBe("direct-to-runtime");
    expect(programForCartridge(LAMP_DISTRICT_CARTRIDGE)).toBe(PROGRAM_004);
  });

  it("prefers and scopes the cartridge-owned Underworld presentation", () => {
    expect(preferredCostumeForArc(LAMP_DISTRICT)).toBe("underworld");
    expect(cartridgePaletteScope(LAMP_DISTRICT)).toBe("lamp-district");
    expect(themeForArc(LAMP_DISTRICT).id).toBe("lamp-district");
  });
});

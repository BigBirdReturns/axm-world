import { describe, it, expect } from "vitest";
import { hallSteward } from "../../src/world/inhabited/people";
import { FIRST_CHARTER_CARTRIDGE, KARAZHAN_CARTRIDGE } from "../../src/world/cartridge";
import { cartridgeIdentity } from "../../src/world/cartridge-identity";

describe("hallSteward — the authored person the hall surfaces", () => {
  it("returns the First Charter's authored steward (name, role, bio, spoken lines)", () => {
    const steward = hallSteward(FIRST_CHARTER_CARTRIDGE);
    expect(steward).not.toBeNull();
    expect(steward!.name).toBe("Maren Vos");
    expect(steward!.role).toBe("Charter-Keeper");
    expect(steward!.bio.length).toBeGreaterThan(0);
    expect(steward!.greeting.length).toBeGreaterThan(0);
    expect(steward!.fulfilledLine.length).toBeGreaterThan(0);
  });

  it("returns null for a cartridge that authors no people (hall uses a generic steward)", () => {
    expect(hallSteward(KARAZHAN_CARTRIDGE)).toBeNull();
  });

  it("authored people are cartridge-layer data — they do NOT change the computed identity", () => {
    // Identity is cartridgeDigest(arc); the authored people ride in the envelope,
    // so a cartridge with people resolves to the same identity as its bare arc.
    expect(cartridgeIdentity(FIRST_CHARTER_CARTRIDGE)).toBe(cartridgeIdentity({ ...FIRST_CHARTER_CARTRIDGE, people: undefined }));
  });
});

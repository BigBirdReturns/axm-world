import { describe, it, expect } from "vitest";
import { hallSteward } from "../../src/world/inhabited/people";
import { FIRST_CHARTER_CARTRIDGE, KARAZHAN_CARTRIDGE, parseCartridge, type AuthoredPerson } from "../../src/world/cartridge";
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

  it("returns Karazhan's authored warden — the second cartridge is now first-class, not a generic fallback", () => {
    // Dignity pass: Karazhan authors its own steward, proving the directing
    // primitive generalizes beyond First Charter. Different fiction, same shape.
    const steward = hallSteward(KARAZHAN_CARTRIDGE);
    expect(steward).not.toBeNull();
    expect(steward!.name).toBe("Aldous Venn");
    expect(steward!.role).toBe("Warden of the Violet Eye");
    expect(steward!.bio.length).toBeGreaterThan(0);
    expect(steward!.greeting.length).toBeGreaterThan(0);
    expect(steward!.fulfilledLine.length).toBeGreaterThan(0);
    // A genuinely DIFFERENT person, not a First Charter reskin.
    expect(steward!.name).not.toBe(hallSteward(FIRST_CHARTER_CARTRIDGE)!.name);
  });

  it("a cartridge that authors no people falls back to a generic runtime steward (null)", () => {
    // The fallback still exists — an imported arc with no authored envelope.
    const bare = parseCartridge(KARAZHAN_CARTRIDGE.arc);
    expect(hallSteward(bare)).toBeNull();
  });

  it("authored people are cartridge-layer data — they do NOT change the computed identity", () => {
    // Identity is cartridgeDigest(arc); the authored people ride in the envelope,
    // so a cartridge with people resolves to the same identity as its bare arc.
    expect(cartridgeIdentity(FIRST_CHARTER_CARTRIDGE)).toBe(cartridgeIdentity({ ...FIRST_CHARTER_CARTRIDGE, people: undefined }));
    // Same invariant for Karazhan's new authored people + opening.
    expect(cartridgeIdentity(KARAZHAN_CARTRIDGE)).toBe(cartridgeIdentity({ ...KARAZHAN_CARTRIDGE, people: undefined, opening: undefined }));
  });

  it("parseCartridge preserves authored people (and opening) from a full envelope", () => {
    const people: AuthoredPerson[] = [
      { id: "p1", name: "Test Person", role: "Tester", bio: "b", greeting: "g", fulfilledLine: "f" },
    ];
    const parsed = parseCartridge({
      manifest: { id: "ignored" },
      arc: FIRST_CHARTER_CARTRIDGE.arc,
      people,
      opening: FIRST_CHARTER_CARTRIDGE.opening,
    });
    // The forward-compat envelope path must not silently drop authored data.
    expect(hallSteward(parsed)).toEqual(people[0]);
    expect(parsed.opening).toBe(FIRST_CHARTER_CARTRIDGE.opening);
  });
});

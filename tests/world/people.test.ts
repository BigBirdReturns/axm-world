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

  it("returns The Waking Tower's authored warden — the second cartridge is now first-class, not a generic fallback", () => {
    // Dignity pass: The Waking Tower authors its own steward, proving the directing
    // primitive generalizes beyond First Charter. Different fiction, same shape.
    const steward = hallSteward(KARAZHAN_CARTRIDGE);
    expect(steward).not.toBeNull();
    expect(steward!.name).toBe("Seren Vale");
    expect(steward!.role).toBe("Warden of the Lamplit Survey");
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
    expect(cartridgeIdentity(KARAZHAN_CARTRIDGE)).toBe(cartridgeIdentity({ ...KARAZHAN_CARTRIDGE, people: undefined }));
    // Executable opening law now lives inside Arc and moves identity.
    expect(cartridgeIdentity(KARAZHAN_CARTRIDGE)).not.toBe(cartridgeIdentity({
      ...KARAZHAN_CARTRIDGE,
      arc: { ...KARAZHAN_CARTRIDGE.arc, opening: undefined },
    }));
  });

  it("parseCartridge preserves people and discards an identical transitional opening duplicate", () => {
    const people: AuthoredPerson[] = [
      { id: "p1", name: "Test Person", role: "Tester", bio: "b", greeting: "g", fulfilledLine: "f" },
    ];
    const parsed = parseCartridge({
      manifest: { id: "ignored" },
      arc: FIRST_CHARTER_CARTRIDGE.arc,
      people,
      opening: FIRST_CHARTER_CARTRIDGE.arc.opening,
    });
    // The forward-compat envelope path must not silently drop authored data.
    expect(hallSteward(parsed)).toEqual(people[0]);
    expect(parsed.arc.opening).toEqual(FIRST_CHARTER_CARTRIDGE.arc.opening);
    expect("opening" in parsed).toBe(false);
    expect(cartridgeIdentity(parsed)).toBe(cartridgeIdentity(FIRST_CHARTER_CARTRIDGE));
  });

  it("derives identity fields and trust from the validated Arc and receiver", () => {
    const parsed = parseCartridge({
      manifest: {
        id: "spoofed",
        name: "Spoofed Name",
        domain: "spoofed-domain",
        engineVersion: "999.0.0",
        trust: "verified",
        preferredCostume: "map",
        signature: "presentation-signature",
      },
      arc: FIRST_CHARTER_CARTRIDGE.arc,
    }, "imported-unsigned");

    expect(parsed.manifest).toMatchObject({
      id: FIRST_CHARTER_CARTRIDGE.arc.meta.id,
      name: FIRST_CHARTER_CARTRIDGE.arc.meta.name,
      domain: FIRST_CHARTER_CARTRIDGE.arc.meta.domain,
      engineVersion: FIRST_CHARTER_CARTRIDGE.arc.meta.engineVersion,
      trust: "imported-unsigned",
      preferredCostume: "map",
      signature: "presentation-signature",
    });
  });

  it("rejects top-level-only or conflicting executable opening law", () => {
    const opening = FIRST_CHARTER_CARTRIDGE.arc.opening!;
    const withoutOpening = { ...FIRST_CHARTER_CARTRIDGE.arc, opening: undefined };
    expect(() => parseCartridge({
      manifest: { id: "legacy" },
      arc: withoutOpening,
      opening,
    })).toThrow(/outside Arc identity/);
    expect(() => parseCartridge({
      manifest: { id: "conflict" },
      arc: FIRST_CHARTER_CARTRIDGE.arc,
      opening: { ...opening, narrativeText: `${opening.narrativeText}!` },
    })).toThrow(/conflicts with identity-bound/);
  });
});

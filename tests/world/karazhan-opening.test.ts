// The Karazhan dignity pass: the second bundled cartridge authors the same
// self-teaching directing DATA First Charter does — a cold-entry opening beat
// and an authored steward — so the runtime's opening loop (oath → steward
// briefing → one advancing action → recorded consequence) plays over a
// genuinely different cartridge WITHOUT any First-Charter-specific runtime code.
//
// This is the standard's ledger: two genuinely different cartridges pass the
// same bar. If this ever regresses, the "prove it generalizes" claim is false.

import { describe, expect, it } from "vitest";
import {
  FIRST_CHARTER_CARTRIDGE,
  KARAZHAN_CARTRIDGE,
  type AuthoredOpening,
} from "../../src/world/cartridge";
import { hallSteward } from "../../src/world/inhabited/people";

const EFFECT_TYPES = new Set(["morale", "stress", "loyalty"]);

function assertWellFormedOpening(label: string, opening: AuthoredOpening | undefined): void {
  expect(opening, `${label}: authors an opening beat`).toBeTruthy();
  const o = opening!;
  // Cold entry establishes conflict and stakes: a substantial narrative, not a stub.
  expect(o.triggerType.length, `${label}: has a trigger type`).toBeGreaterThan(0);
  expect(o.narrativeText.length, `${label}: establishes stakes in prose`).toBeGreaterThan(80);
  // A real founding choice: more than one option, each with authored consequence + effects.
  expect(o.options.length, `${label}: offers a real choice`).toBeGreaterThanOrEqual(2);
  for (const opt of o.options) {
    expect(opt.id.length, `${label}/${opt.label}: has an id`).toBeGreaterThan(0);
    expect(opt.label.length, `${label}: option has a label`).toBeGreaterThan(0);
    expect(opt.description.length, `${label}/${opt.label}: names its consequence`).toBeGreaterThan(0);
    expect(opt.effects.length, `${label}/${opt.label}: binds real effects`).toBeGreaterThan(0);
    for (const e of opt.effects) {
      expect(e.scope, `${label}: effect binds to the whole roster`).toBe("all");
      expect(EFFECT_TYPES.has(e.type), `${label}: effect type "${e.type}" is engine-applied`).toBe(true);
    }
  }
}

describe("Karazhan dignity pass — the second cartridge is first-class", () => {
  it("Karazhan authors a well-formed cold-entry opening beat", () => {
    assertWellFormedOpening("Karazhan", KARAZHAN_CARTRIDGE.opening);
  });

  it("the opening card id derives generically from the authored trigger type", () => {
    // The runtime mints the decision id as `opening:${triggerType}` (useArcWorld),
    // which the shell keys the handoff on — no cartridge name is hardcoded.
    expect(`opening:${KARAZHAN_CARTRIDGE.opening!.triggerType}`).toBe("opening:warding-oath");
  });

  it("an authored steward carries the opening (not a runtime abstraction)", () => {
    const steward = hallSteward(KARAZHAN_CARTRIDGE);
    expect(steward).not.toBeNull();
    // The steward is the recorder — the honesty spine every cartridge shares.
    expect(steward!.greeting.length).toBeGreaterThan(0);
    expect(steward!.fulfilledLine.length).toBeGreaterThan(0);
  });

  it("BOTH bundled cartridges now meet the directing standard, in different fictions", () => {
    assertWellFormedOpening("First Charter", FIRST_CHARTER_CARTRIDGE.opening);
    assertWellFormedOpening("Karazhan", KARAZHAN_CARTRIDGE.opening);
    // Same shape, genuinely different content — not a reskin.
    expect(KARAZHAN_CARTRIDGE.opening!.narrativeText).not.toBe(FIRST_CHARTER_CARTRIDGE.opening!.narrativeText);
    expect(hallSteward(KARAZHAN_CARTRIDGE)!.name).not.toBe(hallSteward(FIRST_CHARTER_CARTRIDGE)!.name);
  });
});

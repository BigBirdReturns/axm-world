import { describe, expect, it } from "vitest";
import { CLASSIC_TRIAL_IDS } from "../../src/fabric/classics/catalog.js";
import {
  ARCADE_INCUBATION_SLATE_FORMAT,
  CLASSIC_TRIALS_INCUBATION_SLATE,
} from "../../src/fabric/incubation/classic-trials-slate.js";

describe("Classic Trials incubation authority", () => {
  it("retains every executable prototype without assigning cartridge canon", () => {
    expect(CLASSIC_TRIALS_INCUBATION_SLATE.format).toBe(
      ARCADE_INCUBATION_SLATE_FORMAT,
    );
    expect(
      CLASSIC_TRIALS_INCUBATION_SLATE.candidates.map(
        (candidate) => candidate.trialId,
      ),
    ).toEqual(CLASSIC_TRIAL_IDS);

    for (const candidate of CLASSIC_TRIALS_INCUBATION_SLATE.candidates) {
      expect(candidate.implementationStatus).toBe("playable-prototype");
      expect(candidate.canonicalWorldAssignment).toBeNull();
      expect(candidate.programOfRecordStanding).toBe(false);
      expect(candidate.programOfRecordStrategyTitle).toBe(false);
      expect(candidate.arcConsequenceAuthority).toBe("none");
      expect(candidate.productAcceptance).toBe("not-issued");
    }
  });
});

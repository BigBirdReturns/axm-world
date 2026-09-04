import { describe, expect, it } from "vitest";
import { CLASSIC_TRIAL_IDS } from "../../src/fabric/classics/catalog.js";
import {
  FIRST_CHARTER_CHAPTERS,
  FIRST_CHARTER_IMPLEMENTED_TRIAL_IDS,
  FIRST_CHARTER_PROGRAM,
} from "../../src/fabric/program/first-charter-program.js";

describe("The First Charter program of record", () => {
  it("holds twelve ordered chapters across three acts", () => {
    expect(FIRST_CHARTER_PROGRAM.format).toBe("axm-first-charter-program/1");
    expect(FIRST_CHARTER_CHAPTERS).toHaveLength(12);
    expect(FIRST_CHARTER_CHAPTERS.map((chapter) => chapter.number)).toEqual(
      Array.from({ length: 12 }, (_, index) => index + 1),
    );
    expect(new Set(FIRST_CHARTER_CHAPTERS.map((chapter) => chapter.act))).toEqual(
      new Set(["I", "II", "III"]),
    );
  });

  it("admits every existing Classic Trial as a playable chapter", () => {
    expect(FIRST_CHARTER_IMPLEMENTED_TRIAL_IDS).toEqual(CLASSIC_TRIAL_IDS);
    for (const trialId of CLASSIC_TRIAL_IDS) {
      const chapter = FIRST_CHARTER_CHAPTERS.find((entry) => entry.existingTrialId === trialId);
      expect(chapter?.status).toBe("playable");
      expect(chapter?.template).toBe("canvas");
    }
  });

  it("defines a chapter factory rather than another corpus gate", () => {
    expect(FIRST_CHARTER_PROGRAM.cadence).toEqual({
      candidateIntervalMinutes: 60,
      playableChaptersPerWeek: 5,
      promotionReviewsPerWeek: 1,
    });
    expect(FIRST_CHARTER_PROGRAM.chapterAcceptance).toContain("ordinary win and loss path");
    expect(FIRST_CHARTER_PROGRAM.chapterAcceptance).toContain("provider-free replay");
    expect(FIRST_CHARTER_CHAPTERS.some((chapter) => chapter.status === "vertical-slice")).toBe(true);
    expect(FIRST_CHARTER_CHAPTERS.some((chapter) => chapter.template === "threejs")).toBe(true);
  });
});

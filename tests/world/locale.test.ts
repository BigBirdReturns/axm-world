import { describe, expect, it } from "vitest";
import { isLocale } from "../../src/world/i18n/locale.js";
import { EN_ONLY_IDS, formatMessage, MESSAGES, type MessageId } from "../../src/world/i18n/messages.js";

describe("locale identifier", () => {
  it("accepts known locales", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("zh-Hant")).toBe(true);
  });

  it("rejects unknown or missing locales", () => {
    expect(isLocale("zh")).toBe(false);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});

describe("formatMessage", () => {
  it("resolves plain string messages in en", () => {
    expect(formatMessage("en", "shell.cycle")).toBe("Cycle");
    expect(formatMessage("en", "shell.bench")).toBe("Bench");
  });

  it("resolves plain string messages in zh-Hant", () => {
    expect(formatMessage("zh-Hant", "shell.cycle")).toBe("週期");
    expect(formatMessage("zh-Hant", "shell.bench")).toBe("候補");
  });

  it("interpolates params for singular vs plural counts (en)", () => {
    expect(formatMessage("en", "blockers.dramaCards", { count: 1 })).toBe(
      "Resolve 1 drama card before advancing.",
    );
    expect(formatMessage("en", "blockers.dramaCards", { count: 2 })).toBe(
      "Resolve 2 drama cards before advancing.",
    );
    expect(formatMessage("en", "blockers.rewardDecisions", { count: 1 })).toBe(
      "Resolve 1 pending reward decision in Reports.",
    );
    expect(formatMessage("en", "blockers.rewardDecisions", { count: 3 })).toBe(
      "Resolve 3 pending reward decisions in Reports.",
    );
  });

  it("interpolates params for zh-Hant", () => {
    expect(formatMessage("zh-Hant", "blockers.dramaCards", { count: 2 })).toBe(
      "推進前請先處理 2 張劇情卡。",
    );
    expect(formatMessage("zh-Hant", "blockers.rewardDecisions", { count: 1 })).toBe(
      "請在報告中處理 1 項待定的獎勵決策。",
    );
  });

  it("falls back to en when zh-Hant is missing a message", () => {
    // "shell.contractOutcome" is intentionally left untranslated in the zh-Hant
    // catalog to exercise the fallback path honestly.
    expect(formatMessage("zh-Hant", "shell.contractOutcome")).toBe("Contract Outcome");
  });

  it("returns the id itself when missing from every catalog", () => {
    expect(formatMessage("en", "does.not.exist" as never)).toBe("does.not.exist");
  });
});

describe("catalog coverage guard", () => {
  it("every en message id is present in zh-Hant, or explicitly documented as EN_ONLY", () => {
    const enIds = Object.keys(MESSAGES.en) as MessageId[];
    const zhIds = new Set(Object.keys(MESSAGES["zh-Hant"]));
    const enOnly = new Set(EN_ONLY_IDS);
    const uncovered = enIds.filter((id) => !zhIds.has(id) && !enOnly.has(id));
    expect(uncovered, `ids missing from zh-Hant and not listed in EN_ONLY_IDS:\n${uncovered.join("\n")}`).toEqual([]);
  });

  it("EN_ONLY_IDS are actually missing from zh-Hant (the array stays honest)", () => {
    const zhIds = new Set(Object.keys(MESSAGES["zh-Hant"]));
    for (const id of EN_ONLY_IDS) {
      expect(zhIds.has(id), `"${id}" is listed as EN_ONLY but zh-Hant defines it`).toBe(false);
    }
  });
});

describe("spot checks on converted chrome ids", () => {
  it("shell run/status vocabulary resolves in both locales", () => {
    expect(formatMessage("en", "shell.runContract")).toBe("Run Contract");
    expect(formatMessage("zh-Hant", "shell.runContract")).toBe("執行契約");
    expect(formatMessage("en", "status.locked")).toBe("Locked");
    expect(formatMessage("zh-Hant", "status.locked")).toBe("鎖定");
  });

  it("readiness templates interpolate named params in both locales", () => {
    expect(formatMessage("en", "readiness.assignAtLeast", { min: 1, have: 0 })).toBe("Assign at least 1 agent (have 0).");
    expect(formatMessage("zh-Hant", "readiness.assignAtLeast", { min: 1, have: 0 })).toBe("請至少指派 1 名人員（目前 0 名）。");
  });

  it("contract board escalation copy interpolates cycle counts in both locales", () => {
    expect(formatMessage("en", "contractBoard.waitingCycles", { n: 3 })).toBe("Waiting 3 cycles");
    expect(formatMessage("zh-Hant", "contractBoard.waitingCycles", { n: 3 })).toBe("已等待 3 個週期");
  });
});

describe("pipeline labels + signed margins (regressions)", () => {
  it("compiled requirement chips translate", () => {
    expect(formatMessage("en", "pipeline.agentsRange", { min: 6, max: 10 })).toBe("6-10 agents");
    expect(formatMessage("zh-Hant", "pipeline.agentsRange", { min: 6, max: 10 })).toBe("6-10 人");
  });

  it("thin-status margins never render '+-' (negative margin branches wording)", () => {
    expect(formatMessage("en", "readiness.checkPassingBy", { name: "X", margin: -3, shortBy: 8 }))
      .toBe("X: behind by 3 under risk — needs +8 more buffer to be reliable.");
    expect(formatMessage("zh-Hant", "readiness.checkPassingBy", { name: "X", margin: -3, shortBy: 8 }))
      .toBe("X：風險下落後 3 — 還需要 +8 緩衝才能可靠。");
    expect(formatMessage("zh-Hant", "readinessRow.passingBy", { margin: -2.8, shortBy: 7.8 }))
      .toBe("風險下落後 2.8 · 還需 +7.8 緩衝才能達到可靠。");
    // positive path unchanged
    expect(formatMessage("zh-Hant", "readiness.checkPassingBy", { name: "X", margin: 3, shortBy: 8 }))
      .toBe("X：領先 +3 — 還需要 +8 緩衝才能可靠。");
  });
});

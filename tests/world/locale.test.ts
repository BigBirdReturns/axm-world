import { describe, expect, it } from "vitest";
import { isLocale } from "../../src/world/i18n/locale.js";
import { formatMessage } from "../../src/world/i18n/messages.js";

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

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { formatMessage, MESSAGES } from "../../src/world/i18n/messages.js";

// PR #61 — one canonical word for "done". A contract whose result has written to
// the Program 001 ledger / world state reads "Recorded" on every runtime surface:
// the board card, the selected-contract detail badge, the disabled run action, the
// map pin + legend, and the cartridge/ledger panel. "Cleared" survives ONLY as
// result flavor on a DIFFERENT axis — the ledger's success grade (vs Partial /
// Failed) and per-check pass marks — never as the completed-state label.

function read(rel: string): string {
  return fs.readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");
}

describe("completed-contract wording is unified on 'Recorded'", () => {
  it("'Recorded' is the one canonical completed-state label, in both locales", () => {
    expect(formatMessage("en", "status.recorded")).toBe("Recorded");
    expect(formatMessage("zh-Hant", "status.recorded")).toBe("已記錄");
  });

  it("the second completed-state label ('status.cleared') is retired from the catalog", () => {
    expect(MESSAGES.en).not.toHaveProperty("status.cleared");
    expect(MESSAGES["zh-Hant"]).not.toHaveProperty("status.cleared");
    // An unmapped id falls through to returning the id itself — proof it is gone,
    // not merely re-pointed.
    expect(formatMessage("en", "status.cleared" as never)).toBe("status.cleared");
  });

  it("the selected-contract detail and the disabled run action say 'Recorded', never 'Cleared'", () => {
    const regions = read("src/world/shell/regions.tsx");
    // No runtime surface may reach for the retired label.
    expect(regions).not.toContain('t("status.cleared")');
    // The disabled RunButton for a completed contract routes through the canonical id
    // (the engine status stays "cleared"; only the chrome changes).
    expect(regions).toMatch(/status === "cleared"\s*\?\s*t\("status\.recorded"\)/);
    // The detail header badge + World-state band both name a completed contract
    // "Recorded" (via the shared card-axes projection), never "Cleared".
    expect(regions).toContain('cardState === "recorded" ? "status.recorded"');
    expect((regions.match(/"status\.recorded"/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("the board card renders the engine 'cleared' status under the 'recorded' label", () => {
    // The card-axes projection collapses engine status "cleared" → card state "recorded"…
    expect(read("src/world/contract-board/card-axes.ts")).toContain('node.status === "cleared") return "recorded"');
    // …and the card maps that state to the canonical label id.
    expect(read("src/world/pixel-ui/PixelContractCard.tsx")).toContain('recorded: "status.recorded"');
  });

  it("the map pin and its legend gloss name the done state 'Recorded' without falling back to 'Cleared'", () => {
    expect(formatMessage("en", "worldMap.stateRecorded")).toBe("Recorded");
    expect(formatMessage("en", "worldMap.legendRecorded")).not.toMatch(/cleared/i);
    expect(formatMessage("zh-Hant", "worldMap.legendRecorded")).not.toContain("已完成");
  });

  it("ledger-adjacent chrome uses 'Recorded' for the state, keeping Cleared/Partial/Failed as the distinct outcome grade", () => {
    // The cartridge panel's completed-state roll-up and prose both say "Recorded".
    expect(formatMessage("en", "cartridgePanel.recordedNodes")).toBe("Recorded nodes");
    expect(formatMessage("en", "cartridgePanel.body")).not.toMatch(/cleared/i);
    // The per-entry outcome GRADE is a separate axis and legitimately keeps "Cleared"
    // for a clean success — a contract can be Recorded with a Partial / Failed outcome.
    expect(formatMessage("en", "cartridgePanel.outcomeSuccess")).toBe("Cleared");
    expect(formatMessage("en", "cartridgePanel.outcomePartial")).toBe("Partial");
    expect(formatMessage("en", "cartridgePanel.outcomeFailure")).toBe("Failed");
  });

  it("the board explainer describes the done state as 'recorded', not 'cleared'", () => {
    expect(formatMessage("en", "contractBoard.explainer")).not.toMatch(/cleared/i);
    expect(formatMessage("zh-Hant", "contractBoard.explainer")).not.toContain("已完成");
  });

  it("the arc-complete banner reports every contract as 'recorded'", () => {
    expect(formatMessage("en", "shell.everyContractRecorded")).toBe("Every contract recorded");
    expect(formatMessage("zh-Hant", "shell.everyContractRecorded")).toBe("所有契約皆已記錄");
  });
});

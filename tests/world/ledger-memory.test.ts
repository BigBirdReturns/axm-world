import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { formatMessage, MESSAGES } from "../../src/world/i18n/messages.js";
import { emptyLedger, appendResult } from "../../src/world/ledger.js";

// #66 — the cartridge ledger reads as memory + proof using ONLY existing
// LedgerEntry fields (challengeName, outcome, cycle, seq, authoredArcDigest). No
// schema change: the panel presents an ordered, counted, identity-sealed record
// over data the ledger already guarantees.

function read(rel: string): string {
  return fs.readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");
}

describe("ledger memory pass (#66)", () => {
  const panel = read("src/world/components/CartridgeObjectPanel.tsx");

  it("presents the ledger as an ordered, counted record — recording order + cumulative count", () => {
    // Recording order per entry, from the existing seq field (append index + 1).
    expect(panel).toContain('data-testid="ledger-entry-seq"');
    expect(panel).toContain("entry.seq + 1");
    // A cumulative count on the heading, via the shared bilingual "N recorded" id.
    expect(panel).toContain('data-testid="ledger-count"');
    expect(panel).toContain('t("shell.identityRecorded", { count: ledger.entries.length })');
  });

  it("names the proof that binds the ledger to the authored identity", () => {
    expect(panel).toContain('data-testid="ledger-sealed"');
    expect(panel).toContain('t("cartridgePanel.ledgerSealed")');
    // The proof copy exists in BOTH locales and speaks to identity + checking.
    expect(formatMessage("en", "cartridgePanel.ledgerSealed")).toMatch(/identity/i);
    expect(formatMessage("en", "cartridgePanel.ledgerSealed")).toMatch(/check/i);
    expect(MESSAGES["zh-Hant"]).toHaveProperty("cartridgePanel.ledgerSealed");
  });

  it("the memory/proof claims are honest: appended entries share the digest in recording order", () => {
    // The UI's "sealed" + "recording order" claims rest on ledger guarantees:
    // every entry carries the ledger's authoredArcDigest, and seq is the append index.
    let l = emptyLedger("cart1_proof");
    l = appendResult(l, { challengeId: "a", challengeName: "A", outcome: "success", cycle: 0 });
    l = appendResult(l, { challengeId: "b", challengeName: "B", outcome: "failure", cycle: 2 });
    expect(l.entries.every((e) => e.authoredArcDigest === l.authoredArcDigest)).toBe(true);
    expect(l.entries.map((e) => e.seq)).toEqual([0, 1]);
  });
});

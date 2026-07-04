import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { formatMessage, MESSAGES } from "../../src/world/i18n/messages.js";
import { emptyLedger, appendResult, summarizeLedger } from "../../src/world/ledger.js";

// #67 — Hall memory reflection. After a result is recorded, the inhabited hall
// acknowledges it using ONLY existing state: it names the last recorded contract
// and how many the ledger holds (summarizeLedger), while the steward keeps pointing
// to what remains next (deriveHallView, unchanged). No new NPCs, dialogue trees,
// mechanics, authored content, or schema.

function read(rel: string): string {
  return fs.readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");
}

describe("hall memory reflection (#67)", () => {
  const scene = read("src/world/inhabited/HallScene.tsx");

  it("the hall acknowledges memory from the SAME run ledger every surface reads", () => {
    // Derived via summarizeLedger (shared), not a hall-local store.
    expect(scene).toContain('from "../ledger.js"');
    expect(scene).toContain("summarizeLedger(world.ledger)");
    // Keyed on the ledger (a result on ANY outcome), not only a visibly-cleared node.
    expect(scene).toContain("memory.entryCount > 0");
    expect(scene).not.toContain("world.clearedCount > 0");
  });

  it("names what was just recorded and where that memory lives", () => {
    expect(scene).toContain('data-testid="hall-last-recorded"');
    expect(scene).toContain('t("hall.lastRecorded", { name: memory.lastResult.challengeName, count: memory.entryCount })');
  });

  it("the last-recorded copy names the contract + ledger count, in both locales", () => {
    const en = formatMessage("en", "hall.lastRecorded", { name: "The Cellar", count: 3 });
    expect(en).toContain("The Cellar");
    expect(en).toContain("3");
    expect(en).toMatch(/ledger/i);
    const zh = formatMessage("zh-Hant", "hall.lastRecorded", { name: "The Cellar", count: 3 });
    expect(zh).toContain("The Cellar");
    expect(zh).toContain("3");
    expect(MESSAGES["zh-Hant"]).toHaveProperty("hall.lastRecorded");
  });

  it("the acknowledgment is exactly what the ledger holds: last result + count", () => {
    // The hall's claim ("last recorded: X · N in the ledger") IS summarizeLedger —
    // no parallel memory, so it can never disagree with the ledger/board/map.
    let l = emptyLedger("cart1_hall");
    l = appendResult(l, { challengeId: "a", challengeName: "The Cellar", outcome: "success", cycle: 0 });
    l = appendResult(l, { challengeId: "b", challengeName: "The Bridge Troll", outcome: "failure", cycle: 1 });
    const s = summarizeLedger(l);
    expect(s.entryCount).toBe(2);
    expect(s.lastResult?.challengeName).toBe("The Bridge Troll");
  });
});

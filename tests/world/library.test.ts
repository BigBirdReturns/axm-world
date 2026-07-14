// The Library: the bay grown into a collection you hold. Two things this slice
// makes true and must stay true:
//   1. Every cartridge is a first-class durable object with an HONEST action —
//      a cartridge with a resumable save says Resume, never the old classic row
//      that always said "Enter" while silently resuming (the label lied).
//   2. The bay is FRAMED as a library — titled, counted, and shelved by
//      provenance (what shipped with the runtime vs. what you imported) — so a
//      stranger can understand what they now possess.
// Source-inspection guards in the codebase's established idiom.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { MESSAGES } from "../../src/world/i18n/messages.js";

function read(path: string): string {
  return fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

const card = read("src/world/components/CartridgeBayCard.tsx");
const player = read("src/world/Player.tsx");

/** The ClassicRow body only (the non-program-of-record card). */
function classicRow(): string {
  const start = card.indexOf("function ClassicRow");
  const end = card.indexOf("export function CartridgeBayCard");
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return card.slice(start, end);
}

describe("Library: every cartridge is a first-class durable object with an honest action", () => {
  it("the non-program card's play button tells the truth — Resume when resumable, Enter when fresh", () => {
    const row = classicRow();
    expect(row).toContain("const resumable = save !== null;");
    // The single primary action, honest for imports and Karazhan too.
    expect(row).toContain('resumable ? t("boot.resume") : t("boot.enter")');
    // It is the real play affordance (same testid the plaque uses), not a
    // decorative text button.
    expect(row).toContain("data-testid={`play-cartridge-${entry.arc.meta.id}`}");
  });

  it("the old lying always-Enter classic button is gone (no bare Enter text button)", () => {
    const row = classicRow();
    // The pre-Library row rendered `{t("boot.enter")} →` unconditionally with no
    // resumable check. Every Enter mention now sits behind the resumable ternary.
    expect(row.includes('{t("boot.enter")} →')).toBe(false);
  });

  it("the non-program card still carries the four durable-object facts", () => {
    const row = classicRow();
    expect(row).toContain("CartridgeEmblem"); // object
    expect(row).toContain("<DigestLine digest={digest} />"); // identity
    expect(row).toContain("<TrustChip entry={entry} />"); // provenance
    expect(row).toContain("<SaveStateLine save={save} />"); // resume state
    expect(row).toContain("<MemoryLine save={save} />"); // progress / memory
  });
});

describe("Library: the bay is framed as a collection you hold", () => {
  it("names the library, counts it, and shelves it by provenance", () => {
    expect(player).toContain('data-testid="library"');
    expect(player).toContain('data-testid="library-count"');
    expect(player).toContain('data-testid="library-shelf-bundled"');
    expect(player).toContain('t("boot.libraryHeading")');
    expect(player).toContain('t("boot.libraryCount", { count: entries.length })');
    expect(player).toContain('t("boot.sectionBundled")');
  });

  it("the imported shelf appears only when the holder has imported something", () => {
    // Honest omission: no empty "Imported by you" shelf on a fresh install.
    expect(player).toContain("importedEntries.length > 0 &&");
    expect(player).toContain('data-testid="library-shelf-imported"');
    expect(player).toContain('t("boot.sectionImported")');
  });

  it("provenance shelving is a pure split of the entries the bay already holds", () => {
    expect(player).toContain('entries.filter((e) => e.source === "bundled")');
    expect(player).toContain('entries.filter((e) => e.source === "file")');
  });

  it("all new Library chrome is bilingual (en + zh-Hant)", () => {
    for (const key of ["boot.libraryHeading", "boot.libraryCount", "boot.sectionBundled", "boot.sectionImported"] as const) {
      expect(MESSAGES.en).toHaveProperty(key);
      expect(MESSAGES["zh-Hant"]).toHaveProperty(key);
    }
  });
});

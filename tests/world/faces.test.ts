import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { PORTRAITS, PIXEL_PORTRAIT_NAMES, type PortraitSpec } from "../../src/world/pixel-ui/PixelPortrait.js";
import { personPortrait } from "../../src/world/themes/first-charter/portrait-icons.js";
import { FIRST_CHARTER_THEME } from "../../src/world/themes/first-charter/theme.js";
import { MESSAGES } from "../../src/world/i18n/messages.js";

// #72 — Faces. Pixel portraits inside the existing asset standard: 16x16 grids,
// declared alphabet, per-portrait palettes. Faces exist ONLY for what the runtime
// can honestly name — roster ROLES (real run data) and AUTHORED people (keyed by
// their authored id). Presence is presentation; no new identity is invented.

function read(rel: string): string {
  return fs.readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");
}

const ALPHABET = new Set([".", "o", "s", "d", "h", "e", "m", "c", "t", "w"]);

function assertSpecIntegrity(name: string, spec: PortraitSpec): void {
  expect(spec.grid.length, `${name}: 16 rows`).toBe(16);
  for (const [i, row] of spec.grid.entries()) {
    expect(row.length, `${name} row ${i}: 16 chars`).toBe(16);
    for (const ch of row) {
      expect(ALPHABET.has(ch), `${name} row ${i}: token "${ch}" in the declared alphabet`).toBe(true);
      expect(ch.charCodeAt(0) < 128, `${name} row ${i}: ASCII only (no lookalike glyphs)`).toBe(true);
      if (ch !== ".") {
        expect(spec.palette[ch], `${name}: token "${ch}" has a palette color`).toBeTruthy();
      }
    }
  }
}

describe("faces (#72): portrait asset integrity", () => {
  it("every role portrait grid is 16x16, ASCII, in-alphabet, and fully paletted", () => {
    for (const name of PIXEL_PORTRAIT_NAMES) assertSpecIntegrity(name, PORTRAITS[name]);
  });

  it("the authored Maren Vos portrait meets the same grid standard", () => {
    const spec = personPortrait("charter-keeper");
    expect(spec).not.toBeNull();
    assertSpecIntegrity("charter-keeper", spec!);
  });

  it("authored faces are keyed by AUTHORED id, and unknown people get no invented face", () => {
    expect(personPortrait("charter-keeper")).not.toBeNull();
    expect(personPortrait("Maren Vos")).toBeNull(); // name is not an id
    expect(personPortrait("someone-else")).toBeNull();
  });

  it("roster faces key off the ROLE — real run data — with a neutral fallback", () => {
    expect(FIRST_CHARTER_THEME.appearancePack.roleBindings.Vanguard).toBe("rodoh:plated");
  });
});

describe("faces (#72): surfaces", () => {
  it("the hall steward has a face and SPEAKS her authored line in the scene, verbatim", () => {
    const hall = read("src/world/inhabited/HallScene.tsx");
    expect(hall).toContain('data-testid="hall-speech"');
    expect(hall).toContain("view.resolved ? person.fulfilledLine : person.greeting");
    expect(hall).toContain("CartridgePortrait({ arcId: world.arc.meta.id, personId: person.id");
  });

  it("the detail panel carries the Steward's note — face + authored greeting — gated on the hall's own derivation", () => {
    const shell = read("src/world/shell/Shell.tsx");
    expect(shell).toContain('data-testid="detail-steward-note"');
    expect(shell).toContain("selectedHeldInHall && steward");
    expect(shell).toContain("{steward.greeting}");
  });

  it("roster cards carry the role face", () => {
    const card = read("src/world/pixel-ui/PixelRosterCard.tsx");
    expect(card).toContain('data-testid="roster-card-doll"');
    expect(card).toContain("resolvedAppearance");
  });

  it("the theme seam only gives faces to cartridges that author people", () => {
    const seam = read("src/world/themes/CartridgeMotif.tsx");
    expect(seam).toContain("export function CartridgePortrait");
    expect(seam).toContain("return null;"); // non-authored cartridges keep neutral figures
  });

  it("the new chrome is bilingual", () => {
    expect(MESSAGES.en).toHaveProperty("shell.stewardNote");
    expect(MESSAGES["zh-Hant"]).toHaveProperty("shell.stewardNote");
  });
});

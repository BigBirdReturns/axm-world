// Karazhan theme wiring: the cartridge is visibly its own skin, and the theme
// seam can never leak one cartridge's clothes onto another. These are the
// mechanical guards behind acceptance #4/#7/#8 (Karazhan palette scoped;
// First Charter unchanged; imported arcs neutral).

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import type { Arc } from "../../src/engine/types.js";
import { FIRST_CHARTER, KARAZHAN } from "../../src/arcs/index.js";
import {
  RODOH_BASE_THEME,
  FIRST_CHARTER_THEME,
  KARAZHAN_THEME,
  themeForArc,
  cartridgePaletteScope,
  hasCartridgeMotifs,
} from "../../src/world/themes/index.js";
import { locationMotif } from "../../src/world/themes/karazhan/motif-icons.js";

function read(path: string): string {
  return fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

// A stand-in for any imported/unknown cartridge (e.g. Operations Lab): a real
// arc shape with an id neither bundled theme claims.
const importedArc = { ...KARAZHAN, meta: { ...KARAZHAN.meta, id: "operations-lab-demo" } } as Arc;

describe("theme selection", () => {
  it("resolves each bundled arc to its own theme", () => {
    expect(themeForArc(KARAZHAN).id).toBe("karazhan");
    expect(themeForArc(FIRST_CHARTER).id).toBe("first-charter");
  });

  it("resolves an unknown/imported arc to the neutral base theme", () => {
    expect(themeForArc(importedArc)).toBe(RODOH_BASE_THEME);
  });

  it("Karazhan carries its own role and attribute vocabulary", () => {
    expect(Object.keys(KARAZHAN_THEME.roles)).toEqual(["Tank", "Healer", "Melee", "Ranged", "Support"]);
    expect(KARAZHAN_THEME.attributes["resilience"]).toBeDefined();
    expect(KARAZHAN_THEME.motto).not.toBe(FIRST_CHARTER_THEME.motto);
  });
});

describe("palette scope cannot leak", () => {
  it("only Karazhan opts into a scoped palette; First Charter and imports stay neutral", () => {
    expect(cartridgePaletteScope(KARAZHAN)).toBe("karazhan");
    expect(cartridgePaletteScope(FIRST_CHARTER)).toBeNull();
    expect(cartridgePaletteScope(importedArc)).toBeNull();
  });

  it("all Karazhan theme CSS is scoped under [data-cartridge=\"karazhan\"] or a kz- class", () => {
    const css = read("src/world/themes/karazhan/karazhan.css");
    // Every top-level rule must be reachable only via the scope attribute or a
    // kz-prefixed class — never a bare shared selector that could restyle
    // First Charter / imports.
    const selectors = css.match(/^[.:#a-zA-Z\[][^{]*\{/gm) ?? [];
    expect(selectors.length).toBeGreaterThan(0);
    for (const sel of selectors) {
      const ok = sel.includes('[data-cartridge="karazhan"]') || sel.includes(".kz-");
      expect(ok, `unscoped Karazhan selector could leak: ${sel.trim()}`).toBe(true);
    }
  });
});

describe("encounter motifs", () => {
  it("every Karazhan encounter id maps to a motif; unknown ids fall back to the tower", () => {
    for (const challenge of KARAZHAN.challenges) {
      expect(locationMotif(challenge.id)).toBeTruthy();
    }
    expect(locationMotif("not-an-encounter")).toBe("tower");
    expect(hasCartridgeMotifs(KARAZHAN)).toBe(true);
    expect(hasCartridgeMotifs(importedArc)).toBe(false);
  });
});

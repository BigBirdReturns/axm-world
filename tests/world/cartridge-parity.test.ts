import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { FIRST_CHARTER, KARAZHAN, KIND_GODS_OF_ILYON } from "../../src/arcs/index.js";
import { resolveDollAppearance } from "../../src/world/themes/appearance.js";
import { FIRST_CHARTER_THEME } from "../../src/world/themes/first-charter/theme.js";
import { KARAZHAN_THEME } from "../../src/world/themes/karazhan/theme.js";
import { ILYON_THEME } from "../../src/world/themes/ilyon/theme.js";
import { planetPaletteForArc } from "../../src/world/themes/select.js";
import { locationMotif as firstCharterMotif } from "../../src/world/themes/first-charter/motif-icons.js";
import { locationMotif as karazhanMotif } from "../../src/world/themes/karazhan/motif-icons.js";
import { locationMotif as ilyonMotif } from "../../src/world/themes/ilyon/motif-icons.js";
import { KARAZHAN_CARTRIDGE } from "../../src/world/cartridge.js";


function collectPlayerFacingText(value: unknown): string[] {
  const displayKeys = new Set([
    "name", "description", "flavorText", "narrative", "label", "text", "title",
    "currencyName", "materialName", "tokenName", "reputationName", "narrativeText",
  ]);
  if (Array.isArray(value)) return value.flatMap(collectPlayerFacingText);
  if (!value || typeof value !== "object") return [];
  const lines: string[] = [];
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (typeof child === "string" && displayKeys.has(key)) lines.push(child);
    else lines.push(...collectPlayerFacingText(child));
  }
  return lines;
}

function read(path: string): string {
  return fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

const CASES = [
  { arc: FIRST_CHARTER, theme: FIRST_CHARTER_THEME, motif: firstCharterMotif, css: "src/world/themes/first-charter/first-charter.css", scope: "first-charter" },
  { arc: KARAZHAN, theme: KARAZHAN_THEME, motif: karazhanMotif, css: "src/world/themes/karazhan/karazhan.css", scope: "karazhan" },
  { arc: KIND_GODS_OF_ILYON, theme: ILYON_THEME, motif: ilyonMotif, css: "src/world/themes/ilyon/ilyon.css", scope: "ilyon" },
] as const;

describe("bundled cartridge presentation parity", () => {
  it.each(CASES)("$arc.meta.name gives every authored role a cartridge-owned portrait and body", ({ arc, theme }) => {
    for (const role of arc.roles) {
      const appearance = resolveDollAppearance(theme, role.id);
      expect(appearance.id).not.toMatch(/^rodoh:/);
      expect(appearance.portraitSpec, `${role.id} portrait`).toBeDefined();
      expect(appearance.bodySpec, `${role.id} body`).toBeDefined();
      expect(appearance.identityTreatment).toBe("authored");
    }
  });

  it.each(CASES)("$arc.meta.name maps every authored challenge to a cartridge motif", ({ arc, motif }) => {
    const mapped = arc.challenges.map((challenge) => motif(challenge.id));
    expect(mapped).toHaveLength(arc.challenges.length);
    expect(mapped.every(Boolean)).toBe(true);
  });

  it("uses distinct cartridge-owned globe material palettes", () => {
    const palettes = CASES.map(({ arc }) => planetPaletteForArc(arc));
    expect(palettes.every((palette) => palette?.length === 7)).toBe(true);
    expect(new Set(palettes.map((palette) => JSON.stringify(palette))).size).toBe(3);
  });

  it.each(CASES)("$arc.meta.name carries material identity through all shared surfaces", ({ css, scope }) => {
    const source = read(css);
    for (const selector of [".contract-board-shell", ".wm-surface", '[data-testid="hall-scene"]', ".encs-panel", ".rodoh-aperture", ".walkable-world", ".pixel-doll-portrait"]) {
      expect(source, `${scope} missing ${selector}`).toContain(selector);
    }
    expect(source).toContain(`[data-cartridge="${scope}"]`);
  });
  it("presents the legacy-id second cartridge only as original Waking Tower fiction", () => {
    expect(KARAZHAN.meta.name).toBe("The Waking Tower");
    expect(KARAZHAN_THEME.name).toBe("The Waking Tower");
    expect(KARAZHAN_CARTRIDGE.people?.[0]).toMatchObject({
      name: "Seren Vale",
      role: "Warden of the Lamplit Survey",
    });
    const text = [
      ...collectPlayerFacingText(KARAZHAN),
      ...(KARAZHAN_CARTRIDGE.people ?? []).flatMap(collectPlayerFacingText),
      KARAZHAN_THEME.name, KARAZHAN_THEME.motto,
    ].join("\n");
    expect(text).toContain("Lamplit Survey");
    for (const pattern of [
      /\bKarazhan\b/i, /Aldous Venn/i, /Violet Eye/i, /\bMedivh\b/i,
      /\bAttumen\b/i, /\bMoroes\b/i, /\bMaiden\b/i, /\bCurator\b/i,
      /\bIllhoof\b/i, /\bAran\b/i, /\bNetherspite\b/i, /\bMalchezaar\b/i,
      /\bNightbane\b/i, /\bMaulgar\b/i, /\bGruul\b/i, /\bMagtheridon\b/i,
      /Hellfire Citadel/i, /\beredar\b/i, /\bfel\b/i, /\bnether\b/i,
      /The Master's Key/i, /The Blackened Urn/i, /dead Guardian/i,
    ]) expect(text, pattern.source).not.toMatch(pattern);
  });

});

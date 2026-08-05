import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { LAMP_DISTRICT } from "../../src/arcs/lamp-district.js";
import { LAMP_DISTRICT_ROLE_SPECS } from "../../src/world/themes/lamp-district/role-appearances.js";
import { locationMotif } from "../../src/world/themes/lamp-district/motif-icons.js";

function read(path: string): string {
  return fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

describe("Lamp District production asset slice", () => {
  it("ships one original environment, lead portrait, and cross-section with machine-readable provenance", () => {
    const provenance = JSON.parse(read("src/assets/lamp-district/underworld/provenance.json")) as {
      format: string;
      cartridgeId: string;
      assets: Array<{ path: string; source: string }>;
    };
    expect(provenance.format).toBe("rodoh-original-asset-provenance/1");
    expect(provenance.cartridgeId).toBe("lamp-district");
    expect(provenance.assets).toHaveLength(3);
    for (const asset of provenance.assets) {
      expect(asset.source).toBe("original");
      const source = read(asset.path);
      expect(source.length).toBeGreaterThan(1_000);
      expect(source).toContain("<svg");
      expect(source).toMatch(/<title[^>]*>/);
      expect(source).toMatch(/<desc[^>]*>/);
    }
  });

  it("gives all seven authored roles 16×16 portrait and body grids", () => {
    expect(Object.keys(LAMP_DISTRICT_ROLE_SPECS)).toHaveLength(7);
    for (const [role, specs] of Object.entries(LAMP_DISTRICT_ROLE_SPECS)) {
      for (const [kind, spec] of Object.entries(specs)) {
        expect(spec.grid, `${role} ${kind}`).toHaveLength(16);
        expect(spec.grid.every((row) => row.length === 16), `${role} ${kind}`).toBe(true);
      }
    }
  });

  it("maps all eight movements to cartridge-owned motifs", () => {
    const motifs = LAMP_DISTRICT.challenges.map((challenge) => locationMotif(challenge.id));
    expect(motifs).toHaveLength(8);
    expect(new Set(motifs).size).toBe(8);
  });
});

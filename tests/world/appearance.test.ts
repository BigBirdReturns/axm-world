import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { identityPalette, resolveDollAppearance } from "../../src/world/themes/appearance.js";
import { FIRST_CHARTER_THEME } from "../../src/world/themes/first-charter/theme.js";
import { KARAZHAN_THEME } from "../../src/world/themes/karazhan/theme.js";
import { RODOH_BASE_THEME } from "../../src/world/themes/rodoh.js";

function read(rel: string): string {
  return fs.readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");
}

describe("Dolls + Layers appearance contract", () => {
  it("keeps role-to-appearance choices in cartridge theme data", () => {
    expect(resolveDollAppearance(FIRST_CHARTER_THEME, "Vanguard").id).toBe("first-charter:vanguard");
    expect(resolveDollAppearance(KARAZHAN_THEME, "Tank").id).toBe("karazhan:tank");
    expect(resolveDollAppearance(KARAZHAN_THEME, "Healer").id).toBe("karazhan:healer");
  });

  it("degrades unknown roles and cartridges to the dignified bare doll", () => {
    expect(resolveDollAppearance(FIRST_CHARTER_THEME, "Future Cartridge Role").id).toBe("rodoh:bare-doll");
    expect(resolveDollAppearance(RODOH_BASE_THEME, "guardian").id).toBe("rodoh:bare-doll");
  });

  it("derives stable identity color from agent identity, never role", () => {
    expect(identityPalette("agent-maren")).toEqual(identityPalette("agent-maren"));
    expect(identityPalette("agent-maren")).not.toEqual(identityPalette("agent-tomas"));
  });

  it("contains no role-name branching in the neutral renderers", () => {
    const renderer = `${read("src/world/pixel-ui/PixelSprite.tsx")}\n${read("src/world/pixel-ui/PixelDoll.tsx")}`;
    expect(renderer).not.toMatch(/includes\(["'](?:vanguard|skirmisher|mender|tank|healer|guardian|striker)/i);
  });

  it("renders body, clothes, stance, and status as explicit state-driven layers", () => {
    const doll = read("src/world/pixel-ui/PixelDoll.tsx");
    expect(doll).toContain('data-layer="body"');
    expect(doll).toContain('data-layer="clothes"');
    expect(doll).toContain('data-layer="stance"');
    expect(doll).toContain('data-layer="status-overlay"');
    for (const state of ["idle", "strain", "cleared", "downed"]) expect(doll).toContain(`"${state}"`);
  });
});

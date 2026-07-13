import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { dollScaleState, resolveDollAppearance, resolveDollBody, resolveWorldAvatarAppearance } from "../../src/world/themes/appearance.js";
import { RODOH_BASE_THEME } from "../../src/world/themes/rodoh.js";

function read(path: string): string {
  return fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

describe("Embodiment Contract v1", () => {
  it("names scale states and exposes honest fallback versus authored topology", () => {
    expect([16, 24, 32, 40].map(dollScaleState)).toEqual(["micro", "field", "card", "close"]);
    const bare = resolveDollAppearance(RODOH_BASE_THEME, "unknown");
    expect(resolveDollBody(bare, 16)).toMatchObject({ body: "person", scale: "micro", authored: false });
    const authored = { ...bare, scaleBodies: { micro: "person" as const } };
    expect(resolveDollBody(authored, 16)).toMatchObject({ body: "person", scale: "micro", authored: true });
  });

  it("keeps 3D appearance theme-owned while identity only changes identity palette roles", () => {
    const first = resolveWorldAvatarAppearance(RODOH_BASE_THEME, "agent-one");
    const second = resolveWorldAvatarAppearance(RODOH_BASE_THEME, "agent-two");
    expect(first.id).toBe("rodoh:traveler");
    expect(first.modules).toEqual(second.modules);
    expect(first.palette.body).not.toBe(second.palette.body);
    const player = read("src/world/core/PlayerCharacter.tsx");
    expect(player).not.toMatch(/#[0-9a-f]{6}/i);
  });

  it("publishes causal motion families instead of an unconditional idle bob", () => {
    const controller = read("src/world/core/PlanetController.tsx");
    const player = read("src/world/core/PlayerCharacter.tsx");
    expect(controller).toContain('motion: "idle"');
    expect(controller).toContain('? "walk" : "idle"');
    expect(controller).toContain('"airborne"');
    for (const state of ["walk", "airborne", "arrived"]) expect(player).toContain(`"${state}"`);
  });

  it("derives place presentation from theme state and durable outcome", () => {
    const markers = read("src/world/components/NodeMarkers.tsx");
    const screen = read("src/world/WorldScreen.tsx");
    expect(markers).toContain("placeStates[outcome]");
    expect(markers).toContain('appearance.landmark === "growth"');
    expect(markers).toContain('appearance.landmark === "warning"');
    expect(screen).toContain("outcomeByChallenge");
    expect(screen).toContain("activeTheme.appearancePack.placeStates");
  });
});

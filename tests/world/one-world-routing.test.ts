import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { MESSAGES } from "../../src/world/i18n/messages.js";

// #71 — One world, one route. Board / Map / Hall stop being three tabs: each surface
// routes to the surface where the next action lives, through the SAME view switch the
// ViewSwitcher uses (SceneProps.onNavigate → Shell's choose) and the SAME shared
// derivations (deriveHallView, deriveWorldMap, evaluateParty). Unified routing only —
// no new mechanics, state, or data.

function read(rel: string): string {
  return fs.readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");
}

describe("one world, one route (#71)", () => {
  const shell = read("src/world/shell/Shell.tsx");
  const hall = read("src/world/inhabited/HallScene.tsx");
  const worldmap = read("src/world/worldmap/WorldMap.tsx");
  const presentations = read("src/world/presentations.tsx");

  it("scenes navigate through ONE seam: SceneProps.onNavigate, wired to the shell's choose()", () => {
    expect(presentations).toContain("onNavigate?: (view: CostumeId) => void");
    expect(shell).toContain("onNavigate={choose}");
  });

  it("the detail panel is the action hub: it routes to the map, and to the hall when the steward holds the selected contract", () => {
    expect(shell).toContain('data-testid="detail-see-on-map"');
    expect(shell).toContain('data-testid="detail-take-in-person"');
    // The hall route is gated on the SAME deriveHallView the hall itself renders from —
    // one derivation, so the detail panel can never offer a hall visit the hall won't honor.
    expect(shell).toContain("deriveHallView(world.nodes)");
    expect(shell).toContain("hallView.challengeId === ix.selectedId && !hallView.resolved");
  });

  it("the hall routes back: View on board selects the held contract through the shared interaction", () => {
    expect(hall).toContain('data-testid="hall-view-on-board"');
    expect(hall).toContain("interaction.select(view.challengeId)");
    expect(hall).toContain('onNavigate?.("board")');
  });

  it("the hall's party status is the board's own projection, not a new verdict", () => {
    expect(hall).toContain('data-testid="hall-party-status"');
    // Same resolver-faithful evaluateParty over the same recommended party.
    expect(hall).toContain("world.evaluateParty(view.challengeId, world.recommendedParty(view.challengeId))");
    // Speaks the existing projection vocabulary — no new label ids minted.
    expect(hall).toContain('"encounterShell.projReliable"');
  });

  it("the map summarizes the world in its own legend vocabulary and routes the next pin to the steward", () => {
    expect(worldmap).toContain('data-testid="wm-state-summary"');
    // Counts come from the SAME derived pins the map renders — no second derivation.
    expect(worldmap).toContain("map.regions.flatMap((r) => r.locations)");
    expect(worldmap).toContain("wm-go-hall-");
    expect(worldmap).toContain('onNavigate("hall")');
  });

  it("the routing chrome is bilingual", () => {
    for (const id of ["shell.seeOnMap", "shell.takeInPerson", "hall.viewOnBoard", "worldMap.talkToSteward"] as const) {
      expect(MESSAGES.en).toHaveProperty(id);
      expect(MESSAGES["zh-Hant"]).toHaveProperty(id);
    }
  });
});

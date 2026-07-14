import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { CARTRIDGE_ENTRY_DURATION_MS, entryTransitionDuration } from "../../src/world/components/CartridgeEnterTransition.js";

function read(path: string): string {
  return fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

describe("Titmouse production slice: cartridge to authored Hall", () => {
  it("keeps the plaque transition bounded, skippable, and immediate with reduced motion", () => {
    expect(CARTRIDGE_ENTRY_DURATION_MS).toBe(720);
    expect(entryTransitionDuration(false)).toBe(720);
    expect(entryTransitionDuration(true)).toBe(0);
    const transition = read("src/world/components/CartridgeEnterTransition.tsx");
    expect(transition).toContain('t("boot.skipEntry")');
    expect(transition).toContain("completed.current");
    expect(read("index.html")).toContain("overflow-x: clip");
  });

  it("keeps the response compact without deleting the exact engine receipt", () => {
    const panel = read("src/world/components/DecisionPanel.tsx");
    expect(panel).toContain("groupDecisionEffects(response!.effects)");
    expect(panel).toContain('<details className="decision-panel__exact-effects">');
    expect(panel).toContain("appliedEffectLabel(effect, targetName)");
  });

  it("does not hardcode the cartridge identity into generic runtime direction", () => {
    const shell = read("src/world/shell/Shell.tsx");
    const stage = read("src/world/components/OpeningDecisionStage.tsx");
    expect(shell).toContain("hallSteward(world.cartridge)");
    expect(shell).not.toContain("world.cartridge.arc.meta.id ===");
    expect(stage).not.toContain("first-charter");
    expect(stage).toContain("hallSteward(world.cartridge)");
  });
});

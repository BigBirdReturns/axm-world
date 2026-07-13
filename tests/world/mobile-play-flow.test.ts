import { describe, expect, it } from "vitest";
import fs from "node:fs";

function read(path: string): string {
  return fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

describe("mobile play flow", () => {
  it("puts the character confrontation before readiness detail", () => {
    const shell = read("src/world/shell/Shell.tsx");
    const contractStart = shell.indexOf('mobileStep === "contract"');
    const partyStart = shell.indexOf('mobileStep === "party"', contractStart);
    const contractBlock = shell.slice(contractStart, partyStart);
    expect(contractBlock).toContain("{mobileMission}");
    expect(contractBlock).toContain('data-testid="mobile-mission-details"');
    expect(contractBlock.indexOf("{mobileMission}")).toBeLessThan(contractBlock.indexOf("<ContractRegion"));
  });

  it("uses one mobile commit path: adjust squad, then play encounter", () => {
    const shell = read("src/world/shell/Shell.tsx");
    const mobileStart = shell.indexOf("{isMobile ? (");
    const desktopStart = shell.indexOf(") : (", mobileStart);
    const mobileBlock = shell.slice(mobileStart, desktopStart);
    expect(mobileBlock).toContain('data-testid="mobile-adjust-party"');
    expect(mobileBlock).toContain("{playEncounter}");
    expect(mobileBlock).not.toContain("<ContractActions");
  });

  it("keeps the spatial world in player navigation while excluding the developer graph", () => {
    const shell = read("src/world/shell/Shell.tsx");
    expect(shell).toContain('presentation.id !== "graph"');
    expect(shell).toContain("playerPresentations.map");
    expect(shell).not.toContain('isMobile ? presentations.filter((presentation) => presentation.id !== "graph")');
  });

  it("renders named dolls facing the encounter threat with a visible three-step loop", () => {
    const stage = read("src/world/components/MobileMissionStage.tsx");
    expect(stage).toContain("<PixelDoll");
    expect(stage).toContain('<PixelSprite name="threat"');
    expect(stage).toContain('data-testid="mobile-mission-party"');
    expect(stage).toContain('t("encounterShell.deploy")');
    expect(stage).toContain('t("encounterShell.playEncounter")');
    expect(stage).toContain('t("result.recorded")');
  });
});

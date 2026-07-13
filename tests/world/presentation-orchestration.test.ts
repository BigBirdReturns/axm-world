import { describe, expect, it } from "vitest";
import fs from "node:fs";

function read(path: string): string {
  return fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

describe("Program 001 presentation orchestration", () => {
  it("gives one blocking beat ownership and keeps queued drama behind the encounter receipt", () => {
    const shell = read("src/world/shell/Shell.tsx");
    expect(shell).toContain('data-testid="shell-underlay"');
    expect(shell).toContain('underlay.setAttribute("inert", "")');
    expect(shell).toContain("aria-hidden={modalOpen ? true : undefined}");
    expect(shell).toContain("world.pendingDecision && !encounterOpen");
  });

  it("retains exact decision effects in the immediate consequence receipt", () => {
    const panel = read("src/world/components/DecisionPanel.tsx");
    expect(panel).toContain("effectPreview");
    expect(panel).toContain('className="decision-panel__result-effect"');
    expect(panel).toContain("optionPreview(o, targetName)");
  });

  it("restores focus after dialogs instead of dropping it on the document body", () => {
    const focus = read("src/world/components/use-dialog-focus.ts");
    const decision = read("src/world/components/DecisionPanel.tsx");
    const encounter = read("src/world/encounter/EncounterShell.tsx");
    expect(focus).toContain("previousFocus");
    expect(focus).toContain('event.key !== "Tab"');
    expect(decision).toContain("useDialogFocus");
    expect(encounter).toContain("useDialogFocus");
  });

  it("meets the 48px target floor and preserves a 52px dominant CTA on mobile", () => {
    const pixel = read("src/world/pixel-ui/pixel-ui.css");
    const regions = read("src/world/shell/regions.tsx");
    expect(pixel).toMatch(/\.pixel-button\s*\{[^}]*min-height:\s*48px/s);
    expect(pixel).toMatch(/@media \(max-width: 480px\)[\s\S]*\.pixel-button\s*\{[^}]*min-height:\s*48px/s);
    expect(pixel).toMatch(/@media \(max-width: 480px\)[\s\S]*\.pixel-button--cta\s*\{[^}]*min-height:\s*52px/s);
    expect(regions).toContain('minHeight: 48');
  });
});

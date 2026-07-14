import { describe, expect, it } from "vitest";
import fs from "node:fs";

function read(path: string): string {
  return fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

describe("shell regressions", () => {
  it("renders decisions through a portal above representation Html labels", () => {
    const decision = read("src/world/components/DecisionPanel.tsx");
    const decisionCss = read("src/world/components/decision-panel.css");
    expect(decision).toContain("createPortal");
    expect(decisionCss).toContain("z-index: 9001");
    expect(decision).toContain('data-testid="pending-decision-card"');
    expect(decision).toContain("PixelPanel");
    expect(decision).toContain('variant="danger"');
    expect(decision).toContain('className="decision-panel"');
    expect(decisionCss).toContain("border-radius: 0");
    expect(decisionCss).toContain("var(--cream)");
  });

  it("commits a decision before presenting the Shell-owned world response", () => {
    const decision = read("src/world/components/DecisionPanel.tsx");
    const shell = read("src/world/shell/Shell.tsx");
    expect(decision).toContain("onClick={() => onResolve?.(o.id)}");
    expect(decision).not.toContain("setChosen");
    expect(shell).toContain("const [decisionResponse, setDecisionResponse]");
    expect(shell).toContain("const response = world.resolveDecision(optionId)");
    expect(shell).toContain("response={decisionResponse}");
    expect(shell).toContain("onContinue={() => setDecisionResponse(null)}");
    expect(shell).toContain("decisionResponse !== null");
  });

  it("uses one governed dandelion map across decisions and cartridge motifs", () => {
    const mark = read("src/world/brand/RodohRuntimeMark.tsx");
    const motifs = read("src/world/themes/first-charter/motif-icons.tsx");
    const decision = read("src/world/components/DecisionPanel.tsx");
    expect(mark).toContain("export function RodohDandelionGlyph");
    expect(motifs).toContain("<RodohDandelionGlyph size={size} />");
    expect(decision).toContain('<RodohRuntimeMark variant="micro" showText={false} />');
  });

  it("hides representation labels and disables canvas events while modal is open", () => {
    const board = read("src/world/board/BoardScreen.tsx");
    const planet = read("src/world/WorldScreen.tsx");
    const markers = read("src/world/components/NodeMarkers.tsx");

    expect(board).toContain("!modalOpen");
    expect(board).toContain('pointerEvents: modalOpen ? "none" : "auto"');
    expect(planet).toContain("labelsEnabled={!modalOpen}");
    expect(markers).toContain("labelsEnabled = true");
    expect(markers).toContain("className=\"node-label\"");
  });

  it("keeps world and interaction state above the view switcher", () => {
    const host = read("src/world/WorldHost.tsx");
    const shell = read("src/world/shell/Shell.tsx");

    expect(host).toContain("const world = useArcWorld(cartridge)");
    expect(host).toContain("const interaction = useArcInteraction(world)");
    expect(shell).toContain("const [costumeId, setCostumeId]");
    expect(shell).not.toContain("key={costumeId}");
    expect(shell).toContain("data-testid=\"engine-shell\"");
  });
});

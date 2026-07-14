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
    expect(shell).toContain("const closesOpening = decisionResponse.cardId.startsWith");
    expect(shell).toContain("setDecisionResponse(null)");
    expect(shell).toContain("decisionResponse !== null");
  });

  it("directs the authored opening through Hall without persisting or replaying it", () => {
    const player = read("src/world/Player.tsx");
    const shell = read("src/world/shell/Shell.tsx");
    const hall = read("src/world/inhabited/HallScene.tsx");
    const spec = read("docs/design/TITMOUSE_PRODUCTION_SLICES.md");

    expect(player).toContain("CartridgeEnterTransition");
    expect(shell).toContain('world.pendingDecision?.id.startsWith("opening:")');
    expect(shell).toContain('setCostumeId("hall")');
    expect(shell).toContain('if (isMobile)');
    expect(shell).toContain('setMobileStep("contract")');
    expect(shell).toContain("const [openingHandoff, setOpeningHandoff]");
    expect(hall).toContain("if (view.challengeId) setOpen(true)");
    expect(spec).toContain("zero-explanation blind run");
    expect(shell).not.toContain('saveCostume(world.cartridge.arc, "hall")');
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

  it("keeps Arc world state above the experience presentation", () => {
    const host = read("src/world/WorldHost.tsx");

    expect(host).toContain("const world = useArcWorld(cartridge)");
    expect(host).toContain("<ExperienceHost world={world} onExit={onExit}");
    expect(host).not.toContain("key=");
  });
});

import { describe, expect, it } from "vitest";
import fs from "node:fs";

function read(path: string): string {
  return fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

describe("Rodoh pixel-ui integration", () => {
  it("/rodoh/ui-kit route exists and renders the live component set", () => {
    const kit = read("src/world/dev/RodohUiKitRoute.tsx");
    expect(kit).toContain("PixelRoleBadge");
    expect(kit).toContain("PixelAttribute");
    expect(kit).toContain("PixelGearSlot");
    expect(kit).toContain("PixelStateBadge");
    expect(kit).toContain("PixelReadinessRow");
    expect(kit).toContain("PixelLootCard");
    expect(kit).toContain("PixelRosterCard");
    expect(kit).toContain("PixelContractCard");
    expect(kit).toContain("MotifIcon");

    const player = read("src/world/Player.tsx");
    expect(player).toContain("/rodoh/ui-kit");
    expect(player).toContain("RodohUiKitRoute");
  });

  it("gameplay roster cards route through PixelRosterCard, which renders pixel-role-badge, pixel-attribute, pixel-gear-slot", () => {
    const regions = read("src/world/shell/regions.tsx");
    expect(regions).toContain("PixelRosterCard");
    expect(regions).toContain("RosterCardAttribute");
    expect(regions).toContain("RosterCardGear");

    const rosterCard = read("src/world/pixel-ui/PixelRosterCard.tsx");
    expect(rosterCard).toContain("PixelRoleBadge");
    expect(rosterCard).toContain("PixelAttribute");
    expect(rosterCard).toContain("PixelGearSlot");

    const roleBadge = read("src/world/pixel-ui/PixelRoleBadge.tsx");
    expect(roleBadge).toContain("pixel-role-badge");

    const attribute = read("src/world/pixel-ui/PixelAttribute.tsx");
    expect(attribute).toContain("pixel-attribute");

    const gearSlot = read("src/world/pixel-ui/PixelGearSlot.tsx");
    expect(gearSlot).toContain("pixel-gear-slot");
  });

  it("readiness rows and loot cards are shared pixel-ui components in gameplay", () => {
    const regions = read("src/world/shell/regions.tsx");
    expect(regions).toContain("PixelReadinessRow");
    expect(regions).toContain("PixelLootCard");
    expect(regions).not.toContain("check-row check-row--${c.status}");
  });

  it("locked contracts show unlock requirements in both ContractBoard and Contract region", () => {
    const contractBoard = read("src/world/contract-board/ContractBoard.tsx");
    expect(contractBoard).toContain("unlockRequirements");

    const contractCard = read("src/world/pixel-ui/PixelContractCard.tsx");
    expect(contractCard).toContain('data-testid="unlock-requirements"');
    expect(contractCard).toContain('state === "locked"');

    const regions = read("src/world/shell/regions.tsx");
    expect(regions).toContain('data-testid="unlock-requirements"');
    expect(regions).toContain('selected.status === "locked"');
  });

  it("PixelContractCard labels its difficulty through t(), not as a bare number", () => {
    const contractCard = read("src/world/pixel-ui/PixelContractCard.tsx");
    // The card's difficulty carries the "Difficulty" label (chrome via t()) beside
    // the value, so the number reads as what it is — matching the map pin and the
    // encounter shell rather than showing a context-free integer.
    expect(contractCard).toContain('t("contractCard.difficulty")');
    expect(contractCard).toContain("pixel-contract-card__difficulty-value");
    // The number itself still flows verbatim as authored content, never catalogued.
    expect(contractCard).toContain("{difficulty}");
  });

  it("board cards carry the map's 'Up next' / 'Steep' markers from the shared projection", () => {
    const board = read("src/world/contract-board/ContractBoard.tsx");
    // The board reads the SAME pure helper the World-map uses — no second definition
    // of next/steep, no coupling to the map's React components.
    expect(board).toContain("deriveNodeMarkers");
    expect(board).toContain("upNext=");
    expect(board).toContain("steep=");

    const card = read("src/world/pixel-ui/PixelContractCard.tsx");
    // …and the card prints the map's own "Up next" / "Steep" chrome (reused ids), as a
    // display-only overlay flagged for tests via data-upnext / data-steep.
    expect(card).toContain('t("worldMap.nextContract")');
    expect(card).toContain('t("worldMap.steep")');
    expect(card).toContain("data-upnext");
  });

  it("the contract card shows world state and squad fit as two separate named bands", () => {
    const card = read("src/world/pixel-ui/PixelContractCard.tsx");
    expect(card).toContain('t("contractCard.worldState")');
    expect(card).toContain('t("contractCard.squadFit")');
    expect(card).toContain("contract-card-world-band");
    expect(card).toContain("contract-card-squad-band");
    // The board feeds the two axes from separate pure helpers — state takes no readiness.
    const board = read("src/world/contract-board/ContractBoard.tsx");
    expect(board).toContain("contractCardState(node)");
    expect(board).toContain("squadFit(node, readiness)");
  });

  it("ContractBoard renders PixelContractCard, not bespoke card markup", () => {
    const contractBoard = read("src/world/contract-board/ContractBoard.tsx");
    expect(contractBoard).toContain("PixelContractCard");
    expect(contractBoard).not.toContain("contract-board-card__panel");
    expect(contractBoard).not.toContain("function StateBadge");
  });

  it("EncounterDirector renders themed motifs (via the cartridge seam) instead of emoji glyphs", () => {
    const director = read("src/world/encounter/EncounterDirector.tsx");
    // Motifs now dispatch through the generic CartridgeMotif seam (which picks
    // the active cartridge's MotifIcon/locationMotif) rather than hardcoding
    // First Charter's — so any bundled cartridge, Karazhan included, themes.
    expect(director).toContain("CartridgeMotif");
    expect(director).not.toContain("🐀");
    expect(director).not.toContain("🌉");
    expect(director).not.toContain("🛒");
    expect(director).not.toContain("⛏️");
    expect(director).not.toContain("🔥");
    expect(director).not.toContain("🏰");
  });

  it("renderer switching does not reset world/interaction state", () => {
    const host = read("src/world/WorldHost.tsx");
    const shell = read("src/world/shell/Shell.tsx");
    expect(host).toContain("const world = useArcWorld(cartridge)");
    expect(host).toContain("const interaction = useArcInteraction(world)");
    expect(shell).not.toContain("key={costumeId}");
  });

  it("CSS uses the canonical --cream/--ink/--gold token namespace, not --rodoh-*", () => {
    const contractBoardCss = read("src/world/contract-board/contract-board.css");
    expect(contractBoardCss).not.toContain("--rodoh-");

    const pixelUiCss = read("src/world/pixel-ui/pixel-ui.css");
    expect(pixelUiCss).not.toContain("--rodoh-");
    expect(pixelUiCss).toContain("--cream:");
    expect(pixelUiCss).toContain("--ink:");
    expect(pixelUiCss).toContain("--gold:");
  });

  it("First Charter motif-icons module exists with the themed motif set", () => {
    const motifs = read("src/world/themes/first-charter/motif-icons.tsx");
    expect(motifs).toContain("dandelion");
    expect(motifs).toContain("archiveBox");
    expect(motifs).toContain("coffeeMug");
    expect(motifs).toContain("crossedCalendar");
    expect(motifs).toContain("receiptTab");
    expect(motifs).toContain("notebook");
    expect(motifs).toContain("starSpark");
    expect(motifs).toContain("locationMotif");
    expect(motifs).toContain("export function MotifIcon");
  });

  it("pixel-ui index exports every new component", () => {
    const index = read("src/world/pixel-ui/index.ts");
    expect(index).toContain("PixelRoleBadge");
    expect(index).toContain("PixelAttribute");
    expect(index).toContain("PixelGearSlot");
    expect(index).toContain("PixelStateBadge");
    expect(index).toContain("PixelReadinessRow");
    expect(index).toContain("PixelLootCard");
    expect(index).toContain("PixelRosterCard");
    expect(index).toContain("PixelContractCard");
  });
});

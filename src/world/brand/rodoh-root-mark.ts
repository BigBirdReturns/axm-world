// Source: BigBirdReturns/axm-tools@93a9740a26b0fafe5b5152103a8118a489afbcec
// Constitution: identity/scg/SCG_MARK_CONSTITUTION.md@6ce2a3a6262a1190764117ec04ce687a1708271c
// Grid: 16x16 AXM-WORLD root glyph; rows and drift are frozen.
// Encoding: .=transparent field W=cream bloom M=moss stem and seeds.

export const RODOH_ROOT_MARK_MAP = [
  "....W..W........",
  "..W..WW..W..W...",
  "...W.WWW.W.W....",
  "..W.WWWWW.WW....",
  "...WWWWWWW.W....",
  "..W.WWWWW..W....",
  "....WWWWW.......",
  ".....MWM........",
  "......M.........",
  "......M.....W...",
  "....M.M..W......",
  "...M..M.M.......",
  "...M..M.........",
  "......M.........",
  ".....MMM........",
  "....MMMMM.......",
] as const;

export const RODOH_ROOT_MARK_PALETTE = {
  cream: "#fffdf5",
  moss: "#6B784D",
  charcoal: "#1B1818",
} as const;

export const RODOH_ROOT_MARK_WIDTH = 16;
export const RODOH_ROOT_MARK_HEIGHT = 16;

export type RodohRootMarkToken = "." | "W" | "M";

export function rootMarkColor(token: RodohRootMarkToken): string | null {
  if (token === "W") return RODOH_ROOT_MARK_PALETTE.cream;
  if (token === "M") return RODOH_ROOT_MARK_PALETTE.moss;
  return null;
}

export function assertRodohRootMarkSource(): void {
  if (RODOH_ROOT_MARK_MAP.length !== RODOH_ROOT_MARK_HEIGHT) {
    throw new Error(`Rodoh root mark must have ${RODOH_ROOT_MARK_HEIGHT} rows.`);
  }
  for (const [index, row] of RODOH_ROOT_MARK_MAP.entries()) {
    if (row.length !== RODOH_ROOT_MARK_WIDTH) {
      throw new Error(`Rodoh root mark row ${index} must have ${RODOH_ROOT_MARK_WIDTH} cells.`);
    }
    for (const token of row) {
      if (token !== "." && token !== "W" && token !== "M") {
        throw new Error(`Rodoh root mark row ${index} contains undeclared token ${token}.`);
      }
    }
  }
}

assertRodohRootMarkSource();
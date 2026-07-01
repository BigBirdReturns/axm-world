import type { HTMLAttributes } from "react";
import "./pixel-ui.css";

export type PixelIconName =
  | "available"
  | "reliable"
  | "risky"
  | "failing"
  | "locked"
  | "recorded"
  | "selected"
  | "lootAvailable"
  | "vanguard"
  | "skirmisher"
  | "mender"
  | "power"
  | "mettle"
  | "wits"
  | "spirit"
  | "rustyBlade"
  | "guardCharm"
  | "fieldSatchel"
  | "emptySlot";

export const PIXEL_ICON_NAMES: PixelIconName[] = [
  "available", "reliable", "risky", "failing", "locked", "recorded", "selected", "lootAvailable",
  "vanguard", "skirmisher", "mender",
  "power", "mettle", "wits", "spirit",
  "rustyBlade", "guardCharm", "fieldSatchel", "emptySlot",
];

// Every icon is a hand-drawn 8x8 pixel grid, not a font glyph. "#" = filled cell,
// "." = empty. Rendered as an inline SVG of <rect> cells so it scales crisply at
// any size (16/24/32/64...) without relying on a font being loaded.
//
// Provenance: these are redrawn derivatives of the harvested reference sheets
// at docs/design/references/{01_rodoh_platform_identity_system_guide,
// 02_axm_world_runtime_ui_asset_pack,03_first_charter_theme_asset_pack_overview}.png
// (see docs/design/references/component-inventory.md for the per-icon table).
// They are 8x8 approximations of those sheets' pixel-art icons, not slices of
// the source images and not the original production sprites.
const GRIDS: Record<PixelIconName, string[]> = {
  // Page/document with two text bars — matches the "Available" contract-state
  // icon in 02_axm_world_runtime_ui_asset_pack.png, section 1.
  available: [
    ".######.",
    "#......#",
    "#......#",
    "#####..#",
    "#......#",
    "#####..#",
    "#......#",
    "########",
  ],
  // Shield with a filled center mark — derived from the "Reliable" shield+star
  // icon in 02_axm_world_runtime_ui_asset_pack.png, section 1.
  reliable: [
    ".######.",
    "#......#",
    "#..##..#",
    "#.####.#",
    "#.####.#",
    "#..##..#",
    ".#....#.",
    "..####..",
  ],
  // Diamond outline with an exclamation stem — matches the "Risky" diamond
  // icon in 02_axm_world_runtime_ui_asset_pack.png, section 1.
  risky: [
    "...##...",
    "..#..#..",
    ".#.##.#.",
    "#..##..#",
    "#..##..#",
    ".#.##.#.",
    "..#..#..",
    "...##...",
  ],
  // Skull — matches the "Failing" skull icon in
  // 02_axm_world_runtime_ui_asset_pack.png, section 1.
  failing: [
    ".######.",
    "#.#..#.#",
    "#......#",
    "#.####.#",
    ".######.",
    "..#..#..",
    ".#....#.",
    "..####..",
  ],
  locked: [
    "..####..",
    ".#....#.",
    ".#....#.",
    "########",
    "#......#",
    "#.####.#",
    "#.####.#",
    "########",
  ],
  // Stacked ledger bars — matches the "Recorded" log icon in
  // 02_axm_world_runtime_ui_asset_pack.png, section 1.
  recorded: [
    "########",
    "#......#",
    "#.####.#",
    "#......#",
    "#.####.#",
    "#......#",
    "#.####.#",
    "########",
  ],
  // Corner-bracket viewfinder frame — matches the "Selected" frame icon in
  // 02_axm_world_runtime_ui_asset_pack.png, section 1.
  selected: [
    "##....##",
    "#......#",
    "........",
    "........",
    "........",
    "........",
    "#......#",
    "##....##",
  ],
  // Treasure chest with a clasp band — matches "Loot Available" in
  // 02_axm_world_runtime_ui_asset_pack.png, section 1.
  lootAvailable: [
    ".######.",
    "#......#",
    "########",
    "#......#",
    "#.####.#",
    "#......#",
    "#......#",
    "########",
  ],
  vanguard: [
    ".######.",
    "#..##..#",
    "#..##..#",
    "#......#",
    "#......#",
    ".#....#.",
    "..#..#..",
    "...##...",
  ],
  // Shield with crossed axes — matches the "Skirmisher" role badge in
  // 02_axm_world_runtime_ui_asset_pack.png, section 2.
  skirmisher: [
    ".######.",
    "#..##..#",
    "#.#..#.#",
    "#..##..#",
    "#.#..#.#",
    "#..##..#",
    ".#....#.",
    "...##...",
  ],
  // Shield with a plain cross — matches the "Mender" role badge in
  // 02_axm_world_runtime_ui_asset_pack.png, section 2.
  mender: [
    ".######.",
    "#......#",
    "#..##..#",
    "#.####.#",
    "#.####.#",
    "#..##..#",
    ".#....#.",
    "...##...",
  ],
  power: [
    "..####..",
    ".######.",
    ".######.",
    ".######.",
    "..####..",
    "...##...",
    "...##...",
    "........",
  ],
  // Plain shield — matches the "Mettle" attribute icon in
  // 02_axm_world_runtime_ui_asset_pack.png, section 3 (a shield, colored
  // gold there vs. teal for the Vanguard role badge — same silhouette).
  mettle: [
    ".######.",
    "#......#",
    "#......#",
    "#......#",
    "#......#",
    ".#....#.",
    "..#..#..",
    "...##...",
  ],
  // Book with a spine — matches the "Wits" attribute icon in
  // 02_axm_world_runtime_ui_asset_pack.png, section 3.
  wits: [
    "........",
    ".######.",
    ".#....#.",
    ".#.##.#.",
    ".#.##.#.",
    ".#....#.",
    ".######.",
    "........",
  ],
  spirit: [
    "...#....",
    "..###...",
    "..###...",
    ".#####..",
    ".#####..",
    "#######.",
    ".#####..",
    "..###...",
  ],
  rustyBlade: [
    ".......#",
    "......#.",
    ".....#..",
    "....#...",
    "...#....",
    "..####..",
    ".##..##.",
    "..#..#..",
  ],
  guardCharm: [
    "..####..",
    ".#....#.",
    "#......#",
    "#..##..#",
    "#..##..#",
    "#......#",
    ".#....#.",
    "..####..",
  ],
  fieldSatchel: [
    "..####..",
    ".#....#.",
    "########",
    "#......#",
    "#......#",
    "#......#",
    ".######.",
    "........",
  ],
  emptySlot: [
    ".#.#.#.#",
    "#......#",
    "........",
    "#......#",
    "........",
    "#......#",
    "........",
    ".#.#.#.#",
  ],
};

function PixelGlyph({ name }: { name: PixelIconName }): JSX.Element {
  const rows = GRIDS[name];
  const cells: JSX.Element[] = [];
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y] ?? "";
    for (let x = 0; x < row.length; x++) {
      if (row[x] === "#") {
        cells.push(<rect key={`${y}-${x}`} x={x} y={y} width={1} height={1} />);
      }
    }
  }
  return (
    <svg viewBox="0 0 8 8" width="100%" height="100%" fill="currentColor" style={{ shapeRendering: "crispEdges", display: "block" }}>
      {cells}
    </svg>
  );
}

type PixelIconProps = HTMLAttributes<HTMLSpanElement> & {
  name: PixelIconName;
  label?: string;
  /** Explicit pixel size (used by the icon matrix). Defaults to the 1.1em CSS sizing. */
  size?: number;
};

export function PixelIcon({ name, label, size, className = "", style, ...props }: PixelIconProps): JSX.Element {
  return (
    <span
      className={`pixel-icon pixel-icon--${name} ${className}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={size ? { width: size, height: size, ...style } : style}
      {...props}
    >
      <PixelGlyph name={name} />
    </span>
  );
}

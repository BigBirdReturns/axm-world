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
const GRIDS: Record<PixelIconName, string[]> = {
  available: [
    "..####..",
    ".#....#.",
    "#......#",
    "#..##..#",
    "#..##..#",
    "#......#",
    ".#....#.",
    "..####..",
  ],
  reliable: [
    "........",
    ".......#",
    "......#.",
    ".....#..",
    "#....#..",
    ".#..#...",
    "..##....",
    "........",
  ],
  risky: [
    "...##...",
    "...##...",
    "...##...",
    "...##...",
    "...##...",
    "........",
    "...##...",
    "...##...",
  ],
  failing: [
    "........",
    "#......#",
    ".#....#.",
    "..#..#..",
    "...##...",
    "..#..#..",
    ".#....#.",
    "#......#",
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
  recorded: [
    ".######.",
    ".#....#.",
    ".#....#.",
    ".#....#.",
    ".#....#.",
    ".#.##.#.",
    ".##..##.",
    "........",
  ],
  selected: [
    "...##...",
    "..####..",
    ".######.",
    "########",
    "########",
    ".######.",
    "..####..",
    "...##...",
  ],
  lootAvailable: [
    "...##...",
    "...##...",
    ".#.##.#.",
    "..####..",
    "..####..",
    ".#.##.#.",
    "...##...",
    "...##...",
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
  skirmisher: [
    "#.......",
    ".#....#.",
    "..#..#..",
    "...##...",
    "...##...",
    "..#..#..",
    ".#....#.",
    ".......#",
  ],
  mender: [
    "........",
    "...##...",
    "...##...",
    ".######.",
    ".######.",
    "...##...",
    "...##...",
    "........",
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
  mettle: [
    ".######.",
    "#..##..#",
    "#..##..#",
    "#.####.#",
    "#.####.#",
    ".#....#.",
    "..#..#..",
    "...##...",
  ],
  wits: [
    "........",
    "..####..",
    ".#....#.",
    "#..##..#",
    "#..##..#",
    ".#....#.",
    "..####..",
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

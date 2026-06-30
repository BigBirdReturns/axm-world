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

const glyphs: Record<PixelIconName, string> = {
  available: "▣",
  reliable: "✦",
  risky: "!",
  failing: "✖",
  locked: "▨",
  recorded: "▤",
  selected: "▢",
  lootAvailable: "▰",
  vanguard: "◆",
  skirmisher: "⚔",
  mender: "+",
  power: "■",
  mettle: "⬟",
  wits: "▰",
  spirit: "◆",
  rustyBlade: "†",
  guardCharm: "◎",
  fieldSatchel: "▣",
  emptySlot: "+",
};

type PixelIconProps = HTMLAttributes<HTMLSpanElement> & {
  name: PixelIconName;
  label?: string;
};

export function PixelIcon({ name, label, className = "", ...props }: PixelIconProps): JSX.Element {
  return (
    <span className={`pixel-icon pixel-icon--${name} ${className}`} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} {...props}>
      {glyphs[name]}
    </span>
  );
}

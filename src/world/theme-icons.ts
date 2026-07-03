// Shared icon-selection heuristics for gameplay surfaces (ContractBoard, shell regions).
//
// This is the "theme seam" called out in docs/design/rodoh-visual-contract.md: mapping
// known First Charter vocabulary (attribute ids, role names, item names) to a specific
// pixel icon is cartridge-specific knowledge, but it lives here — not duplicated per file
// — and every function falls back to a generic icon for anything it doesn't recognize.
// That fallback is what keeps this grammar-acceptable: a different cartridge's attributes,
// roles, and items still render (as the generic icon) instead of being mislabeled or
// silently dropped. A future cartridge that wants its own icon set extends this seam
// rather than teaching the runtime new hardcoded strings.
import type { PixelIconName } from "./pixel-ui/index.js";

const ATTR_ICON: Record<string, PixelIconName> = {
  // First Charter vocabulary.
  power: "power", mettle: "mettle", wits: "wits", spirit: "spirit",
  Power: "power", Mettle: "mettle", Wits: "wits", Spirit: "spirit",
  // Karazhan vocabulary — mapped to the closest-reading shared glyph (the seam
  // degrades to a real icon, never a mislabel): resilience→mettle (endurance),
  // precision/adaptability→wits (acuity), focus→spirit (will/channel).
  resilience: "mettle", precision: "wits", adaptability: "wits", focus: "spirit",
};

/** Known attribute id/name -> icon. Anything unrecognized (another cartridge's
 *  attribute vocabulary) falls back to the generic "available" icon. */
export function attrIcon(idOrName: string): PixelIconName {
  return ATTR_ICON[idOrName] ?? "available";
}

/** Known role name -> icon. Anything unrecognized falls back to the generic
 *  "selected" icon. */
export function roleIcon(name: string): PixelIconName {
  const key = name.toLowerCase();
  // First Charter roles.
  if (key.includes("vanguard")) return "vanguard";
  if (key.includes("skirmisher")) return "skirmisher";
  if (key.includes("mender")) return "mender";
  // Karazhan roles — closest-reading shared glyph: tank→vanguard (front line),
  // healer/support→mender (keep them standing), melee/ranged→skirmisher (strike).
  if (key.includes("tank")) return "vanguard";
  if (key.includes("healer") || key.includes("support")) return "mender";
  if (key.includes("melee") || key.includes("ranged")) return "skirmisher";
  return "selected";
}

/** Known item-name keywords -> icon. Anything unrecognized falls back to the
 *  generic "lootAvailable" icon. */
export function itemIcon(name: string): PixelIconName {
  const key = name.toLowerCase();
  if (key.includes("blade") || key.includes("pick")) return "rustyBlade";
  if (key.includes("charm") || key.includes("favor") || key.includes("seal") || key.includes("trophy")) return "guardCharm";
  if (key.includes("satchel") || key.includes("cloak") || key.includes("pauldron")) return "fieldSatchel";
  return "lootAvailable";
}

import type { PixelIconName } from "../pixel-ui/index.js";
import { RODOH_DOLL_APPEARANCES, type DollAppearancePack } from "./appearance.js";

export type RodohRuntimeState =
  | "available"
  | "reliable"
  | "risky"
  | "failing"
  | "locked"
  | "recorded"
  | "selected"
  | "lootAvailable";

export interface RodohTheme {
  id: string;
  name: string;
  motto: string;
  /** The representation that best teaches this cartridge's ordinary first
   * minute. This is cartridge presentation data, never a shell id check. */
  preferredPresentation: "board" | "map" | "globe" | "hall";
  states: Record<RodohRuntimeState, { icon: PixelIconName; label: string; meaning: string }>;
  roles: Record<string, { icon: PixelIconName; label: string; meaning: string }>;
  attributes: Record<string, { icon: PixelIconName; label: string; meaning: string }>;
  items: Record<string, { icon: PixelIconName; label: string; meaning: string }>;
  appearancePack: DollAppearancePack;
}

export const RODOH_BASE_THEME: RodohTheme = {
  id: "rodoh-base",
  name: "Rodoh Runtime",
  motto: "Hold the loop.",
  preferredPresentation: "board",
  states: {
    available: { icon: "available", label: "Available", meaning: "Can be inspected or assigned now." },
    reliable: { icon: "reliable", label: "Reliable", meaning: "Projection has enough buffer." },
    risky: { icon: "risky", label: "Risky", meaning: "Passes or is close, but needs more buffer." },
    failing: { icon: "failing", label: "Failing", meaning: "Below threshold or missing requirements." },
    locked: { icon: "locked", label: "Locked", meaning: "Prerequisites are not met." },
    recorded: { icon: "recorded", label: "Recorded", meaning: "The cartridge remembers this result." },
    selected: { icon: "selected", label: "Selected", meaning: "The current focus." },
    lootAvailable: { icon: "lootAvailable", label: "Loot ready", meaning: "Reward can be equipped or recorded." },
  },
  roles: {
    Vanguard: { icon: "vanguard", label: "Vanguard", meaning: "Front line. Hold the line." },
    Skirmisher: { icon: "skirmisher", label: "Skirmisher", meaning: "Strike first. Create openings." },
    Mender: { icon: "mender", label: "Mender", meaning: "Keep them standing." },
  },
  attributes: {
    power: { icon: "power", label: "Power", meaning: "Force, pressure, direct work." },
    mettle: { icon: "mettle", label: "Mettle", meaning: "Endurance and holding under strain." },
    wits: { icon: "wits", label: "Wits", meaning: "Planning, routing, and recovery." },
    spirit: { icon: "spirit", label: "Spirit", meaning: "Will, morale, and care." },
  },
  items: {
    rustyBlade: { icon: "rustyBlade", label: "Rusty Blade", meaning: "Starter weapon. Improves Power." },
    guardCharm: { icon: "guardCharm", label: "Guard Charm", meaning: "Protective trinket. Improves Mettle." },
    fieldSatchel: { icon: "fieldSatchel", label: "Field Satchel", meaning: "Carry forward. Inventory identity." },
    emptySlot: { icon: "emptySlot", label: "Empty Slot", meaning: "Gear can be earned and equipped later." },
  },
  appearancePack: {
    fallback: "rodoh:bare-doll",
    appearances: RODOH_DOLL_APPEARANCES,
    roleBindings: {},
    worldAvatar: {
      id: "rodoh:traveler",
      palette: { body: "#3b6ea5", skin: "#e8c4a0", headgear: "#c8492f", legs: "#2a2f3a", cargo: "#7a5230", strap: "#5a3c22" },
      modules: { headgear: "cap", cargo: "satchel" },
    },
    placeStates: {
      available: { color: "#c9a14a", accent: "#f0d47a", landmark: "crystal" },
      locked: { color: "#5e5850", accent: "#8b8172", landmark: "sealed" },
      recorded: { color: "#74ad77", accent: "#b9f6bd", landmark: "growth" },
      success: { color: "#74ad77", accent: "#b9f6bd", landmark: "growth" },
      partial: { color: "#c9a14a", accent: "#f0d47a", landmark: "crystal" },
      failure: { color: "#b01c18", accent: "#e78375", landmark: "warning" },
    },
  },
};

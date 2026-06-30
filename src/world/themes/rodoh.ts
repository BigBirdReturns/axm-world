import type { PixelIconName } from "../pixel-ui/index.js";

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
  states: Record<RodohRuntimeState, { icon: PixelIconName; label: string; meaning: string }>;
  roles: Record<string, { icon: PixelIconName; label: string; meaning: string }>;
  attributes: Record<string, { icon: PixelIconName; label: string; meaning: string }>;
  items: Record<string, { icon: PixelIconName; label: string; meaning: string }>;
}

export const RODOH_BASE_THEME: RodohTheme = {
  id: "rodoh-base",
  name: "Rodoh Runtime",
  motto: "Hold the loop.",
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
};

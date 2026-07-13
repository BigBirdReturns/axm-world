import { RODOH_BASE_THEME, type RodohTheme } from "../rodoh.js";

// The Karazhan cartridge theme — mood "haunted grandeur / arcane decay / violet
// night." Extends the Rodoh base theme (the runtime shell stays identical) with
// Karazhan's own role/attribute/item vocabulary. Icons reuse the shared
// PixelIcon set where a base glyph reads correctly for the raid vocabulary;
// where nothing fits, the base theme's generic fallback is kept deliberately
// (the theme seam degrades, it never mislabels). The distinct violet-night look
// is carried by the palette override (karazhan.css) and the encounter motifs
// (motif-icons.tsx), not by inventing a full second PixelIcon set.

export const KARAZHAN_THEME: RodohTheme = {
  ...RODOH_BASE_THEME,
  id: "karazhan",
  name: "Karazhan",
  motto: "The tower remembers every guest.",
  roles: {
    Tank: { icon: "vanguard", label: "Tank", meaning: "Hold the boss. Eat what would delete anyone else." },
    Healer: { icon: "mender", label: "Healer", meaning: "Keep the raid standing through the mechanic." },
    Melee: { icon: "skirmisher", label: "Melee", meaning: "Up close. Cut down adds and sever sacrifices." },
    Ranged: { icon: "skirmisher", label: "Ranged", meaning: "At distance. Interrupts and flare control." },
    Support: { icon: "mender", label: "Support", meaning: "Calls the mechanic. Owns the count." },
  },
  appearancePack: {
    ...RODOH_BASE_THEME.appearancePack,
    roleBindings: {
      Tank: "rodoh:plated",
      Healer: "rodoh:robed",
      Melee: "rodoh:hooded",
      Ranged: "rodoh:hooded",
      Support: "rodoh:robed",
    },
  },
  attributes: {
    power: { icon: "power", label: "Power", meaning: "Raw damage output, martial or arcane." },
    resilience: { icon: "mettle", label: "Resilience", meaning: "Absorb punishment and stay standing." },
    precision: { icon: "wits", label: "Precision", meaning: "Accuracy, timing, clean execution." },
    adaptability: { icon: "wits", label: "Adaptability", meaning: "Read a changing fight and move first." },
    focus: { icon: "spirit", label: "Focus", meaning: "Sustained concentration — channel, heal, hold." },
  },
};

// Palette tokens from the Karazhan theme sheet §6 (violet-night set). Mirrored
// here as constants so TS surfaces can reference them; the CSS override in
// karazhan.css is the source of truth for rendered color.
export const KARAZHAN_PALETTE = {
  violet: "#574A7A",
  arcane: "#4F7D9E",
  ember: "#D19A3D",
  fel: "#6F8F3F",
  stone: "#746F7C",
  parchment: "#E9DDC4",
  ink: "#1A1420",
  light: "#F0E7D2",
} as const;

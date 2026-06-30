export const rodohPalette = {
  cream: "#fff3e0",
  charcoal: "#1e1e1e",
  yellow: "#ffc21d",
  teal: "#17a589",
  warmGray: "#7a7368",
  success: "#74c476",
  risk: "#ffc21d",
  danger: "#d7372f",
  moss: "#6b784d",
  gold: "#d4a93a",
  rust: "#b24a3a",
  parchment: "#f6efe3",
  ink: "#28282b",
  border: "#1e1e1e",
  panel: "#fff3e0",
  panelDark: "#1e1e1e",
} as const;

export type RodohPaletteKey = keyof typeof rodohPalette;

export const stateColors = {
  available: rodohPalette.teal,
  reliable: rodohPalette.success,
  risky: rodohPalette.risk,
  failing: rodohPalette.danger,
  locked: rodohPalette.warmGray,
  recorded: rodohPalette.warmGray,
  selected: rodohPalette.teal,
  lootAvailable: rodohPalette.yellow,
} as const;

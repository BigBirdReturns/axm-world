import { RODOH_BASE_THEME, type RodohTheme } from "../rodoh.js";

export const FIRST_CHARTER_THEME: RodohTheme = {
  ...RODOH_BASE_THEME,
  id: "first-charter",
  name: "The First Charter",
  motto: "Existence is my counterattack.",
  // Program 001 teaches its real loop spatially: arrive, act, witness change.
  preferredPresentation: "globe",
  appearancePack: {
    ...RODOH_BASE_THEME.appearancePack,
    roleBindings: {
      Vanguard: "rodoh:plated",
      Skirmisher: "rodoh:hooded",
      Mender: "rodoh:robed",
    },
  },
};

export const FIRST_CHARTER_MOTIFS = {
  dandelion: "Persistence / available life",
  archiveBox: "Recorded proof / saved progress",
  coffeeMug: "Routine / rest",
  crossedCalendar: "Cycle survived",
  receiptTab: "Outcome evidence",
  notebook: "Plan / log",
  starSpark: "Improvement / reliable readiness",
} as const;

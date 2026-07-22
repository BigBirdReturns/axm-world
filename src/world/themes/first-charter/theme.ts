import { RODOH_BASE_THEME, type RodohTheme } from "../rodoh.js";
import { FIRST_CHARTER_DOLL_APPEARANCES, FIRST_CHARTER_ROLE_BINDINGS } from "./role-appearances.js";

export const FIRST_CHARTER_THEME: RodohTheme = {
  ...RODOH_BASE_THEME,
  id: "first-charter",
  name: "The First Charter",
  motto: "Existence is my counterattack.",
  appearancePack: {
    fallback: RODOH_BASE_THEME.appearancePack.fallback,
    appearances: { ...RODOH_BASE_THEME.appearancePack.appearances, ...FIRST_CHARTER_DOLL_APPEARANCES },
    roleBindings: FIRST_CHARTER_ROLE_BINDINGS,
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

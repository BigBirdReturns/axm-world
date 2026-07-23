import { RODOH_BASE_THEME, type RodohTheme } from "../rodoh.js";
import { LAMP_DISTRICT_DOLL_APPEARANCES, LAMP_DISTRICT_ROLE_BINDINGS } from "./role-appearances.js";
import "./lamp-district.css";

export const LAMP_DISTRICT_THEME: RodohTheme = {
  ...RODOH_BASE_THEME,
  id: "lamp-district",
  name: "The Lamp District",
  motto: "Every comfort has wake.",
  roles: {
    "wakekeeper": { icon: "wits", label: "Wakekeeper", meaning: "Budget activity against a threat that cannot be safely dismissed." },
    "surface-bearer": { icon: "spirit", label: "Surface Bearer", meaning: "Carry the exterior fiction and the danger it displaces." },
    "maintainer": { icon: "power", label: "Maintainer", meaning: "Keep the quiet works, heat sinks, routes, and common systems alive." },
    "interlocutor": { icon: "spirit", label: "Interlocutor", meaning: "Translate actors omitted by the official map." },
    "witness": { icon: "wits", label: "Witness", meaning: "Hold evidence capable of changing the district's classification." },
    "deliberator": { icon: "mettle", label: "Deliberator", meaning: "Bind emergency authority to a venue, cost, and return obligation." },
    "exception": { icon: "skirmisher", label: "Sovereign Exception", meaning: "Act where inherited maps and commands no longer agree." },
  },
  attributes: {
    "care": { icon: "spirit", label: "Care", meaning: "Keep ordinary lives visible inside concealment policy." },
    "evidence": { icon: "wits", label: "Evidence", meaning: "Recover and qualify claims whose acceptance changes the map." },
    "systems": { icon: "power", label: "Systems", meaning: "Read buried infrastructure and dependencies." },
    "jurisdiction": { icon: "mettle", label: "Jurisdiction", meaning: "Navigate credentials, maps, and incompatible authorities." },
    "opacity": { icon: "skirmisher", label: "Opacity", meaning: "Manage wake without granting one office total observability." },
    "resolve": { icon: "vanguard", label: "Resolve", meaning: "Act under asymmetric risk before certainty arrives." },
  },
  appearancePack: {
    fallback: RODOH_BASE_THEME.appearancePack.fallback,
    appearances: { ...RODOH_BASE_THEME.appearancePack.appearances, ...LAMP_DISTRICT_DOLL_APPEARANCES },
    roleBindings: LAMP_DISTRICT_ROLE_BINDINGS,
  },
};

export const LAMP_DISTRICT_PALETTE = {
  black: "#0a090b",
  basalt: "#1e1b21",
  smoke: "#4a4148",
  lamp: "#d8a24c",
  ember: "#ba6740",
  copper: "#8c5b45",
  paper: "#e8dfcb",
  algae: "#78927d",
} as const;

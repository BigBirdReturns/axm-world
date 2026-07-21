import { RODOH_BASE_THEME, type RodohTheme } from "../rodoh.js";

export const ILYON_THEME: RodohTheme = {
  ...RODOH_BASE_THEME,
  id: "kind-gods-of-ilyon",
  name: "The Kind Gods of Ilyon",
  motto: "A gift must remain refusible.",
  roles: {
    auditor: { icon: "wits", label: "Auditor", meaning: "Recover the claim, its provenance, and the institutions it threatens." },
    interlocutor: { icon: "spirit", label: "Interlocutor", meaning: "Translate actors a governing model cannot own." },
    witness: { icon: "wits", label: "Witness", meaning: "Preserve evidence without laundering uncertainty into certainty." },
    protector: { icon: "vanguard", label: "Protector", meaning: "Keep concrete lives visible while systems are contested." },
    exception: { icon: "skirmisher", label: "Sovereign Exception", meaning: "Learn the assigned model and act outside it." },
  },
  attributes: {
    care: { icon: "spirit", label: "Care", meaning: "Keep the people paying the immediate cost visible." },
    evidence: { icon: "wits", label: "Evidence", meaning: "Recover, test, preserve, and communicate contested knowledge." },
    exteriority: { icon: "skirmisher", label: "Exteriority", meaning: "Defend actors and domains capable of refusal." },
    systems: { icon: "power", label: "Systems", meaning: "Understand dependencies, infrastructure, routes, and institutional power." },
    resolve: { icon: "mettle", label: "Resolve", meaning: "Act before uncertainty can be made complete or comfortable." },
  },
  appearancePack: {
    ...RODOH_BASE_THEME.appearancePack,
    roleBindings: {
      auditor: "rodoh:hooded",
      interlocutor: "rodoh:robed",
      witness: "rodoh:hooded",
      protector: "rodoh:plated",
      exception: "rodoh:bare-doll",
    },
  },
};

export const ILYON_PALETTE = {
  abyss: "#071827",
  ocean: "#0d6d78",
  tide: "#48b7b0",
  nacre: "#e7e1cf",
  coral: "#d68165",
  gold: "#c9a45d",
} as const;

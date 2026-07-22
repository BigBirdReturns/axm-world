// First Charter role portraits and standing bodies. The three founding roles
// receive cartridge-owned silhouettes rather than generic Rodoh starter dolls.
//
// Source: docs/design/references/first_charter_theme_asset_pack_overview.png —
//   redrawn derivative in the civic-guild / ledger / field-work idiom.
// Grid: 16x16 (every portrait and standing body)
// Encoding: .=transparent o=outline s=skin d=ground/skin shadow h=hair/headgear
//   e=eye m=mouth c=clothing t=charter trim w=highlight.

import type { PortraitSpec } from "../../pixel-ui/PixelPortrait.js";
import type { DollAppearance } from "../appearance.js";

export type FirstCharterRoleId = "Vanguard" | "Skirmisher" | "Mender";

const VANGUARD_PORTRAIT: PortraitSpec = {
  grid: [
    "....oooooooo....", "...ohhhhhhhho...", "..ohhhhhhhhhho..", "..ohhwthhtwhho..",
    "..ohhsssssssho..", ".ohhsssssssssho.", ".ohhsseossessho.", ".ohhsssssssssho.",
    ".ohhssdsssdssho.", "..ohsssmmmsssho.", "..ohhsssssssho..", "...ohhsssssho...",
    "...octtttttco...", "..occcwccwccco..", ".occcccccccccco.", ".occcccccccccco.",
  ],
  palette: { o: "#1d1b18", s: "#d8ae87", d: "#45372c", h: "#68747b", e: "#211b17", m: "#945b4e", c: "#4f5e63", t: "#2d8177", w: "#efe6d2" },
};
const VANGUARD_BODY: PortraitSpec = {
  grid: [
    ".....oooooo.....", "....ohhhhhho....", "....ohwtwhho....", "....osssssso....",
    ".....ossso......", "...octtttttco...", "..occcwccwccco..", "..occcccccccco..",
    "..ococcccccco...", "...occccccco....", "...occccccco....", "...oc..cc..co...",
    "..occ..cc..cco..", "..occ..cc..cco..", "..oo...oo...oo..", "...d........d...",
  ],
  palette: VANGUARD_PORTRAIT.palette,
};

const SKIRMISHER_PORTRAIT: PortraitSpec = {
  grid: [
    ".....oooooo.....", "....ohhhhhho....", "...ohhhhhhhho...", "..ohhhwttwhhho..",
    "..ohssssssssho..", ".ohssssssssssho.", ".ohsseossseosho.", ".ohssssssssssho.",
    ".ohssdsssssdssho", "..ohsssmmmsssso.", "..ohhssssssshho.", "...ohhsssshhho..",
    "...otttttttto...", "..octtwccwttco..", ".occcccccccccco.", ".occcccccccccco.",
  ],
  palette: { o: "#1d1b18", s: "#d2a680", d: "#45372c", h: "#43583f", e: "#202019", m: "#955b4d", c: "#50664a", t: "#b68645", w: "#f0e7d4" },
};
const SKIRMISHER_BODY: PortraitSpec = {
  grid: [
    "................", ".....oooo.......", "....ohhhho......", "....ohssho......",
    ".....osso.......", "....otttto......", "...otttttto.....", "...otttttto.....",
    "...o.otto.o.....", ".....otto.......", ".....otto.......", ".....o..o.......",
    "....oc..co......", "....oc..co......", "....oo..oo......", "...d......d.....",
  ],
  palette: SKIRMISHER_PORTRAIT.palette,
};

const MENDER_PORTRAIT: PortraitSpec = {
  grid: [
    ".....oooooo.....", "....ohhhhhho....", "...ohhhhhhhho...", "...otttttttto...",
    "..ohssssssssho..", ".ohssssssssssho.", ".ohsseosseossho.", ".ohssssssssssho.",
    ".ohssdsssssdssho", "..ohsssmmmsssso.", "..ohhssssssshho.", "...ohhsssshhho..",
    "...occcccccco...", "..occcttttccco..", ".occcccccccccco.", ".occcccccccccco.",
  ],
  palette: { o: "#1d1b18", s: "#dfb58e", d: "#45372c", h: "#775640", e: "#241c18", m: "#9d6252", c: "#687b72", t: "#c29d52", w: "#f5eddf" },
};
const MENDER_BODY: PortraitSpec = {
  grid: [
    "................", ".....oooo.......", "....ohhhho......", "....otttto......",
    "....ossso.......", "....occcco......", "...occcccco.....", "...occcccco.....",
    "...occcccco.....", "...occcccco.....", "...occcccco.....", "...occcccco.....",
    "...occcccco.....", "...occcccco.....", "...oooooooo.....", "...d.......d....",
  ],
  palette: MENDER_PORTRAIT.palette,
};

export const FIRST_CHARTER_ROLE_SPECS: Record<FirstCharterRoleId, { portrait: PortraitSpec; body: PortraitSpec }> = {
  Vanguard: { portrait: VANGUARD_PORTRAIT, body: VANGUARD_BODY },
  Skirmisher: { portrait: SKIRMISHER_PORTRAIT, body: SKIRMISHER_BODY },
  Mender: { portrait: MENDER_PORTRAIT, body: MENDER_BODY },
};

export const FIRST_CHARTER_DOLL_APPEARANCES: Record<string, DollAppearance> = Object.fromEntries(
  Object.entries(FIRST_CHARTER_ROLE_SPECS).map(([role, specs]) => {
    const id = `first-charter:${role.toLowerCase()}`;
    return [id, { id, body: "person", portrait: "person", bodySpec: specs.body, portraitSpec: specs.portrait, renderMode: "layered", identityTreatment: "authored" } satisfies DollAppearance];
  }),
);

export const FIRST_CHARTER_ROLE_BINDINGS: Record<string, string> = {
  vanguard: "first-charter:vanguard",
  Vanguard: "first-charter:vanguard",
  skirmisher: "first-charter:skirmisher",
  Skirmisher: "first-charter:skirmisher",
  mender: "first-charter:mender",
  Mender: "first-charter:mender",
};

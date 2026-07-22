// The Waking Tower raid-role portraits and standing bodies (legacy id `karazhan`). Five raid functions receive
// distinct tower-owned silhouettes instead of sharing three neutral Rodoh dolls.
//
// Source: docs/design/references/karazhan_white_label_asset_pack.svg — redrawn
//   derivative of the committed violet-night white-label reference.
// Grid: 16x16 (every portrait and standing body)
// Encoding: .=transparent o=outline s=skin d=ground/skin shadow h=hair/headgear
//   e=eye m=mouth c=clothing t=arcane trim w=highlight.

import type { PortraitSpec } from "../../pixel-ui/PixelPortrait.js";
import type { DollAppearance } from "../appearance.js";

export type KarazhanRoleId = "Tank" | "Healer" | "Melee" | "Ranged" | "Support";

const portraitGrid = [
  "....oooooooo....", "...ohhhhhhhho...", "..ohhhhhhhhhho..", "..ohhwthhtwhho..",
  "..ohhsssssssho..", ".ohhsssssssssho.", ".ohhsseossessho.", ".ohhsssssssssho.",
  ".ohhssdsssdssho.", "..ohsssmmmsssho.", "..ohhsssssssho..", "...ohhsssssho...",
  "...octtttttco...", "..occcwccwccco..", ".occcccccccccco.", ".occcccccccccco.",
];
const hoodPortraitGrid = [
  ".....oooooo.....", "...oohhhhhhoo...", "..ohhhhhhhhhho..", ".ohhhtthhhhtthho",
  ".ohhssssssssshho", ".ohsssssssssssho", ".ohsseosssseosho", ".ohsssssssssssho",
  ".ohssdsssssdssho", "..ohsssmmmsssso.", "..ohhssssssshho.", "...ohhsssshhho..",
  "...octtttttco...", "..octcwccwctco..", ".occcccccccccco.", ".occcccccccccco.",
];
const platedBody = [
  ".....oooooo.....", "....ohhhhhho....", "....ohwtwhho....", "....osssssso....",
  ".....ossso......", "...octtttttco...", "..occcwccwccco..", "..occcccccccco..",
  "..ococcccccco...", "...occccccco....", "...occccccco....", "...oc..cc..co...",
  "..occ..cc..cco..", "..occ..cc..cco..", "..oo...oo...oo..", "...d........d...",
];
const robeBody = [
  "................", ".....oooo.......", "....ohhhho......", "....otttto......",
  "....ossso.......", "....occcco......", "...occcccco.....", "...occcccco.....",
  "...occcccco.....", "...occcccco.....", "...occcccco.....", "...occcccco.....",
  "...occcccco.....", "...occcccco.....", "...oooooooo.....", "...d.......d....",
];
const lightBody = [
  "................", ".....oooo.......", "....ohhhho......", "....ohssho......",
  ".....osso.......", "....otttto......", "...otttttto.....", "...otttttto.....",
  "...o.otto.o.....", ".....otto.......", ".....otto.......", ".....o..o.......",
  "....oc..co......", "....oc..co......", "....oo..oo......", "...d......d.....",
];

const palette = (h: string, c: string, t: string, w = "#efe7f5"): Record<string, string> => ({
  o: "#1a1420", s: "#d9cbb8", d: "#2a2438", h, e: "#241c2c", m: "#8a5a4c", c, t, w,
});

const specs: Record<KarazhanRoleId, { portrait: PortraitSpec; body: PortraitSpec }> = {
  Tank: { portrait: { grid: portraitGrid, palette: palette("#4b465e", "#514c68", "#d19a3d") }, body: { grid: platedBody, palette: palette("#4b465e", "#514c68", "#d19a3d") } },
  Healer: { portrait: { grid: hoodPortraitGrid, palette: palette("#e7d9c5", "#6b5b83", "#9a7fd0") }, body: { grid: robeBody, palette: palette("#e7d9c5", "#6b5b83", "#9a7fd0") } },
  Melee: { portrait: { grid: hoodPortraitGrid, palette: palette("#302942", "#49385f", "#c65d69") }, body: { grid: lightBody, palette: palette("#302942", "#49385f", "#c65d69") } },
  Ranged: { portrait: { grid: portraitGrid, palette: palette("#283d55", "#3f607b", "#68a4ca") }, body: { grid: lightBody, palette: palette("#283d55", "#3f607b", "#68a4ca") } },
  Support: { portrait: { grid: hoodPortraitGrid, palette: palette("#433151", "#4c4b68", "#6f8f3f") }, body: { grid: robeBody, palette: palette("#433151", "#4c4b68", "#6f8f3f") } },
};

export const KARAZHAN_ROLE_SPECS = specs;
export const KARAZHAN_DOLL_APPEARANCES: Record<string, DollAppearance> = Object.fromEntries(
  Object.entries(specs).map(([role, roleSpecs]) => {
    const id = `karazhan:${role.toLowerCase()}`;
    return [id, { id, body: "person", portrait: "person", bodySpec: roleSpecs.body, portraitSpec: roleSpecs.portrait, renderMode: "layered", identityTreatment: "authored" } satisfies DollAppearance];
  }),
);
export const KARAZHAN_ROLE_BINDINGS: Record<string, string> = {
  tank: "karazhan:tank",
  Tank: "karazhan:tank",
  healer: "karazhan:healer",
  Healer: "karazhan:healer",
  melee: "karazhan:melee",
  Melee: "karazhan:melee",
  ranged: "karazhan:ranged",
  Ranged: "karazhan:ranged",
  support: "karazhan:support",
  Support: "karazhan:support",
};

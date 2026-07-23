// Lamp District role portraits and standing bodies. These are cartridge-owned
// 16×16 silhouettes for the seven Dark Tomb roles. The runtime sees only opaque
// appearance ids; no body is assigned an occupation by engine law.

import type { PortraitSpec } from "../../pixel-ui/PixelPortrait.js";
import type { DollAppearance } from "../appearance.js";

export type LampDistrictRoleId =
  | "wakekeeper"
  | "surface-bearer"
  | "maintainer"
  | "interlocutor"
  | "witness"
  | "deliberator"
  | "exception";

const PORTRAIT_GRID = [
  "....oooooooo....",
  "...ohhhhhhhho...",
  "..ohhhhhhhhhho..",
  "..ohhwwhhhhthho.",
  "..ohhssssssshto.",
  ".ohhsssssssssho.",
  ".ohhsseossstsho.",
  ".ohhssssssstsho.",
  ".ohhssdssssssho.",
  "..ohsssmmmsssho.",
  "..ohhsssssssho..",
  "...ohhsssssho...",
  "...octtttttco...",
  "..occcwccwccco..",
  ".occcccccccccco.",
  ".occcccccccccco.",
] as const;

const BODY_GRID = [
  ".....oooooo.....",
  "....ohhhhhho....",
  "....ohwthhho....",
  "....osssssso....",
  ".....ossso......",
  "...octtttttco...",
  "..occcwccwccco..",
  "..occcccccccco..",
  "..ococcccccco...",
  "...occccccco....",
  "...occccccco....",
  "...oc..cc..o....",
  "..occ..cc..cco..",
  "..occ..cc..cco..",
  "..oo...oo...oo..",
  "...d........d...",
] as const;

const PALETTES: Record<LampDistrictRoleId, PortraitSpec["palette"]> = {
  "wakekeeper": { o: "#100f11", s: "#d7aa86", d: "#392e2b", h: "#312c3f", e: "#241b1a", m: "#8a5148", c: "#40374d", t: "#d59b43", w: "#efe5cf" },
  "surface-bearer": { o: "#100f11", s: "#c89572", d: "#392e2b", h: "#594035", e: "#241b1a", m: "#8a5148", c: "#6a4b35", t: "#c87545", w: "#f2e0c8" },
  "maintainer": { o: "#100f11", s: "#d5a780", d: "#392e2b", h: "#4b5048", e: "#241b1a", m: "#8a5148", c: "#4d5c56", t: "#87a67f", w: "#e9ead7" },
  "interlocutor": { o: "#100f11", s: "#d9ad8b", d: "#392e2b", h: "#62464f", e: "#241b1a", m: "#95564d", c: "#704d5e", t: "#d7a25d", w: "#f3e3d4" },
  "witness": { o: "#100f11", s: "#d0a17e", d: "#392e2b", h: "#33434f", e: "#241b1a", m: "#8e554c", c: "#344b58", t: "#95adba", w: "#e7edf0" },
  "deliberator": { o: "#100f11", s: "#d9ac84", d: "#392e2b", h: "#54472f", e: "#241b1a", m: "#92574b", c: "#665a38", t: "#c9a451", w: "#eee6ce" },
  "exception": { o: "#100f11", s: "#c7d8d4", d: "#29373a", h: "#1f4d50", e: "#0c2f32", m: "#75605b", c: "#24585b", t: "#79b5aa", w: "#e2f1ed" },
};

function spec(role: LampDistrictRoleId, grid: readonly string[]): PortraitSpec {
  return { grid: [...grid], palette: PALETTES[role] };
}

export const LAMP_DISTRICT_ROLE_SPECS: Record<LampDistrictRoleId, { portrait: PortraitSpec; body: PortraitSpec }> = {
  "wakekeeper": { portrait: spec("wakekeeper", PORTRAIT_GRID), body: spec("wakekeeper", BODY_GRID) },
  "surface-bearer": { portrait: spec("surface-bearer", PORTRAIT_GRID), body: spec("surface-bearer", BODY_GRID) },
  "maintainer": { portrait: spec("maintainer", PORTRAIT_GRID), body: spec("maintainer", BODY_GRID) },
  "interlocutor": { portrait: spec("interlocutor", PORTRAIT_GRID), body: spec("interlocutor", BODY_GRID) },
  "witness": { portrait: spec("witness", PORTRAIT_GRID), body: spec("witness", BODY_GRID) },
  "deliberator": { portrait: spec("deliberator", PORTRAIT_GRID), body: spec("deliberator", BODY_GRID) },
  "exception": { portrait: spec("exception", PORTRAIT_GRID), body: spec("exception", BODY_GRID) },
};

export const LAMP_DISTRICT_DOLL_APPEARANCES: Record<string, DollAppearance> = Object.fromEntries(
  Object.entries(LAMP_DISTRICT_ROLE_SPECS).map(([role, specs]) => {
    const id = `lamp-district:${role}`;
    return [id, {
      id,
      body: "person",
      portrait: "person",
      bodySpec: specs.body,
      portraitSpec: specs.portrait,
      renderMode: "layered",
      identityTreatment: "authored",
    } satisfies DollAppearance];
  }),
);

export const LAMP_DISTRICT_ROLE_BINDINGS: Record<string, string> = Object.fromEntries(
  Object.keys(LAMP_DISTRICT_ROLE_SPECS).map((role) => [role, `lamp-district:${role}`]),
);

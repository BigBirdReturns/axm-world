// Ilyon role portraits and standing bodies. These are cartridge-owned visual
// assets, not generic Rodoh relabels: each of the five Godscar responsibilities
// receives a distinct 16x16 silhouette in the oceanic civic-observatory idiom.
//
// Source: docs/design/references/ilyon_white_label_asset_pack.svg — redrawn
//   derivative of the accepted Ilyon white-label concept sheet.
// Grid: 16x16 (every portrait and standing body)
// Encoding: .=transparent o=outline s=skin d=ground/skin shadow h=headgear/hair
//   e=eye m=mouth c=clothing t=coral/gold trim w=nacre highlight.

import { PixelPortraitGlyph, type PortraitSpec } from "../../pixel-ui/PixelPortrait.js";
import type { DollAppearance } from "../appearance.js";

export type IlyonRoleId = "auditor" | "interlocutor" | "witness" | "protector" | "exception";

const AUDITOR_PORTRAIT: PortraitSpec = {
  grid: [
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
  ],
  palette: { o: "#071016", s: "#d7ad88", d: "#031019", h: "#18394a", e: "#221c18", m: "#995d51", c: "#174956", t: "#c9a45d", w: "#e7e1cf" },
};

const AUDITOR_BODY: PortraitSpec = {
  grid: [
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
  ],
  palette: { o: "#071016", s: "#d7ad88", d: "#031019", h: "#18394a", e: "#221c18", m: "#995d51", c: "#174956", t: "#c9a45d", w: "#e7e1cf" },
};

const INTERLOCUTOR_PORTRAIT: PortraitSpec = {
  grid: [
    ".....oooooo.....",
    "...oohhhhhhoo...",
    "..ohhhhhhhhhho..",
    ".ohhhtthhhhtthho",
    ".ohhssssssssshho",
    ".ohsssssssssssho",
    ".ohsseosssseosho",
    ".ohsssssssssssho",
    ".ohssdsssssdssho",
    "..ohsssmmmsssso.",
    "..ohhssssssshho.",
    "...ohhsssshhho..",
    "...octtttttco...",
    "..octcwccwctco..",
    ".occcccccccccco.",
    ".occcccccccccco.",
  ],
  palette: { o: "#071016", s: "#d8b08c", d: "#031019", h: "#2d6c70", e: "#1b2628", m: "#9e6253", c: "#2f7372", t: "#d68165", w: "#e7e1cf" },
};

const INTERLOCUTOR_BODY: PortraitSpec = {
  grid: [
    "....oo....oo....",
    "...ohhoooohho...",
    "...ohhhhhhhho...",
    "....osssssso....",
    "...otttttttto...",
    "..octtttttttco..",
    "..occttwwttcco..",
    "..occttttttcco..",
    "...octtttttco...",
    "...octtttttco...",
    "...octtttttco...",
    "...oc..tt..co...",
    "..occ..tt..cco..",
    "..occ..tt..cco..",
    "..oo...oo...oo..",
    "...d........d...",
  ],
  palette: { o: "#071016", s: "#d8b08c", d: "#031019", h: "#2d6c70", e: "#1b2628", m: "#9e6253", c: "#2f7372", t: "#d68165", w: "#e7e1cf" },
};

const WITNESS_PORTRAIT: PortraitSpec = {
  grid: [
    "....oooooooo....",
    "...ohhhhhhhho...",
    "..ohhhhhhhhhho..",
    "..ohhhtttthhho..",
    "..ohhsssssssho..",
    ".ohhsssssssssho.",
    ".ohhsseossessho.",
    ".ohhsssssssssho.",
    ".ohhssdsssdssho.",
    "..ohsssmmmsssho.",
    "..ohhsssssssho..",
    "...ohhsssssho...",
    "...occcccccco...",
    "..occcttttccco..",
    ".occcccccccccco.",
    ".occcccccccccco.",
  ],
  palette: { o: "#071016", s: "#d2aa88", d: "#031019", h: "#1d344e", e: "#191d25", m: "#955b52", c: "#27455d", t: "#d6bd82", w: "#e7e1cf" },
};

const WITNESS_BODY: PortraitSpec = {
  grid: [
    ".....oooooo.....",
    "....ohhhhhho....",
    "....ohttttho....",
    "....osssssso....",
    ".....ossso......",
    "...occcccccco...",
    "..occcttttccco..",
    "..occcccccccco..",
    "...occccccco....",
    "...occccccco....",
    "...occccccco....",
    "...oc..cc..co...",
    "..occ..cc..cco..",
    "..occ..cc..cco..",
    "..oo...oo...oo..",
    "...d........d...",
  ],
  palette: { o: "#071016", s: "#d2aa88", d: "#031019", h: "#1d344e", e: "#191d25", m: "#955b52", c: "#27455d", t: "#d6bd82", w: "#e7e1cf" },
};

const PROTECTOR_PORTRAIT: PortraitSpec = {
  grid: [
    ".....oooooo.....",
    "....ohhhhhho....",
    "...ohhhhhhhho...",
    "...ohhwthhwho...",
    "...ohssssssho...",
    "..ohssssssssho..",
    "..ohseosssseos..",
    "..ohssssssssho..",
    "..ohssdssssdsso.",
    "...ohssmmmssho..",
    "...ohssssssho...",
    "....ohssssho....",
    "...octtttttco...",
    "..occcwccwccco..",
    ".occcccccccccco.",
    ".occcccccccccco.",
  ],
  palette: { o: "#071016", s: "#d9ae89", d: "#031019", h: "#2e6d63", e: "#1d2824", m: "#9d5f51", c: "#3b7e74", t: "#d68165", w: "#eff0df" },
};

const PROTECTOR_BODY: PortraitSpec = {
  grid: [
    ".....oooooo.....",
    "....ohhhhhho....",
    "....ohwtwhho....",
    "....osssssso....",
    ".....ossso......",
    "...octtttttco...",
    "..occcwccwccco..",
    "..occcccccccco..",
    "..ococcccccco...",
    "...occccccco....",
    "...occccccco....",
    "...oc..cc..co...",
    "..occ..cc..cco..",
    "..occ..cc..cco..",
    "..oo...oo...oo..",
    "...d........d...",
  ],
  palette: { o: "#071016", s: "#d9ae89", d: "#031019", h: "#2e6d63", e: "#1d2824", m: "#9d5f51", c: "#3b7e74", t: "#d68165", w: "#eff0df" },
};

const EXCEPTION_PORTRAIT: PortraitSpec = {
  grid: [
    "...oo......oo...",
    "..ohho....ohho..",
    ".ohhwhoooohwhho.",
    ".ohhhhhhhhhhhho.",
    "..ohssssssssho..",
    ".ohssssssssssho.",
    ".ohssewsssswesho",
    ".ohssssssssssho.",
    ".ohssdsssssdssho",
    "..ohsssmmmsssso.",
    "..ohhssssssshho.",
    "...ohhsssshhho..",
    "...octtttttco...",
    "..octcwccwctco..",
    ".occcccccccccco.",
    "..occcccccccco..",
  ],
  palette: { o: "#071016", s: "#d8efe8", d: "#031019", h: "#48b7b0", e: "#0d6d78", m: "#9f625c", c: "#78b9b2", t: "#d68165", w: "#fff3cf" },
};

const EXCEPTION_BODY: PortraitSpec = {
  grid: [
    "...oo......oo...",
    "..ohho....ohho..",
    "..ohhhoooohhho..",
    "...ohssssssho...",
    "....osssssso....",
    "...otttttttto...",
    "..octtwwwwttco..",
    "..octtttttttco..",
    "...octtttttco...",
    "...octtttttco...",
    "...octtttttco...",
    "...ot..tt..to...",
    "..ott..tt..tto..",
    "..ott..tt..tto..",
    "..oo...oo...oo..",
    "...d........d...",
  ],
  palette: { o: "#071016", s: "#d8efe8", d: "#031019", h: "#48b7b0", e: "#0d6d78", m: "#9f625c", c: "#78b9b2", t: "#d68165", w: "#fff3cf" },
};

export const ILYON_ROLE_SPECS: Record<IlyonRoleId, { portrait: PortraitSpec; body: PortraitSpec }> = {
  auditor: { portrait: AUDITOR_PORTRAIT, body: AUDITOR_BODY },
  interlocutor: { portrait: INTERLOCUTOR_PORTRAIT, body: INTERLOCUTOR_BODY },
  witness: { portrait: WITNESS_PORTRAIT, body: WITNESS_BODY },
  protector: { portrait: PROTECTOR_PORTRAIT, body: PROTECTOR_BODY },
  exception: { portrait: EXCEPTION_PORTRAIT, body: EXCEPTION_BODY },
};

export const ILYON_DOLL_APPEARANCES: Record<string, DollAppearance> = {
  "ilyon:auditor": {
    id: "ilyon:auditor", body: "person", portrait: "person",
    bodySpec: AUDITOR_BODY, portraitSpec: AUDITOR_PORTRAIT,
    renderMode: "layered", identityTreatment: "authored",
  },
  "ilyon:interlocutor": {
    id: "ilyon:interlocutor", body: "person", portrait: "person",
    bodySpec: INTERLOCUTOR_BODY, portraitSpec: INTERLOCUTOR_PORTRAIT,
    renderMode: "layered", identityTreatment: "authored",
  },
  "ilyon:witness": {
    id: "ilyon:witness", body: "person", portrait: "person",
    bodySpec: WITNESS_BODY, portraitSpec: WITNESS_PORTRAIT,
    renderMode: "layered", identityTreatment: "authored",
  },
  "ilyon:protector": {
    id: "ilyon:protector", body: "person", portrait: "person",
    bodySpec: PROTECTOR_BODY, portraitSpec: PROTECTOR_PORTRAIT,
    renderMode: "layered", identityTreatment: "authored",
  },
  "ilyon:exception": {
    id: "ilyon:exception", body: "person", portrait: "person",
    bodySpec: EXCEPTION_BODY, portraitSpec: EXCEPTION_PORTRAIT,
    renderMode: "layered", identityTreatment: "authored",
  },
};

export const ILYON_ROLE_BINDINGS: Record<IlyonRoleId, string> = {
  auditor: "ilyon:auditor",
  interlocutor: "ilyon:interlocutor",
  witness: "ilyon:witness",
  protector: "ilyon:protector",
  exception: "ilyon:exception",
};

const CAST_ROLE: Record<string, IlyonRoleId> = {
  "aster-neral": "auditor",
  "talan-rook": "protector",
  "iri-sable": "witness",
  "cael-arvon": "interlocutor",
  "nacre-deep-tide": "exception",
};

export function rolePortrait(roleId: string): PortraitSpec | null {
  return ILYON_ROLE_SPECS[roleId as IlyonRoleId]?.portrait ?? null;
}

export function roleSprite(roleId: string): PortraitSpec | null {
  return ILYON_ROLE_SPECS[roleId as IlyonRoleId]?.body ?? null;
}

export function personPortrait(personId: string): PortraitSpec | null {
  const roleId = CAST_ROLE[personId];
  return roleId ? rolePortrait(roleId) : null;
}

export function personSprite(personId: string): PortraitSpec | null {
  const roleId = CAST_ROLE[personId];
  return roleId ? roleSprite(roleId) : null;
}

export function PersonPortraitIcon({ personId, size = 32, className = "" }: { personId: string; size?: number; className?: string }): JSX.Element | null {
  const spec = personPortrait(personId);
  if (!spec) return null;
  return (
    <span
      className={`ilyon-person-portrait ${className}`.trim()}
      data-testid={`person-portrait-${personId}`}
      aria-hidden="true"
      style={{ width: size, height: size, display: "inline-block", flex: "none" }}
    >
      <PixelPortraitGlyph spec={spec} />
    </span>
  );
}

export function PersonSpriteIcon({ personId, size = 44, className = "" }: { personId: string; size?: number; className?: string }): JSX.Element | null {
  const spec = personSprite(personId);
  if (!spec) return null;
  return (
    <span
      className={`ilyon-person-sprite ${className}`.trim()}
      data-testid={`person-sprite-${personId}`}
      aria-hidden="true"
      style={{ width: size, height: size, display: "inline-block", flex: "none" }}
    >
      <PixelPortraitGlyph spec={spec} />
    </span>
  );
}

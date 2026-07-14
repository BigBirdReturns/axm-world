// One motif element for an encounter, dispatched to the active cartridge's
// theme. Returns null for arcs with no bundled motif set, so callers fall back
// to the neutral PixelIcon exactly as before. The two theme motif modules
// export the same names (locationMotif/MotifIcon) over different motif-name
// unions, so they are imported here under namespaces rather than re-exported.

import * as FirstCharter from "./first-charter/motif-icons.js";
import * as Karazhan from "./karazhan/motif-icons.js";
import { PersonPortraitIcon, PersonSpriteIcon } from "./first-charter/portrait-icons.js";
import * as KarazhanPeople from "./karazhan/portrait-icons.js";
import { FIRST_CHARTER_THEME } from "./first-charter/theme.js";
import { KARAZHAN_THEME } from "./karazhan/theme.js";

interface CartridgeMotifProps {
  arcId: string;
  challengeId: string;
  size?: number;
  className?: string;
}

export function CartridgeMotif({ arcId, challengeId, size = 20, className = "" }: CartridgeMotifProps): JSX.Element | null {
  if (arcId === KARAZHAN_THEME.id) {
    return <Karazhan.MotifIcon name={Karazhan.locationMotif(challengeId)} size={size} className={className} />;
  }
  if (arcId === FIRST_CHARTER_THEME.id) {
    return <FirstCharter.MotifIcon name={FirstCharter.locationMotif(challengeId)} size={size} className={className} />;
  }
  return null;
}

/** An AUTHORED person's face, dispatched to the active cartridge's theme. Only a
 *  person the cartridge actually authors (cartridge.people[].id) can have one —
 *  null otherwise, so callers keep their existing neutral figure. Faces are
 *  presentation over authored identity, never generated for unnamed figures. */
export function CartridgePortrait({ arcId, personId, size = 32, className = "" }: { arcId: string; personId: string; size?: number; className?: string }): JSX.Element | null {
  if (arcId === KARAZHAN_THEME.id) {
    return <KarazhanPeople.PersonPortraitIcon personId={personId} size={size} className={className} />;
  }
  if (arcId === FIRST_CHARTER_THEME.id) {
    return <PersonPortraitIcon personId={personId} size={size} className={className} />;
  }
  return null;
}

/** An AUTHORED person's standing BODY for staged scenes — same honesty rule as
 *  CartridgePortrait: authored people only, null otherwise. */
export function CartridgeSprite({ arcId, personId, size = 44, className = "" }: { arcId: string; personId: string; size?: number; className?: string }): JSX.Element | null {
  if (arcId === KARAZHAN_THEME.id) {
    return <KarazhanPeople.PersonSpriteIcon personId={personId} size={size} className={className} />;
  }
  if (arcId === FIRST_CHARTER_THEME.id) {
    return <PersonSpriteIcon personId={personId} size={size} className={className} />;
  }
  return null;
}

/** The cartridge's identity emblem (boot/library). Karazhan's is the cursed
 *  tower; other cartridges have no bundled emblem here and callers keep their
 *  existing neutral mark. */
export function CartridgeEmblem({ arcId, size = 24, className = "" }: { arcId: string; size?: number; className?: string }): JSX.Element | null {
  if (arcId === KARAZHAN_THEME.id) {
    return <Karazhan.MotifIcon name="tower" size={size} className={`kz-cartridge-emblem ${className}`.trim()} />;
  }
  if (arcId === FIRST_CHARTER_THEME.id) {
    // The charter seal — First Charter's dandelion motif.
    return <FirstCharter.MotifIcon name="dandelion" size={size} className={`fc-cartridge-emblem ${className}`.trim()} />;
  }
  return null;
}

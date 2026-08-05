// Cartridge-owned visual assets, dispatched through one white-label theme seam.
// Unknown/imported arcs return null at every entrypoint and keep the neutral
// Rodoh presentation; bundled cartridges may supply motifs, authored faces,
// standing bodies, institutional marks, and evidence/consequence glyphs.

import * as FirstCharter from "./first-charter/motif-icons.js";
import * as Karazhan from "./karazhan/motif-icons.js";
import * as Ilyon from "./ilyon/motif-icons.js";
import * as Lamp from "./lamp-district/motif-icons.js";
import { PersonPortraitIcon, PersonSpriteIcon } from "./first-charter/portrait-icons.js";
import * as KarazhanPeople from "./karazhan/portrait-icons.js";
import * as IlyonPeople from "./ilyon/portrait-icons.js";
import * as LampPeople from "./lamp-district/portrait-icons.js";
import { FIRST_CHARTER_THEME } from "./first-charter/theme.js";
import { KARAZHAN_THEME } from "./karazhan/theme.js";
import { ILYON_THEME } from "./ilyon/theme.js";
import { LAMP_DISTRICT_THEME } from "./lamp-district/theme.js";

interface CartridgeMotifProps {
  arcId: string;
  challengeId: string;
  size?: number;
  className?: string;
}

export function CartridgeMotif({ arcId, challengeId, size = 20, className = "" }: CartridgeMotifProps): JSX.Element | null {
  if (arcId === LAMP_DISTRICT_THEME.id) {
    return <Lamp.MotifIcon name={Lamp.locationMotif(challengeId)} size={size} className={className} />;
  }
  if (arcId === ILYON_THEME.id) {
    return <Ilyon.MotifIcon name={Ilyon.locationMotif(challengeId)} size={size} className={className} />;
  }
  if (arcId === KARAZHAN_THEME.id) {
    return <Karazhan.MotifIcon name={Karazhan.locationMotif(challengeId)} size={size} className={className} />;
  }
  if (arcId === FIRST_CHARTER_THEME.id) {
    return <FirstCharter.MotifIcon name={FirstCharter.locationMotif(challengeId)} size={size} className={className} />;
  }
  return null;
}

/** An authored person's face, keyed by authored id. The identity may originate
 * in the cartridge's people list or in a validated embedded creator source such
 * as godscar.pocket@1; unknown ids still receive no invented face. */
export function CartridgePortrait({ arcId, personId, size = 32, className = "" }: { arcId: string; personId: string; size?: number; className?: string }): JSX.Element | null {
  if (arcId === LAMP_DISTRICT_THEME.id) {
    return <LampPeople.PersonPortraitIcon personId={personId} size={size} className={className} />;
  }
  if (arcId === ILYON_THEME.id) {
    return <IlyonPeople.PersonPortraitIcon personId={personId} size={size} className={className} />;
  }
  if (arcId === KARAZHAN_THEME.id) {
    return <KarazhanPeople.PersonPortraitIcon personId={personId} size={size} className={className} />;
  }
  if (arcId === FIRST_CHARTER_THEME.id) {
    return <PersonPortraitIcon personId={personId} size={size} className={className} />;
  }
  return null;
}

/** Authored standing body for staged scenes — the same honesty rule as portrait. */
export function CartridgeSprite({ arcId, personId, size = 44, className = "" }: { arcId: string; personId: string; size?: number; className?: string }): JSX.Element | null {
  if (arcId === LAMP_DISTRICT_THEME.id) {
    return <LampPeople.PersonSpriteIcon personId={personId} size={size} className={className} />;
  }
  if (arcId === ILYON_THEME.id) {
    return <IlyonPeople.PersonSpriteIcon personId={personId} size={size} className={className} />;
  }
  if (arcId === KARAZHAN_THEME.id) {
    return <KarazhanPeople.PersonSpriteIcon personId={personId} size={size} className={className} />;
  }
  if (arcId === FIRST_CHARTER_THEME.id) {
    return <PersonSpriteIcon personId={personId} size={size} className={className} />;
  }
  return null;
}

/** Cartridge identity emblem used by boot/library and the active status strip. */
export function CartridgeEmblem({ arcId, size = 24, className = "" }: { arcId: string; size?: number; className?: string }): JSX.Element | null {
  if (arcId === LAMP_DISTRICT_THEME.id) {
    return <Lamp.MotifIcon name="lamp" size={size} className={`lamp-cartridge-emblem ${className}`.trim()} />;
  }
  if (arcId === ILYON_THEME.id) {
    return <Ilyon.MotifIcon name="tideAstrolabe" size={size} className={`ilyon-cartridge-emblem ${className}`.trim()} />;
  }
  if (arcId === KARAZHAN_THEME.id) {
    return <Karazhan.MotifIcon name="tower" size={size} className={`kz-cartridge-emblem ${className}`.trim()} />;
  }
  if (arcId === FIRST_CHARTER_THEME.id) {
    return <FirstCharter.MotifIcon name="dandelion" size={size} className={`fc-cartridge-emblem ${className}`.trim()} />;
  }
  return null;
}

export function CartridgePressureMark({ arcId, kind, size = 22 }: { arcId: string; kind: string; size?: number }): JSX.Element | null {
  if (arcId !== ILYON_THEME.id) return null;
  return <Ilyon.MotifIcon name={Ilyon.pressureMotif(kind)} size={size} data-testid={`ilyon-pressure-mark-${kind}`} />;
}

export function CartridgeEvidenceMark({ arcId, receiptId, size = 22 }: { arcId: string; receiptId: string; size?: number }): JSX.Element | null {
  if (arcId !== ILYON_THEME.id) return null;
  return <Ilyon.MotifIcon name={Ilyon.evidenceMotif(receiptId)} size={size} data-testid={`ilyon-evidence-mark-${receiptId}`} />;
}

export function CartridgeFactionMark({ arcId, factionId, size = 24 }: { arcId: string; factionId: string; size?: number }): JSX.Element | null {
  if (arcId !== ILYON_THEME.id) return null;
  return <Ilyon.MotifIcon name={Ilyon.factionMotif(factionId)} size={size} data-testid={`ilyon-faction-mark-${factionId}`} />;
}

export function CartridgeConsequenceMark({ arcId, consequenceId, size = 22 }: { arcId: string; consequenceId: string; size?: number }): JSX.Element | null {
  if (arcId !== ILYON_THEME.id) return null;
  return <Ilyon.MotifIcon name={Ilyon.consequenceMotif(consequenceId)} size={size} data-testid={`ilyon-consequence-mark-${consequenceId}`} />;
}

// A cartridge is the portable unit axm-world plays: a thin presentation/trust
// envelope around the canonical axm-arc Arc artifact. Every state-changing law
// belongs inside `arc`, where `cart1_` identity covers it. The envelope may carry
// people/costume/signature metadata, but it cannot alter execution.

import type { Arc, AuthoredOpening, TrustLabel } from "../engine/types.js";
import { validateArc } from "../engine/schema.js";
import { canonicalizeArc } from "../engine/cartridge-digest.js";
import { FIRST_CHARTER, KARAZHAN, KIND_GODS_OF_ILYON, LAMP_DISTRICT } from "../arcs/index.js";
import { isCostumeId, type CostumeId } from "./presentation-prefs.js";

export type TrustLevel = TrustLabel;

export interface CartridgeManifest {
  cartridgeVersion: 1;
  id: string;
  name: string;
  domain: string;
  engineVersion: string;
  trust: TrustLevel;
  preferredCostume?: CostumeId;
  signature?: string | null;
}

/** Authored presentation person. This may change how a state fact is staged,
 * never the fact or transition itself, so it remains outside Arc identity. */
export interface AuthoredPerson {
  id: string;
  name: string;
  role: string;
  bio: string;
  greeting: string;
  fulfilledLine: string;
}

export interface Cartridge {
  manifest: CartridgeManifest;
  arc: Arc;
  people?: AuthoredPerson[];
}

function validatePeople(value: unknown): AuthoredPerson[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new Error("Cartridge people must be an array.");
  const people = value.map((person, index) => {
    if (!person || typeof person !== "object") throw new Error(`Cartridge person ${index} must be an object.`);
    const candidate = person as Partial<AuthoredPerson>;
    for (const field of ["id", "name", "role", "bio", "greeting", "fulfilledLine"] as const) {
      if (typeof candidate[field] !== "string") throw new Error(`Cartridge person ${index}.${field} must be a string.`);
    }
    return candidate as AuthoredPerson;
  });
  if (new Set(people.map((person) => person.id)).size !== people.length) {
    throw new Error("Cartridge person ids must be unique.");
  }
  return people;
}

function manifestForArc(arc: Arc, trust: TrustLevel, preferredCostume?: CostumeId): CartridgeManifest {
  return {
    cartridgeVersion: 1,
    id: arc.meta.id,
    name: arc.meta.name,
    domain: arc.meta.domain,
    engineVersion: arc.meta.engineVersion,
    trust,
    preferredCostume,
    signature: null,
  };
}

export const FIRST_CHARTER_PEOPLE: AuthoredPerson[] = [{
  id: "charter-keeper",
  name: "Maren Vos",
  role: "Charter-Keeper",
  bio: "Keeper of the founding writ. She logs every contract the hall takes and every mark it leaves on the world.",
  greeting: "The hall's work waits, and the ledger with it. Take the contract when you're ready — I'll see it recorded.",
  fulfilledLine: "It's done, and written. The charter remembers what the hall did here.",
}];

export const KARAZHAN_PEOPLE: AuthoredPerson[] = [{
  id: "tower-warden",
  name: "Seren Vale",
  role: "Warden of the Lamplit Survey",
  bio: "The Survey's warden at the tower door. Vale keeps its tally — every wing the raid reclaims, every raider it spends — and answers for all of it.",
  greeting: "The wards are thin and the next wing is waiting. Take the raid in when you're ready — the Survey will hear how it went from me.",
  fulfilledLine: "Cleared, and counted. The Survey's tally holds what your raid did in there.",
}];


export const KIND_GODS_OF_ILYON_PEOPLE: AuthoredPerson[] = [
  {
    id: "free-observatory-witness",
    name: "Iri Sable",
    role: "Speaker of the Free Observatory",
    bio: "A witness buying Ilyon enough time to test the dead star before a dynasty or a god turns uncertainty into command.",
    greeting: "The cure is real. So is the ownership structure under it. We record both, or we become somebody else's proof.",
    fulfilledLine: "The evidence leaves with its limits attached. Whatever follows, nobody gets to call Ilyon a clean sample.",
  },
  {
    id: "deep-tide-interlocutor",
    name: "Cael Arvon",
    role: "Reef-Listener",
    bio: "Translator for migratory reefs and deep ecologies that the planetary integration model cannot observe without changing.",
    greeting: "Do not make one voice from the ocean because one voice is easier to govern. Listen for the refusals that disagree.",
    fulfilledLine: "The ocean entered politics as several actors. That friction is the proof that it was heard rather than modeled away.",
  },
];

export const LAMP_DISTRICT_PEOPLE: AuthoredPerson[] = [
  {
    id: "anja-vei",
    name: "Anja Vei",
    role: "Teacher and Interlocutor",
    bio: "Carries testimony between the school, clinic, surface houses, and offices that prefer each group to remain a separate technical problem.",
    greeting: "The school lamps are still on. That does not mean the district is safe. It means somebody paid for the light, and the ledger has to say who.",
    fulfilledLine: "The map now names the people and systems the old classification spent. The next expedition inherits that fact.",
  },
  {
    id: "black-lamp-nine",
    name: "Black Lamp Nine",
    role: "Counterborn Guardian",
    bio: "A damaged guardian carrying partial memory of the Meridian search lattice and an unresolved claim to decide when contact becomes a target signal.",
    greeting: "I can tell you the listener answered. I cannot tell you the answer means peace.",
    fulfilledLine: "The Alarm is awake and witnessed. My memory is evidence now, not a private command.",
  },
];

export const FIRST_CHARTER_CARTRIDGE: Cartridge = {
  manifest: manifestForArc(FIRST_CHARTER, "bundled", "board"),
  arc: FIRST_CHARTER,
  people: FIRST_CHARTER_PEOPLE,
};

export const KARAZHAN_CARTRIDGE: Cartridge = {
  manifest: manifestForArc(KARAZHAN, "bundled", "board"),
  arc: KARAZHAN,
  people: KARAZHAN_PEOPLE,
};

export const KIND_GODS_OF_ILYON_CARTRIDGE: Cartridge = {
  manifest: manifestForArc(KIND_GODS_OF_ILYON, "bundled", "aperture"),
  arc: KIND_GODS_OF_ILYON,
  people: KIND_GODS_OF_ILYON_PEOPLE,
};

export const LAMP_DISTRICT_CARTRIDGE: Cartridge = {
  manifest: manifestForArc(LAMP_DISTRICT, "bundled", "underworld"),
  arc: LAMP_DISTRICT,
  people: LAMP_DISTRICT_PEOPLE,
};

export const BUNDLED_CARTRIDGES: Cartridge[] = [
  FIRST_CHARTER_CARTRIDGE,
  KARAZHAN_CARTRIDGE,
  KIND_GODS_OF_ILYON_CARTRIDGE,
  LAMP_DISTRICT_CARTRIDGE,
];

function sameOpening(left: AuthoredOpening, right: AuthoredOpening): boolean {
  return canonicalizeArc(left as unknown as Arc) === canonicalizeArc(right as unknown as Arc);
}

/** Load a full envelope or bare Arc. Legacy envelope-level executable openings
 * are never silently promoted: they were not covered by the old Arc digest. An
 * identical transitional duplicate is accepted and discarded; top-level-only
 * or conflicting law is rejected with an explicit migration error. */
export function parseCartridge(input: unknown, trust: TrustLevel = "imported-unsigned"): Cartridge {
  if (input && typeof input === "object" && "arc" in input && "manifest" in input) {
    const env = input as {
      manifest: Partial<CartridgeManifest>;
      arc: unknown;
      opening?: AuthoredOpening;
      people?: AuthoredPerson[];
    };
    if (!env.manifest || typeof env.manifest !== "object") {
      throw new Error("Cartridge manifest must be an object.");
    }
    const arc = validateArc(env.arc);
    const people = validatePeople(env.people);
    if (env.opening !== undefined) {
      if (!arc.opening) {
        throw new Error(
          "Legacy cartridge opening is outside Arc identity; re-author it inside arc.opening with engineVersion 1.1.0 or newer.",
        );
      }
      if (!sameOpening(env.opening, arc.opening)) {
        throw new Error("Cartridge envelope opening conflicts with identity-bound arc.opening.");
      }
    }
    const manifest = manifestForArc(
      arc,
      trust,
      isCostumeId(env.manifest.preferredCostume) ? env.manifest.preferredCostume : undefined,
    );
    manifest.signature = typeof env.manifest.signature === "string" || env.manifest.signature === null
      ? env.manifest.signature
      : null;
    return {
      // Identity/execution fields and trust are derived by the receiver. The
      // envelope can contribute presentation/signature metadata, never
      // self-upgrade trust or contradict the validated Arc.
      manifest,
      arc,
      ...(people ? { people } : {}),
    };
  }
  const arc = validateArc(input);
  return { manifest: manifestForArc(arc, trust), arc };
}

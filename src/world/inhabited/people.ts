// Which authored person the inhabited hall surfaces. Pure lookup over the
// cartridge's authored people (cartridge DATA) — the hall's steward is the first
// authored person, or null when a cartridge authors none (then the hall shows a
// generic runtime steward instead). Personhood is authored; the fallback keeps
// every cartridge playable without requiring authored people.

import type { AuthoredPerson, Cartridge } from "../cartridge.js";

export function hallSteward(cartridge: Cartridge): AuthoredPerson | null {
  return cartridge.people?.[0] ?? null;
}

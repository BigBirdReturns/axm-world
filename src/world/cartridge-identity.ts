// The cartridge's content identity: the digest of its authored arc.
//
// Custody metadata that rides in the manifest (trust label, Genesis signature
// slot) is deliberately NOT part of identity — an imported, enveloped, or
// provenance-marked cartridge resolves to the SAME identity as the raw authored
// law. That separation is enforced in the vendored digest module
// (`cartridgeDigest` strips reserved custody keys before hashing); this is just
// the world-side name for the question every surface asks: "what authored law is
// this cartridge?"
//
// Deriving identity from `cartridge.arc` (not the `{ manifest, arc }` envelope)
// is deliberate: the manifest holds trust/signature, and hashing the whole
// envelope would let custody state leak into identity.

import { cartridgeDigest } from "../engine/cartridge-digest.js";
import type { Cartridge } from "./cartridge.js";

/** The content-identity anchor for a cartridge: `cartridgeDigest` of its arc. */
export function cartridgeIdentity(cartridge: Cartridge): string {
  return cartridgeDigest(cartridge.arc);
}

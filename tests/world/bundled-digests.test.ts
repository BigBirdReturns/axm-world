// Golden-digest guard for the bundled playable cartridges.
//
// Proves the bundled artifact is derived from its expected content identity:
// recomputes each bundled cartridge's `cartridgeIdentity` and asserts it equals
// the checked-in golden manifest. `cartridgeDigest` and the reserved-key list
// are imported from the vendored digest module — never re-declared here — so the
// single source of truth for custody-key exclusion cannot silently diverge.
//
// The expected values in src/world/bundled-digests.ts are a committed
// expectation, updated intentionally by a human; this guard never writes them.
// A mismatch means a bundled cartridge's authored law changed — fail loudly.

import { describe, it, expect } from "vitest";
import { cartridgeDigest, RESERVED_ENVELOPE_KEYS } from "../../src/engine/cartridge-digest";
import type { Arc } from "../../src/engine/types";
import { BUNDLED_CARTRIDGES } from "../../src/world/cartridge";
import { cartridgeIdentity } from "../../src/world/cartridge-identity";
import { EXPECTED_BUNDLED_DIGESTS } from "../../src/world/bundled-digests";
import { LEGACY_BUNDLED_DIGESTS } from "../../src/world/legacy-revisions";

describe("bundled cartridge golden digests", () => {
  const actual: Record<string, string> = {};
  for (const c of BUNDLED_CARTRIDGES) actual[c.manifest.id] = cartridgeIdentity(c);

  it("each bundled cartridge matches its expected golden digest", () => {
    expect(actual).toEqual(EXPECTED_BUNDLED_DIGESTS);
  });

  it("keeps historical locators distinct from the current identity manifest", () => {
    for (const [id, legacyDigest] of Object.entries(LEGACY_BUNDLED_DIGESTS)) {
      expect(EXPECTED_BUNDLED_DIGESTS[id]).toBeDefined();
      expect(EXPECTED_BUNDLED_DIGESTS[id]).not.toBe(legacyDigest);
    }
  });

  it("cartridge identity is the digest of the authored arc (custody-independent)", () => {
    for (const c of BUNDLED_CARTRIDGES) {
      expect(cartridgeIdentity(c)).toBe(cartridgeDigest(c.arc));
    }
  });

  it("reserved custody keys cannot change a bundled cartridge's identity", () => {
    for (const c of BUNDLED_CARTRIDGES) {
      const base = cartridgeDigest(c.arc);
      for (const key of RESERVED_ENVELOPE_KEYS) {
        const withKey = { ...(c.arc as unknown as Record<string, unknown>), [key]: "x" } as unknown as Arc;
        expect(cartridgeDigest(withKey)).toBe(base);
      }
    }
  });

  it("every bundled cartridge digest has the cart1_ shape", () => {
    for (const c of BUNDLED_CARTRIDGES) {
      expect(cartridgeIdentity(c)).toMatch(/^cart1_[0-9a-f]{64}$/);
    }
  });
});

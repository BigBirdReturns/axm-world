// Expected content-identity digests of the bundled cartridges — the golden
// manifest for Program 001 (The First Charter) and its siblings.
//
// This file is intentional, not incidental: a change to any value here means a
// bundled cartridge's AUTHORED LAW changed. Never edit a value just to make the
// golden-digest guard pass — regenerate it deliberately and review the diff. The
// guard (tests/world/bundled-digests.test.ts) recomputes each bundled
// cartridge's `cartridgeIdentity` and asserts it equals the value here, keyed by
// the cartridge manifest id.

export const EXPECTED_BUNDLED_DIGESTS: Readonly<Record<string, string>> = {
  // Seeded from CI in the follow-up commit; placeholders fail the guard on
  // purpose until replaced with the real computed digests.
  "first-charter": "cart1_PENDING",
  "karazhan": "cart1_PENDING",
};

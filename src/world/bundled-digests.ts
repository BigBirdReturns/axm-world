// Expected content-identity digests of the bundled cartridges — the golden
// manifest for Program 001 (The First Charter) and its siblings.
//
// This file is a COMMITTED EXPECTATION, updated intentionally by a human — the
// golden-digest guard (tests/world/bundled-digests.test.ts) recomputes each
// bundled cartridge's `cartridgeIdentity` and asserts it equals the value here,
// keyed by the cartridge manifest id. It never writes this file. A change to any
// value means a bundled cartridge's AUTHORED LAW changed: regenerate
// deliberately and review the diff. Never edit a value just to make the guard
// pass.

export const EXPECTED_BUNDLED_DIGESTS: Readonly<Record<string, string>> = {
  "first-charter": "cart1_d8888842c6a7a7ba758a8eea567c71fcc8f998ff8af75208ed44ef4eee74edeb",
  "karazhan": "cart1_91e91931d7102301288d27a6119f189b1a22ec0614335390d2d1ef006933e047",
  "kind-gods-of-ilyon": "cart1_42d0aa17d6c01c6d11b0c2f944699d52b9a38c999b28302af9b972d736b2498a",
};

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
  "karazhan": "cart1_776adac1b9372d0331ddd774af8b94c80b46bd6bbc4763334cf01def46111144",
  "kind-gods-of-ilyon": "cart1_42d0aa17d6c01c6d11b0c2f944699d52b9a38c999b28302af9b972d736b2498a",
  "lamp-district": "cart1_30f8bd5e8102ae5ebedacbfc59ba8d8c1ab2a2a3177dad5f7781aac3a640f931",
  "relief-circuit": "cart1_c5285f11cba0c4a40fb60db4310fd458f53a4a8775566159fb99610465bea5b1",
};

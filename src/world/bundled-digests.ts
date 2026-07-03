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
  "first-charter": "cart1_0ccb3b88957b80f40435ea8c7a1e44c61115f9334d89f875431c4d5cc29c7fd6",
  "karazhan": "cart1_c06b8a8e9955e16c1b8d0eb8b23cac26df650a0bdc2faa0b74663e67b300e1d7",
};

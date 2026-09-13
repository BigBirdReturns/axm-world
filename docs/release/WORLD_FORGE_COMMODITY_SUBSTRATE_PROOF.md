# World Forge commodity-expression substrate proof

**Run date:** 2026-09-13
**Scope:** production-contract proof only; this receipt makes no visual-quality claim.

The new World Forge compiler was run against the existing unbundled `cartridges/deepway-rescue.arc.json`, rather than a cartridge with a hand-authored Rodoh theme.

- cartridge: `deepway-rescue`
- authored-law digest: `cart1_50ac135555a90ca793ca3a04e100494c2836a680e66ca7a8d494c479c3dae00a`
- forge-plan digest: `wf1_d912b54b5bce98b11671dfada48a0970f2500f6de9139532ce4e7eff8f124055`
- derived production jobs: 23
- expression-pack receipts audited: 23
- audit result: `pass`

The first substrate pass used one synthetic producer that emitted the same minimal valid glTF 2.0 triangle mesh into all 23 slots. A second pass exercised the same exact plan through a mixed producer surface: 8 GLB products, 8 PNG products, and 7 governed SVG products, each with a PNG preview. Both complete packs passed the same auditor.

The auditor independently verified complete slot coverage, cartridge and plan digest bindings, local relative paths, exact SHA-256 and byte counts, media-specific structure, embedded GLB dependencies, non-executable/non-remote SVG content, and PNG signatures. This proves the production boundary rather than the art: producer implementation and media lane can change without changing Arc law or the acceptance surface. Real commodity producers can now compete for the same slots while visual quality remains a separate review dimension.

Commands exercised:

```text
npm run world-forge:plan -- --arc cartridges/deepway-rescue.arc.json --output <proof>/deepway-rescue.world-forge.json
npm run world-forge:audit -- --plan <proof>/deepway-rescue.world-forge.json --pack <proof>/deepway-rescue.expression-pack.json --root <proof>/deepway-assets
```

The scratch proof assets are intentionally not committed. Shipping synthetic triangles would collapse an infrastructure receipt into a false presentation claim.
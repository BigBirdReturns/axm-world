# Commodity World Forge

**Status:** optional commodity-expression substrate. Provider-neutral, presentation-only, digest-bound. It is downstream of and independent from Gate 7 neutral-receiver acceptance.

World Forge converts any validated Arc into a deterministic production packet for disposable world-building workers. The Arc remains authored law. Rodoh remains the runtime player. A producer may be an AI coding agent, Blender automation, image-to-model service, a human artist, or a future tool; none receives gameplay authority by producing geometry.

The boundary is:

```text
validated Arc
  -> cart1_ authored-law digest
  -> rodoh-world-forge-plan/1
  -> replaceable producer(s)
  -> rodoh-world-expression-pack/1
  -> local GLB + preview + provenance receipts
  -> World Forge audit
  -> runtime integration / existing release asset custody
```

This is the economic inversion we want. Authored systems, choices, consequences, custody, and evidence stay scarce. Mesh generation, set dressing, prop modeling, preview rendering, and visual iteration become replaceable production labor.
## What the plan derives

`compileWorldForgePlan()` emits work from authored records without cartridge-id branches:

- one region environment per progression tier;
- one reusable actor per authored role;
- one spatial setpiece per challenge, carrying its real mechanic and hazard facts;
- one prop per authored item;
- exact source references, output media contract, and acceptance constraints for every job.

The plan is bound to the exact `cart1_` digest and receives its own `wf1_` digest. Changing authored law changes both bindings. Changing a generated mesh changes neither cartridge identity nor engine behavior.

The preferred spatial product is self-contained glTF 2.0 GLB plus PNG preview. PNG and governed SVG are also accepted so existing sprite, concept-sheet, vector, and host-materializer lanes can plug into the same production contract. These are transport choices, not commitments to Blender, Unity, a model vendor, or a generation model.

## Acceptance law

A complete expression pack passes only when every required slot has one receipt, both cartridge and plan digests match, every path is local and relative, licensed inputs carry source and license receipts, and every asset hash and byte count matches disk. Media-specific guards then require self-contained glTF 2.0 with a mesh for GLB, a valid PNG signature for raster products, or a titled/described/viewBox SVG with no executable or remote content. Every slot also carries a PNG preview.
Partial packs may be checked during production, but release acceptance requires complete coverage. Generated files may express authored facts; they may not introduce mechanics, resolution, rewards, unlocks, trust, custody, or save state.

The existing governed release-asset inventory remains the downstream release gate after an accepted expression pack is actually integrated into a shipped program. World Forge does not bypass that custody system.

## Producer loop

Commodity producers should use a short closed loop:

1. Read one job and its source facts.
2. Produce the asset and preview.
3. Inspect the preview independently against the job, rather than asking the producer to grade itself.
4. Repair one bounded defect at a time.
5. Emit the receipt only for the accepted bytes.
6. Run the complete pack audit before integration.

A producer can internally use headless Blender Python, screenshot-driven visual iteration, image-to-model, procedural geometry, or manual modeling. Those choices belong in receipts and build logs, not in the runtime contract.

## Commands

```bash
npm run world-forge:plan -- --arc cartridges/deepway-rescue.arc.json --output out/deepway.plan.json
npm run world-forge:audit -- --plan out/deepway.plan.json --pack out/deepway.pack.json --root out/assets
```

The expression proof target is an ordinary unbundled cartridge that first works through Rodoh's neutral fallback, then receives a complete expression pack from replaceable producers and plays with byte-identical authored law and run semantics before and after the visual upgrade. The exact Gate 7 Orchard acceptance fixture remains intentionally neutral; World Forge must never become a hidden prerequisite or Orchard-specific exception.
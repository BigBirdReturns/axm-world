# Infinite Fabric implementation handoff

Planning is closed. Implementation starts with four source objects:

```text
src/fabric/runtime/schema-registry.ts
src/fabric/runtime/world-store.ts
src/fabric/runtime/patch-transaction.ts
src/fabric/tiny-world/first-charter-world.ts
```

The first implementation commit must provide a real in-memory and persisted world store, not another contract. The second must render the root sphere cell and accept semantic movement. The third must execute one versioned collectible or interactable schema and append one host-authored ledger event. The fourth must expose the same state through Board, Planet, and Play.

The first AI-facing commit begins only after those four facts run without a model. It must accept one schema-valid patch fixture, display a preview, require acceptance, apply a new immutable revision, and recover the previous revision.

No additional planning artifact is required before those commits.

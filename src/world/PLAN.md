# axm-world 3D spoke — design & orchestration

The 3D world is a **view** over the existing deterministic engine. It renders a
`PlayScene` (compiled from an arc) as a walkable low-poly planet and routes player
actions back through the *same* engine seam the 2D demo uses. It never imports
engine internals — only the published seam in `src/play-pipeline/compile.ts` and
`runCycle` from `src/engine/cycle.ts`. This is the axm-arc boundary, kept intact.

## The seam (already shipped, unchanged)

```
compileArcToPlayScene(arc, org) -> PlayScene   // nodes (challenges), agents, resources, cycle
buildPlayAssignment(challenge, org, arc)        // auto-party
runCycle({ org, arc, assignments }) -> { org, reports }   // deterministic resolve
summarizeReport(report, arc) -> PlayReportView
```

2D `ArcPlayDemo` draws `PlayScene` as an SVG node map. The 3D spoke draws the
identical `PlayScene` as surface structures on a planet. Walking up to a node and
activating it calls `buildPlayAssignment` + `runCycle`, sets the new `org`,
recompiles the scene → the node flips to `cleared`, resources/HUD update.

## Module map

```
src/world/
  contract.ts        PlayScene -> sphere placement (lat/long, normals). PURE.        [foundation]
  core/              spherical gravity + capsule controller + BVH collision + camera [Agent A]
  planet/            procedural low-poly planet + scatter + BVH collider             [Agent B]
  components/        NodeMarkers, Hud                                                 [integration]
  WorldScreen.tsx    R3F <Canvas> composing it all; wires interaction -> runCycle     [integration]
```

## Tech (the Messenger recipe)

- **R3F + drei** for the scene graph on top of the existing React/Vite app.
- **three-mesh-bvh**: capsule `shapecast` against the planet BVH — no physics engine.
- **Procedural planet**: icosphere + noise displacement, baked **vertex colors**,
  instanced scatter. Zero external textures → payload stays tiny by construction.
- **Spherical gravity**: `g = normalize(center - p)`, local up = `normalize(p - center)`,
  movement projected onto the surface tangent plane, character quaternion aligns +Y to up.

## Orchestration

- **Phase 0 (serial):** deps, this doc, `contract.ts`, commit. Freezes the contract
  so the two agents don't re-derive context.
- **Phase 1 (parallel, two cold subagents, disjoint dirs):**
  - Agent A owns `src/world/core/**` (+ a self-contained `CoreSandbox`).
  - Agent B owns `src/world/planet/**` (+ a self-contained `PlanetSandbox`).
  - Each: only its dir, may `tsc --noEmit`, must not run git/build or edit shared files.
- **Phase 2 (serial, integration):** compose A+B in `WorldScreen`, place nodes via
  `contract.ts`, wire activate→`runCycle`, HUD, `/world` route + title button,
  typecheck/build, deploy through the existing Pages workflow.

## Acceptance

`npm run typecheck` and `npm run build` green; `/world` loads a walkable planet whose
nodes come from a real arc; clearing a node advances deterministic engine state.

# Projection manifest and World Forge v2

`axm-world-projection/1` describes what an operator must perceive and do. It is
a presentation artifact outside Arc and outside the carried run. Compiling or
editing it does not change `cart1_` identity, assignments, outcomes, saves, or
ledger law. It contains no provider selection, network requirement, renderer,
screen layout, outcome evaluator, or executable callbacks.

`compileProjectionManifest(arc)` reads validated authored facts. Contexts form
a hierarchy of world, progression spaces, and encounters. Interactables bind
explicit verbs to targets, committed inputs, runtime guards, and feedback.
Mechanic flavor such as “Survive” is an objective to communicate, not a newly
invented control. Inspect, select party, select mode, allocate a supported
resource, commit, review result, choose a pending decision, and claim a pending
reward have existing runtime counterparts.

Every source reference names either an authored JSON pointer or a runtime
derivation. Signal bindings identify the runtime reader separately from the
authored definition. These are descriptive bindings for compatible consumers,
not executable expressions. Access and feasibility must be refreshed by the
runtime for the current selection. A party selector is conditional on actual
eligible alternatives; fixed deployment must degrade to confirmation. Spend
reuses `spendLeverFor`, including its refusal of divergent per-check levers,
and remains guarded by the existing spend offer and commitment checks.

Required feedback separates previews from actual outcome, check reasons,
recorded changes, and memory. Composition constraints require the existing
engine composition verdict. Public and operator-visible state definitions
produce state signals; private state is omitted. No run snapshot is embedded
in a production plan, and an authored initial value is never a changed-run
receipt. Encounter terminal conditions point to authored completion criteria
and the engine report; the manifest does not invent a universal campaign win
rule. The current compiler covers the shared encounter/decision/reward loop
and ABI state/composition shapes. Specialized source-plane scenery and other
runtime management operations can extend this versioned vocabulary through
their own fact-backed bindings; this is not a claim to have replaced each
runtime scene or implemented a new player.

Expression slots group requirements for production. Validation rejects unknown
fields, duplicate IDs, broken or inconsistent interaction references, context
cycles, and uncovered requirements. Forge v2 retains structured requirements
inside each job, including interaction dependencies and containing contexts.
Changing a brief changes `wf2_`, not `cart1_`. Producers can choose materials,
geometry, symbols, and layout; they cannot remove a required signal or decide
an outcome. Asset receipt validation checks custody, paths, media, binding,
and coverage; perceptual quality and interaction usability still require
runtime review. A receipt alone does not certify those qualities.

## Versioned entry points

The existing `compileWorldForgePlan(arc)` and `--arc` CLI default still emit
`rodoh-world-forge-plan/1` with `wf1_` digests. Existing v1 expression packs and
the v1 validator are unchanged. No existing producer silently receives v2.

```sh
npm run world-forge:plan -- --arc cartridge.json --version 2 --output plan-v2.json
npm run world-forge:plan -- --manifest projection.json --output plan-v2.json
npm run world-forge:audit -- --plan plan-v2.json --pack pack-v2.json --root assets
```

The first v2 command derives the manifest and embeds it in the plan. The second
accepts a serialized manifest directly, with no raw Arc dependency. To author a
separate manifest file, serialize `compileProjectionManifest(arc)` or extract
the plan's `manifest` field. Recompile after a presentation edit.

V2 returns use `rodoh-world-expression-pack/2`, the exact `cart1_` and `wf2_`
bindings, and the existing local asset receipt fields. The v2 validator first
recompiles and verifies the plan, then uses an internal versioned bridge to
reuse v1 media/path/coverage checks. It returns only the original v2 receipt;
the bridge never publishes a v1 plan or changes a cartridge.

## Proof

`tests/world/projection-manifest.test.ts` exercises First Charter, Relief
Circuit, and Lamp District against actual engine cycles. Presentation changes
alter production digests while preserving authored bytes, `cart1_`, input run,
and exact engine outputs. Relief Circuit adds composition verdicts and persistent
ship-state signals through the same compiler; renaming its cartridge ID leaves
its requirements unchanged. Waking Tower proves authored mode controls. Tests
also cover actionable bindings, absent/divergent spend, private-state omission,
graph rejection, and v2 receipt compatibility. Existing v1 tests remain intact.

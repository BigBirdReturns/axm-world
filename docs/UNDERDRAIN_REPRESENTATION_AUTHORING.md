# UNDERDRAIN local representation authoring

This transaction closes the gap between a project-owned concept or lineup image and the seven exact PNG products consumed by the Unity materializer. It runs locally, binds every crop and cutout to the exact Shine extraction receipt, and stops before Unity import, named asset approval, gameplay qualification, or product acceptance.

## Authority boundary

```text
input
exact Shine extraction receipt and project-owned PNG inventory

output
7 byte-distinct prepared PNGs
resolved-representation-source.json
representation-authoring-selection.json
representation-authoring-receipt.json
SHA256SUMS

not issued
Unity materialization
named asset review
production-asset approval
player-product acceptance
```

The local console listens on loopback only, uses a random session token, serves no remote resource, and writes nothing unless all seven required roles submit one valid final PNG each.

## Required roles

```text
player:rhea-venn
enemy:skirmisher
enemy:duelist
enemy:swarm
enemy:hexer
enemy:breaker
arena:pump-seven
```

A single concept sheet may supply more than one role when the operator chooses different crops. Final prepared PNG bytes must nevertheless be distinct. Duplicate final bytes are refused even when they came from different source keys.

## Run the authoring console

After `extract-underdrain-shine-assets.mjs` produces `shine-extraction.json`:

```powershell
node .\scripts\author-underdrain-production-representation.mjs `
  --extraction D:\Projects\Embodied-AR-Lab\local\underdrain-shine-extraction\shine-extraction.json `
  --output D:\Projects\Embodied-AR-Lab\local\underdrain-resolved-representation `
  --operator-id "<local-operator>"
```

The process opens a local browser surface and blocks until the operator completes or cancels the transaction. Each role supports:

```text
source selection from the exact extraction inventory
visual crop selection
edge-connected background removal or intentional background retention
background-removal tolerance and feathering
transparent-margin trimming
play-distance preview
```

The browser prepares PNG bytes, but the Node process independently verifies the source key, source digest, crop bounds, PNG signature, PNG dimensions, exact seven-role coverage, and byte-distinct final products before writing the pack.

Use `--no-open` when the environment cannot launch the browser automatically. The process prints the tokenized loopback URL. Use `--replace` only for an explicit replacement of a prior unapproved authoring output.

## Non-interactive qualification mode

For fixtures and reproducible source qualification, provide a selection document containing the exact submitted PNG bytes:

```powershell
node .\scripts\author-underdrain-production-representation.mjs `
  --extraction <shine-extraction.json> `
  --selection <authoring-selection.json> `
  --output <resolved-output> `
  --no-open
```

This mode exercises the same server-side validation and output writer. It is not a substitute for visual review on the real source inventory.

## One-step Windows staging

The one-step staging runner, `stage-underdrain-production-representation.ps1`, is carried by the machine kit. It performs the complete pre-review machine transaction:

```text
exact clean World and Arc custody
→ untouched-project baseline preflight
→ exact Shine extraction
→ local seven-role authoring console
→ Unity 6000.0.66f2 materialization
→ real post-materialization preflight
→ staging receipt with named asset review open
```

Example:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File .\scripts\stage-underdrain-production-representation.ps1 `
  -WorldRoot D:\Projects\axm-world\player-product `
  -ArcRoot D:\Projects\axm-arc\action-player `
  -EmbodiedArLabRoot D:\Projects\Embodied-AR-Lab `
  -ShineStandalone D:\Evidence\UNDERDRAIN_The_Bloom_Below_Shine_v0.4.html `
  -OperatorId "<local-operator>" `
  -InstallDependencies
```

The stage runner reads `MACHINE_LOCK.json`, refuses a dirty or wrong World or Arc checkout, verifies the exact Shine digest, and preserves an untouched-project baseline receipt. A baseline hold may continue only when every blocking failure is confined to the expected representation-asset plane.

For a repeatable non-interactive staging rerun, add `-AuthoringSelection <authoring-selection.json>`. The stager passes that selection through the same seven-role server-side validator and records the selection input digest in the staging receipt. Without that parameter, the loopback authoring console opens normally.

A passing staging receipt means only:

```text
seven prepared role products exist
the Unity materializer completed
the real project preflight passed
named asset review is open
```

It does not mean the generated representation is visually acceptable. Open:

```text
Assets/AXM/Underdrain/Production/Review/UnderdrainRepresentationReview.unity
```

Review all seven products at intended camera distance before using the separate production-asset approval transaction.

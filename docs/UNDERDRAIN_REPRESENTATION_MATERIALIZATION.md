# UNDERDRAIN production representation materialization

This transaction converts project-owned UNDERDRAIN visual products into the exact Unity paths required by the Windows player train. It begins after source qualification and before named presentation-asset approval.

It creates presentation only. It cannot alter Arc action law, timing, damage, objective completion, campaign consequence, candidate authority, comprehension, or product acceptance.

## Exact authority and target

```text
product
underdrain-bloom-below-unity6000-v1

challenge
breach-crown-pump

theme
underdrain-bloom-below

Unity
6000.0.66f2

production root
Assets/AXM/Underdrain/Production
```

The source transaction recognizes the exact project-owned Shine standalone:

```text
UNDERDRAIN_The_Bloom_Below_Shine_v0.4.html
sha256:ab9e1a542f89d66733d0b9946fd9f2b724e5e09395a74611fa760d336c209311
```

The six upstream visual-source names retained by project custody are recorded in `unity/Fixtures/underdrain.shine-source.json`.

## Turnkey local staging path

The machine kit includes a local authoring console and a one-step staging runner. Use them when the Shine inventory contains concept sheets, lineups, or environmental boards rather than seven already isolated PNG products:

```text
shine extraction
→ local crop and edge-cutout authoring
→ seven byte-distinct semantic products
→ Unity materialization
→ real post-materialization preflight
```

See `UNDERDRAIN_REPRESENTATION_AUTHORING.md`. The authoring transaction may reuse one project-owned sheet for different crops, but it refuses duplicate final PNG bytes and cannot issue named approval.

## 1. Extract the embedded Shine assets

The extractor reads only the local standalone, parses its flat `ASSET_DATA` object, preserves the original embedded bytes, and uses local Playwright Chromium to decode non-PNG browser image formats into PNG. It makes no network request.

```powershell
node .\scripts\extract-underdrain-shine-assets.mjs `
  --input D:\Evidence\UNDERDRAIN_The_Bloom_Below_Shine_v0.4.html `
  --output D:\Projects\Embodied-AR-Lab\local\underdrain-shine-extraction `
  --expected-sha256 ab9e1a542f89d66733d0b9946fd9f2b724e5e09395a74611fa760d336c209311
```

The output contains:

```text
original/**
png/**
shine-extraction.json
SHA256SUMS
```

The receipt records every Shine key, source MIME type, dimensions, original-byte digest, PNG digest, and local output path. It records:

```text
unityInvoked = false
approvalIssued = false
productAcceptance = not-issued
```

## 2. Bind seven distinct visual products to semantic roles

Copy `unity/Fixtures/underdrain.shine-role-map.template.json` beside the extraction receipt and replace every placeholder with a concrete key from `shine-extraction.json`.

The seven required roles are:

```text
player:rhea-venn
enemy:skirmisher
enemy:duelist
enemy:swarm
enemy:hexer
enemy:breaker
arena:pump-seven
```

Each role must use a distinct Shine product. The resolver refuses duplicate keys **and duplicate prepared PNG bytes**. This prevents different aliases for one generic frog image or one concept board from becoming five nominally different enemy products.

```powershell
node .\scripts\resolve-underdrain-shine-representation.mjs `
  --extraction D:\Projects\Embodied-AR-Lab\local\underdrain-shine-extraction\shine-extraction.json `
  --role-map D:\Projects\Embodied-AR-Lab\local\underdrain-shine-extraction\underdrain.shine-role-map.json `
  --output D:\Projects\Embodied-AR-Lab\local\underdrain-resolved-representation
```

The output directory must be absent or empty. Use `--replace` only for an explicit, reviewable replacement; the resolver will not silently mix a new seven-role set with stale files.

The resolver writes seven named PNG files, exact hashes, `resolved-representation-source.json`, and `SHA256SUMS`.

The resolver and Unity materializer enforce distinct-byte and path-containment rules independently. A malformed resolved manifest therefore cannot bypass the resolver and rely on the Unity batch to accept duplicate role bytes or a sibling-prefix source path.

Actor PNGs must already be suitable camera-facing products with transparent or intentionally bounded backgrounds. The resolver does not pretend that renaming a concept sheet performs art direction. If the embedded Shine inventory does not contain seven acceptable products, prepare the missing transparent role PNGs from the six retained project-owned visual sources and write the same resolved-source format directly.

## 3. Materialize the Unity representation

The packaged machine kit supplies `MACHINE_LOCK.json`. The materialization runner loads that lock automatically and refuses a wrong or dirty World or Arc checkout **before** copying the Unity package or launching Unity.

Close Unity and run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File .\scripts\materialize-underdrain-production-representation.ps1 `
  -EmbodiedArLabRoot D:\Projects\Embodied-AR-Lab `
  -SourceManifest D:\Projects\Embodied-AR-Lab\local\underdrain-resolved-representation\resolved-representation-source.json `
  -SourceRoot D:\Projects\Embodied-AR-Lab\local\underdrain-resolved-representation `
  -ArcRoot D:\Projects\axm-arc\main
```

Prepared role sprites use explicit custom pivots. Actor bodies are authored as `root → Facing → Visual`: camera billboarding rotates `Facing`, animation curves target `Facing/Visual`, and role scale remains on `Facing`. This prevents camera-facing logic from erasing attack rotation and prevents animation from collapsing the five enemy scale reads.

The Unity batch creates:

```text
7 imported role PNGs and project-owned sprite materials
8 transform-based presentation clips
UnderdrainAction.controller
UnderdrainEnemy.controller
RheaVenn.prefab
5 exact enemy prefabs
PumpSevenArena.prefab
7 feedback prefabs
7 deterministic PCM WAV clips
UnderdrainRepresentationReview.unity
```

All fourteen Animator parameters used by the production presentation are installed:

```text
AXM_Mode
AXM_ModeTick
AXM_Health
AXM_Active
AXM_Hit
AXM_Parry
AXM_Dodge
AXM_Defeat
AXM_Objective
AXM_Cue
AXM_CueCode
AXM_CueDuration
AXM_DefenseWindow
AXM_WorkWindow
```

The materializer refuses:

```text
wrong Unity version
wrong or dirty exact World or Arc custody
wrong product or theme
missing or stale source digest
source path escape, including sibling-prefix escape
missing or duplicate role
duplicate prepared PNG bytes
forbidden generated root
an overwrite of a named-approved prefab
enabled actor collider or CharacterController
active rigid-body authority
an arena without static camera collision
fewer than 7 core assets
anything other than 27 declared bindings and 23 unique top-level assets
```

It does not use `GameObject.CreatePrimitive`. Actor and arena visuals remain imported sprite products. Pump Seven camera collision uses collider-only static children with no combat or outcome authority.

## 4. Inspect the generated review scene

Open:

```text
Assets/AXM/Underdrain/Production/Review/UnderdrainRepresentationReview.unity
```

Review all seven products at intended player distance. Confirm:

```text
Rhea reads as a worker-plumber rather than a generic soldier
each enemy kit has a distinct silhouette, scale, and threat read
telegraphs remain legible against the sewer image
actor backgrounds do not present as rectangular concept-sheet cards
camera-facing behavior does not erase authored facing
Pump Seven establishes coherent mechanism and sewer space
the static camera surfaces do not become combat authority
```

A materialization pass opens named review. It does not satisfy it.

## 5. Continue through the existing product train

After the real machine preflight passes:

```text
named representation review
→ production-asset approval/2
→ read-only representation intake/3
→ exact Arc and Unity scene qualification
→ read-only representation audit/2
→ Windows build
→ keyboard/mouse session
→ gamepad session with persisted rebind
→ exact Arc replay
→ independent comprehension
→ separate Windows player-product acceptance
```

Changing a source PNG, material, controller, clip, prefab, VFX, WAV, `.meta` file, GUID, role, or declared binding invalidates the later named approval through the complete representation-closure contract.

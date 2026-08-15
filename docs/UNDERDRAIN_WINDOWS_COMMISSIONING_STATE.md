# UNDERDRAIN Windows commissioning state

The hosted source train ends at an exact, qualified software contract. The remaining work occurs on the Windows host that contains the clean World and ARC checkouts, the `Embodied-AR-Lab` Unity project, the actual representation assets, the Windows input devices, and the local evidence directories. This controller makes that boundary resumable without converting absence, a failed attempt, or evidence from another attempt into acceptance.

## Exact source floor

```text
World
75f84ebe86f3691035fa35596f559959dd39c173

World tree
3ddb71721d1381382dbe602cd9d1e2b70bd96fe8

ARC Action Player authority
aaa5685903a348b3c1ba875622fbe99d90c1da35

Action Player Floor
9693cb99694338e72c15d0ffbb87b5a1c5bbf16a

Unity
6000.0.66f2
```

The state controller does not infer local execution from those source identities. It reads only the current machine and the receipts stored under one named `JobId`.

## State order

The controlling state order is:

```text
source-custody
→ representation-materialization
→ machine-preflight-v2
→ presentation-asset-approval
→ player-product-train
→ keyboard-mouse-session
→ gamepad-session
→ role-review-kit
→ role-separated-software-review
→ windows-software-product-acceptance
```

A missing receipt leaves that gate `open`. A malformed, failing, stale, or identity-divergent receipt leaves it `held`. A later receipt found after the first non-passing gate is recorded as out-of-order evidence and holds the attempt. A complete sequence returns `pass`.

The controller never treats a later object as proof that an earlier gate occurred. This matters when a file was copied from another machine, another `JobId`, or an older product head.

## Inspect without mutation

```powershell
$World = "D:\Projects\Organs\AXM\axm-world\main"
$Arc = "D:\Projects\Organs\AXM\axm-arc\main"
$Embodied = "D:\Projects\Embodied-AR-Lab"

powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$World\scripts\get-underdrain-commissioning-state.ps1" `
  -WorldRoot $World `
  -ArcRoot $Arc `
  -EmbodiedArLabRoot $Embodied `
  -ExpectedWorldCommit "75f84ebe86f3691035fa35596f559959dd39c173"
```

The inspector writes:

```text
local\scene-jobs\underdrain-unity6000-player-v1\output\commissioning-state\
  underdrain-commissioning-state.json
  underdrain-commissioning-state.json.sha256
  underdrain-commissioning-state.txt
  history\<timestamp>-<status>.json
```

Its receipt format is:

```text
rodoh-underdrain-windows-commissioning-state/1
```

The current receipt includes every expected evidence path, the first divergence, a concrete next command, and any out-of-order evidence. The timestamped history is append-only. The current file is a convenience projection of the latest snapshot.

## Advance one gate

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$World\scripts\invoke-underdrain-commissioning.ps1" `
  -WorldRoot $World `
  -ArcRoot $Arc `
  -EmbodiedArLabRoot $Embodied `
  -ExpectedWorldCommit "75f84ebe86f3691035fa35596f559959dd39c173" `
  -Mode advance
```

`advance` executes no more than one eligible gate. `auto` continues through eligible gates until it reaches a human decision, missing input, a held receipt, or complete bounded Windows software acceptance.

The controller does not manufacture inputs. Representation materialization requires a resolved seven-role source manifest and source root. Presentation approval requires an actual visual review plus a named approval seat and attestation. Role-separated review requires completed player, observer, and adjudicator packets. Final software acceptance requires a fourth seat, lineage, context, name, and attestation.

A missing manual input returns a `blocked` run receipt without mutating the product. A failed child process also returns a diagnostic run receipt. A held state is not automatically retried.

## Fresh representation path

A fresh machine cannot pass asset preflight before the seven project-owned representation products exist. The correct order is:

```text
exact Shine standalone or another project-owned source pack
→ extraction
→ seven-role resolution
→ Unity representation materialization
→ machine preflight v2
```

When the exact Shine standalone is used, its required identity is:

```text
UNDERDRAIN_The_Bloom_Below_Shine_v0.4.html
sha256 ab9e1a542f89d66733d0b9946fd9f2b724e5e09395a74611fa760d336c209311
object ASSET_DATA
```

After extraction and role resolution:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$World\scripts\invoke-underdrain-commissioning.ps1" `
  -WorldRoot $World `
  -ArcRoot $Arc `
  -EmbodiedArLabRoot $Embodied `
  -ExpectedWorldCommit "75f84ebe86f3691035fa35596f559959dd39c173" `
  -Mode auto `
  -SourceManifest "D:\Evidence\underdrain\resolved-representation-source.json" `
  -SourceRoot "D:\Evidence\underdrain\resolved-role-assets"
```

The materializer may invoke Unity because that is the gate being executed. The state inspector itself remains read-only.

## Human review and named representation approval

The controller stops before approval unless all seven exact prefabs were inspected in the intended player camera, sewer lighting, action scale, and mechanism context. The approval invocation requires:

```text
ApprovalId
ApprovalAuthorityId
ApprovalName
ApprovalAttestation
ConfirmAllAssets
```

The presentation approver cannot be reused as the final software-product acceptor. The approval records supplied authority but does not authenticate the human identity, accept the product, establish comprehension, or qualify a physical installation.

## Actual device receipt paths

The executable session runner writes these receipts:

```text
local\scene-jobs\<JobId>\build\receipts\
  player-session-keyboard-mouse\session-run.json
  player-session-gamepad\session-run.json
```

These are the paths consumed by the review-kit generator and the `/2` software-product acceptor. The earlier documentation path under `output\player-train\sessions` was incorrect and must not be used.

The keyboard and gamepad runners launch the exact Windows product, require teach, practice, and mastery, enforce frame-pacing budgets, collect device-specific input, export a provisional candidate, and return it through exact ARC replay. The gamepad receipt must carry a binding-profile digest different from the qualified default. Across the two sessions, at least one real camera-collision adjustment must be observed.

## Review and acceptance

The role-review kit may cite either accepted device session. It creates templates only. It does not issue a review.

The cold player, observer, and adjudicator must remain separate functions with distinct seat, lineage, and context identities. The final acceptor must differ from all three review functions and from the presentation approver. The accepted formats remain:

```text
rodoh-underdrain-role-separated-review-receipt/1
rodoh-underdrain-player-product-acceptance/2
scope = windows-software-player-product
```

The bounded software acceptance leaves:

```text
physicalHumanEvidence = separate-not-required-for-software-scope
questAcceptance = not-issued
physicalQuestAcceptance = open
```

## Preserve failed attempts

Do not delete or rewrite a failed receipt. Do not rerun an interactive device session into a non-empty failed session directory. Preserve the attempt and choose a new `JobId` or review root. The state controller explicitly blocks those overwrite conditions.

The first divergent plane remains the repair target:

```text
source identity
→ representation source
→ Unity materialization
→ machine preflight
→ visual review and approval
→ approval-bound intake
→ ARC and C# projection
→ Unity serialization
→ representation audit
→ Windows build
→ keyboard session
→ gamepad and rebind session
→ review kit
→ player packet
→ observer packet
→ adjudicator packet
→ role-separated review
→ fourth-seat software acceptance
```

## Seal diagnostic evidence

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$World\scripts\export-underdrain-commissioning-evidence.ps1" `
  -EmbodiedArLabRoot $Embodied `
  -JobId "underdrain-unity6000-player-v1"
```

The bundle includes JSON, checksum, text, log, Markdown, and CSV evidence under the named job. It excludes the Windows executable, build products, project source assets, and Quest products. Images are included only when `-IncludeImages` is supplied. The bundle carries its own manifest and `SHA256SUMS` ledger.

The evidence bundle does not issue approval or acceptance. It exists to make a failed or completed local attempt portable for inspection without exporting the product itself.

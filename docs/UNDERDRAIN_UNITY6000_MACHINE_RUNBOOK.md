# UNDERDRAIN Unity 6000 machine runbook

This runbook begins where hosted source qualification ends. It produces only evidence observed by the local Windows and Unity venues. GitHub Actions can qualify source contracts and synthetic refusals. It cannot establish local representation materialization, production-asset approval, device operation, software review, household use, Quest operation, or physical acceptance.

## Immutable source authorities

```text
World player-product source
75f84ebe86f3691035fa35596f559959dd39c173

World tree
3ddb71721d1381382dbe602cd9d1e2b70bd96fe8

ARC Action Player authority
aaa5685903a348b3c1ba875622fbe99d90c1da35

Action Player Floor
9693cb99694338e72c15d0ffbb87b5a1c5bbf16a

catalog
actionfloor1_55eb8869417b3b36a28a309263624fe04ad07028f2254337a2f1548cd03b47d8

UNDERDRAIN intent
playerintent1_91647652ca3f387b114d5fa7cfab416e2d99c5f307098b6426a17f624cdfbe6c

Unity
6000.0.66f2
```

Use the exact World commit named by `MACHINE_LOCK.json`. Do not run the transaction from an uncommitted checkout or a branch that moved after the machine kit was produced.

## Controlling evidence order

A fresh machine follows this order:

```text
exact representation source
→ seven-role resolution
→ Unity representation materialization
→ read-only machine preflight v2
→ inspect the seven exact prefabs in Unity
→ named presentation-asset approval
→ approval-bound read-only source intake
→ exact ARC and C# qualification
→ serialized Unity player scene
→ read-only post-serialization asset audit and representation audit
→ exact Windows player build
→ keyboard and mouse session
→ gamepad session with a persisted rebind
→ exact ARC replay of both provisional candidates
→ role-review kit
→ three-seat role-separated software review
→ fourth-seat Windows software-product acceptance
```

The state inspector represents this as ten gates:

```text
source-custody
representation-materialization
machine-preflight-v2
presentation-asset-approval
player-product-train
keyboard-mouse-session
gamepad-session
role-review-kit
role-separated-software-review
windows-software-product-acceptance
```

Human play, accessibility observation, household use, mounted Quest use, room qualification, and physical comprehension remain separate evidence lanes. Their absence does not invalidate the bounded Windows software-product transaction. A passing software review does not establish human or physical acceptance.

The presentation approver, cold player, cold observer, cold adjudicator, and final software-product acceptor are distinct functions. The three review functions require different seat identifiers, lineage identifiers, and context digests. The final acceptance function must differ from all three review functions and from the presentation approver. No review or acceptance function may modify the artifact under review.

## 1. Establish exact local roots

```powershell
$World = "D:\Projects\Organs\AXM\axm-world\main"
$Arc = "D:\Projects\Organs\AXM\axm-arc\main"
$Embodied = "D:\Projects\Embodied-AR-Lab"
$JobId = "underdrain-unity6000-player-v1"
$WorldCommit = "75f84ebe86f3691035fa35596f559959dd39c173"

if ((& git -C $World rev-parse HEAD).Trim() -ne $WorldCommit) {
    throw "World is not on the accepted source head."
}
if ((& git -C $Arc rev-parse HEAD).Trim() -ne "aaa5685903a348b3c1ba875622fbe99d90c1da35") {
    throw "ARC is not on the accepted Action Player authority."
}
if (& git -C $World status --porcelain) { throw "World is dirty." }
if (& git -C $Arc status --porcelain) { throw "ARC is dirty." }
```

Keep Unity Editor closed unless a step explicitly requires visual inspection. Automated runners refuse or deliberately close a live editor rather than racing it.

## 2. Inspect current state before acting

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$World\scripts\get-underdrain-commissioning-state.ps1" `
  -WorldRoot $World `
  -ArcRoot $Arc `
  -EmbodiedArLabRoot $Embodied `
  -JobId $JobId `
  -ExpectedWorldCommit $WorldCommit
```

The current state receipt is:

```text
local\scene-jobs\<JobId>\output\commissioning-state\underdrain-commissioning-state.json
```

The inspector is read-only. It records the first divergence, the exact expected receipt paths, a concrete next command, and any later evidence that appeared out of order. A missing gate is `open`. A malformed or stale gate is `held`. A completed bounded Windows transaction is `pass`.

For one-gate progression:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$World\scripts\invoke-underdrain-commissioning.ps1" `
  -WorldRoot $World `
  -ArcRoot $Arc `
  -EmbodiedArLabRoot $Embodied `
  -JobId $JobId `
  -ExpectedWorldCommit $WorldCommit `
  -Mode advance
```

Use `-Mode auto` only when all required machine inputs and manual attestations have been supplied. The controller stops at missing human decisions instead of fabricating them.

## 3. Establish the seven-role representation

A fresh project cannot pass asset preflight before the seven production representation products exist. Use the exact Shine standalone or another project-owned source pack.

The retained Shine identity is:

```text
UNDERDRAIN_The_Bloom_Below_Shine_v0.4.html
bytes   828259
sha256  ab9e1a542f89d66733d0b9946fd9f2b724e5e09395a74611fa760d336c209311
object  ASSET_DATA
```

With the machine kit:

```powershell
.\INSTALL_SHINE_EXTRACTOR.ps1

.\RUN_EXTRACT_SHINE.ps1 `
  -Standalone "D:\Sources\UNDERDRAIN_The_Bloom_Below_Shine_v0.4.html" `
  -Output "D:\Evidence\underdrain\shine-extraction"

.\RUN_RESOLVE_SHINE.ps1 `
  -Extraction "D:\Evidence\underdrain\shine-extraction" `
  -RoleMap ".\fixtures\underdrain.shine-role-map.template.json" `
  -Output "D:\Evidence\underdrain\resolved-role-assets"
```

Complete the role map with seven byte-distinct, visually appropriate source products before resolution. The semantic roles are:

```text
player:rhea-venn
enemy:skirmisher
enemy:duelist
enemy:swarm
enemy:hexer
enemy:breaker
arena:pump-seven
```

Materialize the resolved source pack:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$World\scripts\materialize-underdrain-production-representation.ps1" `
  -WorldRoot $World `
  -ArcRoot $Arc `
  -ExpectedWorldCommit $WorldCommit `
  -ExpectedArcCommit "aaa5685903a348b3c1ba875622fbe99d90c1da35" `
  -EmbodiedArLabRoot $Embodied `
  -SourceManifest "D:\Evidence\underdrain\resolved-role-assets\resolved-representation-source.json" `
  -SourceRoot "D:\Evidence\underdrain\resolved-role-assets"
```

The materializer creates project-owned sprite imports, authored hierarchy, presentation-only animation, controllers, seven core prefabs, seven semantic-feedback prefabs, seven deterministic PCM WAV clips, and the Pump Seven review scene. It cannot issue approval or product acceptance.

## 4. Run read-only machine preflight v2

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$World\scripts\preflight-underdrain-unity6000-player-product-v2.ps1" `
  -WorldRoot $World `
  -ExpectedWorldCommit $WorldCommit `
  -ArcRoot $Arc `
  -EmbodiedArLabRoot $Embodied `
  -OutputRoot "$Embodied\local\scene-jobs\$JobId\preflight"
```

Preflight v2 invokes the accepted v1 machine and asset preflight, retains its exact receipt and digest, and adds the role-separated review contract, product-profile review floor, three-function independence, fourth-seat separation, and software-versus-physical authority checks.

It writes:

```text
underdrain-unity6000-machine-preflight-v2.json
underdrain-unity6000-machine-preflight-v2.json.sha256
underdrain-unity6000-machine-preflight-v2.txt
legacy-v1\underdrain-unity6000-machine-preflight.json
legacy-v1\underdrain-unity6000-machine-preflight.json.sha256
legacy-v1\underdrain-unity6000-machine-preflight.txt
```

A v2 `pass` opens named asset review. It does not approve the representation, issue a review receipt, accept the software product, or qualify a physical installation. A `held` receipt identifies the first blocker and exits with code 2.

## 5. Review the exact production representation

Open `Embodied-AR-Lab` in Unity 6000.0.66f2 and inspect:

```text
Rhea Venn
Capling skirmisher
Crown duelist
Signal-spore swarm
Discharge hexer
Root breaker
Pump Seven arena
```

Review them in the intended player camera, sewer lighting, action scale, and mechanism context. Confirm that the visible product is not a primitive fallback, diagnostic renderer, generated placeholder root, or presentation whose silhouette and materials fail at play distance. Confirm that character prefabs carry no active Unity combat physics. Confirm that Pump Seven carries a static camera-collision surface without becoming action authority.

Close Unity after the review.

## 6. Record named presentation-asset approval

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$World\scripts\approve-underdrain-production-assets.ps1" `
  -EmbodiedArLabRoot $Embodied `
  -PresentationManifest "$World\unity\Fixtures\underdrain.authored-presentation.template.json" `
  -ProductProfile "$World\unity\Fixtures\underdrain.player-product.json" `
  -OutputRoot "$Embodied\local\scene-jobs\$JobId\output\player-train\production-asset-approval" `
  -ApprovalId "underdrain-assets-approval-001" `
  -ApprovalAuthorityId "seat:underdrain-presentation-approver" `
  -ApprovalName "UNDERDRAIN Windows presentation assets" `
  -ApprovalAttestation "I reviewed all seven exact imported visual products in the intended Unity player representation and approve them for this bounded Windows player path." `
  -ConfirmAllAssets
```

The approval batch is the only process allowed to write `ProductionApproved`. It records the supplied authority but does not authenticate it and cannot accept the Windows software product.

## 7. Build and qualify the exact Unity and Windows product

```powershell
$Approval = "$Embodied\local\scene-jobs\$JobId\output\player-train\production-asset-approval\production-asset-approval.json"

powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$World\scripts\run-underdrain-unity6000-player-product.ps1" `
  -EmbodiedArLabRoot $Embodied `
  -ArcRoot $Arc `
  -AssetApprovalReceipt $Approval `
  -JobId $JobId
```

This transaction performs approval-bound read-only source intake, exact ARC generation, exact C# cue parity, Unity package import, scene serialization, player-product qualification, read-only post-serialization representation audit, and the Windows build. It stops if any identity, source digest, dependency closure, prefab byte sequence, `.meta` byte sequence, GUID, or declared binding changes between those planes.

The controlling train receipt is:

```text
local\scene-jobs\<JobId>\output\player-train\underdrain-unity6000-player-product-train.json
```

It must leave the two device sessions, role-separated review, final software-product acceptance, physical human evidence, and Quest acceptance open or unissued.

## 8. Run the keyboard and mouse session

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$World\scripts\run-underdrain-player-session.ps1" `
  -EmbodiedArLabRoot $Embodied `
  -ArcRoot $Arc `
  -JobId $JobId `
  -Device keyboard-mouse
```

Complete teach, practice, and mastery. The player closes after terminal evidence is written and exact ARC replay accepts the provisional candidate.

The actual receipt path is:

```text
local\scene-jobs\<JobId>\build\receipts\player-session-keyboard-mouse\session-run.json
```

## 9. Run the gamepad and persisted-rebind session

Use the in-game rebind surface during the session:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$World\scripts\run-underdrain-player-session.ps1" `
  -EmbodiedArLabRoot $Embodied `
  -ArcRoot $Arc `
  -JobId $JobId `
  -Device gamepad
```

The actual receipt path is:

```text
local\scene-jobs\<JobId>\build\receipts\player-session-gamepad\session-run.json
```

Software acceptance refuses a gamepad receipt whose binding-profile digest still equals the qualified default. At least one of the two device sessions must exercise a real camera-collision adjustment. Both sessions must remain inside the declared p95 and p99 frame-time budgets.

Do not use the obsolete `output\player-train\sessions` path. The executable runner never writes there.

## 10. Create the role-separated review kit

```powershell
$Train = "$Embodied\local\scene-jobs\$JobId\output\player-train\underdrain-unity6000-player-product-train.json"
$Keyboard = "$Embodied\local\scene-jobs\$JobId\build\receipts\player-session-keyboard-mouse\session-run.json"
$Gamepad = "$Embodied\local\scene-jobs\$JobId\build\receipts\player-session-gamepad\session-run.json"
$ReviewRoot = "$Embodied\local\scene-jobs\$JobId\output\player-train\role-separated-review"

powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$World\scripts\new-underdrain-role-separated-review-kit.ps1" `
  -PlayerProductTrainReceipt $Train `
  -PlayerSessionReceipt $Keyboard `
  -OutputRoot $ReviewRoot
```

Either accepted device session may be selected. The kit binds the exact train, Windows product, selected session receipt, accepted ARC receipt, and frozen review contract. It emits packet templates only.

The cold player receives only the exact built product and ordinary player instructions. The cold observer receives only the immutable session capture and completed player packet. The cold adjudicator receives only the frozen review contract, completed observer packet, and accepted ARC receipt. No review function may modify the product or have authored the candidate.

Replace every placeholder, create the cited transcript, notes, and adjudication files, and recompute every SHA-256 declaration. Use stable identities:

```text
seat:<stable-function-id>
lineage1_<64 lowercase hex>
ctx1_<64 lowercase hex>
```

## 11. Record role-separated software review

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$World\scripts\record-underdrain-role-separated-software-review.ps1" `
  -PlayerProductTrainReceipt $Train `
  -PlayerSessionReceipt $Keyboard `
  -PlayerPacket "$ReviewRoot\player-packet.json" `
  -ObserverPacket "$ReviewRoot\observer-packet.json" `
  -AdjudicatorPacket "$ReviewRoot\adjudicator-packet.json" `
  -OutputPath "$ReviewRoot\role-separated-review.json"
```

The output format is:

```text
rodoh-underdrain-role-separated-review-receipt/1
```

The recorder verifies the complete identity and digest chain, distinct seats, distinct lineages, distinct contexts, source isolation, no mutation authority, teach-practice-master completion, canonical authored choice and consequence, the next playable action, and voluntary continuation. The receipt cannot accept the product or qualify a physical installation.

## 12. Issue fourth-seat Windows software-product acceptance

```powershell
$Review = "$ReviewRoot\role-separated-review.json"

powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$World\scripts\accept-underdrain-player-product.ps1" `
  -PlayerProductTrainReceipt $Train `
  -KeyboardMouseSessionReceipt $Keyboard `
  -GamepadSessionReceipt $Gamepad `
  -RoleSeparatedReviewReceipt $Review `
  -AcceptanceSeatId "seat:underdrain-windows-software-acceptor" `
  -AcceptanceLineageId "lineage1_<64-lowercase-hex>" `
  -AcceptanceContextDigest "ctx1_<64-lowercase-hex>" `
  -AcceptanceName "UNDERDRAIN Windows software player product" `
  -AcceptanceAttestation "I accept only this exact Windows software product on the cited representation, device, performance, ARC-replay, and role-separated review evidence."
```

The resulting format and scope are:

```text
rodoh-underdrain-player-product-acceptance/2
windows-software-player-product
```

The receipt leaves Quest acceptance unissued, physical Quest acceptance open, and human physical evidence separately unrequired for this bounded software scope.

## 13. Seal the diagnostic evidence bundle

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$World\scripts\export-underdrain-commissioning-evidence.ps1" `
  -EmbodiedArLabRoot $Embodied `
  -JobId $JobId
```

The bundle includes receipts, checksums, state snapshots, text reports, and logs. It excludes the executable, build products, project source assets, and Quest products. Use `-IncludeImages` only when rendered evidence plates must accompany the diagnostic record.

## 14. Preserve optional human and physical evidence separately

`scripts/record-underdrain-independent-comprehension.ps1` remains available for a real human session, accessibility study, household trial, or named physical installation. Its legacy receipt is not consumed by `/2` Windows software-product acceptance. Do not relabel cold-seat evidence as human evidence or vice versa.

## Failure handling

Do not delete or rewrite a failed receipt. Do not rerun an interactive device session into a non-empty failed session directory. Preserve the exact attempt and use another `JobId` or review root.

The operator must correct the first divergent plane:

```text
source identity
→ representation source and role resolution
→ Unity representation materialization
→ machine preflight v2
→ named presentation review and approval
→ approval-bound intake
→ ARC projection and cue parity
→ Unity import and serialization
→ post-serialization representation audit
→ Windows build
→ device ingress and presentation
→ exact ARC replay
→ review kit
→ player packet
→ observer packet
→ adjudicator packet
→ role-separated review
→ fourth-seat software-product acceptance
```

A later success supersedes a failed attempt by exact identity and evidence. It does not make the earlier failure disappear.

# UNDERDRAIN Unity 6000 machine runbook

This runbook begins where hosted source qualification ends. It produces only evidence that the local Windows and Unity venues actually observe. GitHub Actions may qualify source contracts and synthetic refusals, but it cannot establish Unity import, production-asset approval, device operation, software review, household use, Quest operation, or physical acceptance.

## Immutable source authorities

```text
Arc Action Player authority
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

Use the exact World commit named by `MACHINE_LOCK.json`. Do not run this sequence from an uncommitted checkout or a branch that moved after the kit was produced.

## Evidence sequence

```text
read-only machine preflight
→ inspect the seven production prefabs in Unity
→ named presentation-asset approval
→ approval-bound read-only source intake
→ exact Arc and C# qualification
→ serialized Unity player scene
→ read-only post-serialization asset audit
→ exact Windows player build
→ keyboard and mouse session
→ gamepad session with a persisted rebind
→ exact Arc replay of both provisional candidates
→ three-seat role-separated software review
→ fourth-seat Windows software-product acceptance
```

Human play, accessibility observation, household use, mounted Quest use, room qualification, and physical comprehension remain separate evidence lanes. Their absence does not invalidate the bounded Windows software-product transaction, and a passing software review does not establish human or physical acceptance.

The presentation-approval seat, cold player seat, cold observer seat, cold adjudicator seat, and final product-acceptance seat are distinct functions. The three review functions must carry different seat identifiers, lineage identifiers, and context digests. The final acceptance function must differ from all three review functions and from the presentation-approval authority. No review or acceptance function may modify the artifact under review.

## 1. Establish exact local checkouts

The examples below use conventional paths. Substitute the actual clean checkout roots.

```powershell
$World = "D:\Projects\Organs\AXM\axm-world\main"
$Arc = "D:\Projects\Organs\AXM\axm-arc\main"
$Embodied = "D:\Projects\Embodied-AR-Lab"
$WorldCommit = (& git -C $World rev-parse HEAD).Trim()

if ((& git -C $Arc rev-parse HEAD).Trim() -ne "aaa5685903a348b3c1ba875622fbe99d90c1da35") {
    throw "Arc is not on the accepted Action Player authority."
}
if (& git -C $World status --porcelain) { throw "World is dirty." }
if (& git -C $Arc status --porcelain) { throw "Arc is dirty." }
```

Keep Unity Editor closed unless a step explicitly requires visual inspection. Automated runners refuse or deliberately close a live editor rather than racing it.

## 2. Run the read-only machine preflight

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$World\scripts\preflight-underdrain-unity6000-player-product.ps1" `
  -WorldRoot $World `
  -ExpectedWorldCommit $WorldCommit `
  -ArcRoot $Arc `
  -EmbodiedArLabRoot $Embodied `
  -OutputRoot "$Embodied\local\scene-jobs\underdrain-unity6000-player-v1\preflight"
```

The preflight verifies the exact World and Arc identities, clean source custody, Unity 6000.0.66f2 project identity, Unity editor location, required fixtures, all seventeen semantic cues, all five enemy kits, seven core production asset identities, every prefab, controller, VFX, and audio path declared by the authored manifest, stable Unity `.meta` files, allowed asset roots, and role-appropriate extensions.

It writes:

```text
underdrain-unity6000-machine-preflight.json
underdrain-unity6000-machine-preflight.json.sha256
underdrain-unity6000-machine-preflight.txt
```

A `pass` means that the machine is ready for visual review and Unity intake. It does not approve the art or qualify the game. A `held` receipt lists the first machine or filesystem blockers and exits with code 2.

## 3. Review the exact production representation

Open the Embodied-AR-Lab project in Unity 6000.0.66f2. Review these seven prefabs in the intended player camera, sewer lighting, action scale, and mechanism context:

```text
Rhea Venn
Capling skirmisher
Crown duelist
Signal-spore swarm
Discharge hexer
Root breaker
Pump Seven arena
```

Confirm that the visible product is not a primitive fallback, diagnostic renderer, generated placeholder root, or presentation whose silhouette and materials fail at play distance. Confirm that character prefabs carry no active Unity combat physics. Confirm that the arena has a static camera-collision surface without becoming combat authority.

## 4. Record named presentation-asset approval

Close Unity after the review. Supply one stable presentation-approval seat identifier and an attestation that applies to the exact seven imported visual products.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$World\scripts\approve-underdrain-production-assets.ps1" `
  -EmbodiedArLabRoot $Embodied `
  -PresentationManifest "$World\unity\Fixtures\underdrain.authored-presentation.template.json" `
  -ProductProfile "$World\unity\Fixtures\underdrain.player-product.json" `
  -OutputRoot "$Embodied\local\scene-jobs\underdrain-unity6000-player-v1\output\player-train\production-asset-approval" `
  -ApprovalId "underdrain-assets-approval-001" `
  -ApprovalAuthorityId "seat:underdrain-presentation-approver" `
  -ApprovalName "UNDERDRAIN Windows presentation assets" `
  -ApprovalAttestation "I reviewed all seven exact imported visual products in the intended Unity player representation and approve them for this bounded Windows player path." `
  -ConfirmAllAssets
```

The approval batch is the only process allowed to write `ProductionApproved`. It records the supplied authority but does not authenticate it and cannot accept the Windows software product.

## 5. Build and qualify the exact Unity and Windows product

```powershell
$Approval = "$Embodied\local\scene-jobs\underdrain-unity6000-player-v1\output\player-train\production-asset-approval\production-asset-approval.json"

powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$World\scripts\run-underdrain-unity6000-player-product.ps1" `
  -EmbodiedArLabRoot $Embodied `
  -ArcRoot $Arc `
  -AssetApprovalReceipt $Approval `
  -JobId "underdrain-unity6000-player-v1"
```

This transaction performs read-only approval-bound source intake, exact Arc generation, exact C# cue parity, Unity package import, scene serialization, player-product qualification, read-only post-serialization asset audit, and the Windows build. It stops if any identity or source digest changes between those planes.

The controlling product-train receipt is:

```text
local\scene-jobs\underdrain-unity6000-player-v1\output\player-train\underdrain-unity6000-player-product-train.json
```

It must still report the keyboard and mouse session, gamepad session, role-separated software review, final software-product acceptance, physical human evidence, and Quest acceptance as separately open or unissued.

## 6. Run the keyboard and mouse session

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$World\scripts\run-underdrain-player-session.ps1" `
  -EmbodiedArLabRoot $Embodied `
  -ArcRoot $Arc `
  -JobId "underdrain-unity6000-player-v1" `
  -Device keyboard-mouse
```

Complete teach, practice, and mastery. The built player must observe the required device, all seventeen Arc cues, camera collision, terminal state, and frame-pacing budgets, then export a provisional candidate that exact Arc replay accepts.

## 7. Run the gamepad and persisted-rebind session

Use the in-game rebind surface during the session. Software-product acceptance refuses a gamepad receipt whose binding-profile digest still equals the qualified default.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$World\scripts\run-underdrain-player-session.ps1" `
  -EmbodiedArLabRoot $Embodied `
  -ArcRoot $Arc `
  -JobId "underdrain-unity6000-player-v1" `
  -Device gamepad
```

At least one device session must exercise a real camera-collision adjustment. Both sessions must remain within the declared p95 and p99 frame-time budgets.

## 8. Create the role-separated review kit

Choose either accepted device session as the software-review session. The kit generator binds the exact train, Windows product, session receipt, ARC receipt, and frozen review contract, then emits packet templates. It does not issue a review or acceptance.

```powershell
$Train = "$Embodied\local\scene-jobs\underdrain-unity6000-player-v1\output\player-train\underdrain-unity6000-player-product-train.json"
$Keyboard = "$Embodied\local\scene-jobs\underdrain-unity6000-player-v1\output\player-train\sessions\keyboard-mouse\player-session.json"
$ReviewRoot = "$Embodied\local\scene-jobs\underdrain-unity6000-player-v1\output\player-train\role-separated-review"

powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$World\scripts\new-underdrain-role-separated-review-kit.ps1" `
  -PlayerProductTrainReceipt $Train `
  -PlayerSessionReceipt $Keyboard `
  -OutputRoot $ReviewRoot
```

Instantiate three isolated functions from different lineages and contexts.

The cold player receives only the exact built product and ordinary player instructions. It receives no source, answer key, review rubric, or walkthrough. Its packet cites an immutable transcript and records whether the session completed and voluntarily continued after the accepted consequence.

The cold observer receives only the immutable session capture and completed player packet. It records first authored decision, first accepted consequence, player role, immediate conflict, chosen strategy, accepted consequence, next playable action, assistance state, retries, and voluntary continuation. It receives no source, answer key, or rubric.

The cold adjudicator receives only the frozen review contract, completed observer packet, and accepted ARC receipt. It uses `underdrain-role-separated-review-rubric/1`, writes an immutable adjudication object, and returns either `pass` or `refuse`. It cannot modify the product, accept an ARC consequence, or accept the player product.

Replace every placeholder in the packet templates, create the cited transcript, observer notes, and adjudication objects, and recompute every SHA-256 declaration. Each seat must use a valid identifier:

```text
seat:<stable-function-id>
lineage1_<64 lowercase hex>
ctx1_<64 lowercase hex>
```

## 9. Record role-separated software review

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

The recorder verifies exact product identity, the entire packet digest chain, distinct seats, distinct lineages, distinct contexts, source isolation, no mutation authority, complete teach-practice-master objectives, the canonical authored choice and consequence, the next playable action, and voluntary continuation. Its output is:

```text
rodoh-underdrain-role-separated-review-receipt/1
```

The receipt cannot accept the product or qualify a physical installation.

## 10. Issue fourth-seat Windows software-product acceptance

The acceptance function must have a seat identifier, lineage identifier, and context digest that differ from the player, observer, adjudicator, and presentation-approval seat. It consumes the completed evidence bundle but may not modify the artifact.

```powershell
$Gamepad = "$Embodied\local\scene-jobs\underdrain-unity6000-player-v1\output\player-train\sessions\gamepad\player-session.json"
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

## 11. Preserve optional physical human evidence separately

`scripts/record-underdrain-independent-comprehension.ps1` remains available for an actual human session, accessibility study, household trial, or named physical installation. Its legacy receipt is not consumed by `/2` Windows software-product acceptance. Preserve it as a separately scoped observation and do not relabel cold-seat evidence as human evidence or vice versa.

## Failure handling

Do not delete or rewrite a failed receipt. Preserve the exact machine output and correct the first divergent plane:

```text
source identity
→ filesystem and asset presence
→ named presentation approval
→ imported-source intake
→ Arc projection and cue parity
→ Unity import and serialization
→ post-serialization audit
→ Windows build
→ device ingress and presentation
→ exact Arc replay
→ player packet
→ observer packet
→ adjudicator packet
→ role-separated review
→ fourth-seat software-product acceptance
```

A later success supersedes a failed attempt by exact identity and evidence. It does not make the earlier failure disappear.

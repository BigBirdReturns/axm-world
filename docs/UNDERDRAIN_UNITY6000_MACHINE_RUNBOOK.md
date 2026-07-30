# UNDERDRAIN Unity 6000 machine runbook

This runbook begins where hosted source qualification ends. It produces only evidence that the local Windows and Unity venues actually observe. It does not infer Unity import, production-asset approval, device operation, comprehension, or product acceptance from GitHub Actions.

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

Use the exact World commit named by the machine-kit lock. Do not run this acceptance sequence from an uncommitted checkout or a branch that moved after the kit was produced.

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
→ independent comprehension observation
→ separate named Windows player-product acceptance
```

The final Windows acceptor must differ from the presentation-asset approver. The independent player must not have authored the candidate, inspected source, received a walkthrough, or received any assistance event before adjudication.

## 1. Establish exact local checkouts

The examples below use conventional paths. Substitute the actual clean checkout roots.

```powershell
$World = "D:\Projects\axm-world\main"
$Arc = "D:\Projects\axm-arc\main"
$Embodied = "D:\Projects\Embodied-AR-Lab"
$WorldCommit = (& git -C $World rev-parse HEAD).Trim()

if ((& git -C $Arc rev-parse HEAD).Trim() -ne "aaa5685903a348b3c1ba875622fbe99d90c1da35") {
    throw "Arc is not on the accepted Action Player authority."
}
if (& git -C $World status --porcelain) { throw "World is dirty." }
if (& git -C $Arc status --porcelain) { throw "Arc is dirty." }
```

Keep Unity Editor closed unless a step explicitly asks for visual inspection. The automated runners refuse or deliberately close a live editor rather than racing it.

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

The preflight verifies the exact World and Arc identities, clean source custody, Unity 6000.0.66f2 project identity, Unity editor location, required fixtures, all seventeen semantic cues, all five enemy kits, seven core production asset identities, every prefab/controller/VFX/audio path declared by the authored manifest, stable Unity `.meta` files, allowed asset roots, and role-appropriate extensions.

The preflight writes:

```text
underdrain-unity6000-machine-preflight.json
underdrain-unity6000-machine-preflight.json.sha256
underdrain-unity6000-machine-preflight.txt
```

A `pass` means the machine is ready for visual review and Unity intake. It does not approve the art or qualify the game. A `held` receipt lists the first machine or filesystem blockers and exits with code 2.

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

Close Unity after the review. Supply a named authority assertion and an attestation that applies to the exact seven imported visual products.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$World\scripts\approve-underdrain-production-assets.ps1" `
  -EmbodiedArLabRoot $Embodied `
  -PresentationManifest "$World\unity\Fixtures\underdrain.authored-presentation.template.json" `
  -ProductProfile "$World\unity\Fixtures\underdrain.player-product.json" `
  -OutputRoot "$Embodied\local\scene-jobs\underdrain-unity6000-player-v1\output\player-train\production-asset-approval" `
  -ApprovalId "underdrain-assets-approval-001" `
  -ApprovalAuthorityId "<named-asset-approver>" `
  -ApprovalName "UNDERDRAIN Windows presentation assets" `
  -ApprovalAttestation "I reviewed all seven exact imported visual products in the intended Unity player representation and approve them for this bounded Windows player path." `
  -ConfirmAllAssets
```

The approval batch is the only process allowed to write `ProductionApproved`. It records the supplied authority but does not authenticate it and cannot accept the Windows player product.

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

It must still report the keyboard/mouse session, gamepad session, independent comprehension, and named product acceptance as open.

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

Use the in-game rebind surface during the session. Named acceptance refuses a gamepad receipt whose binding-profile digest still equals the qualified default.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$World\scripts\run-underdrain-player-session.ps1" `
  -EmbodiedArLabRoot $Embodied `
  -ArcRoot $Arc `
  -JobId "underdrain-unity6000-player-v1" `
  -Device gamepad
```

At least one of the two device sessions must exercise a real camera-collision adjustment. Both sessions must remain within the declared p95 and p99 frame-time budgets.

## 8. Record independent comprehension

Use one accepted device session. The observer and adjudicator must be different people. The recorder checks exact product, scene, source, candidate, accepted Arc receipt, timing profile, completed objectives, and canonical narrative identities before writing a human-issued receipt.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$World\scripts\record-underdrain-independent-comprehension.ps1" `
  -PlayerProductTrainReceipt "<product-train-receipt>" `
  -PlayerSessionReceipt "<accepted-device-session-receipt>" `
  -ObserverId "<observer>" `
  -AdjudicatorId "<different-adjudicator>" `
  -ObserverAttestation "<observation attestation>" `
  -AdjudicatorAttestation "<adjudication attestation>" `
  -StartedAt "<ISO-8601 start>" `
  -CompletedAt "<ISO-8601 completion>" `
  -Device keyboard-mouse `
  -Viewport "1600x900" `
  -Independent `
  -FirstAuthoredDecisionMs <milliseconds> `
  -FirstAcceptedConsequenceMs <milliseconds> `
  -ChosenStrategyId "<emergency-plan|service-tunnel|truce-offer>" `
  -ObservedPlayerRoleId "rhea-venn" `
  -ObservedImmediateConflictId "conflict-keep-water-running-without-flooding-hidden-nursery" `
  -ObservedAuthoredChoiceId "<same chosen strategy>" `
  -ObservedAcceptedConsequenceId "<outcome-specific canonical fact>" `
  -ObservedNextPlayableActionId "root-gate-parley" `
  -VoluntarilyContinuedAfterConsequence $true
```

Do not supply `-AuthoredCandidate`, `-InspectedSource`, or `-ReceivedWalkthrough`. Any assistance event blocks the independent receipt.

## 9. Issue separate named Windows product acceptance

The acceptor must be different from the asset approver. The acceptance script requires both device sessions, a real gamepad rebind, camera collision, frame pacing, exact Arc acceptance, independent comprehension, and voluntary continuation.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$World\scripts\accept-underdrain-player-product.ps1" `
  -PlayerProductTrainReceipt "<product-train-receipt>" `
  -KeyboardMouseSessionReceipt "<keyboard-session-receipt>" `
  -GamepadSessionReceipt "<gamepad-session-receipt>" `
  -IndependentComprehensionReceipt "<comprehension-receipt>" `
  -AcceptorId "<named-product-acceptor>" `
  -AcceptanceName "UNDERDRAIN Windows player product" `
  -AcceptorAttestation "I accept this exact Windows player product on the cited source, asset, device, performance, Arc-replay, and independent human evidence."
```

The resulting scope is the Windows player product only. Quest build, headset operation, tracking, guardian, safety, and physical Quest acceptance remain separate and open.

## Failure handling

Do not delete or rewrite a failed receipt. Preserve the exact machine output and correct the first divergent plane:

```text
source identity
→ filesystem and asset presence
→ named asset approval
→ imported-source intake
→ Arc projection and cue parity
→ Unity import and serialization
→ post-serialization audit
→ Windows build
→ device ingress and presentation
→ exact Arc replay
→ independent comprehension
→ named acceptance
```

A later success supersedes a failed attempt by exact identity and evidence. It does not make the earlier failure disappear.
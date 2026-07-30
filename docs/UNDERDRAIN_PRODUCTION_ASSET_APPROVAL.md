# UNDERDRAIN production asset approval

The UNDERDRAIN Windows player product requires seven project-owned presentation prefabs:

```text
Rhea Venn player
Capling skirmisher
Crown duelist
Signal-spore swarm
Discharge hexer
Root breaker
Pump Seven arena
```

They must resolve under `Assets/AXM/Underdrain/Production/**`, avoid the forbidden generated primitive roots, and satisfy the player-product physics boundary. Character and enemy prefabs may not contain enabled colliders or active rigid-body authority. The arena must provide at least one enabled static collision surface for the presentation-only camera collision provider.

## Approval is a separate human-owned assertion

Importing a prefab, finding its source files, calculating a digest, or passing a structural test does not approve it for the player path. The intake and audit batches are read-only. They cannot set `ProductionApproved` or create an approval marker.

Only the named approval transaction may write:

```text
rodoh-action-production-asset-approval/2
```

The approval record binds the exact representation that was reviewed, not merely the first mesh or sprite reachable from each prefab.

```text
product id
presentation-template id and SHA-256
player-product profile SHA-256
seven asset ids and roles
seven prefab paths and Unity GUIDs
seven final prefab SHA-256 values
seven prefab .meta SHA-256 values
per-prefab imported visual-source SHA-256 values
per-prefab recursive Assets/ dependency-closure SHA-256 values
per-dependency asset path, Unity GUID, asset SHA-256, and .meta SHA-256
all 27 declared presentation roles
all 23 unique top-level prefab, controller, VFX, and audio assets
the aggregate declared-binding closure SHA-256
named approval id
authority id
approval name
attestation
approval time
```

The recursive closure includes project-owned materials, textures, child prefabs, animator controllers, animation clips, VFX dependencies, audio assets, and any other `Assets/**` dependency reachable from the reviewed bindings. Package dependencies remain under the separately pinned Unity package and project custody planes. Built-in or untracked primitive visuals and forbidden generated roots are refused.

The transaction preserves the named authority assertion but does not authenticate it. It approves presentation representation only. It cannot change Arc law, accept a provisional candidate, issue a player-comprehension receipt, or accept the Windows player product.

## Operator sequence

First run the read-only machine preflight. Then open the real Embodied-AR-Lab Unity 6000 project and review all seven prefabs in their intended player camera, sewer lighting, materials, animation, action scale, and mechanism context. Confirm that each representation is suitable for the production player path and that the arena provides camera collision without acquiring combat authority.

Close Unity and run the approval transaction only after that review:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File .\scripts\approve-underdrain-production-assets.ps1 `
  -EmbodiedArLabRoot D:\Projects\Embodied-AR-Lab `
  -PresentationManifest .\unity\Fixtures\underdrain.authored-presentation.template.json `
  -ProductProfile .\unity\Fixtures\underdrain.player-product.json `
  -OutputRoot D:\Projects\Embodied-AR-Lab\local\scene-jobs\underdrain-unity6000-player-v1\output\player-train\production-asset-approval `
  -ApprovalId underdrain-assets-approval-001 `
  -ApprovalAuthorityId <named-authority-id> `
  -ApprovalName "UNDERDRAIN Windows presentation assets" `
  -ApprovalAttestation "I reviewed all seven exact imported visual products in the intended Unity player representation and approve them for this bounded Windows player path." `
  -ConfirmAllAssets
```

The transaction writes:

```text
production-asset-approval.json
production-asset-approval.json.sha256
production-asset-approval-run.json
unity-production-asset-approval.log
```

Then run the complete player-product train with the exact approval receipt:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File .\scripts\run-underdrain-unity6000-player-product.ps1 `
  -EmbodiedArLabRoot D:\Projects\Embodied-AR-Lab `
  -ArcRoot D:\Projects\axm-arc `
  -AssetApprovalReceipt D:\Projects\Embodied-AR-Lab\local\scene-jobs\underdrain-unity6000-player-v1\output\player-train\production-asset-approval\production-asset-approval.json
```

The product train performs approval-bound read-only representation intake, exact Arc and C# qualification, serialized-scene qualification, a second approval-bound read-only representation audit, and the requested Windows build boundary. The projected effective presentation manifest may receive a new action-spec-bound manifest id, but all 27 representation bindings and their exact asset closure must remain byte-identical to the named approval.

Keyboard and mouse, gamepad and persisted rebinding, independent comprehension, and named player-product acceptance remain separate evidence transactions.

## Invalidation and renewal

Changing any of the following invalidates the named approval:

```text
model or sprite source bytes
material or texture bytes
prefab serialization
prefab dependency
animation controller or animation clip
VFX prefab or dependency
audio clip
Unity .meta bytes or GUID
asset path or role
product profile
presentation-template bytes
any of the 27 declared bindings
```

The next intake or read-only audit must fail closed. The prior approval must not be edited in place or silently refreshed. Review the changed representation and issue a new named approval id and receipt.

The final player-product acceptor must differ from the named presentation-asset approver. This prevents the asset machinery and final product disposition from collapsing into one self-issued decision.

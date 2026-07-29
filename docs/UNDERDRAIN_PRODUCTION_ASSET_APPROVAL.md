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

They must resolve under `Assets/AXM/Underdrain/Production/**`, retain imported visual-source custody, avoid the forbidden generated primitive roots, and satisfy the player-product physics boundary. Character and enemy prefabs may not contain enabled colliders or active rigid-body authority. The arena must provide at least one enabled static collision surface for the presentation-only camera collision provider.

## Approval is a separate human-owned assertion

Importing a prefab, finding its source files, calculating a digest, or passing a structural test does not approve it for the player path. The source-intake and audit batches are read-only. They cannot set `ProductionApproved` or create an approval marker.

Only the named approval transaction may write:

```text
rodoh-action-production-asset-approval/1
```

The approval record binds:

```text
product id
presentation-manifest id
seven asset ids and roles
prefab paths
exact imported visual-source SHA-256 values
visual-source paths
named approval id
authority id
approval name
attestation
approval time
```

The transaction preserves the named authority assertion but does not authenticate it. It approves presentation assets only. It cannot change Arc law, accept a provisional candidate, issue a player-comprehension receipt, or accept the Windows player product.

## Operator sequence

Open the real Embodied-AR-Lab Unity 6000 project and review all seven prefabs in their intended player camera, lighting, materials, animation, and scale. Confirm that each representation is suitable for the production player path and that the arena provides camera collision without acquiring combat authority.

Run the approval transaction only after that review:

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

The product train performs named-approval-bound intake, exact Arc and C# qualification, serialized-scene qualification, a read-only post-serialization source audit, and the requested Windows build boundary. Keyboard and mouse, gamepad and persisted rebinding, independent comprehension, and named player-product acceptance remain separate evidence transactions.

## Invalidation and renewal

The approval is bound to the exact imported visual-source bytes. Changing a model, texture, material source, animation controller, prefab dependency, asset path, role, product id, or presentation manifest causes the next intake or read-only audit to fail. The prior approval must not be edited in place or silently refreshed. Review the changed representation and issue a new named approval id and receipt.

The final player-product acceptor must differ from the named presentation-asset approver. This prevents the asset-intake machinery and final product disposition from collapsing into one self-issued decision.

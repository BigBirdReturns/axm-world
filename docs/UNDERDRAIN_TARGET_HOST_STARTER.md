# UNDERDRAIN target-host starter

The target-host starter is the governed composition layer between read-only host discovery and the existing bounded Windows commissioning controller. It exists so a fresh operator does not need to manually translate a host-bootstrap receipt into a second command while still preserving a hard distinction between inspection and mutation.

The starter emits:

```text
rodoh-underdrain-target-host-start/1
```

Its default mode is `inspect`. In that mode it runs the read-only `rodoh-underdrain-windows-host-bootstrap/1` transaction, retains the exact bootstrap receipt and digest, reports the current ten-gate commissioning divergence, and cannot invoke the commissioning controller.

`advance` and `auto` require `-ConfirmMutation`. Even after confirmation, delegation occurs only when the bootstrap status is `pass`. A dirty or ambiguous checkout, wrong Unity version, stale resolved source, missing current-gate input, or held commissioning state prevents delegation. The starter then invokes the existing `invoke-underdrain-commissioning.ps1` controller and requires exactly one new `rodoh-underdrain-windows-commissioning-run/1` receipt.

## Usage

Inspect exact explicit roots:

```powershell
pwsh.exe -NoProfile -ExecutionPolicy Bypass `
  -File .\scripts\start-underdrain-target-host.ps1 `
  -WorldRoot "D:\Projects\Organs\AXM\axm-world\main" `
  -ArcRoot "D:\Projects\Organs\AXM\axm-arc\main" `
  -EmbodiedArLabRoot "D:\Projects\Embodied-AR-Lab"
```

Use bounded discovery:

```powershell
pwsh.exe -NoProfile -ExecutionPolicy Bypass `
  -File .\scripts\start-underdrain-target-host.ps1 `
  -SearchRoots "D:\Projects" `
  -DeepSearch
```

Execute no more than one currently eligible commissioning gate:

```powershell
pwsh.exe -NoProfile -ExecutionPolicy Bypass `
  -File .\scripts\start-underdrain-target-host.ps1 `
  -WorldRoot "D:\Projects\Organs\AXM\axm-world\main" `
  -ArcRoot "D:\Projects\Organs\AXM\axm-arc\main" `
  -EmbodiedArLabRoot "D:\Projects\Embodied-AR-Lab" `
  -ResolvedSourceManifest "D:\Evidence\underdrain\resolved-role-assets\resolved-representation-source.json" `
  -ResolvedSourceRoot "D:\Evidence\underdrain\resolved-role-assets" `
  -Mode advance `
  -ConfirmMutation
```

The starter does not itself materialize representation assets, invoke Unity, approve visuals, issue review, accept a product, operate Quest, or qualify a physical installation. Any such action remains owned by the existing gate-specific script and receipt. Human, household, accessibility, Quest, and physical evidence remain separate from the bounded Windows software-product train.

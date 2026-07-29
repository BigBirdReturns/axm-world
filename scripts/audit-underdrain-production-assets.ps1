[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$EmbodiedArLabRoot,

    [Parameter(Mandatory = $true)]
    [string]$PresentationManifest,

    [Parameter(Mandatory = $true)]
    [string]$ProductProfile,

    [Parameter(Mandatory = $true)]
    [string]$OutputRoot,

    [string]$UnityVersion = "6000.0.66f2",
    [string]$UnityEditor,
    [switch]$ForceCloseUnity
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-FullPath([string]$Value, [string]$Base) {
    if ([System.IO.Path]::IsPathRooted($Value)) { return [System.IO.Path]::GetFullPath($Value) }
    return [System.IO.Path]::GetFullPath((Join-Path $Base $Value))
}

$worldRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$projectRoot = Resolve-FullPath $EmbodiedArLabRoot (Get-Location).Path
$presentationPath = Resolve-FullPath $PresentationManifest $worldRoot
$profilePath = Resolve-FullPath $ProductProfile $worldRoot
$output = Resolve-FullPath $OutputRoot $projectRoot
foreach ($directory in @("Assets", "Packages", "ProjectSettings")) {
    if (-not (Test-Path (Join-Path $projectRoot $directory))) { throw "Embodied-AR-Lab $directory directory is absent: $projectRoot" }
}
foreach ($path in @($presentationPath, $profilePath)) { if (-not (Test-Path $path)) { throw "Production-asset audit input is absent: $path" } }
if ([string]::IsNullOrWhiteSpace($UnityEditor)) { $UnityEditor = "C:\Program Files\Unity\Hub\Editor\$UnityVersion\Editor\Unity.exe" }
$unityPath = [System.IO.Path]::GetFullPath($UnityEditor)
if (-not (Test-Path $unityPath)) { throw "Unity Editor is absent: $unityPath" }

$sourcePackage = Join-Path $worldRoot "unity\Packages\com.axm.rodoh-action"
$embeddedPackage = Join-Path $projectRoot "Packages\com.axm.rodoh-action"
if (-not (Test-Path (Join-Path $sourcePackage "package.json"))) { throw "World Unity action package is incomplete: $sourcePackage" }
New-Item -ItemType Directory -Force $embeddedPackage, $output | Out-Null
& robocopy.exe $sourcePackage $embeddedPackage /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -gt 7) { throw "RODOH Unity package copy failed with robocopy exit $LASTEXITCODE." }

$unityProcesses = Get-Process Unity -ErrorAction SilentlyContinue
if ($unityProcesses) {
    if (-not $ForceCloseUnity) { throw "Unity Editor is running. Close it first or pass -ForceCloseUnity." }
    $unityProcesses | Stop-Process -Force
    Start-Sleep -Seconds 2
}

$logPath = Join-Path $output "unity-production-asset-audit.log"
$arguments = @(
    "-batchmode",
    "-nographics",
    "-quit",
    "-projectPath", $projectRoot,
    "-executeMethod", "Axm.Rodoh.Action.Editor.ActionProductionAssetAuditBatch.Run",
    "-presentation", $presentationPath,
    "-productProfile", $profilePath,
    "-outputRoot", $output,
    "-logFile", $logPath
)
Write-Host "Recomputing UNDERDRAIN production-prefab source custody without modifying assets..."
$process = Start-Process -FilePath $unityPath -ArgumentList $arguments -Wait -PassThru -NoNewWindow
if ($process.ExitCode -ne 0) { throw "UNDERDRAIN production-asset audit failed with exit $($process.ExitCode). See $logPath" }
$auditPath = Join-Path $output "production-asset-audit.json"
if (-not (Test-Path $auditPath)) { throw "Unity did not write the production-asset audit receipt: $auditPath" }
$audit = Get-Content $auditPath -Raw | ConvertFrom-Json
if ($audit.status -ne "pass" -or $audit.assetCount -ne 7) { throw "Production-asset audit did not retain the complete seven-asset floor: $($audit.error)" }
if ($audit.exactSourceCustody -ne $true -or $audit.productionApproved -ne $true -or $audit.generatedPrimitive -ne $false -or $audit.activePhysicsAuthority -ne $false) {
    throw "Production-asset audit crossed the source, approval, primitive, or physics boundary."
}
foreach ($asset in @($audit.assets)) {
    if ($asset.markerSourceSha256 -ne $asset.computedSourceSha256) { throw "Production asset $($asset.assetId) has stale imported-source custody." }
    if ($asset.prefabSha256 -notmatch '^[0-9a-f]{64}$' -or @($asset.visualSourcePaths).Count -lt 1) { throw "Production asset $($asset.assetId) lacks prefab or source custody." }
}

$worldCommit = (& git -C $worldRoot rev-parse HEAD).Trim()
$run = [ordered]@{
    format = "rodoh-underdrain-production-asset-audit-run/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "pass"
    worldCommit = $worldCommit
    projectRoot = $projectRoot
    unityEditor = $unityPath
    unityVersion = $audit.unityVersion
    productId = $audit.productId
    presentationManifestId = $audit.presentationManifestId
    presentationManifest = $presentationPath
    productProfile = $profilePath
    assetCount = $audit.assetCount
    exactSourceCustody = $audit.exactSourceCustody
    assetReceipts = @($audit.assets)
    productionApproved = $audit.productionApproved
    generatedPrimitive = $audit.generatedPrimitive
    activePhysicsAuthority = $audit.activePhysicsAuthority
    auditReceipt = $auditPath
    unityLog = $logPath
}
$runPath = Join-Path $output "production-asset-audit-run.json"
$run | ConvertTo-Json -Depth 24 | Set-Content -Encoding utf8 $runPath
Write-Host "UNDERDRAIN production assets passed the read-only imported-source audit."
Write-Host $runPath

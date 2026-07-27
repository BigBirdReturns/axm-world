[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$EmbodiedArLabRoot,

    [Parameter(Mandatory = $true)]
    [string]$SourceManifest,

    [Parameter(Mandatory = $true)]
    [string]$OutputManifest,

    [Parameter(Mandatory = $true)]
    [string]$OutputRoot,

    [string]$AssetRoot = "Assets/AXM/Generated/ActionProduction/GovernedV1",
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

$projectRoot = Resolve-FullPath $EmbodiedArLabRoot (Get-Location).Path
$source = Resolve-FullPath $SourceManifest (Get-Location).Path
$output = Resolve-FullPath $OutputManifest (Get-Location).Path
$receipts = Resolve-FullPath $OutputRoot (Get-Location).Path
foreach ($path in @($projectRoot, $source)) {
    if (-not (Test-Path $path)) { throw "Required governed-production input is absent: $path" }
}
foreach ($directory in @("Assets", "Packages", "ProjectSettings")) {
    if (-not (Test-Path (Join-Path $projectRoot $directory))) { throw "Embodied-AR-Lab $directory directory is absent: $projectRoot" }
}
if (-not (Test-Path (Join-Path $projectRoot "Packages\com.axm.rodoh-action\package.json"))) {
    throw "The RODOH action package must be installed before governed assets are generated."
}
if ([string]::IsNullOrWhiteSpace($UnityEditor)) { $UnityEditor = "C:\Program Files\Unity\Hub\Editor\$UnityVersion\Editor\Unity.exe" }
$unityPath = [System.IO.Path]::GetFullPath($UnityEditor)
if (-not (Test-Path $unityPath)) { throw "Unity Editor is absent: $unityPath" }
$unityProcesses = Get-Process Unity -ErrorAction SilentlyContinue
if ($unityProcesses) {
    if (-not $ForceCloseUnity) { throw "Unity Editor is running. Close it first or pass -ForceCloseUnity." }
    $unityProcesses | Stop-Process -Force
    Start-Sleep -Seconds 2
}

New-Item -ItemType Directory -Force ([System.IO.Path]::GetDirectoryName($output)), $receipts | Out-Null
$logRoot = Join-Path $receipts "logs"
New-Item -ItemType Directory -Force $logRoot | Out-Null
$log = Join-Path $logRoot "unity-governed-action-production.log"
$arguments = @(
    "-batchmode",
    "-nographics",
    "-quit",
    "-projectPath", $projectRoot,
    "-executeMethod", "Axm.Rodoh.Action.Editor.ActionGovernedProductionBatch.Run",
    "-sourceManifest", $source,
    "-outputManifest", $output,
    "-assetRoot", $AssetRoot,
    "-outputRoot", $receipts,
    "-logFile", $log
)
Write-Host "Generating governed low-cost action bodies, motion, and arena assets..."
$process = Start-Process -FilePath $unityPath -ArgumentList $arguments -Wait -PassThru -NoNewWindow
if ($process.ExitCode -ne 0) { throw "Governed action production generation failed with exit $($process.ExitCode). See $log" }
$receiptPath = Join-Path $receipts "governed-production-assets.json"
if (-not (Test-Path $receiptPath)) { throw "Unity did not write the governed-production receipt: $receiptPath" }
if (-not (Test-Path $output)) { throw "Unity did not write the governed presentation manifest: $output" }
$receipt = Get-Content $receiptPath -Raw | ConvertFrom-Json
if ($receipt.status -ne "pass") { throw "Governed action production receipt reports failure: $($receipt.error)" }
if ($receipt.activePhysicsAuthority -ne $false -or $receipt.remoteRuntimeReferences -ne $false) {
    throw "Governed production crossed the physics or remote-runtime authority boundary."
}
if ($receipt.bodyPrefabs -ne 6 -or $receipt.enemyKits -ne 5 -or $receipt.motionClipCount -lt 8 -or $receipt.authoredArena -ne $true) {
    throw "Governed production asset inventory is incomplete."
}
Write-Host "RODOH governed action production generation passed."
Write-Host $receiptPath

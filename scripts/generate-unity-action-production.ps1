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
$assetLog = Join-Path $logRoot "unity-governed-action-production.log"
$assetArguments = @(
    "-batchmode",
    "-nographics",
    "-quit",
    "-projectPath", $projectRoot,
    "-executeMethod", "Axm.Rodoh.Action.Editor.ActionGovernedProductionBatch.Run",
    "-sourceManifest", $source,
    "-outputManifest", $output,
    "-assetRoot", $AssetRoot,
    "-outputRoot", $receipts,
    "-logFile", $assetLog
)
Write-Host "Generating governed low-cost action bodies, motion clips, and arena assets..."
$assetProcess = Start-Process -FilePath $unityPath -ArgumentList $assetArguments -Wait -PassThru -NoNewWindow
if ($assetProcess.ExitCode -ne 0) { throw "Governed action production generation failed with exit $($assetProcess.ExitCode). See $assetLog" }
$assetReceiptPath = Join-Path $receipts "governed-production-assets.json"
if (-not (Test-Path $assetReceiptPath)) { throw "Unity did not write the governed-production receipt: $assetReceiptPath" }
if (-not (Test-Path $output)) { throw "Unity did not write the governed presentation manifest: $output" }
$assetReceipt = Get-Content $assetReceiptPath -Raw | ConvertFrom-Json
if ($assetReceipt.status -ne "pass") { throw "Governed action production receipt reports failure: $($assetReceipt.error)" }
if ($assetReceipt.activePhysicsAuthority -ne $false -or $assetReceipt.remoteRuntimeReferences -ne $false) {
    throw "Governed production crossed the physics or remote-runtime authority boundary."
}
if ($assetReceipt.bodyPrefabs -ne 6 -or $assetReceipt.enemyKits -ne 5 -or $assetReceipt.motionClipCount -lt 8 -or $assetReceipt.authoredArena -ne $true) {
    throw "Governed production asset inventory is incomplete."
}

$motionLog = Join-Path $logRoot "unity-governed-action-motion.log"
$motionArguments = @(
    "-batchmode",
    "-nographics",
    "-quit",
    "-projectPath", $projectRoot,
    "-executeMethod", "Axm.Rodoh.Action.Editor.ActionGovernedMotionAugmentBatch.Run",
    "-manifest", $output,
    "-assetRoot", $assetReceipt.assetRoot,
    "-outputRoot", $receipts,
    "-logFile", $motionLog
)
Write-Host "Binding governed motion clips to deterministic-state player and enemy controllers..."
$motionProcess = Start-Process -FilePath $unityPath -ArgumentList $motionArguments -Wait -PassThru -NoNewWindow
if ($motionProcess.ExitCode -ne 0) { throw "Governed action motion augmentation failed with exit $($motionProcess.ExitCode). See $motionLog" }
$motionReceiptPath = Join-Path $receipts "governed-motion-augmentation.json"
if (-not (Test-Path $motionReceiptPath)) { throw "Unity did not write the governed-motion receipt: $motionReceiptPath" }
$motionReceipt = Get-Content $motionReceiptPath -Raw | ConvertFrom-Json
if ($motionReceipt.status -ne "pass") { throw "Governed motion receipt reports failure: $($motionReceipt.error)" }
if ($motionReceipt.controllers -ne 2 -or $motionReceipt.prefabsBound -ne 6 -or $motionReceipt.motionClips -lt 8) {
    throw "Governed motion controller inventory is incomplete."
}
if ($motionReceipt.rootMotion -ne $false -or $motionReceipt.actionStateDriven -ne $true -or $motionReceipt.proceduralFallbackRetained -ne $true) {
    throw "Governed motion crossed the action-authority or fallback boundary."
}

$manifestValue = Get-Content $output -Raw | ConvertFrom-Json
if ([string]::IsNullOrWhiteSpace([string]$manifestValue.player.animatorController)) { throw "Governed player controller was not bound into the output manifest." }
foreach ($enemy in @($manifestValue.enemies)) {
    if ([string]::IsNullOrWhiteSpace([string]$enemy.animatorController)) { throw "Governed enemy controller was not bound into the output manifest: $($enemy.kit)" }
}
$aggregate = [ordered]@{
    format = "rodoh-action-governed-production-run/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "pass"
    projectRoot = $projectRoot
    unityEditor = $unityPath
    unityVersion = $motionReceipt.unityVersion
    sourceManifest = $source
    outputManifest = $output
    outputManifestId = $manifestValue.manifestId
    outputManifestSha256 = (Get-FileHash $output -Algorithm SHA256).Hash.ToLowerInvariant()
    assetRoot = $assetReceipt.assetRoot
    bodyPrefabs = $assetReceipt.bodyPrefabs
    enemyKits = $assetReceipt.enemyKits
    motionClips = $motionReceipt.motionClips
    controllers = $motionReceipt.controllers
    prefabsBound = $motionReceipt.prefabsBound
    authoredArena = $assetReceipt.authoredArena
    neutralFallbackBodies = $assetReceipt.neutralFallbackBodies
    activePhysicsAuthority = $assetReceipt.activePhysicsAuthority
    remoteRuntimeReferences = $assetReceipt.remoteRuntimeReferences
    rootMotion = $motionReceipt.rootMotion
    actionStateDriven = $motionReceipt.actionStateDriven
    proceduralFallbackRetained = $motionReceipt.proceduralFallbackRetained
    assetReceipt = $assetReceiptPath
    motionReceipt = $motionReceiptPath
}
$aggregatePath = Join-Path $receipts "governed-production-run.json"
$aggregate | ConvertTo-Json -Depth 10 | Set-Content -Encoding utf8 $aggregatePath
Write-Host "RODOH governed action production generation passed."
Write-Host $aggregatePath

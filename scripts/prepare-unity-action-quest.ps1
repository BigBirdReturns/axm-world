[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$EmbodiedArLabRoot,

    [Parameter(Mandatory = $true)]
    [string]$JobId,

    [string]$TrackedHeadPath,
    [ValidateSet("left", "right")]
    [string]$DominantHand = "right",
    [switch]$OneHanded,
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
$jobRoot = Join-Path $projectRoot "local\scene-jobs\$JobId"
$outputRoot = Join-Path $jobRoot "output"
$logRoot = Join-Path $jobRoot "logs"
$localRunPath = Join-Path $outputRoot "local-run-v2.json"
if (-not (Test-Path $localRunPath)) { throw "Unity action estate v2 receipt is absent: $localRunPath" }
$localRun = Get-Content $localRunPath -Raw | ConvertFrom-Json
if ($localRun.status -ne "pass") { throw "Unity action estate v2 has not passed." }
$scenePath = [string]$localRun.scenePath
if ([string]::IsNullOrWhiteSpace($scenePath)) { throw "Unity action estate v2 receipt lacks scenePath." }

if ([string]::IsNullOrWhiteSpace($UnityEditor)) { $UnityEditor = "C:\Program Files\Unity\Hub\Editor\$UnityVersion\Editor\Unity.exe" }
$unityPath = [System.IO.Path]::GetFullPath($UnityEditor)
if (-not (Test-Path $unityPath)) { throw "Unity Editor is absent: $unityPath" }
$unityProcesses = Get-Process Unity -ErrorAction SilentlyContinue
if ($unityProcesses) {
    if (-not $ForceCloseUnity) { throw "Unity Editor is running. Close it first or pass -ForceCloseUnity." }
    $unityProcesses | Stop-Process -Force
    Start-Sleep -Seconds 2
}

New-Item -ItemType Directory -Force $outputRoot, $logRoot | Out-Null
$logPath = Join-Path $logRoot "unity-action-quest-augmentation.log"
$arguments = @(
    "-batchmode",
    "-nographics",
    "-quit",
    "-projectPath", $projectRoot,
    "-executeMethod", "Axm.Rodoh.Action.Editor.ActionQuestAugmentBatch.Run",
    "-scenePath", $scenePath,
    "-outputRoot", $outputRoot,
    "-dominantHand", $DominantHand,
    "-oneHanded", $(if ($OneHanded) { "true" } else { "false" }),
    "-logFile", $logPath
)
if (-not [string]::IsNullOrWhiteSpace($TrackedHeadPath)) { $arguments += @("-trackedHeadPath", $TrackedHeadPath) }
Write-Host "Installing the Quest and OpenXR action receiver into the generated scene..."
$process = Start-Process -FilePath $unityPath -ArgumentList $arguments -Wait -PassThru -NoNewWindow
if ($process.ExitCode -ne 0) { throw "Unity Quest augmentation failed with exit $($process.ExitCode). See $logPath" }
$receiptPath = Join-Path $outputRoot "quest-augmentation.json"
if (-not (Test-Path $receiptPath)) { throw "Unity did not write the Quest augmentation receipt: $receiptPath" }
$receipt = Get-Content $receiptPath -Raw | ConvertFrom-Json
if ($receipt.status -ne "pass") { throw "Quest augmentation receipt reports $($receipt.status): $($receipt.error)" }
if ($receipt.activePhysicsAuthority -ne $false) { throw "Quest action scene retained active physics combat authority." }
foreach ($field in @("xrControllerInput", "xrHaptics", "xrTrackingSafety", "boundaryReporter", "sessionSpool", "adaptiveQuality")) {
    if ($receipt.$field -ne $true) { throw "Quest augmentation is missing $field." }
}
$runReceipt = [ordered]@{
    format = "rodoh-unity-action-quest-prepare-run/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "pass"
    projectRoot = $projectRoot
    jobId = $JobId
    scenePath = $scenePath
    trackedHead = $receipt.trackedHead
    oneHanded = [bool]$OneHanded
    dominantHand = $DominantHand
    actionSpecDigest = $localRun.actionSpecDigest
    questAugmentation = $receiptPath
}
$runReceiptPath = Join-Path $outputRoot "quest-prepare-run.json"
$runReceipt | ConvertTo-Json -Depth 10 | Set-Content -Encoding utf8 $runReceiptPath
Write-Host "RODOH Quest action receiver preparation passed."
Write-Host $runReceiptPath

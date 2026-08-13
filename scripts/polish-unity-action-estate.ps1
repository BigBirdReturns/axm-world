[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$EmbodiedArLabRoot,

    [Parameter(Mandatory = $true)]
    [string]$JobId,

    [string]$PresentationManifest,
    [switch]$ReducedMotion,
    [switch]$HighContrast,
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
$jobRoot = Join-Path $projectRoot "local\scene-jobs\$JobId"
$inputRoot = Join-Path $jobRoot "input"
$outputRoot = Join-Path $jobRoot "output"
$logRoot = Join-Path $jobRoot "logs"
$localRunPath = Join-Path $outputRoot "local-run-v2.json"
$sceneJobPath = Join-Path $inputRoot "action.scene-job.json"
if (-not (Test-Path $localRunPath)) { throw "Unity action estate v2 receipt is absent: $localRunPath" }
if (-not (Test-Path $sceneJobPath)) { throw "Action scene job is absent: $sceneJobPath" }
$localRun = Get-Content $localRunPath -Raw | ConvertFrom-Json
if ($localRun.status -ne "pass") { throw "Unity action estate v2 has not passed." }
$scenePath = [string]$localRun.scenePath
if ([string]::IsNullOrWhiteSpace($scenePath)) { throw "Unity action estate v2 receipt lacks scenePath." }
if ([string]::IsNullOrWhiteSpace($PresentationManifest)) { $PresentationManifest = [string]$localRun.presentationManifest }
if ([string]::IsNullOrWhiteSpace($PresentationManifest)) { $PresentationManifest = Join-Path $worldRoot "unity\Fixtures\frog-pit.presentation.json" }
$presentationPath = Resolve-FullPath $PresentationManifest $worldRoot
if (-not (Test-Path $presentationPath)) { throw "Action presentation manifest is absent: $presentationPath" }

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
$logPath = Join-Path $logRoot "unity-action-polish-augmentation.log"
$arguments = @(
    "-batchmode",
    "-nographics",
    "-quit",
    "-projectPath", $projectRoot,
    "-executeMethod", "Axm.Rodoh.Action.Editor.ActionPolishAugmentBatch.Run",
    "-scenePath", $scenePath,
    "-sceneJob", $sceneJobPath,
    "-presentation", $presentationPath,
    "-outputRoot", $outputRoot,
    "-reducedMotion", $(if ($ReducedMotion) { "true" } else { "false" }),
    "-highContrast", $(if ($HighContrast) { "true" } else { "false" }),
    "-logFile", $logPath
)
Write-Host "Installing the complete low-cost action polish floor..."
$process = Start-Process -FilePath $unityPath -ArgumentList $arguments -Wait -PassThru -NoNewWindow
if ($process.ExitCode -ne 0) { throw "Unity action polish augmentation failed with exit $($process.ExitCode). See $logPath" }
$receiptPath = Join-Path $outputRoot "polish-augmentation.json"
if (-not (Test-Path $receiptPath)) { throw "Unity did not write the action polish receipt: $receiptPath" }
$receipt = Get-Content $receiptPath -Raw | ConvertFrom-Json
if ($receipt.status -ne "pass") { throw "Action polish receipt reports $($receipt.status): $($receipt.error)" }
if ($receipt.activePhysicsAuthority -ne $false) { throw "Polished action scene retained active physics combat authority." }
foreach ($field in @("proceduralMotion", "boundedCamera", "visualFeedback", "proceduralAudio", "preferenceControlled")) {
    if ($receipt.$field -ne $true) { throw "Action polish augmentation is missing $field." }
}
$runReceipt = [ordered]@{
    format = "rodoh-unity-action-polish-run/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "pass"
    projectRoot = $projectRoot
    jobId = $JobId
    scenePath = $scenePath
    actionSpecDigest = $localRun.actionSpecDigest
    presentationManifest = $presentationPath
    themeId = $receipt.themeId
    proceduralMotion = $receipt.proceduralMotion
    boundedCamera = $receipt.boundedCamera
    visualFeedback = $receipt.visualFeedback
    proceduralAudio = $receipt.proceduralAudio
    reducedMotion = [bool]$ReducedMotion
    highContrast = [bool]$HighContrast
    polishReceipt = $receiptPath
}
$runReceiptPath = Join-Path $outputRoot "polish-run.json"
$runReceipt | ConvertTo-Json -Depth 10 | Set-Content -Encoding utf8 $runReceiptPath
Write-Host "RODOH action polish augmentation passed."
Write-Host $runReceiptPath

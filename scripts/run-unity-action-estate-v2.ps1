[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$EmbodiedArLabRoot,

    [string]$NativeActionSpec,
    [string]$PresentationManifest,
    [string]$JobId = "frog-pit-estate-v2-001",
    [string]$SessionId,
    [string]$DeviceId = "unity-local",
    [ValidateSet("low", "standard", "high")]
    [string]$InitialQuality = "standard",
    [string]$TrackedHeadPath,
    [string]$UnityVersion = "6000.0.66f2",
    [string]$UnityEditor,
    [switch]$DisableAdaptiveQuality,
    [switch]$SkipUnityTests,
    [switch]$ForceCloseUnity
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-FullPath([string]$Value, [string]$Base) {
    if ([System.IO.Path]::IsPathRooted($Value)) { return [System.IO.Path]::GetFullPath($Value) }
    return [System.IO.Path]::GetFullPath((Join-Path $Base $Value))
}

function Invoke-CheckedPowerShell([string]$Script, [hashtable]$Parameters, [string]$Label) {
    $arguments = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $Script)
    foreach ($key in $Parameters.Keys) {
        $value = $Parameters[$key]
        if ($value -is [System.Management.Automation.SwitchParameter] -or $value -is [bool]) {
            if ([bool]$value) { $arguments += "-$key" }
        } elseif ($null -ne $value -and -not [string]::IsNullOrWhiteSpace([string]$value)) {
            $arguments += @("-$key", [string]$value)
        }
    }
    Write-Host $Label
    & powershell.exe @arguments
    if ($LASTEXITCODE -ne 0) { throw "$Label failed with exit $LASTEXITCODE." }
}

$worldRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$projectRoot = Resolve-FullPath $EmbodiedArLabRoot (Get-Location).Path
if ([string]::IsNullOrWhiteSpace($NativeActionSpec)) { $NativeActionSpec = Join-Path $worldRoot "unity\Fixtures\frog-pit.action-spec.json" }
if ([string]::IsNullOrWhiteSpace($PresentationManifest)) { $PresentationManifest = Join-Path $worldRoot "unity\Fixtures\frog-pit.presentation.json" }
$nativeSpecPath = Resolve-FullPath $NativeActionSpec $worldRoot
$presentationPath = Resolve-FullPath $PresentationManifest $worldRoot
if ([string]::IsNullOrWhiteSpace($SessionId)) { $SessionId = $JobId }
if ([string]::IsNullOrWhiteSpace($UnityEditor)) { $UnityEditor = "C:\Program Files\Unity\Hub\Editor\$UnityVersion\Editor\Unity.exe" }
$unityPath = [System.IO.Path]::GetFullPath($UnityEditor)
if (-not (Test-Path $unityPath)) { throw "Unity Editor is absent: $unityPath" }

$baseRunner = Join-Path $worldRoot "scripts\run-unity-action-estate.ps1"
if (-not (Test-Path $baseRunner)) { throw "Base Unity action estate runner is absent: $baseRunner" }
$baseParameters = @{
    EmbodiedArLabRoot = $projectRoot
    NativeActionSpec = $nativeSpecPath
    PresentationManifest = $presentationPath
    JobId = $JobId
    UnityVersion = $UnityVersion
    UnityEditor = $unityPath
    SkipUnityTests = $true
    ForceCloseUnity = $ForceCloseUnity
}
Invoke-CheckedPowerShell $baseRunner $baseParameters "Compiling the deterministic base action estate..."

$jobRoot = Join-Path $projectRoot "local\scene-jobs\$JobId"
$inputRoot = Join-Path $jobRoot "input"
$outputRoot = Join-Path $jobRoot "output"
$logRoot = Join-Path $jobRoot "logs"
$baseValidationPath = Join-Path $outputRoot "validation.json"
$sceneJobPath = Join-Path $inputRoot "action.scene-job.json"
if (-not (Test-Path $baseValidationPath)) { throw "Base action validation is absent: $baseValidationPath" }
if (-not (Test-Path $sceneJobPath)) { throw "Action scene job is absent: $sceneJobPath" }
$baseValidation = Get-Content $baseValidationPath -Raw | ConvertFrom-Json
if ($baseValidation.status -ne "pass") { throw "Base action estate did not pass: $($baseValidation.error)" }
$scenePath = [string]$baseValidation.scenePath
if ([string]::IsNullOrWhiteSpace($scenePath)) { throw "Base action validation did not identify the generated scene." }

$postprocessLog = Join-Path $logRoot "unity-action-estate-postprocess.log"
$postprocessArguments = @(
    "-batchmode",
    "-nographics",
    "-quit",
    "-projectPath", $projectRoot,
    "-executeMethod", "Axm.Rodoh.Action.Editor.ActionEstatePostprocessBatch.Run",
    "-scenePath", $scenePath,
    "-sceneJob", $sceneJobPath,
    "-presentation", $presentationPath,
    "-outputRoot", $outputRoot,
    "-sessionId", $SessionId,
    "-deviceId", $DeviceId,
    "-initialQuality", $InitialQuality,
    "-adaptiveQuality", $(if ($DisableAdaptiveQuality) { "false" } else { "true" }),
    "-logFile", $postprocessLog
)
if (-not [string]::IsNullOrWhiteSpace($TrackedHeadPath)) { $postprocessArguments += @("-trackedHeadPath", $TrackedHeadPath) }
Write-Host "Installing adaptive quality, Quest spool, safety custody, and performance receipts..."
$postprocess = Start-Process -FilePath $unityPath -ArgumentList $postprocessArguments -Wait -PassThru -NoNewWindow
if ($postprocess.ExitCode -ne 0) { throw "Unity action estate postprocess failed with exit $($postprocess.ExitCode). See $postprocessLog" }
$postprocessReceiptPath = Join-Path $outputRoot "estate-postprocess.json"
if (-not (Test-Path $postprocessReceiptPath)) { throw "Unity did not write the postprocess receipt: $postprocessReceiptPath" }
$postprocessReceipt = Get-Content $postprocessReceiptPath -Raw | ConvertFrom-Json
if ($postprocessReceipt.status -ne "pass") { throw "Unity postprocess receipt reports $($postprocessReceipt.status): $($postprocessReceipt.error)" }
if ($postprocessReceipt.activePhysicsAuthority -ne $false) { throw "Postprocessed action estate retained active physics combat authority." }
if ($postprocessReceipt.qualityProfiles -ne 3) { throw "Postprocessed action estate lacks the complete quality ladder." }

$testsStatus = "skipped"
$testResults = Join-Path $outputRoot "action-estate-v2-editmode-tests.xml"
$testLog = Join-Path $logRoot "unity-action-estate-v2-tests.log"
if (-not $SkipUnityTests) {
    $testArguments = @(
        "-batchmode",
        "-nographics",
        "-projectPath", $projectRoot,
        "-runTests",
        "-testPlatform", "EditMode",
        "-testFilter", "Axm.Rodoh.Action.Tests",
        "-testResults", $testResults,
        "-logFile", $testLog
    )
    Write-Host "Running the complete Unity action package EditMode gate..."
    $tests = Start-Process -FilePath $unityPath -ArgumentList $testArguments -Wait -PassThru -NoNewWindow
    if ($tests.ExitCode -ne 0) { throw "Unity action package tests failed with exit $($tests.ExitCode). See $testLog" }
    if (-not (Test-Path $testResults)) { throw "Unity test runner did not write $testResults" }
    [xml]$testXml = Get-Content $testResults -Raw
    if ([int]$testXml.'test-run'.failed -ne 0) { throw "Unity action package test XML reports failures." }
    $testsStatus = "pass"
}

$sceneJob = Get-Content $sceneJobPath -Raw | ConvertFrom-Json
$receipt = [ordered]@{
    format = "rodoh-unity-action-estate-v2-local-run/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "pass"
    projectRoot = $projectRoot
    unityEditor = $unityPath
    unityVersion = $postprocessReceipt.unityVersion
    jobId = $JobId
    sessionId = $SessionId
    deviceId = $DeviceId
    nativeActionSpec = $nativeSpecPath
    presentationManifest = $presentationPath
    sceneJob = $sceneJobPath
    sceneJobDigest = $sceneJob.jobDigest
    scenePath = $scenePath
    actionSpecDigest = $postprocessReceipt.actionSpecDigest
    presentationManifestId = $postprocessReceipt.presentationManifestId
    deterministicReplay = $baseValidation.deterministicReplay
    activePhysicsAuthority = $postprocessReceipt.activePhysicsAuthority
    adaptiveQuality = $postprocessReceipt.adaptiveQuality
    qualityProfiles = $postprocessReceipt.qualityProfiles
    questSpool = $postprocessReceipt.questSpool
    safetySpool = $postprocessReceipt.safetySpool
    performanceReceipt = $postprocessReceipt.performanceReceipt
    editModeTests = $testsStatus
    baseValidation = $baseValidationPath
    postprocessValidation = $postprocessReceiptPath
    testResults = if ($SkipUnityTests) { $null } else { $testResults }
}
$receiptPath = Join-Path $outputRoot "local-run-v2.json"
$receipt | ConvertTo-Json -Depth 10 | Set-Content -Encoding utf8 $receiptPath
Write-Host "RODOH Unity action estate v2 passed."
Write-Host $receiptPath

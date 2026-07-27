[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$EmbodiedArLabRoot,

    [string]$NativeActionSpec,
    [string]$PresentationManifest,
    [string]$JobId = "frog-pit-estate-v3-001",
    [string]$SessionId,
    [string]$DeviceId = "unity-local",
    [ValidateSet("low", "standard", "high")]
    [string]$InitialQuality = "standard",
    [string]$TrackedHeadPath,
    [switch]$ReducedMotion,
    [switch]$HighContrast,
    [switch]$Quest,
    [ValidateSet("left", "right")]
    [string]$DominantHand = "right",
    [switch]$OneHanded,
    [switch]$GovernedProduction,
    [string]$GovernedAssetRoot = "Assets/AXM/Generated/ActionProduction/GovernedV1",
    [switch]$DisableAdaptiveQuality,
    [switch]$SkipUnityTests,
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

function Invoke-CheckedScript([string]$Script, [hashtable]$Parameters, [string]$Label) {
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
if ([string]::IsNullOrWhiteSpace($SessionId)) { $SessionId = $JobId }
if ([string]::IsNullOrWhiteSpace($UnityEditor)) { $UnityEditor = "C:\Program Files\Unity\Hub\Editor\$UnityVersion\Editor\Unity.exe" }
$unityPath = [System.IO.Path]::GetFullPath($UnityEditor)
if (-not (Test-Path $unityPath)) { throw "Unity Editor is absent: $unityPath" }

$v2Script = Join-Path $worldRoot "scripts\run-unity-action-estate-v2.ps1"
$polishScript = Join-Path $worldRoot "scripts\polish-unity-action-estate.ps1"
$questScript = Join-Path $worldRoot "scripts\prepare-unity-action-quest.ps1"
foreach ($script in @($v2Script, $polishScript, $questScript)) { if (-not (Test-Path $script)) { throw "Required action script is absent: $script" } }

Invoke-CheckedScript $v2Script @{
    EmbodiedArLabRoot = $projectRoot
    NativeActionSpec = $NativeActionSpec
    PresentationManifest = $PresentationManifest
    JobId = $JobId
    SessionId = $SessionId
    DeviceId = $DeviceId
    InitialQuality = $InitialQuality
    TrackedHeadPath = $TrackedHeadPath
    UnityVersion = $UnityVersion
    UnityEditor = $unityPath
    GovernedProduction = $GovernedProduction
    GovernedAssetRoot = $GovernedAssetRoot
    DisableAdaptiveQuality = $DisableAdaptiveQuality
    SkipUnityTests = $true
    ForceCloseUnity = $ForceCloseUnity
} "Compiling and postprocessing the deterministic Unity action estate..."

$jobRoot = Join-Path $projectRoot "local\scene-jobs\$JobId"
$outputRoot = Join-Path $jobRoot "output"
$baseReceiptPath = Join-Path $outputRoot "local-run-v2.json"
if (-not (Test-Path $baseReceiptPath)) { throw "Postprocessed action estate receipt is absent: $baseReceiptPath" }
$base = Get-Content $baseReceiptPath -Raw | ConvertFrom-Json
if ($base.status -ne "pass") { throw "Postprocessed action estate did not pass." }
$effectivePresentation = [string]$base.presentationManifest
if ([string]::IsNullOrWhiteSpace($effectivePresentation) -or -not (Test-Path $effectivePresentation)) { throw "Postprocessed action estate did not retain its effective presentation manifest." }

Invoke-CheckedScript $polishScript @{
    EmbodiedArLabRoot = $projectRoot
    JobId = $JobId
    PresentationManifest = $effectivePresentation
    ReducedMotion = $ReducedMotion
    HighContrast = $HighContrast
    UnityVersion = $UnityVersion
    UnityEditor = $unityPath
    ForceCloseUnity = $ForceCloseUnity
} "Installing the low-cost action presentation floor..."

if ($Quest) {
    Invoke-CheckedScript $questScript @{
        EmbodiedArLabRoot = $projectRoot
        JobId = $JobId
        TrackedHeadPath = $TrackedHeadPath
        DominantHand = $DominantHand
        OneHanded = $OneHanded
        UnityVersion = $UnityVersion
        UnityEditor = $unityPath
        ForceCloseUnity = $ForceCloseUnity
    } "Installing the Quest and OpenXR action receiver..."
}

$logRoot = Join-Path $jobRoot "logs"
$testResults = Join-Path $outputRoot "action-estate-v3-editmode-tests.xml"
$testLog = Join-Path $logRoot "unity-action-estate-v3-tests.log"
$testsStatus = "skipped"
if (-not $SkipUnityTests) {
    $arguments = @(
        "-batchmode",
        "-nographics",
        "-projectPath", $projectRoot,
        "-runTests",
        "-testPlatform", "EditMode",
        "-testFilter", "Axm.Rodoh.Action.Tests",
        "-testResults", $testResults,
        "-logFile", $testLog
    )
    Write-Host "Running the final Unity action package gate against the completed estate..."
    $process = Start-Process -FilePath $unityPath -ArgumentList $arguments -Wait -PassThru -NoNewWindow
    if ($process.ExitCode -ne 0) { throw "Final Unity action package tests failed with exit $($process.ExitCode). See $testLog" }
    if (-not (Test-Path $testResults)) { throw "Unity test runner did not write $testResults" }
    [xml]$testXml = Get-Content $testResults -Raw
    if ([int]$testXml.'test-run'.failed -ne 0) { throw "Final Unity action package test XML reports failures." }
    $testsStatus = "pass"
}

$polishReceiptPath = Join-Path $outputRoot "polish-run.json"
$questReceiptPath = Join-Path $outputRoot "quest-prepare-run.json"
foreach ($path in @($baseReceiptPath, $polishReceiptPath)) { if (-not (Test-Path $path)) { throw "Required completed-estate receipt is absent: $path" } }
if ($Quest -and -not (Test-Path $questReceiptPath)) { throw "Quest preparation receipt is absent: $questReceiptPath" }
$base = Get-Content $baseReceiptPath -Raw | ConvertFrom-Json
$polish = Get-Content $polishReceiptPath -Raw | ConvertFrom-Json
$questValue = if ($Quest) { Get-Content $questReceiptPath -Raw | ConvertFrom-Json } else { $null }
if ($base.status -ne "pass" -or $polish.status -ne "pass" -or ($Quest -and $questValue.status -ne "pass")) { throw "Completed action estate contains a failing component receipt." }

$receipt = [ordered]@{
    format = "rodoh-unity-action-estate-v3-local-run/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "pass"
    projectRoot = $projectRoot
    jobId = $JobId
    sessionId = $SessionId
    deviceId = $DeviceId
    scenePath = $base.scenePath
    actionSpecDigest = $base.actionSpecDigest
    sceneJobDigest = $base.sceneJobDigest
    deterministicReplay = $base.deterministicReplay
    activePhysicsAuthority = $base.activePhysicsAuthority
    adaptiveQuality = $base.adaptiveQuality
    questSpool = $base.questSpool
    safetySpool = $base.safetySpool
    performanceReceipt = $base.performanceReceipt
    governedProduction = [bool]$GovernedProduction
    governedProductionReceipt = $base.governedProductionReceipt
    presentationManifest = $base.presentationManifest
    proceduralMotion = $polish.proceduralMotion
    boundedCamera = $polish.boundedCamera
    visualFeedback = $polish.visualFeedback
    proceduralAudio = $polish.proceduralAudio
    reducedMotion = [bool]$ReducedMotion
    highContrast = [bool]$HighContrast
    questReceiver = [bool]$Quest
    dominantHand = if ($Quest) { $DominantHand } else { $null }
    oneHanded = if ($Quest) { [bool]$OneHanded } else { $null }
    editModeTests = $testsStatus
    baseReceipt = $baseReceiptPath
    polishReceipt = $polishReceiptPath
    questReceipt = if ($Quest) { $questReceiptPath } else { $null }
    testResults = if ($SkipUnityTests) { $null } else { $testResults }
}
$receiptPath = Join-Path $outputRoot "local-run-v3.json"
$receipt | ConvertTo-Json -Depth 10 | Set-Content -Encoding utf8 $receiptPath
Write-Host "RODOH Unity action estate v3 passed."
Write-Host $receiptPath

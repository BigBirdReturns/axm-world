[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$EmbodiedArLabRoot,

    [string]$ActionSpec,
    [string]$JobId = "frog-pit-001",
    [string]$UnityVersion = "6000.0.66f2",
    [string]$UnityEditor,
    [switch]$SkipUnityTests,
    [switch]$ForceCloseUnity
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-FullPath([string]$PathValue, [string]$BasePath) {
    if ([System.IO.Path]::IsPathRooted($PathValue)) {
        return [System.IO.Path]::GetFullPath($PathValue)
    }
    return [System.IO.Path]::GetFullPath((Join-Path $BasePath $PathValue))
}

$worldRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$projectRoot = Resolve-FullPath $EmbodiedArLabRoot (Get-Location).Path
if (-not (Test-Path (Join-Path $projectRoot "Assets"))) { throw "Embodied-AR-Lab Assets directory is absent: $projectRoot" }
if (-not (Test-Path (Join-Path $projectRoot "Packages"))) { throw "Embodied-AR-Lab Packages directory is absent: $projectRoot" }
if (-not (Test-Path (Join-Path $projectRoot "ProjectSettings"))) { throw "Embodied-AR-Lab ProjectSettings directory is absent: $projectRoot" }

if ([string]::IsNullOrWhiteSpace($ActionSpec)) {
    $ActionSpec = Join-Path $worldRoot "unity\Fixtures\frog-pit.unity-action-spec.json"
}
$specPath = Resolve-FullPath $ActionSpec $worldRoot
if (-not (Test-Path $specPath)) { throw "Action projection is absent: $specPath" }

if ([string]::IsNullOrWhiteSpace($UnityEditor)) {
    $UnityEditor = "C:\Program Files\Unity\Hub\Editor\$UnityVersion\Editor\Unity.exe"
}
$unityPath = [System.IO.Path]::GetFullPath($UnityEditor)
if (-not (Test-Path $unityPath)) { throw "Unity Editor is absent: $unityPath" }

$unityProcesses = Get-Process Unity -ErrorAction SilentlyContinue
if ($unityProcesses) {
    if (-not $ForceCloseUnity) {
        throw "Unity Editor is running. Close it first or pass -ForceCloseUnity."
    }
    $unityProcesses | Stop-Process -Force
    Start-Sleep -Seconds 2
}

$sourcePackage = Join-Path $worldRoot "unity\Packages\com.axm.rodoh-action"
$embeddedPackage = Join-Path $projectRoot "Packages\com.axm.rodoh-action"
if (-not (Test-Path (Join-Path $sourcePackage "package.json"))) { throw "World Unity package is incomplete: $sourcePackage" }
New-Item -ItemType Directory -Force $embeddedPackage | Out-Null
& robocopy.exe $sourcePackage $embeddedPackage /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -gt 7) { throw "RODOH Unity package copy failed with robocopy exit $LASTEXITCODE." }

$outputRoot = Join-Path $projectRoot "local\scene-jobs\$JobId\output"
$logRoot = Join-Path $projectRoot "local\scene-jobs\$JobId\logs"
New-Item -ItemType Directory -Force $outputRoot, $logRoot | Out-Null
$compileLog = Join-Path $logRoot "unity-action-compile.log"
$testLog = Join-Path $logRoot "unity-action-tests.log"
$testResults = Join-Path $outputRoot "action-editmode-tests.xml"
$validationPath = Join-Path $outputRoot "validation.json"

$compileArguments = @(
    "-batchmode",
    "-nographics",
    "-quit",
    "-projectPath", $projectRoot,
    "-executeMethod", "Axm.Rodoh.Action.Editor.ActionBridgeBatch.Run",
    "-actionSpec", $specPath,
    "-outputRoot", $outputRoot,
    "-jobId", $JobId,
    "-createDesktopRig", "true",
    "-logFile", $compileLog
)

Write-Host "Compiling the Arc action projection into Embodied-AR-Lab..."
$compile = Start-Process -FilePath $unityPath -ArgumentList $compileArguments -Wait -PassThru -NoNewWindow
if ($compile.ExitCode -ne 0) {
    throw "Unity action scene compilation failed with exit $($compile.ExitCode). See $compileLog"
}
if (-not (Test-Path $validationPath)) { throw "Unity did not write the expected validation receipt: $validationPath" }
$validation = Get-Content $validationPath -Raw | ConvertFrom-Json
if ($validation.status -ne "pass") { throw "Unity action validation receipt reports $($validation.status): $($validation.error)" }
if ($validation.tickRate -ne 30) { throw "Unity action validation changed the 30 Hz law." }
if ($validation.unityPhysicsAuthority -ne $false) { throw "Unity action scene claims physics authority." }

$testsStatus = "skipped"
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
    Write-Host "Running Unity EditMode action conformance tests..."
    $tests = Start-Process -FilePath $unityPath -ArgumentList $testArguments -Wait -PassThru -NoNewWindow
    if ($tests.ExitCode -ne 0) {
        throw "Unity action EditMode tests failed with exit $($tests.ExitCode). See $testLog"
    }
    if (-not (Test-Path $testResults)) { throw "Unity test runner did not write $testResults" }
    [xml]$testXml = Get-Content $testResults -Raw
    $failures = [int]$testXml.'test-run'.failed
    if ($failures -ne 0) { throw "Unity action tests report $failures failures." }
    $testsStatus = "pass"
}

$receipt = [ordered]@{
    format = "rodoh-unity-action-local-run/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "pass"
    projectRoot = $projectRoot
    unityEditor = $unityPath
    unityVersion = $validation.unityVersion
    jobId = $JobId
    actionSpec = $specPath
    actionSpecDigest = $validation.sourceActionSpecDigest
    arcDigest = $validation.sourceArcDigest
    tickRate = $validation.tickRate
    deterministicReplay = $validation.deterministicReplay
    unityPhysicsAuthority = $validation.unityPhysicsAuthority
    editModeTests = $testsStatus
    validation = $validationPath
    testResults = if ($SkipUnityTests) { $null } else { $testResults }
}
$receiptPath = Join-Path $outputRoot "local-run.json"
$receipt | ConvertTo-Json -Depth 10 | Set-Content -Encoding utf8 $receiptPath
Write-Host "RODOH Unity action bridge passed."
Write-Host $receiptPath

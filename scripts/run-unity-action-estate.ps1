[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$EmbodiedArLabRoot,

    [string]$NativeActionSpec,
    [string]$PresentationManifest,
    [string]$JobId = "frog-pit-estate-001",
    [string]$UnityVersion = "6000.0.66f2",
    [string]$UnityEditor,
    [switch]$GovernedProduction,
    [string]$GovernedAssetRoot = "Assets/AXM/Generated/ActionProduction/GovernedV1",
    [switch]$SkipUnityTests,
    [switch]$ForceCloseUnity
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-FullPath([string]$PathValue, [string]$BasePath) {
    if ([System.IO.Path]::IsPathRooted($PathValue)) { return [System.IO.Path]::GetFullPath($PathValue) }
    return [System.IO.Path]::GetFullPath((Join-Path $BasePath $PathValue))
}

function Invoke-Checked([string]$FilePath, [string[]]$Arguments, [string]$Label, [string]$LogPath) {
    Write-Host $Label
    $process = Start-Process -FilePath $FilePath -ArgumentList $Arguments -Wait -PassThru -NoNewWindow -RedirectStandardOutput $LogPath -RedirectStandardError ($LogPath + ".err")
    if ($process.ExitCode -ne 0) {
        throw "$Label failed with exit $($process.ExitCode). See $LogPath and $LogPath.err"
    }
}

$worldRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$projectRoot = Resolve-FullPath $EmbodiedArLabRoot (Get-Location).Path
foreach ($directory in @("Assets", "Packages", "ProjectSettings")) {
    if (-not (Test-Path (Join-Path $projectRoot $directory))) { throw "Embodied-AR-Lab $directory directory is absent: $projectRoot" }
}

if ([string]::IsNullOrWhiteSpace($NativeActionSpec)) { $NativeActionSpec = Join-Path $worldRoot "unity\Fixtures\frog-pit.action-spec.json" }
if ([string]::IsNullOrWhiteSpace($PresentationManifest)) { $PresentationManifest = Join-Path $worldRoot "unity\Fixtures\frog-pit.presentation.json" }
$nativeSpecPath = Resolve-FullPath $NativeActionSpec $worldRoot
$presentationPath = Resolve-FullPath $PresentationManifest $worldRoot
if (-not (Test-Path $nativeSpecPath)) { throw "Native Arc action spec is absent: $nativeSpecPath" }
if (-not (Test-Path $presentationPath)) { throw "Action presentation manifest is absent: $presentationPath" }

if ([string]::IsNullOrWhiteSpace($UnityEditor)) { $UnityEditor = "C:\Program Files\Unity\Hub\Editor\$UnityVersion\Editor\Unity.exe" }
$unityPath = [System.IO.Path]::GetFullPath($UnityEditor)
if (-not (Test-Path $unityPath)) { throw "Unity Editor is absent: $unityPath" }
$node = (Get-Command node -ErrorAction Stop).Source

$unityProcesses = Get-Process Unity -ErrorAction SilentlyContinue
if ($unityProcesses) {
    if (-not $ForceCloseUnity) { throw "Unity Editor is running. Close it first or pass -ForceCloseUnity." }
    $unityProcesses | Stop-Process -Force
    Start-Sleep -Seconds 2
}

$sourcePackage = Join-Path $worldRoot "unity\Packages\com.axm.rodoh-action"
$embeddedPackage = Join-Path $projectRoot "Packages\com.axm.rodoh-action"
if (-not (Test-Path (Join-Path $sourcePackage "package.json"))) { throw "World Unity package is incomplete: $sourcePackage" }
New-Item -ItemType Directory -Force $embeddedPackage | Out-Null
& robocopy.exe $sourcePackage $embeddedPackage /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -gt 7) { throw "RODOH Unity package copy failed with robocopy exit $LASTEXITCODE." }

$jobRoot = Join-Path $projectRoot "local\scene-jobs\$JobId"
$inputRoot = Join-Path $jobRoot "input"
$outputRoot = Join-Path $jobRoot "output"
$logRoot = Join-Path $jobRoot "logs"
New-Item -ItemType Directory -Force $inputRoot, $outputRoot, $logRoot | Out-Null
$projectionPath = Join-Path $inputRoot "action.unity-action-spec.json"
$sceneJobPath = Join-Path $inputRoot "action.scene-job.json"
$projectionLog = Join-Path $logRoot "action-projection.log"
$sceneJobLog = Join-Path $logRoot "action-scene-job.log"
$compileLog = Join-Path $logRoot "unity-action-estate-compile.log"
$testLog = Join-Path $logRoot "unity-action-estate-tests.log"
$testResults = Join-Path $outputRoot "action-estate-editmode-tests.xml"
$validationPath = Join-Path $outputRoot "validation.json"
$governedProductionReceipt = $null

if ($GovernedProduction) {
    $governedManifestPath = Join-Path $inputRoot "action.governed-presentation.json"
    $governedGenerator = Join-Path $worldRoot "scripts\generate-unity-action-production.ps1"
    if (-not (Test-Path $governedGenerator)) { throw "Governed action production generator is absent: $governedGenerator" }
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $governedGenerator `
        -EmbodiedArLabRoot $projectRoot `
        -SourceManifest $presentationPath `
        -OutputManifest $governedManifestPath `
        -OutputRoot $outputRoot `
        -AssetRoot $GovernedAssetRoot `
        -UnityVersion $UnityVersion `
        -UnityEditor $unityPath `
        -ForceCloseUnity:$ForceCloseUnity
    if ($LASTEXITCODE -ne 0) { throw "Governed action production generation failed with exit $LASTEXITCODE." }
    $governedProductionReceipt = Join-Path $outputRoot "governed-production-run.json"
    if (-not (Test-Path $governedProductionReceipt)) { throw "Governed production receipt is absent: $governedProductionReceipt" }
    $governed = Get-Content $governedProductionReceipt -Raw | ConvertFrom-Json
    if ($governed.status -ne "pass" -or $governed.activePhysicsAuthority -ne $false -or $governed.neutralFallbackBodies -ne $false) {
        throw "Governed production did not establish an authored presentation boundary."
    }
    if ($governed.bodyPrefabs -ne 6 -or $governed.enemyKits -ne 5 -or $governed.authoredArena -ne $true) {
        throw "Governed production did not preserve the complete body and arena inventory."
    }
    if ($governed.controllers -ne 2 -or $governed.prefabsBound -ne 6 -or $governed.motionClips -lt 8) {
        throw "Governed production did not bind its complete motion kit into runtime bodies."
    }
    if ($governed.rootMotion -ne $false -or $governed.actionStateDriven -ne $true -or $governed.proceduralFallbackRetained -ne $true) {
        throw "Governed motion crossed the action-authority or constrained-device fallback boundary."
    }
    if ($governed.remoteRuntimeReferences -ne $false) { throw "Governed production retained a remote runtime presentation reference." }
    $presentationPath = $governedManifestPath
}

Invoke-Checked $node @(
    (Join-Path $worldRoot "unity\Conformance\project-action-spec.mjs"),
    $nativeSpecPath,
    $projectionPath
) "Projecting exact Arc action law for Unity..." $projectionLog

Invoke-Checked $node @(
    (Join-Path $worldRoot "unity\Conformance\build-action-scene-job.mjs"),
    $projectionPath,
    $presentationPath,
    $sceneJobPath
) "Building the digest-bound Unity action scene job..." $sceneJobLog

$compileArguments = @(
    "-batchmode",
    "-nographics",
    "-quit",
    "-projectPath", $projectRoot,
    "-executeMethod", "Axm.Rodoh.Action.Editor.ActionEstateBatch.Run",
    "-sceneJob", $sceneJobPath,
    "-outputRoot", $outputRoot,
    "-jobId", $JobId,
    "-createDesktopRig", "true",
    "-logFile", $compileLog
)
Write-Host "Compiling the action estate into Embodied-AR-Lab..."
$compile = Start-Process -FilePath $unityPath -ArgumentList $compileArguments -Wait -PassThru -NoNewWindow
if ($compile.ExitCode -ne 0) { throw "Unity action estate compilation failed with exit $($compile.ExitCode). See $compileLog" }
if (-not (Test-Path $validationPath)) { throw "Unity did not write the expected validation receipt: $validationPath" }
$validation = Get-Content $validationPath -Raw | ConvertFrom-Json
if ($validation.status -ne "pass") { throw "Unity action estate validation reports $($validation.status): $($validation.error)" }
if ($validation.deterministicReplay -ne $true) { throw "Unity estate did not prove deterministic replay." }
if ($validation.activePhysicsAuthority -ne $false) { throw "Unity estate retained active physics combat authority." }
if ($validation.maximumActiveEnemies -lt 1 -or $validation.maximumActiveEnemies -gt 12) { throw "Unity estate enemy ceiling is outside action v1." }
if ($GovernedProduction -and ($validation.authoredPlayerPrefabs -ne 1 -or $validation.authoredEnemyPrefabs -ne 5 -or $validation.neutralFallbackBodies -ne 0 -or $validation.arenaAuthored -ne $true)) {
    throw "Unity scene did not materialize the complete governed production asset set."
}

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
    Write-Host "Running Unity EditMode action estate tests..."
    $tests = Start-Process -FilePath $unityPath -ArgumentList $testArguments -Wait -PassThru -NoNewWindow
    if ($tests.ExitCode -ne 0) { throw "Unity action estate tests failed with exit $($tests.ExitCode). See $testLog" }
    if (-not (Test-Path $testResults)) { throw "Unity test runner did not write $testResults" }
    [xml]$testXml = Get-Content $testResults -Raw
    if ([int]$testXml.'test-run'.failed -ne 0) { throw "Unity action estate test XML reports failures." }
    $testsStatus = "pass"
}

$receipt = [ordered]@{
    format = "rodoh-unity-action-estate-local-run/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "pass"
    projectRoot = $projectRoot
    unityEditor = $unityPath
    unityVersion = $validation.unityVersion
    jobId = $JobId
    sceneJob = $sceneJobPath
    jobDigest = $validation.jobDigest
    nativeActionSpec = $nativeSpecPath
    actionProjection = $projectionPath
    actionSpecDigest = $validation.actionSpecDigest
    arcDigest = $validation.arcDigest
    presentationManifest = $presentationPath
    presentationManifestId = $validation.presentationManifestId
    deterministicReplay = $validation.deterministicReplay
    activePhysicsAuthority = $validation.activePhysicsAuthority
    maximumActiveEnemies = $validation.maximumActiveEnemies
    authoredPlayerPrefabs = $validation.authoredPlayerPrefabs
    authoredEnemyPrefabs = $validation.authoredEnemyPrefabs
    neutralFallbackBodies = $validation.neutralFallbackBodies
    arenaAuthored = $validation.arenaAuthored
    governedProduction = [bool]$GovernedProduction
    governedProductionReceipt = $governedProductionReceipt
    editModeTests = $testsStatus
    validation = $validationPath
    testResults = if ($SkipUnityTests) { $null } else { $testResults }
}
$receiptPath = Join-Path $outputRoot "local-run.json"
$receipt | ConvertTo-Json -Depth 10 | Set-Content -Encoding utf8 $receiptPath
Write-Host "RODOH Unity action estate passed."
Write-Host $receiptPath

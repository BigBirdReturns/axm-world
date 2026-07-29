[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$EmbodiedArLabRoot,

    [Parameter(Mandatory = $true)]
    [string]$JobId,

    [ValidateSet("windows", "quest", "android")]
    [string]$Target = "windows",

    [string]$OutputPath,
    [string]$UnityVersion = "6000.0.66f2",
    [string]$UnityEditor,
    [switch]$DevelopmentBuild,
    [switch]$RequirePlayerProduct,
    [switch]$SkipWindowsSmoke,
    [int]$SmokeTimeoutSeconds = 240,
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
$inputRoot = Join-Path $jobRoot "input"
$outputRoot = Join-Path $jobRoot "output"
$logRoot = Join-Path $jobRoot "logs"
$buildRoot = Join-Path $jobRoot "build"
$localRunPath = Join-Path $outputRoot "local-run-v2.json"
$playerProductPath = Join-Path $outputRoot "player-product-run.json"
$sceneJobPath = Join-Path $inputRoot "action.scene-job.json"
if (-not (Test-Path $localRunPath)) { throw "Unity action estate v2 receipt is absent: $localRunPath" }
if (-not (Test-Path $sceneJobPath)) { throw "Unity action scene job is absent: $sceneJobPath" }
$localRun = Get-Content $localRunPath -Raw | ConvertFrom-Json
if ($localRun.status -ne "pass") { throw "Unity action estate v2 has not passed." }
$scenePath = [string]$localRun.scenePath
if ([string]::IsNullOrWhiteSpace($scenePath)) { throw "Unity action estate v2 receipt lacks scenePath." }
$playerProduct = $null
if ($RequirePlayerProduct) {
    if (-not (Test-Path $playerProductPath)) { throw "Qualified Unity player-product receipt is absent: $playerProductPath" }
    $playerProduct = Get-Content $playerProductPath -Raw | ConvertFrom-Json
    if ($playerProduct.status -ne "pass" -or $playerProduct.buildEligible -ne $true) { throw "Unity player product is not build-eligible." }
    if ($playerProduct.scenePath -ne $scenePath -or $playerProduct.actionSpecDigest -ne $localRun.actionSpecDigest -or $playerProduct.arcDigest -ne $localRun.arcDigest) {
        throw "Unity player-product receipt differs from the build scene or action authority."
    }
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

New-Item -ItemType Directory -Force $buildRoot, $logRoot | Out-Null
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $safe = ($JobId -replace '[^A-Za-z0-9._-]', '-')
    if ($Target -eq "windows") { $OutputPath = Join-Path $buildRoot "windows\$safe.exe" }
    else { $OutputPath = Join-Path $buildRoot "$Target\$safe.apk" }
}
$buildOutput = Resolve-FullPath $OutputPath $projectRoot
New-Item -ItemType Directory -Force ([System.IO.Path]::GetDirectoryName($buildOutput)) | Out-Null
$receiptRoot = Join-Path $buildRoot "receipts"
$buildLog = Join-Path $logRoot "unity-action-build-$Target.log"
$arguments = @(
    "-batchmode",
    "-nographics",
    "-quit",
    "-projectPath", $projectRoot,
    "-executeMethod", "Axm.Rodoh.Action.Editor.ActionBuildBatch.Run",
    "-scenePath", $scenePath,
    "-sceneJob", $sceneJobPath,
    "-target", $Target,
    "-outputPath", $buildOutput,
    "-receiptRoot", $receiptRoot,
    "-development", $(if ($DevelopmentBuild) { "true" } else { "false" }),
    "-requirePlayerProduct", $(if ($RequirePlayerProduct) { "true" } else { "false" }),
    "-logFile", $buildLog
)
Write-Host "Building the exact RODOH action player for $Target..."
$build = Start-Process -FilePath $unityPath -ArgumentList $arguments -Wait -PassThru -NoNewWindow
if ($build.ExitCode -ne 0) { throw "Unity action build failed with exit $($build.ExitCode). See $buildLog" }
$buildReceiptPath = Join-Path $receiptRoot "build-$Target.json"
if (-not (Test-Path $buildReceiptPath)) { throw "Unity did not write the build receipt: $buildReceiptPath" }
$buildReceipt = Get-Content $buildReceiptPath -Raw | ConvertFrom-Json
if ($buildReceipt.status -ne "pass") { throw "Unity build receipt reports $($buildReceipt.status): $($buildReceipt.error)" }
if (-not (Test-Path $buildOutput)) { throw "Built action product is absent: $buildOutput" }
if ($RequirePlayerProduct) {
    if ($buildReceipt.playerProductRequired -ne $true
        -or $buildReceipt.playerProductId -ne $playerProduct.productId
        -or $buildReceipt.playerProductProfileSha256 -ne $playerProduct.productProfileSha256
        -or $buildReceipt.playerProductWorldCommit -ne $playerProduct.worldCommit
        -or $buildReceipt.playerProductArcCommit -ne $playerProduct.arcCommit) {
        throw "Built player lost exact player-product identity custody."
    }
}

$smokeStatus = "not-applicable"
$smokeReceiptPath = $null
$smokeLog = $null
if ($Target -eq "windows" -and -not $SkipWindowsSmoke) {
    $smokeStatus = "fail"
    $smokeReceiptPath = Join-Path $receiptRoot "player-smoke-windows.json"
    $smokeLog = Join-Path $logRoot "action-player-smoke-windows.log"
    $smokeArguments = @(
        "-batchmode",
        "-nographics",
        "-axmActionSmoke",
        "-axmActionSmokeReceipt", $smokeReceiptPath,
        "-axmActionSmokeTimeout", [string]$SmokeTimeoutSeconds,
        "-logFile", $smokeLog
    )
    Write-Host "Launching the built Windows player through its internal action smoke..."
    $player = Start-Process -FilePath $buildOutput -ArgumentList $smokeArguments -PassThru -NoNewWindow
    try {
        Wait-Process -Id $player.Id -Timeout ($SmokeTimeoutSeconds + 60) -ErrorAction Stop
    } catch {
        if (-not $player.HasExited) { Stop-Process -Id $player.Id -Force }
        throw "Built Windows action player exceeded the smoke timeout. See $smokeLog"
    }
    $player.Refresh()
    if ($player.ExitCode -ne 0) { throw "Built Windows action player smoke exited $($player.ExitCode). See $smokeLog" }
    if (-not (Test-Path $smokeReceiptPath)) { throw "Built player did not write the smoke receipt: $smokeReceiptPath" }
    $smoke = Get-Content $smokeReceiptPath -Raw | ConvertFrom-Json
    if ($smoke.status -ne "pass" -or $smoke.terminal -ne $true) { throw "Built player smoke did not reach a terminal action state: $($smoke.error)" }
    if ($smoke.actionSpecDigest -ne $localRun.actionSpecDigest) { throw "Built player smoke loaded a different action spec." }
    $smokeStatus = "pass"
}

$runReceipt = [ordered]@{
    format = "rodoh-unity-action-build-run/2"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "pass"
    target = $Target
    projectRoot = $projectRoot
    jobId = $JobId
    scenePath = $scenePath
    sceneJob = $sceneJobPath
    actionSpecDigest = $localRun.actionSpecDigest
    arcDigest = $localRun.arcDigest
    playerProductRequired = [bool]$RequirePlayerProduct
    playerProductId = if ($RequirePlayerProduct) { $playerProduct.productId } else { $null }
    playerProductProfileSha256 = if ($RequirePlayerProduct) { $playerProduct.productProfileSha256 } else { $null }
    product = $buildOutput
    productSha256 = $buildReceipt.productSha256
    productFiles = $buildReceipt.productFiles
    totalBytes = $buildReceipt.totalBytes
    developmentBuild = [bool]$DevelopmentBuild
    buildReceipt = $buildReceiptPath
    playerSmoke = $smokeStatus
    playerSmokeReceipt = $smokeReceiptPath
    playerSmokeLog = $smokeLog
    keyboardMouseSession = "open"
    gamepadSession = "open"
    independentComprehension = "open"
    productAcceptance = "not-issued"
}
$runReceiptPath = Join-Path $receiptRoot "build-run-$Target.json"
$runReceipt | ConvertTo-Json -Depth 12 | Set-Content -Encoding utf8 $runReceiptPath
Write-Host "RODOH action player build passed."
Write-Host $runReceiptPath

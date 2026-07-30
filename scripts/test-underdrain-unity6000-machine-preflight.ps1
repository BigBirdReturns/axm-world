[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$WorldRoot,

    [Parameter(Mandatory = $true)]
    [string]$ArcRoot,

    [string]$OutputRoot
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-FullPath([string]$Value, [string]$Base) {
    if ([System.IO.Path]::IsPathRooted($Value)) { return [System.IO.Path]::GetFullPath($Value) }
    return [System.IO.Path]::GetFullPath((Join-Path $Base $Value))
}

function Get-Sha256([string]$Value) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Value)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace("-", "").ToLowerInvariant() }
    finally { $sha.Dispose() }
}

function Write-UnityFixtureAsset([string]$ProjectRoot, [string]$AssetPath) {
    $relative = $AssetPath.Replace('/', '\')
    $full = Join-Path $ProjectRoot $relative
    New-Item -ItemType Directory -Force ([System.IO.Path]::GetDirectoryName($full)) | Out-Null
    "synthetic-preflight-fixture:$AssetPath" | Set-Content -Encoding utf8 $full
    $guid = (Get-Sha256 $AssetPath).Substring(0, 32)
    @(
        "fileFormatVersion: 2",
        "guid: $guid"
    ) | Set-Content -Encoding ascii ($full + ".meta")
    return $full
}

function Find-Check([object]$Receipt, [string]$Id) {
    $matches = @($Receipt.checks | Where-Object { $_.id -eq $Id })
    if ($matches.Count -ne 1) { throw "Expected one preflight check '$Id', found $($matches.Count)." }
    return $matches[0]
}

function Invoke-PreflightCase(
    [string]$Name,
    [string]$ProjectRoot,
    [string]$UnityEditor,
    [string]$ExpectedWorldCommit,
    [string]$TemplatePath,
    [int]$ExpectedExitCode,
    [string]$ExpectedStatus
) {
    $caseRoot = Join-Path $OutputRoot $Name
    New-Item -ItemType Directory -Force $caseRoot | Out-Null
    $preflight = Join-Path $WorldRoot "scripts\preflight-underdrain-unity6000-player-product.ps1"
    $pwsh = (Get-Process -Id $PID).Path
    $arguments = @(
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy", "Bypass",
        "-File", $preflight,
        "-WorldRoot", $WorldRoot,
        "-ExpectedWorldCommit", $ExpectedWorldCommit,
        "-ArcRoot", $ArcRoot,
        "-EmbodiedArLabRoot", $ProjectRoot,
        "-AuthoredPresentationTemplate", $TemplatePath,
        "-ProductProfile", (Join-Path $WorldRoot "unity\Fixtures\underdrain.player-product.json"),
        "-ComprehensionContract", (Join-Path $WorldRoot "unity\Fixtures\underdrain.comprehension-contract.json"),
        "-UnityEditor", $UnityEditor,
        "-OutputRoot", $caseRoot
    )
    & $pwsh @arguments
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne $ExpectedExitCode) { throw "Preflight case $Name exited $exitCode, expected $ExpectedExitCode." }
    $receiptPath = Join-Path $caseRoot "underdrain-unity6000-machine-preflight.json"
    if (-not (Test-Path $receiptPath -PathType Leaf)) { throw "Preflight case $Name did not write its receipt." }
    $receipt = Get-Content $receiptPath -Raw | ConvertFrom-Json
    if ($receipt.format -ne "rodoh-underdrain-unity6000-machine-preflight/1" -or $receipt.status -ne $ExpectedStatus) {
        throw "Preflight case $Name returned format/status $($receipt.format)/$($receipt.status), expected rodoh-underdrain-unity6000-machine-preflight/1/$ExpectedStatus."
    }
    if ($receipt.productAcceptance -ne "not-issued") { throw "Preflight case $Name crossed product-acceptance authority." }
    $shaPath = $receiptPath + ".sha256"
    if (-not (Test-Path $shaPath -PathType Leaf)) { throw "Preflight case $Name did not write its checksum sidecar." }
    $expectedSha = ((Get-Content $shaPath -Raw).Trim() -split '\s+')[0]
    $actualSha = (Get-FileHash $receiptPath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($expectedSha -ne $actualSha) { throw "Preflight case $Name checksum sidecar is stale." }
    return [ordered]@{
        name = $Name
        exitCode = $exitCode
        status = $receipt.status
        receipt = $receiptPath
        receiptSha256 = $actualSha
        value = $receipt
    }
}

$worldPath = Resolve-FullPath $WorldRoot (Get-Location).Path
$arcPath = Resolve-FullPath $ArcRoot (Get-Location).Path
$WorldRoot = $worldPath
$ArcRoot = $arcPath
if ([string]::IsNullOrWhiteSpace($OutputRoot)) { $OutputRoot = Join-Path $env:RUNNER_TEMP "underdrain-machine-preflight-execution" }
$OutputRoot = Resolve-FullPath $OutputRoot (Get-Location).Path
New-Item -ItemType Directory -Force $OutputRoot | Out-Null

$worldCommit = (& git -C $worldPath rev-parse HEAD).Trim()
$arcCommit = (& git -C $arcPath rev-parse HEAD).Trim()
if ($worldCommit -notmatch '^[0-9a-f]{40}$') { throw "World commit is unavailable." }
if ($arcCommit -ne "aaa5685903a348b3c1ba875622fbe99d90c1da35") { throw "Arc checkout is not the accepted Action Player authority: $arcCommit" }
if (& git -C $worldPath status --porcelain) { throw "World fixture checkout must begin clean." }
if (& git -C $arcPath status --porcelain) { throw "Arc fixture checkout must begin clean." }

$projectRoot = Join-Path $OutputRoot "synthetic-unity-project"
foreach ($directory in @("Assets", "Packages", "ProjectSettings")) {
    New-Item -ItemType Directory -Force (Join-Path $projectRoot $directory) | Out-Null
}
"m_EditorVersion: 6000.0.66f2" | Set-Content -Encoding ascii (Join-Path $projectRoot "ProjectSettings\ProjectVersion.txt")

$unityEditor = Join-Path $OutputRoot "Unity\Hub\Editor\6000.0.66f2\Editor\Unity.exe"
New-Item -ItemType Directory -Force ([System.IO.Path]::GetDirectoryName($unityEditor)) | Out-Null
$hostExecutable = Join-Path $env:WINDIR "System32\where.exe"
if (-not (Test-Path $hostExecutable -PathType Leaf)) { throw "Windows fixture executable is absent: $hostExecutable" }
Copy-Item $hostExecutable $unityEditor -Force

$templatePath = Join-Path $worldPath "unity\Fixtures\underdrain.authored-presentation.template.json"
$template = Get-Content $templatePath -Raw | ConvertFrom-Json
$assetPaths = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
[void]$assetPaths.Add([string]$template.player.bodyPrefab)
[void]$assetPaths.Add([string]$template.player.animatorController)
foreach ($enemy in @($template.enemies)) {
    [void]$assetPaths.Add([string]$enemy.bodyPrefab)
    [void]$assetPaths.Add([string]$enemy.animatorController)
}
[void]$assetPaths.Add([string]$template.arena.recipe)
foreach ($feedback in @($template.feedback)) {
    [void]$assetPaths.Add([string]$feedback.vfxPrefab)
    [void]$assetPaths.Add([string]$feedback.audioClip)
}
foreach ($assetPath in $assetPaths) { [void](Write-UnityFixtureAsset $projectRoot $assetPath) }

$cases = @()
$passParameters = @{
    Name = "pass-complete-fixture"
    ProjectRoot = $projectRoot
    UnityEditor = $unityEditor
    ExpectedWorldCommit = $worldCommit
    TemplatePath = $templatePath
    ExpectedExitCode = 0
    ExpectedStatus = "pass"
}
$pass = Invoke-PreflightCase @passParameters
if ($pass.value.machineReadyForNamedAssetReview -ne $true) { throw "Complete synthetic fixture was not declared ready for named asset review." }
if ($pass.value.summary.blockingFailures -ne 0 -or @($pass.value.summary.coreProductionAssetIds).Count -ne 7) { throw "Complete synthetic fixture lost its seven-asset or zero-blocker contract." }
if (@($pass.value.assets).Count -lt 20) { throw "Complete synthetic fixture did not exercise the full manifest asset inventory." }
$cases += $pass

$missingAssetPath = Join-Path $projectRoot ([string]$template.player.bodyPrefab).Replace('/', '\')
Remove-Item $missingAssetPath -Force
Remove-Item ($missingAssetPath + ".meta") -Force
$missingParameters = @{
    Name = "held-missing-core-asset"
    ProjectRoot = $projectRoot
    UnityEditor = $unityEditor
    ExpectedWorldCommit = $worldCommit
    TemplatePath = $templatePath
    ExpectedExitCode = 2
    ExpectedStatus = "held"
}
$missing = Invoke-PreflightCase @missingParameters
if ((Find-Check -Receipt $missing.value -Id "assets.files").status -eq "pass") { throw "Missing core asset did not fail the assets.files gate." }
if ($missing.value.machineReadyForNamedAssetReview -ne $false) { throw "Missing core asset incorrectly permitted named review." }
$cases += $missing
[void](Write-UnityFixtureAsset $projectRoot ([string]$template.player.bodyPrefab))

$wrongCommitParameters = @{
    Name = "held-wrong-world-commit"
    ProjectRoot = $projectRoot
    UnityEditor = $unityEditor
    ExpectedWorldCommit = ("0" * 40)
    TemplatePath = $templatePath
    ExpectedExitCode = 2
    ExpectedStatus = "held"
}
$wrongCommit = Invoke-PreflightCase @wrongCommitParameters
if ((Find-Check -Receipt $wrongCommit.value -Id "world.commit").status -eq "pass") { throw "Wrong World commit did not fail the source-custody gate." }
$cases += $wrongCommit

$forbiddenTemplatePath = Join-Path $OutputRoot "forbidden-template.json"
$forbiddenTemplate = Get-Content $templatePath -Raw | ConvertFrom-Json
$forbiddenTemplate.player.bodyPrefab = "Assets/AXM/Generated/ActionEstate/Rhea.prefab"
$forbiddenTemplate | ConvertTo-Json -Depth 30 | Set-Content -Encoding utf8 $forbiddenTemplatePath
[void](Write-UnityFixtureAsset $projectRoot ([string]$forbiddenTemplate.player.bodyPrefab))
$forbiddenParameters = @{
    Name = "held-forbidden-generated-root"
    ProjectRoot = $projectRoot
    UnityEditor = $unityEditor
    ExpectedWorldCommit = $worldCommit
    TemplatePath = $forbiddenTemplatePath
    ExpectedExitCode = 2
    ExpectedStatus = "held"
}
$forbidden = Invoke-PreflightCase @forbiddenParameters
if ((Find-Check -Receipt $forbidden.value -Id "assets.roots").status -eq "pass") { throw "Forbidden generated root did not fail the asset-root gate." }
$cases += $forbidden

if (& git -C $worldPath status --porcelain) { throw "Preflight execution fixtures dirtied the World checkout." }
if (& git -C $arcPath status --porcelain) { throw "Preflight execution fixtures dirtied the Arc checkout." }

$qualification = [ordered]@{
    format = "rodoh-underdrain-unity6000-machine-preflight-fixture-qualification/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "pass"
    worldCommit = $worldCommit
    arcCommit = $arcCommit
    unityVersion = "6000.0.66f2"
    cases = @($cases | ForEach-Object {
        [ordered]@{
            name = $_.name
            exitCode = $_.exitCode
            status = $_.status
            receipt = $_.receipt
            receiptSha256 = $_.receiptSha256
        }
    })
    passCase = "complete synthetic Unity project, exact source, full manifest inventory, and stable meta custody"
    refusalCases = @(
        "missing core production asset",
        "wrong World commit",
        "forbidden generated asset root"
    )
    unityInvoked = $false
    approvalIssued = $false
    productAcceptance = "not-issued"
    authority = "synthetic machine-preflight execution qualification only"
}
$qualificationPath = Join-Path $OutputRoot "machine-preflight-fixture-qualification.json"
$qualification | ConvertTo-Json -Depth 24 | Set-Content -Encoding utf8 $qualificationPath
$qualificationSha = (Get-FileHash $qualificationPath -Algorithm SHA256).Hash.ToLowerInvariant()
"$qualificationSha  $([System.IO.Path]::GetFileName($qualificationPath))" | Set-Content -Encoding ascii ($qualificationPath + ".sha256")
Write-Host "UNDERDRAIN machine preflight execution fixtures passed."
Write-Host $qualificationPath
exit 0

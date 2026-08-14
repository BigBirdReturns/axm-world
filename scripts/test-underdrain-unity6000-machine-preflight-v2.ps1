[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)] [string]$WorldRoot,
    [Parameter(Mandatory = $true)] [string]$ArcRoot,
    [string]$OutputRoot
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-FullPath([string]$Value, [string]$Base) {
    if ([System.IO.Path]::IsPathRooted($Value)) { return [System.IO.Path]::GetFullPath($Value) }
    return [System.IO.Path]::GetFullPath((Join-Path $Base $Value))
}

function Write-Json([string]$Path, [object]$Value) {
    $Value | ConvertTo-Json -Depth 50 | Set-Content -Encoding utf8 $Path
}

function Sha([string]$Path) {
    return (Get-FileHash $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Invoke-V2(
    [string]$Name,
    [string]$WorldPath,
    [string]$ArcPath,
    [string]$ProjectPath,
    [string]$UnityEditor,
    [string]$ExpectedWorldCommit,
    [string]$RoleContract,
    [int]$ExpectedExit,
    [string]$ExpectedStatus
) {
    $caseRoot = Join-Path $OutputRoot $Name
    New-Item -ItemType Directory -Force $caseRoot | Out-Null
    $script = Join-Path $WorldPath "scripts\preflight-underdrain-unity6000-player-product-v2.ps1"
    $hostPowerShell = (Get-Process -Id $PID).Path
    $arguments = @(
        "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
        "-File", $script,
        "-WorldRoot", $WorldPath,
        "-ExpectedWorldCommit", $ExpectedWorldCommit,
        "-ArcRoot", $ArcPath,
        "-EmbodiedArLabRoot", $ProjectPath,
        "-AuthoredPresentationTemplate", (Join-Path $WorldPath "unity\Fixtures\underdrain.authored-presentation.template.json"),
        "-ProductProfile", (Join-Path $WorldPath "unity\Fixtures\underdrain.player-product.json"),
        "-RoleSeparatedReviewContract", $RoleContract,
        "-LegacyHumanEvidenceContract", (Join-Path $WorldPath "unity\Fixtures\underdrain.comprehension-contract.json"),
        "-UnityEditor", $UnityEditor,
        "-OutputRoot", $caseRoot
    )
    $child = @(& $hostPowerShell @arguments 2>&1)
    $exit = $LASTEXITCODE
    foreach ($line in $child) { Write-Host "[$Name] $line" }
    if ($exit -ne $ExpectedExit) { throw "Preflight v2 case $Name exited $exit, expected $ExpectedExit." }
    $receiptPath = Join-Path $caseRoot "underdrain-unity6000-machine-preflight-v2.json"
    if (-not (Test-Path $receiptPath -PathType Leaf)) { throw "Preflight v2 case $Name did not write its receipt." }
    $receipt = Get-Content $receiptPath -Raw | ConvertFrom-Json
    if ($receipt.format -ne "rodoh-underdrain-unity6000-machine-preflight/2" -or $receipt.status -ne $ExpectedStatus) {
        throw "Preflight v2 case $Name returned $($receipt.format)/$($receipt.status), expected v2/$ExpectedStatus."
    }
    if ($receipt.productAcceptance -ne "not-issued" -or $receipt.physicalHumanEvidence -ne "separate" -or $receipt.questAcceptance -ne "open") {
        throw "Preflight v2 case $Name crossed product, human, or Quest authority."
    }
    $sidecar = $receiptPath + ".sha256"
    if (-not (Test-Path $sidecar -PathType Leaf)) { throw "Preflight v2 case $Name did not write its checksum sidecar." }
    $declared = ((Get-Content $sidecar -Raw).Trim() -split '\s+')[0]
    $actual = Sha $receiptPath
    if ($declared -ne $actual) { throw "Preflight v2 case $Name checksum sidecar is stale." }
    return [ordered]@{
        name = $Name
        status = $receipt.status
        exitCode = $exit
        receipt = $receiptPath
        receiptSha256 = $actual
        checks = @($receipt.checks)
    }
}

$worldPath = Resolve-FullPath $WorldRoot (Get-Location).Path
$arcPath = Resolve-FullPath $ArcRoot (Get-Location).Path
if ([string]::IsNullOrWhiteSpace($OutputRoot)) { $OutputRoot = Join-Path $env:RUNNER_TEMP "underdrain-machine-preflight-v2-execution" }
$OutputRoot = Resolve-FullPath $OutputRoot (Get-Location).Path
New-Item -ItemType Directory -Force $OutputRoot | Out-Null

$legacyFixtureRoot = Join-Path $OutputRoot "legacy-fixture"
& (Join-Path $worldPath "scripts\test-underdrain-unity6000-machine-preflight.ps1") `
    -WorldRoot $worldPath `
    -ArcRoot $arcPath `
    -OutputRoot $legacyFixtureRoot
$legacyQualificationPath = Join-Path $legacyFixtureRoot "underdrain-unity6000-machine-preflight-fixture-qualification.json"
if (-not (Test-Path $legacyQualificationPath -PathType Leaf)) {
    throw "Legacy preflight execution fixture did not write its qualification receipt."
}
$legacyQualification = Get-Content $legacyQualificationPath -Raw | ConvertFrom-Json
if ($legacyQualification.format -ne "rodoh-underdrain-unity6000-machine-preflight-fixture-qualification/1" -or $legacyQualification.status -ne "pass") {
    throw "Legacy preflight execution fixture is unsupported or failed."
}

$projectPath = Join-Path $legacyFixtureRoot "synthetic-unity-project"
$unityEditor = Join-Path $legacyFixtureRoot "Unity\Hub\Editor\6000.0.66f2\Editor\Unity.exe"
$worldCommit = (& git -C $worldPath rev-parse HEAD).Trim()
if ($worldCommit -notmatch '^[0-9a-f]{40}$') { throw "World commit is unavailable." }
$reviewContract = Join-Path $worldPath "unity\Fixtures\underdrain.role-separated-software-review.json"

$cases = @()
$pass = Invoke-V2 `
    -Name "pass-complete-role-review-floor" `
    -WorldPath $worldPath `
    -ArcPath $arcPath `
    -ProjectPath $projectPath `
    -UnityEditor $unityEditor `
    -ExpectedWorldCommit $worldCommit `
    -RoleContract $reviewContract `
    -ExpectedExit 0 `
    -ExpectedStatus "pass"
$cases += $pass

$brokenContractPath = Join-Path $OutputRoot "underdrain.role-separated-software-review.invalid.json"
$broken = Get-Content $reviewContract -Raw | ConvertFrom-Json
$broken.independence.minimumDistinctSeats = 2
Write-Json $brokenContractPath $broken
$held = Invoke-V2 `
    -Name "held-invalid-role-review-independence" `
    -WorldPath $worldPath `
    -ArcPath $arcPath `
    -ProjectPath $projectPath `
    -UnityEditor $unityEditor `
    -ExpectedWorldCommit $worldCommit `
    -RoleContract $brokenContractPath `
    -ExpectedExit 2 `
    -ExpectedStatus "held"
$independence = @($held.checks | Where-Object { $_.id -eq "review.independence" })
if ($independence.Count -ne 1 -or $independence[0].status -ne "fail") {
    throw "Invalid review independence did not fail at review.independence."
}
$cases += $held

$qualification = [ordered]@{
    format = "rodoh-underdrain-unity6000-machine-preflight-v2-fixture-qualification/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "pass"
    worldCommit = $worldCommit
    arcCommit = (& git -C $arcPath rev-parse HEAD).Trim()
    cases = $cases
    legacyFixture = $legacyQualificationPath
    productAcceptance = "not-issued"
    physicalHumanEvidence = "separate"
    questInvoked = $false
    unityInvoked = $false
}
$receiptPath = Join-Path $OutputRoot "underdrain-unity6000-machine-preflight-v2-fixture-qualification.json"
Write-Json $receiptPath $qualification
"$(Sha $receiptPath)  $([System.IO.Path]::GetFileName($receiptPath))" | Set-Content -Encoding ascii ($receiptPath + ".sha256")
Write-Host "UNDERDRAIN machine preflight v2 pass and refusal fixtures qualified."
Write-Host $receiptPath
$global:LASTEXITCODE = 0

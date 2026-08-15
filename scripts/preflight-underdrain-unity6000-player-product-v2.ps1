[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)] [string]$EmbodiedArLabRoot,
    [Parameter(Mandatory = $true)] [string]$ArcRoot,
    [string]$WorldRoot,
    [string]$ExpectedWorldCommit,
    [string]$AuthoredPresentationTemplate,
    [string]$ProductProfile,
    [string]$RoleSeparatedReviewContract,
    [string]$LegacyHumanEvidenceContract,
    [string]$OutputRoot,
    [string]$UnityVersion = "6000.0.66f2",
    [string]$UnityEditor,
    [switch]$AllowDirtyWorld,
    [switch]$AllowDirtyArc,
    [switch]$NoFail
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-FullPath([string]$Value, [string]$Base) {
    if ([string]::IsNullOrWhiteSpace($Value)) { return $null }
    if ([System.IO.Path]::IsPathRooted($Value)) { return [System.IO.Path]::GetFullPath($Value) }
    return [System.IO.Path]::GetFullPath((Join-Path $Base $Value))
}

function Read-Json([string]$Path, [string]$Label) {
    if (-not (Test-Path $Path -PathType Leaf)) { throw "$Label is absent: $Path" }
    try { return Get-Content $Path -Raw | ConvertFrom-Json }
    catch { throw "$Label is invalid JSON: $Path`n$($_.Exception.Message)" }
}

function File-Sha256([string]$Path) {
    return (Get-FileHash $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function New-Check([string]$Id, [bool]$Passed, [object]$Expected, [object]$Observed, [string]$Detail) {
    return [ordered]@{
        id = $Id
        plane = "software-review-contract"
        status = if ($Passed) { "pass" } else { "fail" }
        blocking = $true
        expected = $Expected
        observed = $Observed
        detail = $Detail
    }
}

if ([string]::IsNullOrWhiteSpace($WorldRoot)) { $WorldRoot = Join-Path $PSScriptRoot ".." }
$worldPath = Resolve-FullPath $WorldRoot (Get-Location).Path
$projectPath = Resolve-FullPath $EmbodiedArLabRoot (Get-Location).Path
$arcPath = Resolve-FullPath $ArcRoot (Get-Location).Path
if ([string]::IsNullOrWhiteSpace($AuthoredPresentationTemplate)) { $AuthoredPresentationTemplate = Join-Path $worldPath "unity\Fixtures\underdrain.authored-presentation.template.json" }
if ([string]::IsNullOrWhiteSpace($ProductProfile)) { $ProductProfile = Join-Path $worldPath "unity\Fixtures\underdrain.player-product.json" }
if ([string]::IsNullOrWhiteSpace($RoleSeparatedReviewContract)) { $RoleSeparatedReviewContract = Join-Path $worldPath "unity\Fixtures\underdrain.role-separated-software-review.json" }
if ([string]::IsNullOrWhiteSpace($LegacyHumanEvidenceContract)) { $LegacyHumanEvidenceContract = Join-Path $worldPath "unity\Fixtures\underdrain.comprehension-contract.json" }
if ([string]::IsNullOrWhiteSpace($OutputRoot)) { $OutputRoot = Join-Path $env:TEMP "axm-underdrain-unity6000-preflight-v2" }
$outputPath = Resolve-FullPath $OutputRoot (Get-Location).Path
$legacyRoot = Join-Path $outputPath "legacy-v1"
New-Item -ItemType Directory -Force $outputPath, $legacyRoot | Out-Null

$templatePath = Resolve-FullPath $AuthoredPresentationTemplate $worldPath
$profilePath = Resolve-FullPath $ProductProfile $worldPath
$reviewPath = Resolve-FullPath $RoleSeparatedReviewContract $worldPath
$legacyHumanPath = Resolve-FullPath $LegacyHumanEvidenceContract $worldPath
$legacyScript = Join-Path $worldPath "scripts\preflight-underdrain-unity6000-player-product.ps1"
if (-not (Test-Path $legacyScript -PathType Leaf)) { throw "Legacy UNDERDRAIN preflight is absent: $legacyScript" }

$hostPowerShell = (Get-Process -Id $PID).Path
$arguments = @(
    "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
    "-File", $legacyScript,
    "-WorldRoot", $worldPath,
    "-ArcRoot", $arcPath,
    "-EmbodiedArLabRoot", $projectPath,
    "-AuthoredPresentationTemplate", $templatePath,
    "-ProductProfile", $profilePath,
    "-ComprehensionContract", $legacyHumanPath,
    "-OutputRoot", $legacyRoot,
    "-UnityVersion", $UnityVersion,
    "-NoFail"
)
if (-not [string]::IsNullOrWhiteSpace($ExpectedWorldCommit)) { $arguments += @("-ExpectedWorldCommit", $ExpectedWorldCommit) }
if (-not [string]::IsNullOrWhiteSpace($UnityEditor)) { $arguments += @("-UnityEditor", $UnityEditor) }
if ($AllowDirtyWorld) { $arguments += "-AllowDirtyWorld" }
if ($AllowDirtyArc) { $arguments += "-AllowDirtyArc" }
$legacyOutput = @(& $hostPowerShell @arguments 2>&1)
$legacyExit = $LASTEXITCODE
foreach ($line in $legacyOutput) { Write-Host "[legacy-v1] $line" }
if ($legacyExit -ne 0) { throw "Legacy UNDERDRAIN preflight invocation failed with exit $legacyExit." }
$legacyReceiptPath = Join-Path $legacyRoot "underdrain-unity6000-machine-preflight.json"
$legacy = Read-Json $legacyReceiptPath "Legacy machine-preflight receipt"
if ($legacy.format -ne "rodoh-underdrain-unity6000-machine-preflight/1") { throw "Legacy machine-preflight format is unsupported." }

$checks = @($legacy.checks)
$review = $null
$profile = $null
$reviewParseError = $null
$profileParseError = $null
try { $review = Read-Json $reviewPath "Role-separated review contract" } catch { $reviewParseError = $_.Exception.Message }
try { $profile = Read-Json $profilePath "Player-product profile" } catch { $profileParseError = $_.Exception.Message }

$checks += New-Check "review.fixture" (Test-Path $reviewPath -PathType Leaf) $reviewPath $(if (Test-Path $reviewPath -PathType Leaf) { File-Sha256 $reviewPath } else { $null }) "The role-separated review contract must be present and content-addressable."
$checks += New-Check "review.identity" ($null -ne $review -and $review.format -eq "rodoh-underdrain-role-separated-review/1" -and $review.reviewReceiptFormat -eq "rodoh-underdrain-role-separated-review-receipt/1" -and $review.productId -eq "underdrain-bloom-below-unity6000-v1" -and $review.challengeId -eq "breach-crown-pump" -and $review.timingProfileId -eq "forgiving") ([ordered]@{ format = "rodoh-underdrain-role-separated-review/1"; receiptFormat = "rodoh-underdrain-role-separated-review-receipt/1"; productId = "underdrain-bloom-below-unity6000-v1"; challengeId = "breach-crown-pump"; timingProfileId = "forgiving" }) $(if ($null -eq $review) { $reviewParseError } else { [ordered]@{ format = $review.format; receiptFormat = $review.reviewReceiptFormat; productId = $review.productId; challengeId = $review.challengeId; timingProfileId = $review.timingProfileId } }) "The review contract must bind the exact UNDERDRAIN software product."
$checks += New-Check "review.independence" ($null -ne $review -and [int]$review.independence.minimumDistinctSeats -eq 3 -and [int]$review.independence.minimumDistinctLineages -eq 3 -and [int]$review.independence.minimumDistinctContexts -eq 3 -and $review.independence.artifactMutationAllowed -eq $false -and $review.independence.runtimeMayIssue -eq $false -and $review.independence.candidateAuthorMayIssue -eq $false) ([ordered]@{ minimumDistinctSeats = 3; minimumDistinctLineages = 3; minimumDistinctContexts = 3; artifactMutationAllowed = $false; runtimeMayIssue = $false; candidateAuthorMayIssue = $false }) $(if ($null -eq $review) { $reviewParseError } else { $review.independence }) "The three review functions must remain independent, source-isolated, and unable to mutate or self-issue."
$checks += New-Check "review.authority" ($null -ne $review -and $review.authority.reviewMayAcceptArcConsequence -eq $false -and $review.authority.reviewMayAcceptPlayerProduct -eq $false -and $review.softwareScope -eq "windows-player-product" -and $review.physicalInstallationScope -eq "separate") ([ordered]@{ reviewMayAcceptArcConsequence = $false; reviewMayAcceptPlayerProduct = $false; softwareScope = "windows-player-product"; physicalInstallationScope = "separate" }) $(if ($null -eq $review) { $reviewParseError } else { [ordered]@{ authority = $review.authority; softwareScope = $review.softwareScope; physicalInstallationScope = $review.physicalInstallationScope } }) "Software review cannot accept ARC consequences, accept the product, or qualify a physical installation."
$checks += New-Check "profile.review-floor" ($null -ne $profile -and $profile.humanEvidence.roleSeparatedSoftwareReviewRequired -eq $true -and [int]$profile.humanEvidence.minimumDistinctReviewSeats -eq 3 -and $profile.humanEvidence.separateAcceptanceSeatRequired -eq $true -and $profile.humanEvidence.independentComprehensionRequired -eq $false -and $profile.humanEvidence.physicalHumanEvidenceRequiredForSoftwareAcceptance -eq $false) ([ordered]@{ roleSeparatedSoftwareReviewRequired = $true; minimumDistinctReviewSeats = 3; separateAcceptanceSeatRequired = $true; independentComprehensionRequired = $false; physicalHumanEvidenceRequiredForSoftwareAcceptance = $false }) $(if ($null -eq $profile) { $profileParseError } else { $profile.humanEvidence }) "The product profile must route bounded software acceptance through role-separated review while retaining physical human evidence separately."

$blockingFailures = @($checks | Where-Object { $_.blocking -eq $true -and $_.status -ne "pass" })
$status = if ($legacy.status -eq "pass" -and $blockingFailures.Count -eq 0) { "pass" } else { "held" }
$receipt = [ordered]@{
    format = "rodoh-underdrain-unity6000-machine-preflight/2"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = $status
    machineReadyForNamedAssetReview = ($status -eq "pass")
    legacyReceipt = $legacyReceiptPath
    legacyReceiptSha256 = File-Sha256 $legacyReceiptPath
    identities = $legacy.identities
    roots = $legacy.roots
    unity = $legacy.unity
    fixtures = [ordered]@{
        presentationManifest = $templatePath
        playerProductProfile = $profilePath
        roleSeparatedReviewContract = $reviewPath
        legacyHumanEvidenceContract = $legacyHumanPath
    }
    checks = $checks
    assets = $legacy.assets
    summary = [ordered]@{
        totalChecks = $checks.Count
        blockingFailures = $blockingFailures.Count
        legacyStatus = $legacy.status
        declaredAssetBindings = $legacy.summary.declaredAssetBindings
        coreProductionAssetIds = $legacy.summary.coreProductionAssetIds
    }
    openEvidence = @(
        "named production-asset review and approval",
        "Unity 6000 package import",
        "serialized player-scene qualification",
        "Windows player build",
        "keyboard and mouse session",
        "gamepad and persisted-rebind session",
        "three-seat role-separated software review",
        "fourth-seat Windows software-product acceptance",
        "human physical evidence",
        "Quest and physical Quest acceptance"
    )
    productAcceptance = "not-issued"
    physicalHumanEvidence = "separate"
    questAcceptance = "open"
    authority = "read-only machine, filesystem, and product-contract preflight; no asset, action, review, human, physical, Quest, or product acceptance authority"
}
$receiptPath = Join-Path $outputPath "underdrain-unity6000-machine-preflight-v2.json"
$receipt | ConvertTo-Json -Depth 50 | Set-Content -Encoding utf8 $receiptPath
$hash = File-Sha256 $receiptPath
"$hash  $([System.IO.Path]::GetFileName($receiptPath))" | Set-Content -Encoding ascii ($receiptPath + ".sha256")
@(
    "UNDERDRAIN Unity 6000 machine preflight v2",
    "status: $status",
    "legacy v1 status: $($legacy.status)",
    "blocking failures: $($blockingFailures.Count)",
    "receipt: $receiptPath"
) | Set-Content -Encoding utf8 (Join-Path $outputPath "underdrain-unity6000-machine-preflight-v2.txt")
Write-Host "UNDERDRAIN Unity 6000 machine preflight v2 status: $status"
Write-Host $receiptPath
if ($status -ne "pass" -and -not $NoFail) { exit 2 }

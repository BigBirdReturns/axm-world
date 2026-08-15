[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$EmbodiedArLabRoot,

    [Parameter(Mandatory = $true)]
    [string]$ArcRoot,

    [string]$WorldRoot,
    [string]$ExpectedWorldCommit,
    [string]$AuthoredPresentationTemplate,
    [string]$ProductProfile,
    [string]$ComprehensionContract,
    [string]$OutputRoot,
    [string]$UnityVersion = "6000.0.66f2",
    [string]$UnityEditor,
    [switch]$AllowDirtyWorld,
    [switch]$AllowDirtyArc,
    [switch]$NoFail
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ExpectedArcCommit = "aaa5685903a348b3c1ba875622fbe99d90c1da35"
$ExpectedFloorCommit = "9693cb99694338e72c15d0ffbb87b5a1c5bbf16a"
$ExpectedFloorCatalog = "actionfloor1_55eb8869417b3b36a28a309263624fe04ad07028f2254337a2f1548cd03b47d8"
$ExpectedPlayerIntent = "playerintent1_91647652ca3f387b114d5fa7cfab416e2d99c5f307098b6426a17f624cdfbe6c"
$ExpectedProductId = "underdrain-bloom-below-unity6000-v1"
$ExpectedChallengeId = "breach-crown-pump"
$ExpectedTimingProfile = "forgiving"
$ExpectedPresentationAdapter = "production.prefab/v1"
$AllowedAssetRoot = "Assets/AXM/Underdrain/Production"

function Resolve-FullPath([string]$Value, [string]$Base) {
    if ([string]::IsNullOrWhiteSpace($Value)) { return $null }
    if ([System.IO.Path]::IsPathRooted($Value)) { return [System.IO.Path]::GetFullPath($Value) }
    return [System.IO.Path]::GetFullPath((Join-Path $Base $Value))
}

function Normalize-AssetPath([string]$Value) {
    return ([string]$Value).Replace('\', '/').Trim()
}

function Project-Path([string]$ProjectRoot, [string]$AssetPath) {
    $normalized = Normalize-AssetPath $AssetPath
    return [System.IO.Path]::GetFullPath((Join-Path $ProjectRoot ($normalized -replace '/', '\')))
}

function Get-FileSha256([string]$Path) {
    if (-not (Test-Path $Path -PathType Leaf)) { return $null }
    return (Get-FileHash $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Read-MetaGuid([string]$MetaPath) {
    if (-not (Test-Path $MetaPath -PathType Leaf)) { return $null }
    $match = Select-String -Path $MetaPath -Pattern '^guid:\s*([0-9a-f]{32})\s*$' | Select-Object -First 1
    if ($null -eq $match) { return $null }
    return $match.Matches[0].Groups[1].Value
}

function Git-Value([string]$Root, [string[]]$Arguments) {
    $value = & git -C $Root @Arguments 2>$null
    if ($LASTEXITCODE -ne 0) { return $null }
    return ($value | Out-String).Trim()
}

function New-Check(
    [string]$Id,
    [string]$Plane,
    [string]$Status,
    [bool]$Blocking,
    [object]$Expected,
    [object]$Observed,
    [string]$Detail
) {
    return [ordered]@{
        id = $Id
        plane = $Plane
        status = $Status
        blocking = $Blocking
        expected = $Expected
        observed = $Observed
        detail = $Detail
    }
}

function Add-Check(
    [ref]$Collection,
    [string]$Id,
    [string]$Plane,
    [bool]$Passed,
    [bool]$Blocking,
    [object]$Expected,
    [object]$Observed,
    [string]$Detail,
    [string]$FailureStatus = "fail"
) {
    $status = if ($Passed) { "pass" } else { $FailureStatus }
    $Collection.Value += New-Check $Id $Plane $status $Blocking $Expected $Observed $Detail
}

function Add-AssetRecord(
    [ref]$Collection,
    [string]$ProjectRoot,
    [string[]]$ForbiddenRoots,
    [string]$Role,
    [string]$Kind,
    [string]$AssetPath,
    [string]$ExpectedExtension,
    [string]$ExpectedAssetId,
    [bool]$CoreProductAsset
) {
    $normalized = Normalize-AssetPath $AssetPath
    $underAllowedRoot = $normalized -eq $AllowedAssetRoot -or $normalized.StartsWith($AllowedAssetRoot + "/", [System.StringComparison]::Ordinal)
    $forbidden = $false
    foreach ($root in @($ForbiddenRoots)) {
        $candidate = Normalize-AssetPath $root
        if ($normalized -eq $candidate -or $normalized.StartsWith($candidate.TrimEnd('/') + "/", [System.StringComparison]::Ordinal)) {
            $forbidden = $true
            break
        }
    }
    $fullPath = if ($normalized.StartsWith("Assets/", [System.StringComparison]::Ordinal)) { Project-Path $ProjectRoot $normalized } else { $null }
    $exists = $null -ne $fullPath -and (Test-Path $fullPath -PathType Leaf)
    $metaPath = if ($null -eq $fullPath) { $null } else { $fullPath + ".meta" }
    $metaExists = $null -ne $metaPath -and (Test-Path $metaPath -PathType Leaf)
    $extensionMatches = [string]::IsNullOrWhiteSpace($ExpectedExtension) -or [System.IO.Path]::GetExtension($normalized).Equals($ExpectedExtension, [System.StringComparison]::OrdinalIgnoreCase)
    $Collection.Value += [ordered]@{
        role = $Role
        kind = $Kind
        expectedAssetId = if ([string]::IsNullOrWhiteSpace($ExpectedAssetId)) { $null } else { $ExpectedAssetId }
        coreProductAsset = $CoreProductAsset
        assetPath = $normalized
        fullPath = $fullPath
        allowedRoot = $underAllowedRoot
        forbiddenRoot = $forbidden
        expectedExtension = $ExpectedExtension
        extensionMatches = $extensionMatches
        exists = $exists
        metaExists = $metaExists
        metaGuid = if ($metaExists) { Read-MetaGuid $metaPath } else { $null }
        sha256 = if ($exists) { Get-FileSha256 $fullPath } else { $null }
        importedSourceCustody = "requires-Unity-intake-and-read-only-audit"
        namedApproval = "open"
    }
}

if ([string]::IsNullOrWhiteSpace($WorldRoot)) { $WorldRoot = Join-Path $PSScriptRoot ".." }
$worldPath = Resolve-FullPath $WorldRoot (Get-Location).Path
$projectPath = Resolve-FullPath $EmbodiedArLabRoot (Get-Location).Path
$arcPath = Resolve-FullPath $ArcRoot (Get-Location).Path
if ([string]::IsNullOrWhiteSpace($AuthoredPresentationTemplate)) { $AuthoredPresentationTemplate = Join-Path $worldPath "unity\Fixtures\underdrain.authored-presentation.template.json" }
if ([string]::IsNullOrWhiteSpace($ProductProfile)) { $ProductProfile = Join-Path $worldPath "unity\Fixtures\underdrain.player-product.json" }
if ([string]::IsNullOrWhiteSpace($ComprehensionContract)) { $ComprehensionContract = Join-Path $worldPath "unity\Fixtures\underdrain.comprehension-contract.json" }
$templatePath = Resolve-FullPath $AuthoredPresentationTemplate $worldPath
$profilePath = Resolve-FullPath $ProductProfile $worldPath
$contractPath = Resolve-FullPath $ComprehensionContract $worldPath
if ([string]::IsNullOrWhiteSpace($OutputRoot)) { $OutputRoot = Join-Path $env:TEMP "axm-underdrain-unity6000-preflight" }
$outputPath = Resolve-FullPath $OutputRoot (Get-Location).Path
New-Item -ItemType Directory -Force $outputPath | Out-Null

if ([string]::IsNullOrWhiteSpace($UnityEditor)) { $UnityEditor = "C:\Program Files\Unity\Hub\Editor\$UnityVersion\Editor\Unity.exe" }
$unityPath = Resolve-FullPath $UnityEditor (Get-Location).Path

$checks = @()
$assets = @()
$warnings = @()

$worldGit = Test-Path (Join-Path $worldPath ".git")
Add-Check ([ref]$checks) "world.git" "source-custody" $worldGit $true "Git checkout" $worldPath "World must be an exact Git checkout."
$worldCommit = if ($worldGit) { Git-Value $worldPath @("rev-parse", "HEAD") } else { $null }
$resolvedExpectedWorld = if ([string]::IsNullOrWhiteSpace($ExpectedWorldCommit)) { $worldCommit } else { $ExpectedWorldCommit }
$worldCommitValid = $null -ne $worldCommit -and $worldCommit -match '^[0-9a-f]{40}$' -and $worldCommit -eq $resolvedExpectedWorld
Add-Check ([ref]$checks) "world.commit" "source-custody" $worldCommitValid $true $resolvedExpectedWorld $worldCommit "World must match the exact operator-lock commit."
$worldDirty = if ($worldGit) { Git-Value $worldPath @("status", "--porcelain") } else { $null }
$worldClean = $worldGit -and ([string]::IsNullOrWhiteSpace($worldDirty) -or $AllowDirtyWorld)
Add-Check ([ref]$checks) "world.clean" "source-custody" $worldClean $true "clean checkout" $(if ([string]::IsNullOrWhiteSpace($worldDirty)) { "clean" } else { $worldDirty }) "Dirty World source is refused unless -AllowDirtyWorld is explicitly supplied."

$arcGit = Test-Path (Join-Path $arcPath ".git")
Add-Check ([ref]$checks) "arc.git" "source-custody" $arcGit $true "Git checkout" $arcPath "Arc must be an exact Git checkout."
$arcCommit = if ($arcGit) { Git-Value $arcPath @("rev-parse", "HEAD") } else { $null }
Add-Check ([ref]$checks) "arc.commit" "source-custody" ($arcCommit -eq $ExpectedArcCommit) $true $ExpectedArcCommit $arcCommit "The product train is pinned to the accepted Arc Action Player authority."
$arcDirty = if ($arcGit) { Git-Value $arcPath @("status", "--porcelain") } else { $null }
$arcClean = $arcGit -and ([string]::IsNullOrWhiteSpace($arcDirty) -or $AllowDirtyArc)
Add-Check ([ref]$checks) "arc.clean" "source-custody" $arcClean $true "clean checkout" $(if ([string]::IsNullOrWhiteSpace($arcDirty)) { "clean" } else { $arcDirty }) "Dirty Arc source is refused unless -AllowDirtyArc is explicitly supplied."

foreach ($directory in @("Assets", "Packages", "ProjectSettings")) {
    $present = Test-Path (Join-Path $projectPath $directory) -PathType Container
    Add-Check ([ref]$checks) ("project." + $directory.ToLowerInvariant()) "unity-project" $present $true $directory $(Join-Path $projectPath $directory) "Embodied-AR-Lab must contain an ordinary Unity project layout."
}

$projectVersionPath = Join-Path $projectPath "ProjectSettings\ProjectVersion.txt"
$projectVersionText = if (Test-Path $projectVersionPath -PathType Leaf) { Get-Content $projectVersionPath -Raw } else { $null }
$projectVersionMatch = if ($null -eq $projectVersionText) { $null } else { [regex]::Match($projectVersionText, '(?m)^m_EditorVersion:\s*(\S+)\s*$') }
$observedProjectVersion = if ($null -ne $projectVersionMatch -and $projectVersionMatch.Success) { $projectVersionMatch.Groups[1].Value } else { $null }
Add-Check ([ref]$checks) "unity.project-version" "unity-project" ($observedProjectVersion -eq $UnityVersion) $true $UnityVersion $observedProjectVersion "The project must use the exact qualified Unity editor version."

$unityExists = Test-Path $unityPath -PathType Leaf
Add-Check ([ref]$checks) "unity.editor" "unity-toolchain" $unityExists $true $unityPath $(if ($unityExists) { $unityPath } else { $null }) "Unity Editor must exist at the selected path."
$unityProductVersion = if ($unityExists) { (Get-Item $unityPath).VersionInfo.ProductVersion } else { $null }
$unityProcesses = @(Get-Process Unity -ErrorAction SilentlyContinue)
if ($unityProcesses.Count -gt 0) { $warnings += "Unity Editor is currently running; close it before the approval or product train unless using the explicit force-close option." }
$driveRoot = [System.IO.Path]::GetPathRoot($projectPath)
$drive = if ([string]::IsNullOrWhiteSpace($driveRoot)) { $null } else { Get-PSDrive -Name $driveRoot.Substring(0, 1) -ErrorAction SilentlyContinue }
$freeBytes = if ($null -eq $drive) { $null } else { [int64]$drive.Free }
if ($null -ne $freeBytes -and $freeBytes -lt 10737418240) { $warnings += "The Unity project drive has less than 10 GiB free; import and Windows build evidence may fail for storage rather than product reasons." }

$sourcePackagePath = Join-Path $worldPath "unity\Packages\com.axm.rodoh-action\package.json"
$embeddedPackagePath = Join-Path $projectPath "Packages\com.axm.rodoh-action\package.json"
Add-Check ([ref]$checks) "package.source" "unity-package" (Test-Path $sourcePackagePath -PathType Leaf) $true $sourcePackagePath $(if (Test-Path $sourcePackagePath -PathType Leaf) { Get-FileSha256 $sourcePackagePath } else { $null }) "World must contain the exact action package source."
$embeddedPresent = Test-Path $embeddedPackagePath -PathType Leaf
Add-Check ([ref]$checks) "package.embedded" "unity-package" $embeddedPresent $false "installed before Unity import" $(if ($embeddedPresent) { Get-FileSha256 $embeddedPackagePath } else { "absent; product runners will copy it" }) "The product scripts install the package, but a pre-existing package is recorded for diagnosis." "warning"

foreach ($fixture in @(
    @($templatePath, "presentation manifest"),
    @($profilePath, "player-product profile"),
    @($contractPath, "comprehension contract")
)) {
    Add-Check ([ref]$checks) ("fixture." + (($fixture[1] -replace '[^a-zA-Z0-9]+', '-').ToLowerInvariant())) "product-contract" (Test-Path $fixture[0] -PathType Leaf) $true $fixture[1] $fixture[0] "Required player-product fixture must exist."
}

$template = $null
$profile = $null
$contract = $null
try { if (Test-Path $templatePath -PathType Leaf) { $template = Get-Content $templatePath -Raw | ConvertFrom-Json } } catch { $warnings += "Presentation manifest failed JSON parsing: $($_.Exception.Message)" }
try { if (Test-Path $profilePath -PathType Leaf) { $profile = Get-Content $profilePath -Raw | ConvertFrom-Json } } catch { $warnings += "Player-product profile failed JSON parsing: $($_.Exception.Message)" }
try { if (Test-Path $contractPath -PathType Leaf) { $contract = Get-Content $contractPath -Raw | ConvertFrom-Json } } catch { $warnings += "Comprehension contract failed JSON parsing: $($_.Exception.Message)" }

Add-Check ([ref]$checks) "manifest.identity" "product-contract" ($null -ne $template -and $template.format -eq "rodoh-action-presentation-manifest/1" -and $template.themeId -eq "underdrain-bloom-below") $true "UNDERDRAIN presentation manifest" $(if ($null -eq $template) { $null } else { [ordered]@{ format = $template.format; themeId = $template.themeId; manifestId = $template.manifestId } }) "The manifest must identify the UNDERDRAIN authored representation."
Add-Check ([ref]$checks) "profile.identity" "product-contract" ($null -ne $profile -and $profile.format -eq "rodoh-action-player-product-profile/1" -and $profile.productId -eq $ExpectedProductId -and $profile.challengeId -eq $ExpectedChallengeId -and $profile.timingProfileId -eq $ExpectedTimingProfile -and $profile.presentationAdapterId -eq $ExpectedPresentationAdapter) $true ([ordered]@{ productId = $ExpectedProductId; challengeId = $ExpectedChallengeId; timingProfileId = $ExpectedTimingProfile; presentationAdapterId = $ExpectedPresentationAdapter }) $(if ($null -eq $profile) { $null } else { [ordered]@{ format = $profile.format; productId = $profile.productId; challengeId = $profile.challengeId; timingProfileId = $profile.timingProfileId; presentationAdapterId = $profile.presentationAdapterId } }) "The player profile must bind the exact action and presentation product."
Add-Check ([ref]$checks) "profile.refusal" "product-contract" ($null -ne $profile -and $profile.allowDiagnosticPresentation -eq $false -and $profile.allowPrimitiveFallback -eq $false) $true "diagnostic and primitive fallback disabled" $(if ($null -eq $profile) { $null } else { [ordered]@{ allowDiagnosticPresentation = $profile.allowDiagnosticPresentation; allowPrimitiveFallback = $profile.allowPrimitiveFallback } }) "The player path must refuse diagnostic and primitive fallback representations."
Add-Check ([ref]$checks) "profile.inventory" "product-contract" ($null -ne $profile -and @($profile.enemies).Count -eq 5 -and @($profile.requiredCueIds).Count -eq 17) $true ([ordered]@{ enemyKits = 5; requiredCues = 17 }) $(if ($null -eq $profile) { $null } else { [ordered]@{ enemyKits = @($profile.enemies).Count; requiredCues = @($profile.requiredCueIds).Count } }) "The product profile must retain all enemy kits and Arc semantic cues."
Add-Check ([ref]$checks) "comprehension.identity" "human-evidence-contract" ($null -ne $contract -and $contract.format -eq "rodoh-underdrain-comprehension-contract/1" -and $contract.productId -eq $ExpectedProductId -and $contract.challengeId -eq $ExpectedChallengeId -and $contract.timingProfileId -eq $ExpectedTimingProfile -and $contract.nextPlayableAction.expectedId -eq "root-gate-parley") $true "exact UNDERDRAIN independent-comprehension contract" $(if ($null -eq $contract) { $null } else { [ordered]@{ format = $contract.format; productId = $contract.productId; challengeId = $contract.challengeId; timingProfileId = $contract.timingProfileId; nextPlayableActionId = $contract.nextPlayableAction.expectedId } }) "Human evidence must remain bound to the exact product and Root Gate continuation."

if ($null -ne $template -and $null -ne $profile) {
    $forbiddenRoots = @($profile.forbiddenAssetRoots | ForEach-Object { [string]$_ })
    Add-AssetRecord ([ref]$assets) $projectPath $forbiddenRoots "player:rhea-venn" "player-prefab" ([string]$template.player.bodyPrefab) ".prefab" ([string]$profile.player.assetId) $true
    Add-AssetRecord ([ref]$assets) $projectPath $forbiddenRoots "player-animation" "animator-controller" ([string]$template.player.animatorController) ".controller" $null $false

    $profileEnemies = @{}
    foreach ($enemy in @($profile.enemies)) { $profileEnemies[[string]$enemy.kit] = $enemy }
    foreach ($enemy in @($template.enemies)) {
        $required = $profileEnemies[[string]$enemy.kit]
        Add-AssetRecord ([ref]$assets) $projectPath $forbiddenRoots ("enemy:" + [string]$enemy.kit) "enemy-prefab" ([string]$enemy.bodyPrefab) ".prefab" $(if ($null -eq $required) { $null } else { [string]$required.assetId }) $true
        Add-AssetRecord ([ref]$assets) $projectPath $forbiddenRoots ("enemy-animation:" + [string]$enemy.kit) "animator-controller" ([string]$enemy.animatorController) ".controller" $null $false
    }
    Add-AssetRecord ([ref]$assets) $projectPath $forbiddenRoots "arena:pump-seven" "arena-prefab" ([string]$template.arena.recipe) ".prefab" ([string]$profile.arena.assetId) $true
    foreach ($feedback in @($template.feedback)) {
        Add-AssetRecord ([ref]$assets) $projectPath $forbiddenRoots ("feedback-vfx:" + [string]$feedback.event) "feedback-prefab" ([string]$feedback.vfxPrefab) ".prefab" $null $false
        Add-AssetRecord ([ref]$assets) $projectPath $forbiddenRoots ("feedback-audio:" + [string]$feedback.event) "audio-clip" ([string]$feedback.audioClip) ".wav" $null $false
    }
}

$missingAssets = @($assets | Where-Object { $_.exists -ne $true })
$missingMeta = @($assets | Where-Object { $_.exists -eq $true -and $_.metaExists -ne $true })
$badRoots = @($assets | Where-Object { $_.allowedRoot -ne $true -or $_.forbiddenRoot -eq $true })
$badExtensions = @($assets | Where-Object { $_.extensionMatches -ne $true })
$coreAssets = @($assets | Where-Object { $_.coreProductAsset -eq $true })
$coreIds = @($coreAssets | Where-Object { [string]::IsNullOrWhiteSpace([string]$_.expectedAssetId) -eq $false } | ForEach-Object { [string]$_.expectedAssetId } | Sort-Object -Unique)
Add-Check ([ref]$checks) "assets.core-count" "asset-custody" ($coreIds.Count -eq 7) $true 7 $coreIds.Count "The approval and product path require seven distinct core production asset identities."
Add-Check ([ref]$checks) "assets.files" "asset-custody" ($assets.Count -gt 0 -and $missingAssets.Count -eq 0) $true "all manifest asset files present" @($missingAssets | ForEach-Object { $_.assetPath }) "Every prefab, controller, feedback prefab, and audio clip declared by the authored manifest must exist before Unity import."
Add-Check ([ref]$checks) "assets.meta" "asset-custody" ($assets.Count -gt 0 -and $missingMeta.Count -eq 0) $true "Unity .meta file for every asset" @($missingMeta | ForEach-Object { $_.assetPath }) "Meta files are required for stable Unity GUID custody."
Add-Check ([ref]$checks) "assets.roots" "asset-custody" ($assets.Count -gt 0 -and $badRoots.Count -eq 0) $true $AllowedAssetRoot @($badRoots | ForEach-Object { $_.assetPath }) "Player assets must remain under the authored production root and outside forbidden generated roots."
Add-Check ([ref]$checks) "assets.extensions" "asset-custody" ($assets.Count -gt 0 -and $badExtensions.Count -eq 0) $true "role-appropriate extensions" @($badExtensions | ForEach-Object { [ordered]@{ role = $_.role; path = $_.assetPath; expected = $_.expectedExtension } }) "The manifest must bind the intended Unity asset class for each role."

$blockingFailures = @($checks | Where-Object { $_.blocking -eq $true -and $_.status -ne "pass" })
$warningChecks = @($checks | Where-Object { $_.blocking -ne $true -and $_.status -ne "pass" })
$status = if ($blockingFailures.Count -eq 0) { "pass" } else { "held" }
$machineReadyForNamedAssetReview = $status -eq "pass"

$receipt = [ordered]@{
    format = "rodoh-underdrain-unity6000-machine-preflight/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = $status
    machineReadyForNamedAssetReview = $machineReadyForNamedAssetReview
    identities = [ordered]@{
        worldCommit = $worldCommit
        expectedWorldCommit = $resolvedExpectedWorld
        arcCommit = $arcCommit
        expectedArcCommit = $ExpectedArcCommit
        floorCommit = $ExpectedFloorCommit
        floorCatalogId = $ExpectedFloorCatalog
        playerIntentId = $ExpectedPlayerIntent
        productId = $ExpectedProductId
        challengeId = $ExpectedChallengeId
        timingProfileId = $ExpectedTimingProfile
        presentationAdapterId = $ExpectedPresentationAdapter
    }
    roots = [ordered]@{
        world = $worldPath
        arc = $arcPath
        embodiedArLab = $projectPath
        unityEditor = $unityPath
        output = $outputPath
    }
    unity = [ordered]@{
        requiredVersion = $UnityVersion
        projectVersion = $observedProjectVersion
        editorProductVersion = $unityProductVersion
        editorRunning = ($unityProcesses.Count -gt 0)
        projectVersionFile = $projectVersionPath
        freeBytesOnProjectDrive = $freeBytes
    }
    fixtures = [ordered]@{
        presentationManifest = $templatePath
        playerProductProfile = $profilePath
        comprehensionContract = $contractPath
    }
    checks = $checks
    assets = $assets
    summary = [ordered]@{
        totalChecks = $checks.Count
        blockingFailures = $blockingFailures.Count
        warningChecks = $warningChecks.Count
        declaredAssetBindings = $assets.Count
        coreProductionAssetIds = $coreIds
        missingAssetFiles = @($missingAssets | ForEach-Object { $_.assetPath })
        missingMetaFiles = @($missingMeta | ForEach-Object { $_.assetPath })
        invalidAssetRoots = @($badRoots | ForEach-Object { $_.assetPath })
    }
    warnings = $warnings
    nextGate = if ($machineReadyForNamedAssetReview) { "open the exact Unity project and perform the named seven-asset representation review" } else { "repair the listed blocking preflight failures before Unity import or approval" }
    openEvidence = @(
        "named production-asset review and approval",
        "Unity 6000 package import",
        "serialized player-scene qualification",
        "Windows player build",
        "keyboard and mouse session",
        "gamepad and persisted-rebind session",
        "independent player comprehension",
        "named Windows player-product acceptance",
        "Quest and physical Quest acceptance"
    )
    productAcceptance = "not-issued"
    authority = "read-only machine and filesystem preflight; no asset, action, human, or product acceptance authority"
}

$receiptPath = Join-Path $outputPath "underdrain-unity6000-machine-preflight.json"
$receipt | ConvertTo-Json -Depth 40 | Set-Content -Encoding utf8 $receiptPath
$receiptSha = Get-FileSha256 $receiptPath
"$receiptSha  $([System.IO.Path]::GetFileName($receiptPath))" | Set-Content -Encoding ascii ($receiptPath + ".sha256")

$summaryPath = Join-Path $outputPath "underdrain-unity6000-machine-preflight.txt"
@(
    "UNDERDRAIN Unity 6000 machine preflight",
    "status: $status",
    "World: $worldCommit",
    "Arc: $arcCommit",
    "Unity project version: $observedProjectVersion",
    "declared asset bindings: $($assets.Count)",
    "core production asset ids: $($coreIds.Count)",
    "blocking failures: $($blockingFailures.Count)",
    "warnings: $($warnings.Count + $warningChecks.Count)",
    "next gate: $($receipt.nextGate)",
    "receipt: $receiptPath"
) | Set-Content -Encoding utf8 $summaryPath

Write-Host "UNDERDRAIN Unity 6000 machine preflight status: $status"
Write-Host $receiptPath
if ($status -ne "pass" -and -not $NoFail) { exit 2 }

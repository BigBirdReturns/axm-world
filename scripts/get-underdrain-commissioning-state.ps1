[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)] [string]$WorldRoot,
    [Parameter(Mandatory = $true)] [string]$ArcRoot,
    [Parameter(Mandatory = $true)] [string]$EmbodiedArLabRoot,
    [string]$JobId = "underdrain-unity6000-player-v1",
    [string]$ExpectedWorldCommit,
    [string]$ExpectedArcCommit = "aaa5685903a348b3c1ba875622fbe99d90c1da35",
    [string]$PreflightRoot,
    [string]$ReviewRoot,
    [string]$OutputRoot,
    [switch]$NoFail
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ExpectedProductId = "underdrain-bloom-below-unity6000-v1"
$ExpectedChallengeId = "breach-crown-pump"
$ExpectedTimingProfile = "forgiving"
$ExpectedUnityVersion = "6000.0.66f2"
$ExpectedPresentationAdapter = "production.prefab/v1"

function Resolve-FullPath([string]$Value, [string]$Base) {
    if ([string]::IsNullOrWhiteSpace($Value)) { return $null }
    if ([System.IO.Path]::IsPathRooted($Value)) {
        return [System.IO.Path]::GetFullPath($Value)
    }
    return [System.IO.Path]::GetFullPath((Join-Path $Base $Value))
}

function Resolve-ReceiptReference([string]$Value, [string]$ReceiptPath) {
    if ([string]::IsNullOrWhiteSpace($Value)) { return $null }
    return Resolve-FullPath $Value ([System.IO.Path]::GetDirectoryName($ReceiptPath))
}

function Write-Json([string]$Path, [object]$Value) {
    $directory = [System.IO.Path]::GetDirectoryName($Path)
    if (-not [string]::IsNullOrWhiteSpace($directory)) {
        New-Item -ItemType Directory -Force $directory | Out-Null
    }
    $Value | ConvertTo-Json -Depth 60 | Set-Content -Encoding utf8 $Path
}

function Get-Sha256([string]$Path) {
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Require-Equal([object]$Actual, [object]$Expected, [string]$Label) {
    if ($Actual -ne $Expected) {
        throw "$Label differs. Expected '$Expected', observed '$Actual'."
    }
}

function Require-True([object]$Actual, [string]$Label) {
    if ($Actual -ne $true) { throw "$Label must be true." }
}

function Require-Hex([string]$Value, [int]$Length, [string]$Label) {
    if ([string]::IsNullOrWhiteSpace($Value) -or $Value -notmatch "^[0-9a-f]{$Length}$") {
        throw "$Label is not $Length lowercase hexadecimal characters: $Value"
    }
}

function Require-NonEmpty([object]$Value, [string]$Label) {
    if ([string]::IsNullOrWhiteSpace([string]$Value)) { throw "$Label is absent." }
}

function New-Gate(
    [string]$Id,
    [string]$Label,
    [string]$Receipt,
    [string]$ExpectedFormat
) {
    return [ordered]@{
        id = $Id
        label = $Label
        status = "open"
        receipt = $Receipt
        receiptPresent = $false
        receiptSha256 = $null
        expectedFormat = $ExpectedFormat
        observedFormat = $null
        observedStatus = $null
        message = "Required receipt is absent."
    }
}

function Test-ReceiptGate(
    [System.Collections.IDictionary]$Gate,
    [string]$ExpectedFormat,
    [string[]]$AcceptedStatuses,
    [scriptblock]$Validator
) {
    if (-not (Test-Path -LiteralPath $Gate.receipt -PathType Leaf)) { return $null }

    $Gate.receiptPresent = $true
    $Gate.receiptSha256 = Get-Sha256 $Gate.receipt
    $value = $null
    try {
        $value = Get-Content -LiteralPath $Gate.receipt -Raw | ConvertFrom-Json
        $Gate.observedFormat = [string]$value.format
        $Gate.observedStatus = [string]$value.status
        Require-Equal $value.format $ExpectedFormat "$($Gate.label) format"
        if ([string]$value.status -notin $AcceptedStatuses) {
            throw "$($Gate.label) status '$($value.status)' is not accepted."
        }
        & $Validator $value
        $Gate.status = "pass"
        $Gate.message = "Exact receipt passed."
    } catch {
        $Gate.status = "held"
        $Gate.message = $_.Exception.Message
    }
    return $value
}

function Get-GitHead([string]$Root, [string]$Label) {
    if (-not (Test-Path -LiteralPath (Join-Path $Root ".git") -PathType Container)) {
        throw "$Label is not a Git checkout: $Root"
    }
    $output = @(& git -C $Root rev-parse HEAD 2>$null)
    if ($LASTEXITCODE -ne 0 -or $output.Count -ne 1) {
        throw "$Label commit could not be resolved."
    }
    $head = ([string]$output[0]).Trim().ToLowerInvariant()
    Require-Hex $head 40 "$Label commit"
    return $head
}

function Require-CleanGit([string]$Root, [string]$Label) {
    $dirty = @(& git -C $Root status --porcelain)
    if ($LASTEXITCODE -ne 0) { throw "$Label Git status failed." }
    if ($dirty.Count -gt 0) { throw "$Label checkout is dirty." }
}

function Require-UnderRoot([string]$Path, [string]$Root, [string]$Label) {
    $full = [System.IO.Path]::GetFullPath($Path)
    $rootFull = [System.IO.Path]::GetFullPath($Root).TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
    $comparison = if ([System.IO.Path]::DirectorySeparatorChar -eq '\') { [System.StringComparison]::OrdinalIgnoreCase } else { [System.StringComparison]::Ordinal }
    if ($full -ne $rootFull -and -not $full.StartsWith($rootFull + [System.IO.Path]::DirectorySeparatorChar, $comparison)) {
        throw "$Label escaped its evidence root: $full"
    }
    return $full
}

function Read-UnityVersion([string]$ProjectRoot) {
    $path = Join-Path $ProjectRoot "ProjectSettings\ProjectVersion.txt"
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "Unity project-version file is absent: $path"
    }
    $match = [regex]::Match((Get-Content -LiteralPath $path -Raw), '(?m)^m_EditorVersion:\s*(\S+)\s*$')
    if (-not $match.Success) { throw "Unity project version could not be read: $path" }
    return $match.Groups[1].Value
}

function Quote-CommandValue([string]$Value) {
    if ($null -eq $Value) { return '""' }
    return '"' + $Value.Replace('"', '`"') + '"'
}

$worldPath = Resolve-FullPath $WorldRoot (Get-Location).Path
$arcPath = Resolve-FullPath $ArcRoot (Get-Location).Path
$projectRoot = Resolve-FullPath $EmbodiedArLabRoot (Get-Location).Path
$jobRoot = Join-Path $projectRoot "local\scene-jobs\$JobId"

$kitLockPath = Join-Path (Split-Path $PSScriptRoot -Parent) "MACHINE_LOCK.json"
if (Test-Path -LiteralPath $kitLockPath -PathType Leaf) {
    $kitLock = Get-Content -LiteralPath $kitLockPath -Raw | ConvertFrom-Json
    if ([string]::IsNullOrWhiteSpace($ExpectedWorldCommit)) {
        $ExpectedWorldCommit = [string]$kitLock.world.commit
    }
    if ([string]::IsNullOrWhiteSpace($ExpectedArcCommit)) {
        $ExpectedArcCommit = [string]$kitLock.arc.commit
    }
}

$worldHead = $null
$arcHead = $null
if ([string]::IsNullOrWhiteSpace($ExpectedWorldCommit)) {
    try { $ExpectedWorldCommit = Get-GitHead $worldPath "World" } catch { $ExpectedWorldCommit = $null }
}
if (-not [string]::IsNullOrWhiteSpace($ExpectedWorldCommit)) {
    $ExpectedWorldCommit = $ExpectedWorldCommit.Trim().ToLowerInvariant()
}
if (-not [string]::IsNullOrWhiteSpace($ExpectedArcCommit)) {
    $ExpectedArcCommit = $ExpectedArcCommit.Trim().ToLowerInvariant()
}

if ([string]::IsNullOrWhiteSpace($PreflightRoot)) { $PreflightRoot = Join-Path $jobRoot "preflight" }
if ([string]::IsNullOrWhiteSpace($ReviewRoot)) { $ReviewRoot = Join-Path $jobRoot "output\player-train\role-separated-review" }
if ([string]::IsNullOrWhiteSpace($OutputRoot)) { $OutputRoot = Join-Path $jobRoot "output\commissioning-state" }
$preflightOutput = Resolve-FullPath $PreflightRoot $projectRoot
$reviewOutput = Resolve-FullPath $ReviewRoot $projectRoot
$output = Resolve-FullPath $OutputRoot $projectRoot
New-Item -ItemType Directory -Force $output | Out-Null

$materializationPath = Join-Path $jobRoot "output\representation-materialization\underdrain-representation-materialization-run.json"
$preflightPath = Join-Path $preflightOutput "underdrain-unity6000-machine-preflight-v2.json"
$approvalPath = Join-Path $jobRoot "output\player-train\production-asset-approval\production-asset-approval.json"
$trainPath = Join-Path $jobRoot "output\player-train\underdrain-unity6000-player-product-train.json"
$keyboardPath = Join-Path $jobRoot "build\receipts\player-session-keyboard-mouse\session-run.json"
$gamepadPath = Join-Path $jobRoot "build\receipts\player-session-gamepad\session-run.json"
$reviewKitPath = Join-Path $reviewOutput "review-kit-receipt.json"
$reviewPath = Join-Path $reviewOutput "role-separated-review.json"
$acceptancePath = Join-Path $jobRoot "output\player-train\underdrain-player-product-acceptance.json"

$gates = [System.Collections.ArrayList]::new()

$sourceGate = New-Gate "source-custody" "Exact source and Unity project custody" $null "git-and-unity-project"
$sourceGate.receiptPresent = $true
try {
    Require-Hex $ExpectedWorldCommit 40 "Expected World commit"
    Require-Hex $ExpectedArcCommit 40 "Expected Arc commit"
    $worldHead = Get-GitHead $worldPath "World"
    $arcHead = Get-GitHead $arcPath "Arc"
    Require-CleanGit $worldPath "World"
    Require-CleanGit $arcPath "Arc"
    Require-Equal $worldHead $ExpectedWorldCommit "World commit"
    Require-Equal $arcHead $ExpectedArcCommit "Arc commit"
    foreach ($directory in @("Assets", "Packages", "ProjectSettings")) {
        $candidate = Join-Path $projectRoot $directory
        if (-not (Test-Path -LiteralPath $candidate -PathType Container)) {
            throw "Embodied-AR-Lab $directory directory is absent: $candidate"
        }
    }
    $unityVersion = Read-UnityVersion $projectRoot
    Require-Equal $unityVersion $ExpectedUnityVersion "Unity project version"
    $sourceGate.status = "pass"
    $sourceGate.message = "World, Arc, and Unity project roots are exact and clean."
    $sourceGate.observedStatus = "pass"
} catch {
    $sourceGate.status = "held"
    $sourceGate.message = $_.Exception.Message
    $sourceGate.observedStatus = "held"
}
[void]$gates.Add($sourceGate)

$materializationGate = New-Gate `
    "representation-materialization" `
    "Seven-role representation materialization" `
    $materializationPath `
    "rodoh-underdrain-representation-materialization-run/1"
$materializationValue = Test-ReceiptGate $materializationGate $materializationGate.expectedFormat @("pass") {
    param($value)
    Require-Equal $value.worldCommit $ExpectedWorldCommit "Materialization World commit"
    Require-Equal $value.arcCommit $ExpectedArcCommit "Materialization Arc commit"
    Require-Equal $value.unityVersion $ExpectedUnityVersion "Materialization Unity version"
    Require-Equal $value.productionAssetCount 7 "Materialization production-asset count"
    Require-Equal $value.declaredBindingCount 27 "Materialization declared-binding count"
    Require-Equal $value.uniqueDeclaredAssetCount 23 "Materialization unique-asset count"
    Require-Equal $value.namedAssetReview "open" "Materialization named-asset review"
    Require-Equal $value.approvalIssued $false "Materialization approval issuance"
    Require-Equal $value.productAcceptance "not-issued" "Materialization product acceptance"
    Require-NonEmpty $value.materializationReceipt "Materialization native receipt"
    Require-Hex ([string]$value.materializationReceiptSha256) 64 "Materialization receipt SHA-256"
    $nativeReceipt = Resolve-ReceiptReference ([string]$value.materializationReceipt) $materializationPath
    Require-UnderRoot $nativeReceipt ([System.IO.Path]::GetDirectoryName($materializationPath)) "Materialization native receipt" | Out-Null
    if (-not (Test-Path -LiteralPath $nativeReceipt -PathType Leaf)) { throw "Materialization native receipt is absent: $nativeReceipt" }
    Require-Equal (Get-Sha256 $nativeReceipt) $value.materializationReceiptSha256 "Materialization native receipt SHA-256"
}
[void]$gates.Add($materializationGate)

$preflightGate = New-Gate `
    "machine-preflight-v2" `
    "Read-only machine preflight v2" `
    $preflightPath `
    "rodoh-underdrain-unity6000-machine-preflight/2"
$preflightValue = Test-ReceiptGate $preflightGate $preflightGate.expectedFormat @("pass") {
    param($value)
    Require-True $value.machineReadyForNamedAssetReview "Preflight machineReadyForNamedAssetReview"
    Require-Equal $value.identities.worldCommit $ExpectedWorldCommit "Preflight World commit"
    Require-Equal $value.identities.arcCommit $ExpectedArcCommit "Preflight Arc commit"
    Require-Equal $value.identities.productId $ExpectedProductId "Preflight product"
    Require-Equal $value.identities.challengeId $ExpectedChallengeId "Preflight challenge"
    Require-Equal $value.identities.timingProfileId $ExpectedTimingProfile "Preflight timing profile"
    Require-Equal $value.identities.presentationAdapterId $ExpectedPresentationAdapter "Preflight presentation adapter"
    Require-Equal $value.productAcceptance "not-issued" "Preflight product acceptance"
    Require-Equal $value.physicalHumanEvidence "separate" "Preflight physical-human evidence"
    Require-Equal $value.questAcceptance "open" "Preflight Quest acceptance"
    $legacyPath = Resolve-ReceiptReference ([string]$value.legacyReceipt) $preflightPath
    Require-UnderRoot $legacyPath $preflightOutput "Preflight legacy v1 receipt" | Out-Null
    if (-not (Test-Path -LiteralPath $legacyPath -PathType Leaf)) { throw "Preflight v2 legacy v1 receipt is absent: $legacyPath" }
    Require-Equal (Get-Sha256 $legacyPath) $value.legacyReceiptSha256 "Preflight legacy v1 receipt SHA-256"
}
[void]$gates.Add($preflightGate)

$approvalGate = New-Gate `
    "presentation-asset-approval" `
    "Named presentation-asset approval" `
    $approvalPath `
    "rodoh-action-production-asset-approval/2"
$approvalValue = Test-ReceiptGate $approvalGate $approvalGate.expectedFormat @("approved") {
    param($value)
    Require-Equal $value.productId $ExpectedProductId "Asset approval product"
    Require-True $value.productionApproved "Asset approval productionApproved"
    Require-True $value.confirmedAllAssets "Asset approval confirmedAllAssets"
    Require-Equal $value.assetCount 7 "Asset approval count"
    Require-Equal $value.declaredBindingCount 27 "Asset approval declared-binding count"
    Require-Equal $value.uniqueDeclaredAssetCount 23 "Asset approval unique-asset count"
    Require-Hex ([string]$value.declaredBindingClosureSha256) 64 "Asset approval binding closure"
    Require-Equal $value.generatedPrimitive $false "Asset approval generated primitive"
    Require-Equal $value.activePhysicsAuthority $false "Asset approval active physics authority"
    Require-Equal $value.playerProductAcceptance "not-issued" "Asset approval product acceptance"
    Require-Equal $value.authorityAuthentication "not-performed" "Asset approval authority authentication"
    Require-NonEmpty $value.approvalId "Asset approval id"
    Require-NonEmpty $value.approvalAuthorityId "Asset approval authority"
}
[void]$gates.Add($approvalGate)

$trainGate = New-Gate `
    "player-product-train" `
    "Qualified Unity and Windows player product" `
    $trainPath `
    "rodoh-underdrain-unity6000-player-product-train/1"
$trainValue = Test-ReceiptGate $trainGate $trainGate.expectedFormat @("pass") {
    param($value)
    Require-Equal $value.productId $ExpectedProductId "Player-product train product"
    Require-Equal $value.worldCommit $ExpectedWorldCommit "Player-product train World commit"
    Require-Equal $value.arcCommit $ExpectedArcCommit "Player-product train Arc commit"
    Require-Equal $value.unityVersion $ExpectedUnityVersion "Player-product train Unity version"
    Require-Equal $value.challengeId $ExpectedChallengeId "Player-product train challenge"
    Require-Equal $value.timingProfileId $ExpectedTimingProfile "Player-product train timing profile"
    Require-Equal $value.presentationAdapterId $ExpectedPresentationAdapter "Player-product presentation adapter"
    Require-Equal $value.productionAssetCount 7 "Player-product production-asset count"
    Require-Equal $value.declaredBindingCount 27 "Player-product declared-binding count"
    Require-Equal $value.uniqueDeclaredAssetCount 23 "Player-product unique-asset count"
    Require-Equal $value.windowsBuild "pass" "Player-product Windows build"
    Require-Hex ([string]$value.windowsProductSha256) 64 "Player-product Windows SHA-256"
    Require-True $value.exactSourceCustody "Player-product exact source custody"
    Require-True $value.exactDependencyCustody "Player-product exact dependency custody"
    Require-True $value.exactPrefabCustody "Player-product exact prefab custody"
    Require-True $value.exactBindingCustody "Player-product exact binding custody"
    Require-True $value.exactRepresentationCustody "Player-product exact representation custody"
    Require-True $value.exactCueParity "Player-product exact cue parity"
    Require-Equal $value.primitiveFallback $false "Player-product primitive fallback"
    Require-Equal $value.diagnosticPresentation $false "Player-product diagnostic presentation"
    Require-Equal $value.activePhysicsAuthority $false "Player-product active physics authority"
    Require-True $value.cameraCollision "Player-product camera collision"
    Require-True $value.runtimeRebinding "Player-product runtime rebinding"
    Require-Equal $value.roleSeparatedSoftwareReview "open" "Player-product role review state"
    Require-Equal $value.namedPlayerProductAcceptance "not-issued" "Player-product acceptance state"
    Require-Equal $value.questAcceptance "open" "Player-product Quest state"

    $approvalReference = Resolve-ReceiptReference ([string]$value.assetApprovalReceipt) $trainPath
    Require-Equal $approvalReference ([System.IO.Path]::GetFullPath($approvalPath)) "Player-product approval receipt path"
    if (-not (Test-Path -LiteralPath $approvalReference -PathType Leaf)) { throw "Player-product approval receipt is absent: $approvalReference" }
    Require-Equal (Get-Sha256 $approvalReference) $value.assetApprovalReceiptSha256 "Player-product approval receipt SHA-256"
    if ($null -ne $approvalValue) {
        Require-Equal $value.assetApprovalId $approvalValue.approvalId "Player-product approval id"
        Require-Equal $value.assetApprovalAuthorityId $approvalValue.approvalAuthorityId "Player-product approval authority"
        Require-Equal $value.declaredBindingClosureSha256 $approvalValue.declaredBindingClosureSha256 "Player-product binding closure"
    }
    $productPath = Resolve-ReceiptReference ([string]$value.windowsProduct) $trainPath
    Require-UnderRoot $productPath $jobRoot "Qualified Windows product" | Out-Null
    if (-not (Test-Path -LiteralPath $productPath -PathType Leaf)) { throw "Qualified Windows product is absent: $productPath" }
    Require-Equal (Get-Sha256 $productPath) $value.windowsProductSha256 "Qualified Windows product SHA-256"
}
[void]$gates.Add($trainGate)

$keyboardGate = New-Gate `
    "keyboard-mouse-session" `
    "Keyboard and mouse session with exact Arc replay" `
    $keyboardPath `
    "rodoh-underdrain-windows-player-session/2"
$keyboardValue = Test-ReceiptGate $keyboardGate $keyboardGate.expectedFormat @("pass") {
    param($value)
    Require-Equal $value.device "keyboard-mouse" "Keyboard session device"
    Require-Equal $value.worldCommit $ExpectedWorldCommit "Keyboard session World commit"
    Require-Equal $value.arcCommit $ExpectedArcCommit "Keyboard session Arc commit"
    Require-Equal $value.challengeId $ExpectedChallengeId "Keyboard session challenge"
    Require-Equal $value.timingProfileId $ExpectedTimingProfile "Keyboard session timing profile"
    Require-Equal $value.presentationAdapterId $ExpectedPresentationAdapter "Keyboard session presentation adapter"
    Require-Equal $value.candidateAuthority "Arc replay required" "Keyboard session candidate authority"
    Require-True $value.provisionalParity "Keyboard session provisional parity"
    Require-True $value.allRequiredCuesObserved "Keyboard session cue coverage"
    Require-True $value.performance.withinBudget "Keyboard session performance"
    Require-Equal $value.namedPlayerProductAcceptance "not-issued" "Keyboard session product acceptance"
    Require-Hex ([string]$value.windowsProductSha256) 64 "Keyboard session Windows SHA-256"
    Require-NonEmpty $value.acceptedReceiptDigest "Keyboard accepted ARC receipt digest"
    if ($null -ne $trainValue) {
        Require-Equal $value.playerProductId $trainValue.productId "Keyboard session product"
        Require-Equal $value.playerProductProfileSha256 $trainValue.productProfileSha256 "Keyboard session profile"
        Require-Equal $value.windowsProductSha256 $trainValue.windowsProductSha256 "Keyboard session Windows product"
        Require-Equal $value.actionSpecDigest $trainValue.actionSpecDigest "Keyboard session action specification"
        Require-Equal $value.arcDigest $trainValue.arcDigest "Keyboard session ARC digest"
        Require-Equal $value.presentationManifestId $trainValue.presentationManifestId "Keyboard session presentation"
        Require-Equal $value.sceneJobDigest $trainValue.sceneJobDigest "Keyboard session scene job"
    }
}
[void]$gates.Add($keyboardGate)

$gamepadGate = New-Gate `
    "gamepad-session" `
    "Gamepad session with persisted rebind and exact Arc replay" `
    $gamepadPath `
    "rodoh-underdrain-windows-player-session/2"
$gamepadValue = Test-ReceiptGate $gamepadGate $gamepadGate.expectedFormat @("pass") {
    param($value)
    Require-Equal $value.device "gamepad" "Gamepad session device"
    Require-Equal $value.worldCommit $ExpectedWorldCommit "Gamepad session World commit"
    Require-Equal $value.arcCommit $ExpectedArcCommit "Gamepad session Arc commit"
    Require-Equal $value.challengeId $ExpectedChallengeId "Gamepad session challenge"
    Require-Equal $value.timingProfileId $ExpectedTimingProfile "Gamepad session timing profile"
    Require-Equal $value.presentationAdapterId $ExpectedPresentationAdapter "Gamepad session presentation adapter"
    Require-Equal $value.candidateAuthority "Arc replay required" "Gamepad session candidate authority"
    Require-True $value.provisionalParity "Gamepad session provisional parity"
    Require-True $value.allRequiredCuesObserved "Gamepad session cue coverage"
    Require-True $value.performance.withinBudget "Gamepad session performance"
    Require-Equal $value.namedPlayerProductAcceptance "not-issued" "Gamepad session product acceptance"
    Require-Hex ([string]$value.windowsProductSha256) 64 "Gamepad session Windows SHA-256"
    Require-NonEmpty $value.acceptedReceiptDigest "Gamepad accepted ARC receipt digest"
    if ($null -ne $trainValue) {
        Require-Equal $value.playerProductId $trainValue.productId "Gamepad session product"
        Require-Equal $value.playerProductProfileSha256 $trainValue.productProfileSha256 "Gamepad session profile"
        Require-Equal $value.windowsProductSha256 $trainValue.windowsProductSha256 "Gamepad session Windows product"
        Require-Equal $value.actionSpecDigest $trainValue.actionSpecDigest "Gamepad session action specification"
        Require-Equal $value.arcDigest $trainValue.arcDigest "Gamepad session ARC digest"
        Require-Equal $value.presentationManifestId $trainValue.presentationManifestId "Gamepad session presentation"
        Require-Equal $value.sceneJobDigest $trainValue.sceneJobDigest "Gamepad session scene job"
        if ($value.bindingProfileDigest -eq $trainValue.bindingProfileDigest) {
            throw "Gamepad session did not persist a binding-profile change."
        }
    }
}
[void]$gates.Add($gamepadGate)

if ($keyboardGate.status -eq "pass" -and $gamepadGate.status -eq "pass") {
    $collisionAdjustments = [int]$keyboardValue.cameraCollisionAdjustments + [int]$gamepadValue.cameraCollisionAdjustments
    if ($collisionAdjustments -lt 1) {
        $gamepadGate.status = "held"
        $gamepadGate.message = "Neither device session exercised a real camera-collision adjustment."
    }
}

$reviewKitGate = New-Gate `
    "role-review-kit" `
    "Role-separated review kit" `
    $reviewKitPath `
    "rodoh-underdrain-role-separated-review-kit/1"
$reviewKitValue = Test-ReceiptGate $reviewKitGate $reviewKitGate.expectedFormat @("ready") {
    param($value)
    Require-Equal $value.productId $ExpectedProductId "Review-kit product"
    Require-Equal $value.worldCommit $ExpectedWorldCommit "Review-kit World commit"
    Require-Equal $value.arcCommit $ExpectedArcCommit "Review-kit Arc commit"
    Require-Equal $value.reviewIssued $false "Review-kit review issuance"
    Require-Equal $value.productAcceptance "not-issued" "Review-kit product acceptance"
    Require-Equal $value.physicalInstallationEvidence "separate" "Review-kit physical evidence"
    $sessionReference = Resolve-ReceiptReference ([string]$value.playerSessionReceipt) $reviewKitPath
    if ($sessionReference -ne [System.IO.Path]::GetFullPath($keyboardPath) -and $sessionReference -ne [System.IO.Path]::GetFullPath($gamepadPath)) {
        throw "Review kit does not cite either accepted device-session receipt."
    }
    Require-Equal (Get-Sha256 $sessionReference) $value.playerSessionReceiptSha256 "Review-kit session SHA-256"
}
[void]$gates.Add($reviewKitGate)

$reviewGate = New-Gate `
    "role-separated-software-review" `
    "Three-seat role-separated software review" `
    $reviewPath `
    "rodoh-underdrain-role-separated-review-receipt/1"
$reviewValue = Test-ReceiptGate $reviewGate $reviewGate.expectedFormat @("pass") {
    param($value)
    Require-Equal $value.productId $ExpectedProductId "Role review product"
    Require-Equal $value.worldCommit $ExpectedWorldCommit "Role review World commit"
    Require-Equal $value.arcCommit $ExpectedArcCommit "Role review Arc commit"
    Require-Equal $value.challengeId $ExpectedChallengeId "Role review challenge"
    Require-Equal $value.timingProfileId $ExpectedTimingProfile "Role review timing profile"
    Require-True $value.independence.distinctSeats "Role review distinct seats"
    Require-True $value.independence.distinctLineages "Role review distinct lineages"
    Require-True $value.independence.distinctContexts "Role review distinct contexts"
    Require-True $value.independence.sourceIsolated "Role review source isolation"
    Require-Equal $value.independence.artifactMutationCapability $false "Role review artifact mutation"
    Require-True $value.learning.teachPracticeMasterComplete "Role review teach-practice-master"
    Require-True $value.behavior.voluntarilyContinuedAfterConsequence "Role review voluntary continuation"
    Require-Equal $value.runtimeIssued $false "Role review runtime issuance"
    Require-Equal $value.candidateAuthorIssued $false "Role review candidate-author issuance"
    Require-Equal $value.productAcceptance "not-issued" "Role review product acceptance"
    Require-Equal $value.physicalHumanEvidence "separate-not-inferred" "Role review physical-human evidence"
    $sessionReference = Resolve-ReceiptReference ([string]$value.playerSessionReceipt) $reviewPath
    if ($sessionReference -ne [System.IO.Path]::GetFullPath($keyboardPath) -and $sessionReference -ne [System.IO.Path]::GetFullPath($gamepadPath)) {
        throw "Role review does not cite either accepted device session."
    }
    Require-Equal (Get-Sha256 $sessionReference) $value.playerSessionReceiptSha256 "Role-review session SHA-256"
    $sessionValue = if ($sessionReference -eq [System.IO.Path]::GetFullPath($keyboardPath)) { $keyboardValue } else { $gamepadValue }
    if ($null -ne $sessionValue) {
        Require-Equal $value.acceptedArcReceiptDigest $sessionValue.acceptedReceiptDigest "Role-review accepted ARC receipt"
    }
    if ($null -ne $trainValue) {
        Require-Equal $value.productProfileSha256 $trainValue.productProfileSha256 "Role-review product profile"
        Require-Equal $value.windowsProductSha256 $trainValue.windowsProductSha256 "Role-review Windows product"
        Require-Equal $value.actionSpecDigest $trainValue.actionSpecDigest "Role-review action specification"
        Require-Equal $value.arcDigest $trainValue.arcDigest "Role-review ARC digest"
        Require-Equal $value.presentationManifestId $trainValue.presentationManifestId "Role-review presentation"
        Require-Equal $value.sceneJobDigest $trainValue.sceneJobDigest "Role-review scene job"
    }
}
[void]$gates.Add($reviewGate)

$acceptanceGate = New-Gate `
    "windows-software-product-acceptance" `
    "Fourth-seat Windows software-product acceptance" `
    $acceptancePath `
    "rodoh-underdrain-player-product-acceptance/2"
$acceptanceValue = Test-ReceiptGate $acceptanceGate $acceptanceGate.expectedFormat @("accepted") {
    param($value)
    Require-True $value.accepted "Windows software acceptance"
    Require-Equal $value.scope "windows-software-player-product" "Windows software acceptance scope"
    Require-Equal $value.productId $ExpectedProductId "Windows software acceptance product"
    Require-Equal $value.worldCommit $ExpectedWorldCommit "Windows software acceptance World commit"
    Require-Equal $value.arcCommit $ExpectedArcCommit "Windows software acceptance Arc commit"
    Require-Equal $value.challengeId $ExpectedChallengeId "Windows software acceptance challenge"
    Require-Equal $value.timingProfileId $ExpectedTimingProfile "Windows software acceptance timing profile"
    Require-Equal $value.presentationAdapterId $ExpectedPresentationAdapter "Windows software acceptance presentation adapter"
    Require-Equal $value.productionAssetCount 7 "Windows software acceptance production-asset count"
    Require-Equal $value.declaredBindingCount 27 "Windows software acceptance declared-binding count"
    Require-Equal $value.uniqueDeclaredAssetCount 23 "Windows software acceptance unique-asset count"
    Require-True $value.exactSourceCustody "Windows software acceptance source custody"
    Require-True $value.exactDependencyCustody "Windows software acceptance dependency custody"
    Require-True $value.exactPrefabCustody "Windows software acceptance prefab custody"
    Require-True $value.exactBindingCustody "Windows software acceptance binding custody"
    Require-True $value.exactRepresentationCustody "Windows software acceptance representation custody"
    Require-True $value.exactCueParity "Windows software acceptance cue parity"
    Require-Equal $value.physicalHumanEvidence "separate-not-required-for-software-scope" "Windows software acceptance physical-human evidence"
    Require-Equal $value.questAcceptance "not-issued" "Windows software acceptance Quest state"
    Require-Equal $value.physicalQuestAcceptance "open" "Windows software acceptance physical Quest state"
    Require-Equal $value.acceptanceSeat.artifactMutationCapability $false "Windows software acceptance mutation capability"

    if ($null -ne $trainValue) {
        Require-Equal $value.productProfileSha256 $trainValue.productProfileSha256 "Windows acceptance product profile"
        Require-Equal $value.windowsProductSha256 $trainValue.windowsProductSha256 "Windows acceptance product bytes"
        Require-Equal $value.actionSpecDigest $trainValue.actionSpecDigest "Windows acceptance action specification"
        Require-Equal $value.arcDigest $trainValue.arcDigest "Windows acceptance ARC digest"
        Require-Equal $value.presentationManifestId $trainValue.presentationManifestId "Windows acceptance presentation"
        Require-Equal $value.sceneJobDigest $trainValue.sceneJobDigest "Windows acceptance scene job"
        Require-Equal $value.declaredBindingClosureSha256 $trainValue.declaredBindingClosureSha256 "Windows acceptance binding closure"
    }
    $keyboardReference = Resolve-ReceiptReference ([string]$value.keyboardMouseSession.receipt) $acceptancePath
    $gamepadReference = Resolve-ReceiptReference ([string]$value.gamepadAndRebindingSession.receipt) $acceptancePath
    $reviewReference = Resolve-ReceiptReference ([string]$value.roleSeparatedReview.receipt) $acceptancePath
    Require-Equal $keyboardReference ([System.IO.Path]::GetFullPath($keyboardPath)) "Windows acceptance keyboard receipt"
    Require-Equal $gamepadReference ([System.IO.Path]::GetFullPath($gamepadPath)) "Windows acceptance gamepad receipt"
    Require-Equal $reviewReference ([System.IO.Path]::GetFullPath($reviewPath)) "Windows acceptance review receipt"
    Require-Equal (Get-Sha256 $reviewReference) $value.roleSeparatedReview.receiptSha256 "Windows acceptance review SHA-256"
}
[void]$gates.Add($acceptanceGate)

function Get-NextCommand([string]$GateId) {
    $world = Quote-CommandValue $worldPath
    $arc = Quote-CommandValue $arcPath
    $embodied = Quote-CommandValue $projectRoot
    $job = Quote-CommandValue $JobId
    switch ($GateId) {
        "source-custody" {
            return "Correct the exact World, Arc, Unity-version, and project-root custody before continuing."
        }
        "representation-materialization" {
            $script = Quote-CommandValue (Join-Path $worldPath "scripts\materialize-underdrain-production-representation.ps1")
            return "powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script -WorldRoot $world -ArcRoot $arc -EmbodiedArLabRoot $embodied -ExpectedWorldCommit $ExpectedWorldCommit -ExpectedArcCommit $ExpectedArcCommit -SourceManifest `"<resolved-representation-source.json>`" -SourceRoot `"<resolved-role-assets>`""
        }
        "machine-preflight-v2" {
            $script = Quote-CommandValue (Join-Path $worldPath "scripts\preflight-underdrain-unity6000-player-product-v2.ps1")
            return "powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script -WorldRoot $world -ExpectedWorldCommit $ExpectedWorldCommit -ArcRoot $arc -EmbodiedArLabRoot $embodied -OutputRoot $(Quote-CommandValue $preflightOutput)"
        }
        "presentation-asset-approval" {
            return "Review the seven exact prefabs in Unity, close the editor, then run approve-underdrain-production-assets.ps1 with a distinct approval seat, name, attestation, and -ConfirmAllAssets."
        }
        "player-product-train" {
            $script = Quote-CommandValue (Join-Path $worldPath "scripts\run-underdrain-unity6000-player-product.ps1")
            return "powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script -EmbodiedArLabRoot $embodied -ArcRoot $arc -AssetApprovalReceipt $(Quote-CommandValue $approvalPath) -JobId $job"
        }
        "keyboard-mouse-session" {
            $script = Quote-CommandValue (Join-Path $worldPath "scripts\run-underdrain-player-session.ps1")
            return "powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script -EmbodiedArLabRoot $embodied -ArcRoot $arc -JobId $job -Device keyboard-mouse"
        }
        "gamepad-session" {
            $script = Quote-CommandValue (Join-Path $worldPath "scripts\run-underdrain-player-session.ps1")
            return "powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script -EmbodiedArLabRoot $embodied -ArcRoot $arc -JobId $job -Device gamepad"
        }
        "role-review-kit" {
            $script = Quote-CommandValue (Join-Path $worldPath "scripts\new-underdrain-role-separated-review-kit.ps1")
            return "powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script -PlayerProductTrainReceipt $(Quote-CommandValue $trainPath) -PlayerSessionReceipt $(Quote-CommandValue $keyboardPath) -OutputRoot $(Quote-CommandValue $reviewOutput)"
        }
        "role-separated-software-review" {
            return "Complete the three isolated packet functions, then run record-underdrain-role-separated-software-review.ps1 against $(Quote-CommandValue $reviewOutput)."
        }
        "windows-software-product-acceptance" {
            return "Run accept-underdrain-player-product.ps1 with $(Quote-CommandValue $trainPath), $(Quote-CommandValue $keyboardPath), $(Quote-CommandValue $gamepadPath), $(Quote-CommandValue $reviewPath), and a fourth seat, lineage, context, name, and attestation."
        }
        default { return $null }
    }
}

$firstDivergenceIndex = -1
for ($index = 0; $index -lt $gates.Count; $index++) {
    if ($gates[$index].status -ne "pass") { $firstDivergenceIndex = $index; break }
}

$outOfOrder = @()
if ($firstDivergenceIndex -ge 0) {
    for ($index = $firstDivergenceIndex + 1; $index -lt $gates.Count; $index++) {
        if ($gates[$index].receiptPresent) {
            $outOfOrder += [ordered]@{
                id = $gates[$index].id
                receipt = $gates[$index].receipt
                status = $gates[$index].status
            }
        }
    }
}

$overallStatus = "pass"
if ($firstDivergenceIndex -ge 0) { $overallStatus = [string]$gates[$firstDivergenceIndex].status }
if ($outOfOrder.Count -gt 0) { $overallStatus = "held" }

$firstDivergence = $null
$nextCommand = $null
if ($firstDivergenceIndex -ge 0) {
    $gate = $gates[$firstDivergenceIndex]
    $firstDivergence = [ordered]@{
        id = $gate.id
        label = $gate.label
        status = $gate.status
        message = $gate.message
        receipt = $gate.receipt
    }
    $nextCommand = Get-NextCommand $gate.id
}

$generatedAt = (Get-Date).ToUniversalTime().ToString("o")
$snapshotId = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssfffZ")
$historyRoot = Join-Path $output "history"
$snapshotPath = Join-Path $historyRoot "$snapshotId-$overallStatus.json"
$currentPath = Join-Path $output "underdrain-commissioning-state.json"
$textPath = Join-Path $output "underdrain-commissioning-state.txt"

$state = [ordered]@{
    format = "rodoh-underdrain-windows-commissioning-state/1"
    generatedAt = $generatedAt
    snapshotId = $snapshotId
    snapshot = $snapshotPath
    current = $currentPath
    status = $overallStatus
    productId = $ExpectedProductId
    challengeId = $ExpectedChallengeId
    timingProfileId = $ExpectedTimingProfile
    unityVersion = $ExpectedUnityVersion
    worldCommit = $ExpectedWorldCommit
    arcCommit = $ExpectedArcCommit
    observedWorldCommit = $worldHead
    observedArcCommit = $arcHead
    jobId = $JobId
    roots = [ordered]@{
        world = $worldPath
        arc = $arcPath
        embodiedArLab = $projectRoot
        job = $jobRoot
        preflight = $preflightOutput
        review = $reviewOutput
        output = $output
    }
    evidencePaths = [ordered]@{
        materialization = $materializationPath
        preflightV2 = $preflightPath
        presentationApproval = $approvalPath
        playerProductTrain = $trainPath
        keyboardMouseSession = $keyboardPath
        gamepadSession = $gamepadPath
        reviewKit = $reviewKitPath
        roleSeparatedReview = $reviewPath
        windowsSoftwareAcceptance = $acceptancePath
    }
    gates = @($gates)
    firstDivergence = $firstDivergence
    nextCommand = $nextCommand
    outOfOrderEvidence = @($outOfOrder)
    windowsSoftwareProductAcceptance = if ($acceptanceGate.status -eq "pass") { "accepted" } else { "not-issued" }
    physicalHumanEvidence = "separate"
    questAcceptance = "open"
    physicalAcceptance = "not-issued"
    authority = "read-only commissioning-state inspection only"
}

Write-Json $snapshotPath $state
Copy-Item -LiteralPath $snapshotPath -Destination $currentPath -Force
"$(Get-Sha256 $currentPath)  underdrain-commissioning-state.json" |
    Set-Content -Encoding ascii ($currentPath + ".sha256")

$lines = @(
    "UNDERDRAIN Windows commissioning state: $overallStatus",
    "World: $ExpectedWorldCommit",
    "Arc: $ExpectedArcCommit",
    "Job: $JobId"
)
foreach ($gate in $gates) {
    $lines += ("[{0}] {1}: {2}" -f ([string]$gate.status).ToUpperInvariant(), $gate.id, $gate.message)
}
if ($outOfOrder.Count -gt 0) {
    $lines += "Out-of-order evidence was found after the first incomplete gate and must not be mixed into this attempt."
}
if (-not [string]::IsNullOrWhiteSpace($nextCommand)) {
    $lines += ""
    $lines += "NEXT"
    $lines += $nextCommand
}
$lines | Set-Content -Encoding utf8 $textPath

Write-Host "UNDERDRAIN Windows commissioning state: $overallStatus"
if ($firstDivergence) { Write-Host "First divergence: $($firstDivergence.id) [$($firstDivergence.status)]" }
Write-Host $currentPath

if ($overallStatus -eq "held" -and -not $NoFail) { exit 2 }
exit 0

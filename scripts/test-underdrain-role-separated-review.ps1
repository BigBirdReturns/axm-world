[CmdletBinding()]
param(
    [string]$OutputRoot
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Json([string]$Path, [object]$Value) {
    $Value | ConvertTo-Json -Depth 50 | Set-Content -Encoding utf8 $Path
}

function Sha([string]$Path) {
    return (Get-FileHash $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Invoke-ExpectedFailure([scriptblock]$Operation, [string]$Pattern, [string]$Label) {
    $failed = $false
    try { & $Operation }
    catch {
        $failed = $true
        if ($_.Exception.Message -notmatch $Pattern) {
            throw "$Label failed for the wrong reason: $($_.Exception.Message)"
        }
    }
    if (-not $failed) { throw "$Label unexpectedly passed." }
}

$worldRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    $OutputRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("underdrain-role-review-" + [guid]::NewGuid().ToString("N"))
}
$root = [System.IO.Path]::GetFullPath($OutputRoot)
New-Item -ItemType Directory -Force $root | Out-Null

$contractPath = Join-Path $worldRoot "unity/Fixtures/underdrain.role-separated-software-review.json"
$recorder = Join-Path $worldRoot "scripts/record-underdrain-role-separated-software-review.ps1"
$acceptor = Join-Path $worldRoot "scripts/accept-underdrain-player-product.ps1"
foreach ($path in @($contractPath, $recorder, $acceptor)) {
    if (-not (Test-Path $path -PathType Leaf)) { throw "Required role-review source is absent: $path" }
}
$contract = Get-Content $contractPath -Raw | ConvertFrom-Json

$hex40a = "1" * 40
$hex40b = "2" * 40
$hex64a = "a" * 64
$hex64b = "b" * 64
$hex64c = "c" * 64
$hex64d = "d" * 64
$hex64e = "e" * 64
$hex64f = "f" * 64
$identity = [ordered]@{
    productId = "underdrain-bloom-below-unity6000-v1"
    worldCommit = $hex40a
    arcCommit = $hex40b
    productProfileSha256 = $hex64a
    windowsProductSha256 = $hex64b
    actionSpecDigest = "actspec1_$hex64c"
    arcDigest = "cart1_$hex64d"
    challengeId = "breach-crown-pump"
    timingProfileId = "forgiving"
    presentationManifestId = "underdrain-bloom-below-v1"
    sceneJobDigest = "scenejob1_$hex64e"
}

function New-IdentityObject([ordered]$Extra) {
    $value = [ordered]@{}
    foreach ($entry in $identity.GetEnumerator()) { $value[$entry.Key] = $entry.Value }
    foreach ($entry in $Extra.GetEnumerator()) { $value[$entry.Key] = $entry.Value }
    return $value
}

$acceptedPath = Join-Path $root "accepted-arc-receipt.json"
$acceptedDigest = "actionreceipt1_$hex64f"
Write-Json $acceptedPath ([ordered]@{
    format = "axm-action-receipt/1"
    receiptDigest = $acceptedDigest
    timingProfileId = "forgiving"
    result = [ordered]@{
        outcome = "success"
        completedObjectiveIds = @("diagnose-spore-valves", "operate-purge-wheel", "open-crown-sluice")
    }
})

$assetApprovalPath = Join-Path $root "production-asset-approval.json"
Write-Json $assetApprovalPath ([ordered]@{
    format = "rodoh-action-production-asset-approval/2"
    status = "approved"
    productId = $identity.productId
    approvalId = "underdrain-assets-approval-fixture"
    approvalAuthorityId = "seat:presentation-approver"
    approvalName = "UNDERDRAIN fixture presentation"
    approvedAt = "2026-08-14T00:00:00Z"
    assetCount = 7
    declaredBindingCount = 27
    uniqueDeclaredAssetCount = 23
    declaredBindingClosureSha256 = $hex64a
    confirmedAllAssets = $true
    productionApproved = $true
    generatedPrimitive = $false
    activePhysicsAuthority = $false
    playerProductAcceptance = "not-issued"
    authorityAuthentication = "not-performed"
})
$assetApprovalSha = Sha $assetApprovalPath

$trainPath = Join-Path $root "player-product-train.json"
$productionAssets = 1..7 | ForEach-Object { [ordered]@{ assetId = "asset-$_"; visualSourceSha256 = $hex64a } }
$train = New-IdentityObject ([ordered]@{
    format = "rodoh-underdrain-unity6000-player-product-train/1"
    status = "pass"
    windowsBuild = "pass"
    windowsProduct = "UNDERDRAIN.exe"
    exactSourceCustody = $true
    exactDependencyCustody = $true
    exactPrefabCustody = $true
    exactBindingCustody = $true
    exactRepresentationCustody = $true
    exactCueParity = $true
    primitiveFallback = $false
    diagnosticPresentation = $false
    activePhysicsAuthority = $false
    productionAssetCount = 7
    productionAssetSourceDigests = @($productionAssets)
    declaredBindingCount = 27
    uniqueDeclaredAssetCount = 23
    declaredBindingClosureSha256 = $hex64a
    presentationAdapterId = "production.prefab/v1"
    cameraCollision = $true
    runtimeRebinding = $true
    bindingProfileDigest = "bindings1_$hex64a"
    assetApprovalReceipt = $assetApprovalPath
    assetApprovalReceiptSha256 = $assetApprovalSha
    assetApprovalId = "underdrain-assets-approval-fixture"
    assetApprovalAuthorityId = "seat:presentation-approver"
    assetApprovalName = "UNDERDRAIN fixture presentation"
})
Write-Json $trainPath $train

function New-RawSession([string]$Name, [bool]$Keyboard, [bool]$Gamepad) {
    $path = Join-Path $root $Name
    Write-Json $path ([ordered]@{
        format = "rodoh-action-player-session-evidence/2"
        status = "pass"
        sawKeyboardMouse = $Keyboard
        sawGamepad = $Gamepad
        rebindingAvailable = $true
    })
    return $path
}

$keyboardRawPath = New-RawSession "keyboard-session-evidence.json" $true $false
$gamepadRawPath = New-RawSession "gamepad-session-evidence.json" $false $true

function New-Session([string]$Path, [string]$Device, [string]$RawPath, [string]$BindingDigest, [int]$CollisionAdjustments) {
    $value = New-IdentityObject ([ordered]@{
        format = "rodoh-underdrain-windows-player-session/2"
        status = "pass"
        device = $Device
        presentationAdapterId = "production.prefab/v1"
        candidateAuthority = "Arc replay required"
        allRequiredCuesObserved = $true
        performance = [ordered]@{ withinBudget = $true; p95FrameMilliseconds = 16.0; p99FrameMilliseconds = 20.0 }
        provisionalParity = $true
        acceptedReceipt = $acceptedPath
        acceptedReceiptDigest = $acceptedDigest
        namedPlayerProductAcceptance = "not-issued"
        sessionEvidence = $RawPath
        bindingProfileDigest = $BindingDigest
        cameraCollisionAdjustments = $CollisionAdjustments
    })
    Write-Json $Path $value
}

$keyboardPath = Join-Path $root "keyboard-session.json"
$gamepadPath = Join-Path $root "gamepad-session.json"
New-Session $keyboardPath "keyboard-mouse" $keyboardRawPath "bindings1_$hex64a" 1
New-Session $gamepadPath "gamepad" $gamepadRawPath "bindings1_$hex64b" 0
$reviewSessionSha = Sha $keyboardPath

$transcriptPath = Join-Path $root "player-transcript.json"
$notesPath = Join-Path $root "observer-notes.json"
$adjudicationPath = Join-Path $root "adjudication.json"
Write-Json $transcriptPath ([ordered]@{ format = "rodoh-underdrain-cold-player-transcript/1"; completed = $true })
Write-Json $notesPath ([ordered]@{ format = "rodoh-underdrain-cold-observer-notes/1"; immutable = $true })

$playerPath = Join-Path $root "player-packet.json"
$player = New-IdentityObject ([ordered]@{
    format = [string]$contract.packetFormats.player
    playerSessionReceiptSha256 = $reviewSessionSha
    seat = [ordered]@{ seatId = "seat:cold-player"; lineageId = "lineage1_$hex64a"; contextDigest = "ctx1_$hex64a" }
    access = [string]$contract.independence.playerAccess
    sourceAccess = "none"
    rubricAccess = "none"
    answerKeyAccess = "none"
    artifactMutationCapability = $false
    candidateAuthor = $false
    receivedWalkthrough = $false
    assistanceEvents = 0
    completedSession = $true
    voluntarilyContinuedAfterConsequence = $true
    transcript = [ordered]@{ path = [System.IO.Path]::GetFileName($transcriptPath); sha256 = Sha $transcriptPath }
})
Write-Json $playerPath $player
$playerSha = Sha $playerPath

$observerPath = Join-Path $root "observer-packet.json"
$observer = New-IdentityObject ([ordered]@{
    format = [string]$contract.packetFormats.observer
    playerSessionReceiptSha256 = $reviewSessionSha
    seat = [ordered]@{ seatId = "seat:cold-observer"; lineageId = "lineage1_$hex64b"; contextDigest = "ctx1_$hex64b" }
    access = [string]$contract.independence.observerAccess
    sourceAccess = "none"
    rubricAccess = "none"
    answerKeyAccess = "none"
    artifactMutationCapability = $false
    candidateAuthor = $false
    playerPacketSha256 = $playerSha
    notes = [ordered]@{ path = [System.IO.Path]::GetFileName($notesPath); sha256 = Sha $notesPath }
    observations = [ordered]@{
        firstAuthoredDecisionMs = 1200
        firstAcceptedConsequenceMs = 9000
        playerRoleId = "rhea-venn"
        immediateConflictId = "conflict-keep-water-running-without-flooding-hidden-nursery"
        chosenStrategyId = "service-tunnel"
        authoredChoiceId = "service-tunnel"
        acceptedConsequenceId = "fact-pump-seven-balanced"
        nextPlayableActionId = "root-gate-parley"
    }
    behavior = [ordered]@{
        wrongTurns = 1
        knockdowns = 0
        retries = 0
        abandonedBeforeConsequence = $false
        voluntarilyContinuedAfterConsequence = $true
    }
})
Write-Json $observerPath $observer
$observerSha = Sha $observerPath
$contractSha = Sha $contractPath
Write-Json $adjudicationPath ([ordered]@{
    format = "rodoh-underdrain-cold-adjudication/1"
    decision = "pass"
    rubricVersion = "underdrain-role-separated-review-rubric/1"
    observerPacketSha256 = $observerSha
    contractSha256 = $contractSha
    refusalReasons = @()
})

$adjudicatorPath = Join-Path $root "adjudicator-packet.json"
$adjudicator = New-IdentityObject ([ordered]@{
    format = [string]$contract.packetFormats.adjudicator
    playerSessionReceiptSha256 = $reviewSessionSha
    seat = [ordered]@{ seatId = "seat:cold-adjudicator"; lineageId = "lineage1_$hex64c"; contextDigest = "ctx1_$hex64c" }
    access = [string]$contract.independence.adjudicatorAccess
    sourceScope = "contract-and-observation-only"
    artifactMutationCapability = $false
    candidateAuthor = $false
    observerPacketSha256 = $observerSha
    contractSha256 = $contractSha
    rubricVersion = "underdrain-role-separated-review-rubric/1"
    decision = "pass"
    adjudication = [ordered]@{ path = [System.IO.Path]::GetFileName($adjudicationPath); sha256 = Sha $adjudicationPath }
})
Write-Json $adjudicatorPath $adjudicator

$reviewPath = Join-Path $root "role-separated-review.json"
& $recorder `
    -PlayerProductTrainReceipt $trainPath `
    -PlayerSessionReceipt $keyboardPath `
    -PlayerPacket $playerPath `
    -ObserverPacket $observerPath `
    -AdjudicatorPacket $adjudicatorPath `
    -ReviewContract $contractPath `
    -OutputPath $reviewPath
$review = Get-Content $reviewPath -Raw | ConvertFrom-Json
if ($review.format -ne "rodoh-underdrain-role-separated-review-receipt/1" -or $review.status -ne "pass") {
    throw "Valid role-separated review did not pass."
}
if ($review.productAcceptance -ne "not-issued" -or $review.physicalHumanEvidence -ne "separate-not-inferred") {
    throw "Role-separated review crossed product or physical-evidence authority."
}

$acceptancePath = Join-Path $root "windows-software-product-acceptance.json"
& $acceptor `
    -PlayerProductTrainReceipt $trainPath `
    -KeyboardMouseSessionReceipt $keyboardPath `
    -GamepadSessionReceipt $gamepadPath `
    -RoleSeparatedReviewReceipt $reviewPath `
    -AcceptanceSeatId "seat:software-product-acceptor" `
    -AcceptanceLineageId "lineage1_$hex64d" `
    -AcceptanceContextDigest "ctx1_$hex64d" `
    -AcceptanceName "UNDERDRAIN Windows software product fixture" `
    -AcceptanceAttestation "I accept only the exact cited Windows software product on the cited evidence." `
    -OutputPath $acceptancePath
$acceptance = Get-Content $acceptancePath -Raw | ConvertFrom-Json
if ($acceptance.format -ne "rodoh-underdrain-player-product-acceptance/2" -or $acceptance.scope -ne "windows-software-player-product" -or $acceptance.accepted -ne $true) {
    throw "Valid Windows software-product acceptance did not pass."
}
if ($acceptance.questAcceptance -ne "not-issued" -or $acceptance.physicalQuestAcceptance -ne "open" -or $acceptance.physicalHumanEvidence -ne "separate-not-required-for-software-scope") {
    throw "Software acceptance crossed Quest or physical-human authority."
}

$duplicateObserverPath = Join-Path $root "observer-packet-duplicate-lineage.json"
$duplicateObserver = Get-Content $observerPath -Raw | ConvertFrom-Json
$duplicateObserver.seat.lineageId = $player.seat.lineageId
Write-Json $duplicateObserverPath $duplicateObserver
$duplicateObserverSha = Sha $duplicateObserverPath
$duplicateAdjudicationPath = Join-Path $root "adjudication-duplicate-lineage.json"
Write-Json $duplicateAdjudicationPath ([ordered]@{
    format = "rodoh-underdrain-cold-adjudication/1"
    decision = "pass"
    rubricVersion = "underdrain-role-separated-review-rubric/1"
    observerPacketSha256 = $duplicateObserverSha
    contractSha256 = $contractSha
    refusalReasons = @()
})
$duplicateAdjudicatorPath = Join-Path $root "adjudicator-packet-duplicate-lineage.json"
$duplicateAdjudicator = Get-Content $adjudicatorPath -Raw | ConvertFrom-Json
$duplicateAdjudicator.observerPacketSha256 = $duplicateObserverSha
$duplicateAdjudicator.adjudication.path = [System.IO.Path]::GetFileName($duplicateAdjudicationPath)
$duplicateAdjudicator.adjudication.sha256 = Sha $duplicateAdjudicationPath
Write-Json $duplicateAdjudicatorPath $duplicateAdjudicator
Invoke-ExpectedFailure {
    & $recorder `
        -PlayerProductTrainReceipt $trainPath `
        -PlayerSessionReceipt $keyboardPath `
        -PlayerPacket $playerPath `
        -ObserverPacket $duplicateObserverPath `
        -AdjudicatorPacket $duplicateAdjudicatorPath `
        -ReviewContract $contractPath `
        -OutputPath (Join-Path $root "duplicate-lineage-review.json")
} "Review lineage ids are not distinct" "Duplicate-lineage refusal"

Invoke-ExpectedFailure {
    & $acceptor `
        -PlayerProductTrainReceipt $trainPath `
        -KeyboardMouseSessionReceipt $keyboardPath `
        -GamepadSessionReceipt $gamepadPath `
        -RoleSeparatedReviewReceipt $reviewPath `
        -AcceptanceSeatId "seat:cold-player" `
        -AcceptanceLineageId "lineage1_$hex64d" `
        -AcceptanceContextDigest "ctx1_$hex64d" `
        -AcceptanceName "Invalid self-overlap" `
        -AcceptanceAttestation "This must be refused." `
        -OutputPath (Join-Path $root "overlap-acceptance.json")
} "Final acceptance seat participated in the role-separated review" "Acceptance-seat overlap refusal"

$receipt = [ordered]@{
    format = "rodoh-underdrain-role-separated-review-source-qualification/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "pass"
    validReview = $reviewPath
    validSoftwareAcceptance = $acceptancePath
    duplicateLineageRefused = $true
    acceptanceSeatOverlapRefused = $true
    physicalInstallationPerformed = $false
    questInvoked = $false
}
$receiptPath = Join-Path $root "qualification.json"
Write-Json $receiptPath $receipt
"$(Sha $receiptPath)  qualification.json" | Set-Content -Encoding ascii ($receiptPath + ".sha256")
Write-Host "UNDERDRAIN role-separated review admission and refusal fixtures passed."
Write-Host $receiptPath

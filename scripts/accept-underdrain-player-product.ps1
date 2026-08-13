[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)] [string]$PlayerProductTrainReceipt,
    [Parameter(Mandatory = $true)] [string]$KeyboardMouseSessionReceipt,
    [Parameter(Mandatory = $true)] [string]$GamepadSessionReceipt,
    [Parameter(Mandatory = $true)] [string]$RoleSeparatedReviewReceipt,
    [Parameter(Mandatory = $true)] [Alias("AcceptorId")] [string]$AcceptanceSeatId,
    [Parameter(Mandatory = $true)] [string]$AcceptanceLineageId,
    [Parameter(Mandatory = $true)] [string]$AcceptanceContextDigest,
    [Parameter(Mandatory = $true)] [string]$AcceptanceName,
    [Parameter(Mandatory = $true)] [Alias("AcceptorAttestation")] [string]$AcceptanceAttestation,
    [string]$OutputPath
)

. (Join-Path $PSScriptRoot "lib\underdrain-role-review-common-v1.ps1")

function Load-SessionEvidence([object]$Session, [string]$SessionPath, [string]$Label) {
    $path = Resolve-UnderdrainPath ([string]$Session.sessionEvidence) ([System.IO.Path]::GetDirectoryName($SessionPath))
    $value = Read-UnderdrainJson $path "$Label raw player-session evidence"
    if ($value.format -ne "rodoh-action-player-session-evidence/2" -or $value.status -ne "pass") {
        throw "$Label raw player-session evidence is not accepted."
    }
    return [ordered]@{ path = $path; value = $value }
}

$trainPath = Resolve-UnderdrainPath $PlayerProductTrainReceipt (Get-Location).Path
$keyboardPath = Resolve-UnderdrainPath $KeyboardMouseSessionReceipt (Get-Location).Path
$gamepadPath = Resolve-UnderdrainPath $GamepadSessionReceipt (Get-Location).Path
$reviewPath = Resolve-UnderdrainPath $RoleSeparatedReviewReceipt (Get-Location).Path

$train = Read-UnderdrainJson $trainPath "Player-product train receipt"
$keyboard = Read-UnderdrainJson $keyboardPath "Keyboard/mouse session receipt"
$gamepad = Read-UnderdrainJson $gamepadPath "Gamepad session receipt"
$review = Read-UnderdrainJson $reviewPath "Role-separated review receipt"

Require-UnderdrainSeatId $AcceptanceSeatId "Acceptance seat"
Require-UnderdrainLineage $AcceptanceLineageId "Acceptance lineage"
Require-UnderdrainContext $AcceptanceContextDigest "Acceptance context"
Require-UnderdrainNonEmpty $AcceptanceName "Acceptance name"
Require-UnderdrainNonEmpty $AcceptanceAttestation "Acceptance attestation"

if ($train.format -ne "rodoh-underdrain-unity6000-player-product-train/1" -or $train.status -ne "pass") {
    throw "Player-product train receipt is not accepted."
}
if ($train.windowsBuild -ne "pass" -or $train.exactSourceCustody -ne $true -or $train.exactDependencyCustody -ne $true -or $train.exactPrefabCustody -ne $true -or $train.exactBindingCustody -ne $true -or $train.exactRepresentationCustody -ne $true -or $train.exactCueParity -ne $true) {
    throw "Player-product train lacks Windows build, exact representation custody, or exact cue parity."
}
if ($train.primitiveFallback -ne $false -or $train.diagnosticPresentation -ne $false -or $train.activePhysicsAuthority -ne $false) {
    throw "Player-product train crossed the primitive, diagnostic, or physics-authority boundary."
}
if ($train.productionAssetCount -ne 7 -or @($train.productionAssetSourceDigests).Count -ne 7 -or $train.declaredBindingCount -ne 27 -or $train.uniqueDeclaredAssetCount -ne 23 -or $train.declaredBindingClosureSha256 -notmatch '^[0-9a-f]{64}$') {
    throw "Player-product train lacks the complete seven-asset and 27-binding production floor."
}
if ($train.presentationAdapterId -ne "production.prefab/v1" -or $train.cameraCollision -ne $true -or $train.runtimeRebinding -ne $true) {
    throw "Player-product train lacks the production adapter, camera collision, or runtime rebinding."
}

$assetApprovalPath = Resolve-UnderdrainPath ([string]$train.assetApprovalReceipt) ([System.IO.Path]::GetDirectoryName($trainPath))
$assetApproval = Read-UnderdrainJson $assetApprovalPath "Presentation-asset approval receipt"
if ($assetApproval.format -ne "rodoh-action-production-asset-approval/2" -or $assetApproval.status -ne "approved") {
    throw "Presentation-asset approval receipt is unsupported or not approved."
}
if ($assetApproval.productId -ne $train.productId -or $assetApproval.declaredBindingClosureSha256 -ne $train.declaredBindingClosureSha256) {
    throw "Presentation-asset approval differs from the accepted representation closure."
}
if ($assetApproval.assetCount -ne 7 -or $assetApproval.declaredBindingCount -ne 27 -or $assetApproval.uniqueDeclaredAssetCount -ne 23 -or $assetApproval.confirmedAllAssets -ne $true -or $assetApproval.productionApproved -ne $true -or $assetApproval.generatedPrimitive -ne $false -or $assetApproval.activePhysicsAuthority -ne $false) {
    throw "Presentation-asset approval does not cover the complete safe representation floor."
}
if ($assetApproval.playerProductAcceptance -ne "not-issued" -or $assetApproval.authorityAuthentication -ne "not-performed") {
    throw "Presentation-asset approval crossed product authority or misrepresented authentication."
}
if ($train.assetApprovalId -ne $assetApproval.approvalId -or $train.assetApprovalAuthorityId -ne $assetApproval.approvalAuthorityId -or $train.assetApprovalName -ne $assetApproval.approvalName) {
    throw "Player-product train lost presentation-approval custody."
}
$assetApprovalSha = Get-UnderdrainSha256 $assetApprovalPath
if ($train.assetApprovalReceiptSha256 -ne $assetApprovalSha) { throw "Presentation-approval receipt digest mismatch." }
if ([string]$assetApproval.approvalAuthorityId -eq $AcceptanceSeatId) {
    throw "Final product-acceptance seat must differ from the presentation-approval seat."
}

foreach ($entry in @(
    @($keyboard, $keyboardPath, "keyboard-mouse", "Keyboard/mouse"),
    @($gamepad, $gamepadPath, "gamepad", "Gamepad")
)) {
    $session = $entry[0]
    $path = [string]$entry[1]
    $device = [string]$entry[2]
    $label = [string]$entry[3]
    if ($session.format -ne "rodoh-underdrain-windows-player-session/2" -or $session.status -ne "pass") { throw "$label session is not accepted." }
    if ($session.device -ne $device) { throw "$label receipt has device '$($session.device)' instead of '$device'." }
    Require-UnderdrainIdentity $session $train $label
    if ($session.presentationAdapterId -ne "production.prefab/v1" -or $session.candidateAuthority -ne "Arc replay required") {
        throw "$label session crossed presentation or candidate authority."
    }
    if ($session.allRequiredCuesObserved -ne $true -or $session.performance.withinBudget -ne $true) {
        throw "$label session lacks cue or frame-pacing acceptance."
    }
    if ($session.provisionalParity -ne $true -or [string]::IsNullOrWhiteSpace([string]$session.acceptedReceiptDigest)) {
        throw "$label session was not accepted by exact ARC replay."
    }
    if ($session.namedPlayerProductAcceptance -ne "not-issued") { throw "$label mechanic session crossed product-acceptance authority." }
    $acceptedPath = Resolve-UnderdrainPath ([string]$session.acceptedReceipt) ([System.IO.Path]::GetDirectoryName($path))
    $accepted = Read-UnderdrainJson $acceptedPath "$label accepted ARC receipt"
    if ($accepted.format -ne "axm-action-receipt/1" -or $accepted.receiptDigest -ne $session.acceptedReceiptDigest) {
        throw "$label accepted ARC receipt is unsupported or mismatched."
    }
}

$keyboardRaw = Load-SessionEvidence $keyboard $keyboardPath "Keyboard/mouse"
$gamepadRaw = Load-SessionEvidence $gamepad $gamepadPath "Gamepad"
if ($keyboardRaw.value.sawKeyboardMouse -ne $true -or $gamepadRaw.value.sawGamepad -ne $true) {
    throw "Required input devices were not observed by the built player."
}
if ($keyboardRaw.value.rebindingAvailable -ne $true -or $gamepadRaw.value.rebindingAvailable -ne $true) {
    throw "Built-player sessions did not retain runtime rebinding."
}
if ($gamepad.bindingProfileDigest -eq $train.bindingProfileDigest) {
    throw "Gamepad acceptance requires a persisted runtime rebind."
}
if (($keyboard.cameraCollisionAdjustments + $gamepad.cameraCollisionAdjustments) -lt 1) {
    throw "Neither Windows session exercised a real camera-collision adjustment."
}

if ($review.format -ne "rodoh-underdrain-role-separated-review-receipt/1" -or $review.status -ne "pass") {
    throw "Role-separated software review receipt is not accepted."
}
Require-UnderdrainIdentity $review $train "Role-separated review"
if ($review.softwareScope -ne "windows-player-product" -or $review.physicalInstallationScope -ne "separate") {
    throw "Role-separated review conflates software and physical-installation evidence."
}
if ($review.runtimeIssued -ne $false -or $review.candidateAuthorIssued -ne $false -or $review.productAcceptance -ne "not-issued") {
    throw "Role-separated review crossed runtime, candidate-author, or product-acceptance authority."
}
if ($review.independence.distinctSeats -ne $true -or $review.independence.distinctLineages -ne $true -or $review.independence.distinctContexts -ne $true -or $review.independence.sourceIsolated -ne $true -or $review.independence.candidateAuthorExcluded -ne $true -or $review.independence.artifactMutationCapability -ne $false) {
    throw "Role-separated review lost its independence or read-only boundary."
}
if ($review.learning.teachPracticeMasterComplete -ne $true) { throw "Cold player did not complete teach, practice, and mastery." }
$answers = @($review.comprehension.playerRole, $review.comprehension.immediateConflict, $review.comprehension.authoredChoice, $review.comprehension.acceptedConsequence, $review.comprehension.nextPlayableAction)
if (@($answers | Where-Object { $_.matched -ne $true }).Count -ne 0) { throw "Role-separated review did not match all five canonical answers." }
if ($review.behavior.abandonedBeforeConsequence -ne $false -or $review.behavior.voluntarilyContinuedAfterConsequence -ne $true) {
    throw "Cold player did not complete and voluntarily continue after consequence."
}

$reviewSeatIds = @([string]$review.seats.player.seatId, [string]$review.seats.observer.seatId, [string]$review.seats.adjudicator.seatId)
$reviewLineages = @([string]$review.seats.player.lineageId, [string]$review.seats.observer.lineageId, [string]$review.seats.adjudicator.lineageId)
$reviewContexts = @([string]$review.seats.player.contextDigest, [string]$review.seats.observer.contextDigest, [string]$review.seats.adjudicator.contextDigest)
Require-UnderdrainDistinct $reviewSeatIds "Review seat ids"
Require-UnderdrainDistinct $reviewLineages "Review lineages"
Require-UnderdrainDistinct $reviewContexts "Review contexts"
foreach ($value in $reviewSeatIds) { Require-UnderdrainSeatId $value "Review seat" }
foreach ($value in $reviewLineages) { Require-UnderdrainLineage $value "Review lineage" }
foreach ($value in $reviewContexts) { Require-UnderdrainContext $value "Review context" }
if ($AcceptanceSeatId -in $reviewSeatIds) { throw "Final acceptance seat participated in the role-separated review." }
if ($AcceptanceLineageId -in $reviewLineages) { throw "Final acceptance lineage participated in the role-separated review." }
if ($AcceptanceContextDigest -in $reviewContexts) { throw "Final acceptance context participated in the role-separated review." }

$reviewSessionPath = Resolve-UnderdrainPath ([string]$review.playerSessionReceipt) ([System.IO.Path]::GetDirectoryName($reviewPath))
if ($reviewSessionPath -ne $keyboardPath -and $reviewSessionPath -ne $gamepadPath) {
    throw "Role-separated review does not cite either accepted mechanic session."
}
$reviewSessionSha = Get-UnderdrainSha256 $reviewSessionPath
if ($review.playerSessionReceiptSha256 -ne $reviewSessionSha) { throw "Role-separated review session digest mismatch." }

$evidenceFiles = @($trainPath, $assetApprovalPath, $keyboardPath, $gamepadPath, $keyboardRaw.path, $gamepadRaw.path, $reviewPath)
$evidence = @($evidenceFiles | ForEach-Object { [ordered]@{ path = $_; sha256 = Get-UnderdrainSha256 $_ } })
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Join-Path ([System.IO.Path]::GetDirectoryName($trainPath)) "underdrain-player-product-acceptance.json"
}
$output = Resolve-UnderdrainPath $OutputPath (Get-Location).Path
New-Item -ItemType Directory -Force ([System.IO.Path]::GetDirectoryName($output)) | Out-Null
$receipt = [ordered]@{
    format = "rodoh-underdrain-player-product-acceptance/2"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "accepted"
    accepted = $true
    scope = "windows-software-player-product"
    acceptanceName = $AcceptanceName
    acceptanceSeat = [ordered]@{
        seatId = $AcceptanceSeatId
        lineageId = $AcceptanceLineageId
        contextDigest = $AcceptanceContextDigest
        attestation = $AcceptanceAttestation
        artifactMutationCapability = $false
    }
    productId = $train.productId
    worldCommit = $train.worldCommit
    arcCommit = $train.arcCommit
    productProfileSha256 = $train.productProfileSha256
    windowsProduct = $train.windowsProduct
    windowsProductSha256 = $train.windowsProductSha256
    actionSpecDigest = $train.actionSpecDigest
    arcDigest = $train.arcDigest
    challengeId = $train.challengeId
    timingProfileId = $train.timingProfileId
    presentationManifestId = $train.presentationManifestId
    sceneJobDigest = $train.sceneJobDigest
    presentationAdapterId = $train.presentationAdapterId
    productionAssetCount = $train.productionAssetCount
    exactSourceCustody = $train.exactSourceCustody
    exactDependencyCustody = $train.exactDependencyCustody
    exactPrefabCustody = $train.exactPrefabCustody
    exactBindingCustody = $train.exactBindingCustody
    exactRepresentationCustody = $train.exactRepresentationCustody
    declaredBindingCount = $train.declaredBindingCount
    uniqueDeclaredAssetCount = $train.uniqueDeclaredAssetCount
    declaredBindingClosureSha256 = $train.declaredBindingClosureSha256
    exactCueParity = $train.exactCueParity
    presentationApproval = [ordered]@{
        receipt = $assetApprovalPath
        receiptSha256 = $assetApprovalSha
        approvalId = $assetApproval.approvalId
        approvalSeatId = $assetApproval.approvalAuthorityId
        approvalName = $assetApproval.approvalName
        approvedAt = $assetApproval.approvedAt
        declaredBindingClosureSha256 = $assetApproval.declaredBindingClosureSha256
    }
    keyboardMouseSession = [ordered]@{
        receipt = $keyboardPath
        acceptedArcReceiptDigest = $keyboard.acceptedReceiptDigest
        bindingProfileDigest = $keyboard.bindingProfileDigest
        cameraCollisionAdjustments = $keyboard.cameraCollisionAdjustments
        performance = $keyboard.performance
    }
    gamepadAndRebindingSession = [ordered]@{
        receipt = $gamepadPath
        acceptedArcReceiptDigest = $gamepad.acceptedReceiptDigest
        bindingProfileDigest = $gamepad.bindingProfileDigest
        cameraCollisionAdjustments = $gamepad.cameraCollisionAdjustments
        performance = $gamepad.performance
    }
    roleSeparatedReview = [ordered]@{
        receipt = $reviewPath
        receiptSha256 = Get-UnderdrainSha256 $reviewPath
        acceptedArcReceiptDigest = $review.acceptedArcReceiptDigest
        playerSeatId = $review.seats.player.seatId
        observerSeatId = $review.seats.observer.seatId
        adjudicatorSeatId = $review.seats.adjudicator.seatId
        teachPracticeMasterComplete = $review.learning.teachPracticeMasterComplete
        nextPlayableActionId = $review.comprehension.nextPlayableAction.observedId
        voluntarilyContinuedAfterConsequence = $review.behavior.voluntarilyContinuedAfterConsequence
    }
    evidence = $evidence
    physicalHumanEvidence = "separate-not-required-for-software-scope"
    questAcceptance = "not-issued"
    physicalQuestAcceptance = "open"
}
$receipt | ConvertTo-Json -Depth 40 | Set-Content -Encoding utf8 $output
$hash = Get-UnderdrainSha256 $output
"$hash  $([System.IO.Path]::GetFileName($output))" | Set-Content -Encoding ascii ($output + ".sha256")
Write-Host "UNDERDRAIN Windows software player product accepted on role-separated evidence."
Write-Host "Quest and physical-installation evidence remain separate and open."
Write-Host $output

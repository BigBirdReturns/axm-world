[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)] [string]$PlayerProductTrainReceipt,
    [Parameter(Mandatory = $true)] [string]$PlayerSessionReceipt,
    [Parameter(Mandatory = $true)] [string]$PlayerPacket,
    [Parameter(Mandatory = $true)] [string]$ObserverPacket,
    [Parameter(Mandatory = $true)] [string]$AdjudicatorPacket,
    [string]$ReviewContract,
    [string]$OutputPath
)

. (Join-Path $PSScriptRoot "lib\underdrain-role-review-common-v1.ps1")

$worldRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$trainPath = Resolve-UnderdrainPath $PlayerProductTrainReceipt (Get-Location).Path
$sessionPath = Resolve-UnderdrainPath $PlayerSessionReceipt (Get-Location).Path
$playerPath = Resolve-UnderdrainPath $PlayerPacket (Get-Location).Path
$observerPath = Resolve-UnderdrainPath $ObserverPacket (Get-Location).Path
$adjudicatorPath = Resolve-UnderdrainPath $AdjudicatorPacket (Get-Location).Path
if ([string]::IsNullOrWhiteSpace($ReviewContract)) {
    $ReviewContract = Join-Path $worldRoot "unity\Fixtures\underdrain.role-separated-software-review.json"
}
$contractPath = Resolve-UnderdrainPath $ReviewContract $worldRoot

$train = Read-UnderdrainJson $trainPath "Player-product train receipt"
$session = Read-UnderdrainJson $sessionPath "Player session receipt"
$player = Read-UnderdrainJson $playerPath "Player review packet"
$observer = Read-UnderdrainJson $observerPath "Observer review packet"
$adjudicator = Read-UnderdrainJson $adjudicatorPath "Adjudicator review packet"
$contract = Read-UnderdrainJson $contractPath "Role-separated review contract"

if ($train.format -ne "rodoh-underdrain-unity6000-player-product-train/1" -or $train.status -ne "pass") {
    throw "Player-product train is not accepted for software review."
}
if ($train.windowsBuild -ne "pass" -or [string]::IsNullOrWhiteSpace([string]$train.windowsProductSha256)) {
    throw "Software review requires the exact qualified Windows product."
}
if ($session.format -ne "rodoh-underdrain-windows-player-session/2" -or $session.status -ne "pass") {
    throw "Player session is not an accepted Windows mechanic session."
}
Require-UnderdrainIdentity $session $train "Player session"
if ($session.presentationAdapterId -ne "production.prefab/v1" -or $session.candidateAuthority -ne "Arc replay required") {
    throw "Player session crossed the presentation or candidate-authority boundary."
}
if ($session.allRequiredCuesObserved -ne $true -or $session.performance.withinBudget -ne $true -or $session.provisionalParity -ne $true) {
    throw "Player session lacks cue, timing, or exact ARC replay acceptance."
}

if ($contract.format -ne "rodoh-underdrain-role-separated-review/1") { throw "Review contract format is unsupported." }
Require-UnderdrainEqual $contract.productId $train.productId "Review contract product"
Require-UnderdrainEqual $contract.challengeId $train.challengeId "Review contract challenge"
Require-UnderdrainEqual $contract.timingProfileId $train.timingProfileId "Review contract timing profile"
if ($contract.softwareScope -ne "windows-player-product" -or $contract.physicalInstallationScope -ne "separate") {
    throw "Review contract conflates software and installation scope."
}
if ($contract.independence.artifactMutationAllowed -ne $false -or $contract.independence.runtimeMayIssue -ne $false -or $contract.independence.candidateAuthorMayIssue -ne $false) {
    throw "Review contract grants forbidden mutation or issuance authority."
}
if ($contract.independence.minimumDistinctSeats -ne 3 -or $contract.independence.minimumDistinctLineages -ne 3 -or $contract.independence.minimumDistinctContexts -ne 3) {
    throw "Review contract lost its three-seat independence floor."
}
if ($contract.authority.reviewMayAcceptArcConsequence -ne $false -or $contract.authority.reviewMayAcceptPlayerProduct -ne $false) {
    throw "Review contract crossed ARC or product-acceptance authority."
}

$expectedFormats = @(
    [string]$contract.packetFormats.player,
    [string]$contract.packetFormats.observer,
    [string]$contract.packetFormats.adjudicator
)
$packets = @($player, $observer, $adjudicator)
$labels = @("Player", "Observer", "Adjudicator")
$sessionSha = Get-UnderdrainSha256 $sessionPath
for ($index = 0; $index -lt 3; $index += 1) {
    $packet = $packets[$index]
    if ($packet.format -ne $expectedFormats[$index]) { throw "$($labels[$index]) packet format is unsupported." }
    Require-UnderdrainIdentity $packet $train "$($labels[$index]) packet"
    Require-UnderdrainEqual $packet.playerSessionReceiptSha256 $sessionSha "$($labels[$index]) session receipt"
    Require-UnderdrainSeatId ([string]$packet.seat.seatId) "$($labels[$index]) seat"
    Require-UnderdrainLineage ([string]$packet.seat.lineageId) "$($labels[$index]) lineage"
    Require-UnderdrainContext ([string]$packet.seat.contextDigest) "$($labels[$index]) context"
    if ($packet.artifactMutationCapability -ne $false) { throw "$($labels[$index]) function retains artifact mutation capability." }
    if ($packet.candidateAuthor -ne $false) { throw "$($labels[$index]) function authored the candidate." }
}

$seatIds = @([string]$player.seat.seatId, [string]$observer.seat.seatId, [string]$adjudicator.seat.seatId)
$lineageIds = @([string]$player.seat.lineageId, [string]$observer.seat.lineageId, [string]$adjudicator.seat.lineageId)
$contextDigests = @([string]$player.seat.contextDigest, [string]$observer.seat.contextDigest, [string]$adjudicator.seat.contextDigest)
Require-UnderdrainDistinct $seatIds "Review seat ids"
Require-UnderdrainDistinct $lineageIds "Review lineage ids"
Require-UnderdrainDistinct $contextDigests "Review context digests"

if ($player.access -ne $contract.independence.playerAccess) { throw "Player access exceeds the contract." }
if ($observer.access -ne $contract.independence.observerAccess) { throw "Observer access exceeds the contract." }
if ($adjudicator.access -ne $contract.independence.adjudicatorAccess) { throw "Adjudicator access exceeds the contract." }
if ($player.sourceAccess -ne "none" -or $player.rubricAccess -ne "none" -or $player.answerKeyAccess -ne "none") {
    throw "Player packet reports forbidden source, rubric, or answer-key access."
}
if ($observer.sourceAccess -ne "none" -or $observer.rubricAccess -ne "none" -or $observer.answerKeyAccess -ne "none") {
    throw "Observer packet reports forbidden source, rubric, or answer-key access."
}
if ($adjudicator.sourceScope -ne "contract-and-observation-only") { throw "Adjudicator source scope exceeds the contract." }
if ($player.receivedWalkthrough -ne $false -or [int]$player.assistanceEvents -ne 0) {
    throw "Player packet reports a walkthrough or assistance event."
}
if ($player.completedSession -ne $true -or $player.voluntarilyContinuedAfterConsequence -ne $true) {
    throw "Player did not complete and continue after the accepted consequence."
}

$playerSha = Get-UnderdrainSha256 $playerPath
$observerSha = Get-UnderdrainSha256 $observerPath
$adjudicatorSha = Get-UnderdrainSha256 $adjudicatorPath
$contractSha = Get-UnderdrainSha256 $contractPath
Require-UnderdrainEqual $observer.playerPacketSha256 $playerSha "Observer player packet"
Require-UnderdrainEqual $adjudicator.observerPacketSha256 $observerSha "Adjudicator observer packet"
Require-UnderdrainEqual $adjudicator.contractSha256 $contractSha "Adjudicator contract"
if ($adjudicator.rubricVersion -ne "underdrain-role-separated-review-rubric/1") { throw "Adjudicator rubric version is unsupported." }
if ($adjudicator.decision -ne "pass") { throw "Adjudicator did not return a passing software-review decision." }

$transcript = Resolve-UnderdrainReference $player.transcript $playerPath "Player transcript"
$notes = Resolve-UnderdrainReference $observer.notes $observerPath "Observer notes"
$adjudication = Resolve-UnderdrainReference $adjudicator.adjudication $adjudicatorPath "Adjudication record"

$acceptedPath = Resolve-UnderdrainPath ([string]$session.acceptedReceipt) ([System.IO.Path]::GetDirectoryName($sessionPath))
$accepted = Read-UnderdrainJson $acceptedPath "Accepted ARC receipt"
if ($accepted.format -ne "axm-action-receipt/1") { throw "Accepted ARC receipt format is unsupported." }
Require-UnderdrainEqual $accepted.receiptDigest $session.acceptedReceiptDigest "Accepted ARC receipt digest"
Require-UnderdrainEqual $accepted.timingProfileId $train.timingProfileId "Accepted ARC timing profile"
$outcome = [string]$accepted.result.outcome
if ($outcome -notin @("success", "partial", "failure")) { throw "Accepted ARC outcome is unsupported: $outcome" }
$expectedConsequence = [string]$contract.answers.consequenceByOutcome.$outcome
Require-UnderdrainNonEmpty $expectedConsequence "Expected consequence"

$requiredObjectives = @($contract.learningSequence | ForEach-Object { [string]$_ })
$completedObjectives = @($accepted.result.completedObjectiveIds | ForEach-Object { [string]$_ })
$missing = @($requiredObjectives | Where-Object { $_ -notin $completedObjectives })
if ($missing.Count -gt 0) { throw "Teach, practice, and mastery are incomplete: $($missing -join ', ')." }

if ([string]$observer.observations.chosenStrategyId -notin @($contract.answers.allowedChoiceIds)) {
    throw "Observer recorded an unsupported authored choice."
}
Require-UnderdrainEqual $observer.observations.authoredChoiceId $observer.observations.chosenStrategyId "Observer authored choice"
if ([double]$observer.observations.firstAuthoredDecisionMs -lt 0 -or [double]$observer.observations.firstAcceptedConsequenceMs -lt [double]$observer.observations.firstAuthoredDecisionMs) {
    throw "Observer timing is invalid."
}
if ($observer.behavior.abandonedBeforeConsequence -ne $false -or $observer.behavior.voluntarilyContinuedAfterConsequence -ne $true) {
    throw "Observer did not record completion and voluntary continuation."
}

$answers = [ordered]@{
    playerRole = [ordered]@{
        expectedId = [string]$contract.answers.playerRoleId
        observedId = [string]$observer.observations.playerRoleId
        matched = ([string]$contract.answers.playerRoleId -eq [string]$observer.observations.playerRoleId)
    }
    immediateConflict = [ordered]@{
        expectedId = [string]$contract.answers.immediateConflictId
        observedId = [string]$observer.observations.immediateConflictId
        matched = ([string]$contract.answers.immediateConflictId -eq [string]$observer.observations.immediateConflictId)
    }
    authoredChoice = [ordered]@{
        expectedId = [string]$observer.observations.chosenStrategyId
        observedId = [string]$observer.observations.authoredChoiceId
        matched = ([string]$observer.observations.chosenStrategyId -eq [string]$observer.observations.authoredChoiceId)
    }
    acceptedConsequence = [ordered]@{
        expectedId = $expectedConsequence
        observedId = [string]$observer.observations.acceptedConsequenceId
        matched = ($expectedConsequence -eq [string]$observer.observations.acceptedConsequenceId)
    }
    nextPlayableAction = [ordered]@{
        expectedId = [string]$contract.answers.nextPlayableActionId
        observedId = [string]$observer.observations.nextPlayableActionId
        matched = ([string]$contract.answers.nextPlayableActionId -eq [string]$observer.observations.nextPlayableActionId)
    }
}
if (@($answers.Values | Where-Object { $_.matched -ne $true }).Count -gt 0) {
    throw "Role-separated review did not match every canonical answer."
}

$adjudicationRecord = Read-UnderdrainJson $adjudication "Adjudication record"
if ($adjudicationRecord.format -ne "rodoh-underdrain-cold-adjudication/1" -or $adjudicationRecord.decision -ne "pass") {
    throw "Adjudication record is unsupported or refused."
}
Require-UnderdrainEqual $adjudicationRecord.rubricVersion $adjudicator.rubricVersion "Adjudication rubric"
Require-UnderdrainEqual $adjudicationRecord.observerPacketSha256 $observerSha "Adjudication observer packet"
Require-UnderdrainEqual $adjudicationRecord.contractSha256 $contractSha "Adjudication contract"
if (@($adjudicationRecord.refusalReasons).Count -ne 0) { throw "Passing adjudication retains refusal reasons." }

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Join-Path ([System.IO.Path]::GetDirectoryName($sessionPath)) "role-separated-review.json"
}
$output = Resolve-UnderdrainPath $OutputPath (Get-Location).Path
New-Item -ItemType Directory -Force ([System.IO.Path]::GetDirectoryName($output)) | Out-Null
$receipt = [ordered]@{
    format = [string]$contract.reviewReceiptFormat
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "pass"
    softwareScope = [string]$contract.softwareScope
    physicalInstallationScope = [string]$contract.physicalInstallationScope
    productId = $train.productId
    worldCommit = $train.worldCommit
    arcCommit = $train.arcCommit
    productProfileSha256 = $train.productProfileSha256
    windowsProductSha256 = $train.windowsProductSha256
    actionSpecDigest = $train.actionSpecDigest
    arcDigest = $train.arcDigest
    challengeId = $train.challengeId
    timingProfileId = $train.timingProfileId
    presentationManifestId = $train.presentationManifestId
    sceneJobDigest = $train.sceneJobDigest
    playerSessionReceipt = $sessionPath
    playerSessionReceiptSha256 = $sessionSha
    acceptedArcReceipt = $acceptedPath
    acceptedArcReceiptDigest = $accepted.receiptDigest
    outcome = $outcome
    seats = [ordered]@{
        player = [ordered]@{ seatId = $seatIds[0]; lineageId = $lineageIds[0]; contextDigest = $contextDigests[0] }
        observer = [ordered]@{ seatId = $seatIds[1]; lineageId = $lineageIds[1]; contextDigest = $contextDigests[1] }
        adjudicator = [ordered]@{ seatId = $seatIds[2]; lineageId = $lineageIds[2]; contextDigest = $contextDigests[2] }
    }
    independence = [ordered]@{
        distinctSeats = $true
        distinctLineages = $true
        distinctContexts = $true
        sourceIsolated = $true
        candidateAuthorExcluded = $true
        artifactMutationCapability = $false
    }
    timing = [ordered]@{
        firstAuthoredDecisionMs = [double]$observer.observations.firstAuthoredDecisionMs
        firstAcceptedConsequenceMs = [double]$observer.observations.firstAcceptedConsequenceMs
    }
    learning = [ordered]@{
        requiredObjectiveIds = $requiredObjectives
        completedObjectiveIds = $completedObjectives
        teachPracticeMasterComplete = $true
    }
    comprehension = $answers
    behavior = $observer.behavior
    evidence = @(
        [ordered]@{ path = $trainPath; sha256 = Get-UnderdrainSha256 $trainPath },
        [ordered]@{ path = $sessionPath; sha256 = $sessionSha },
        [ordered]@{ path = $contractPath; sha256 = $contractSha },
        [ordered]@{ path = $playerPath; sha256 = $playerSha },
        [ordered]@{ path = $observerPath; sha256 = $observerSha },
        [ordered]@{ path = $adjudicatorPath; sha256 = $adjudicatorSha },
        [ordered]@{ path = $transcript; sha256 = Get-UnderdrainSha256 $transcript },
        [ordered]@{ path = $notes; sha256 = Get-UnderdrainSha256 $notes },
        [ordered]@{ path = $adjudication; sha256 = Get-UnderdrainSha256 $adjudication },
        [ordered]@{ path = $acceptedPath; sha256 = Get-UnderdrainSha256 $acceptedPath }
    )
    runtimeIssued = $false
    candidateAuthorIssued = $false
    productAcceptance = "not-issued"
    physicalHumanEvidence = "separate-not-inferred"
}
$receipt | ConvertTo-Json -Depth 40 | Set-Content -Encoding utf8 $output
$hash = Get-UnderdrainSha256 $output
"$hash  $([System.IO.Path]::GetFileName($output))" | Set-Content -Encoding ascii ($output + ".sha256")
Write-Host "UNDERDRAIN role-separated software review passed."
Write-Host "This receipt does not accept the product or qualify a physical installation."
Write-Host $output

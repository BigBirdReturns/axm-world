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

. (Join-Path $PSScriptRoot "lib\underdrain-review-common.ps1")

$worldRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$trainPath = Resolve-UnderdrainPath $PlayerProductTrainReceipt (Get-Location).Path
$sessionPath = Resolve-UnderdrainPath $PlayerSessionReceipt (Get-Location).Path
$playerPath = Resolve-UnderdrainPath $PlayerPacket (Get-Location).Path
$observerPath = Resolve-UnderdrainPath $ObserverPacket (Get-Location).Path
$adjudicatorPath = Resolve-UnderdrainPath $AdjudicatorPacket (Get-Location).Path
if ([string]::IsNullOrWhiteSpace($ReviewContract)) {
    $ReviewContract = Join-Path $worldRoot "unity\Fixtures\underdrain.role-separated-review.json"
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
if ($contract.independence.artifactMutationAllowed -ne $false -or $contract.independence.runtimeMayIssue -ne $false -or $contract.independence.candidateAuthorMayIssue -ne $false) {
    throw "Review contract grants forbidden mutation or issuance authority."
}
if ($contract.softwareScope -ne "windows-player-product" -or $contract.physicalInstallationScope -ne "separate") {
    throw "Review contract conflates software and installation scope."
}

$expectedFormats = @(
    [string]$contract.packetFormats.player,
    [string]$contract.packetFormats.observer,
    [string]$contract.packetFormats.adjudicator
)
$packets = @($player, $observer, $adjudicator)
$packetPaths = @($playerPath, $observerPath, $adjudicatorPath)
$labels = @("Player", "Observer", "Adjudicator")
$sessionSha = Get-UnderdrainSha256 $sessionPath
for ($index = 0; $index -lt 3; $index += 1) {
    $packet = $packets[$index]
    if ($packet.format -ne $expectedFormats[$index]) { throw "$($labels[$index]) packet format is unsupported." }
    Require-UnderdrainIdentity $packet $train "$($labels[$index]) packet"
    Require-UnderdrainEqual $packet.playerSessionReceiptSha256 $sessionSha "$($labels[$index]) session receipt"
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
if ($player.receivedWalkthrough -ne $false -or [int]$player.assistanceEvents -ne 0) { throw "Player packet reports a walkthrough or assistance event." }
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
if ($observer.behavior.abandonedBeforeConsequence -ne $false -or $observer.behavior.voluntarilyContinuedAfterConsequence -ne $true) {
    throw "Observer did not record completion and voluntary continuation."
}

$expected = [ordered]@{
    playerRoleId = [string]$contract.answers.playerRoleId
    immediateConflictId = [string]$contract.answers.immediateConflictId
    authoredChoiceId = [string]$observer.observations.chosenStrategyId
    acceptedConsequenceId = $expectedConsequence
    nextPlayableActionId = [string]$contract.answers.nextPlayableActionId
}
foreach ($field in $expected.Keys) {
    Require-UnderdrainEqual $observer.observations.$field $expected[$field] "Observer $field"
    Require-UnderdrainEqual $adjudicator.answers.$field $expected[$field] "Adjudicator $field"
}
if ($adjudicator.verdict -ne "pass") { throw "Adjudicator did not pass the review packet." }

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Join-Path ([System.IO.Path]::GetDirectoryName($sessionPath)) "role-separated-review.json"
}
$output = Resolve-UnderdrainPath $OutputPath (Get-Location).Path
New-Item -ItemType Directory -Force ([System.IO.Path]::GetDirectoryName($output)) | Out-Null
$receipt = [ordered]@{
    format = "rodoh-underdrain-role-separated-review-receipt/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "pass"
    scope = "windows-player-product"
    productId = $train.productId
    worldCommit = $train.worldCommit
    arcCommit = $train.arcCommit
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
    packets = [ordered]@{
        player = [ordered]@{ path = $playerPath; sha256 = $playerSha; seat = $player.seat; transcript = $transcript }
        observer = [ordered]@{ path = $observerPath; sha256 = $observerSha; seat = $observer.seat; notes = $notes }
        adjudicator = [ordered]@{ path = $adjudicatorPath; sha256 = $adjudicatorSha; seat = $adjudicator.seat; adjudication = $adjudication }
        contract = [ordered]@{ path = $contractPath; sha256 = $contractSha }
    }
    answers = $expected
    teachPracticeMasterComplete = $true
    voluntarilyContinuedAfterConsequence = $true
    distinctSeatIds = $true
    distinctLineageIds = $true
    distinctContextDigests = $true
    artifactMutationAllowed = $false
    runtimeIssued = $false
    candidateAuthorIssued = $false
    productAcceptance = "not-issued"
    physicalInstallationScope = "separate-open"
}
$receipt | ConvertTo-Json -Depth 30 | Set-Content -Encoding utf8 $output
$hash = Get-UnderdrainSha256 $output
"$hash  $([System.IO.Path]::GetFileName($output))" | Set-Content -Encoding ascii ($output + ".sha256")
Write-Host "UNDERDRAIN role-separated software review passed."
Write-Host "Product acceptance and installation evidence remain separate."
Write-Host $output

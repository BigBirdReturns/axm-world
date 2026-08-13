[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)] [string]$PlayerProductTrainReceipt,
    [Parameter(Mandatory = $true)] [string]$PlayerSessionReceipt,
    [string]$ReviewContract,
    [Parameter(Mandatory = $true)] [string]$OutputRoot
)

. (Join-Path $PSScriptRoot "lib\underdrain-role-review-common-v1.ps1")

$worldRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$trainPath = Resolve-UnderdrainPath $PlayerProductTrainReceipt (Get-Location).Path
$sessionPath = Resolve-UnderdrainPath $PlayerSessionReceipt (Get-Location).Path
if ([string]::IsNullOrWhiteSpace($ReviewContract)) {
    $ReviewContract = Join-Path $worldRoot "unity\Fixtures\underdrain.role-separated-software-review.json"
}
$contractPath = Resolve-UnderdrainPath $ReviewContract $worldRoot
$output = Resolve-UnderdrainPath $OutputRoot (Get-Location).Path

$train = Read-UnderdrainJson $trainPath "Player-product train receipt"
$session = Read-UnderdrainJson $sessionPath "Player session receipt"
$contract = Read-UnderdrainJson $contractPath "Role-separated review contract"
if ($train.format -ne "rodoh-underdrain-unity6000-player-product-train/1" -or $train.status -ne "pass") {
    throw "Player-product train is not accepted for review-kit creation."
}
if ($train.windowsBuild -ne "pass" -or [string]::IsNullOrWhiteSpace([string]$train.windowsProductSha256)) {
    throw "Review-kit creation requires the exact qualified Windows product."
}
if ($session.format -ne "rodoh-underdrain-windows-player-session/2" -or $session.status -ne "pass") {
    throw "Review-kit creation requires one accepted Windows mechanic session."
}
Require-UnderdrainIdentity $session $train "Player session"
if ($session.candidateAuthority -ne "Arc replay required" -or $session.provisionalParity -ne $true) {
    throw "Player session lacks exact ARC replay or crossed candidate authority."
}
if ($contract.format -ne "rodoh-underdrain-role-separated-review/1") { throw "Review contract format is unsupported." }
Require-UnderdrainEqual $contract.productId $train.productId "Review contract product"
Require-UnderdrainEqual $contract.challengeId $train.challengeId "Review contract challenge"
Require-UnderdrainEqual $contract.timingProfileId $train.timingProfileId "Review contract timing profile"

if (Test-Path $output) {
    if (@(Get-ChildItem -LiteralPath $output -Force).Count -gt 0) { throw "Review-kit output is not empty: $output" }
} else {
    New-Item -ItemType Directory -Force $output | Out-Null
}

$contractCopy = Join-Path $output "review-contract.json"
Copy-Item -LiteralPath $contractPath -Destination $contractCopy
$sessionSha = Get-UnderdrainSha256 $sessionPath
$identity = [ordered]@{
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
    playerSessionReceiptSha256 = $sessionSha
}

function With-Identity([ordered]$Body) {
    $value = [ordered]@{}
    foreach ($entry in $identity.GetEnumerator()) { $value[$entry.Key] = $entry.Value }
    foreach ($entry in $Body.GetEnumerator()) { $value[$entry.Key] = $entry.Value }
    return $value
}

$player = With-Identity ([ordered]@{
    format = [string]$contract.packetFormats.player
    seat = [ordered]@{ seatId = "seat:replace-cold-player"; lineageId = "lineage1_replace"; contextDigest = "ctx1_replace" }
    access = [string]$contract.independence.playerAccess
    sourceAccess = "none"
    rubricAccess = "none"
    answerKeyAccess = "none"
    artifactMutationCapability = $false
    candidateAuthor = $false
    receivedWalkthrough = $false
    assistanceEvents = 0
    completedSession = $false
    voluntarilyContinuedAfterConsequence = $false
    transcript = [ordered]@{ path = "player-transcript.json"; sha256 = "replace-with-64-lowercase-hex" }
})
$observer = With-Identity ([ordered]@{
    format = [string]$contract.packetFormats.observer
    seat = [ordered]@{ seatId = "seat:replace-cold-observer"; lineageId = "lineage1_replace"; contextDigest = "ctx1_replace" }
    access = [string]$contract.independence.observerAccess
    sourceAccess = "none"
    rubricAccess = "none"
    answerKeyAccess = "none"
    artifactMutationCapability = $false
    candidateAuthor = $false
    playerPacketSha256 = "replace-with-64-lowercase-hex"
    notes = [ordered]@{ path = "observer-notes.json"; sha256 = "replace-with-64-lowercase-hex" }
    observations = [ordered]@{
        firstAuthoredDecisionMs = 0
        firstAcceptedConsequenceMs = 0
        playerRoleId = "replace"
        immediateConflictId = "replace"
        chosenStrategyId = "replace"
        authoredChoiceId = "replace"
        acceptedConsequenceId = "replace"
        nextPlayableActionId = "replace"
    }
    behavior = [ordered]@{ wrongTurns = 0; knockdowns = 0; retries = 0; abandonedBeforeConsequence = $false; voluntarilyContinuedAfterConsequence = $false }
})
$adjudicator = With-Identity ([ordered]@{
    format = [string]$contract.packetFormats.adjudicator
    seat = [ordered]@{ seatId = "seat:replace-cold-adjudicator"; lineageId = "lineage1_replace"; contextDigest = "ctx1_replace" }
    access = [string]$contract.independence.adjudicatorAccess
    sourceScope = "contract-and-observation-only"
    artifactMutationCapability = $false
    candidateAuthor = $false
    observerPacketSha256 = "replace-with-64-lowercase-hex"
    contractSha256 = Get-UnderdrainSha256 $contractCopy
    rubricVersion = "underdrain-role-separated-review-rubric/1"
    decision = "replace-with-pass-or-refuse"
    adjudication = [ordered]@{ path = "adjudication.json"; sha256 = "replace-with-64-lowercase-hex" }
})

$playerPath = Join-Path $output "player-packet.template.json"
$observerPath = Join-Path $output "observer-packet.template.json"
$adjudicatorPath = Join-Path $output "adjudicator-packet.template.json"
$player | ConvertTo-Json -Depth 30 | Set-Content -Encoding utf8 $playerPath
$observer | ConvertTo-Json -Depth 30 | Set-Content -Encoding utf8 $observerPath
$adjudicator | ConvertTo-Json -Depth 30 | Set-Content -Encoding utf8 $adjudicatorPath

@"
# UNDERDRAIN role-separated review kit

This kit is an input boundary, not a review receipt. Instantiate three independent seats from separate lineages and contexts. Give the player seat only the exact built product and ordinary instructions. Give the observer seat only the immutable session capture and completed player packet. Give the adjudicator seat only the frozen contract, completed observer packet, and accepted ARC receipt.

Replace every placeholder, create the cited transcript, notes, and adjudication files, recompute all SHA-256 fields, and run `scripts/record-underdrain-role-separated-software-review.ps1`. No seat may modify the product or have authored the candidate. Human physical evidence remains a separate installation lane.
"@ | Set-Content -Encoding utf8 (Join-Path $output "README.md")

$kitReceipt = [ordered]@{
    format = "rodoh-underdrain-role-separated-review-kit/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "ready"
    productId = $train.productId
    worldCommit = $train.worldCommit
    arcCommit = $train.arcCommit
    windowsProductSha256 = $train.windowsProductSha256
    playerSessionReceipt = $sessionPath
    playerSessionReceiptSha256 = $sessionSha
    reviewContract = $contractCopy
    reviewContractSha256 = Get-UnderdrainSha256 $contractCopy
    templates = @($playerPath, $observerPath, $adjudicatorPath)
    reviewIssued = $false
    productAcceptance = "not-issued"
    physicalInstallationEvidence = "separate"
}
$kitPath = Join-Path $output "review-kit-receipt.json"
$kitReceipt | ConvertTo-Json -Depth 20 | Set-Content -Encoding utf8 $kitPath
$kitHash = Get-UnderdrainSha256 $kitPath
"$kitHash  review-kit-receipt.json" | Set-Content -Encoding ascii ($kitPath + ".sha256")
Write-Host "UNDERDRAIN role-separated review kit created. No review or product acceptance was issued."
Write-Host $kitPath

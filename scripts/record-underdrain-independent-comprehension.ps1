[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$PlayerProductTrainReceipt,

    [Parameter(Mandatory = $true)]
    [string]$PlayerSessionReceipt,

    [string]$ComprehensionContract,

    [Parameter(Mandatory = $true)]
    [string]$ObserverId,

    [Parameter(Mandatory = $true)]
    [string]$AdjudicatorId,

    [Parameter(Mandatory = $true)]
    [string]$ObserverAttestation,

    [Parameter(Mandatory = $true)]
    [string]$AdjudicatorAttestation,

    [string]$RunId,

    [Parameter(Mandatory = $true)]
    [datetime]$StartedAt,

    [Parameter(Mandatory = $true)]
    [datetime]$CompletedAt,

    [ValidateSet("keyboard-mouse", "gamepad")]
    [string]$Device,

    [Parameter(Mandatory = $true)]
    [string]$Viewport,

    [Parameter(Mandatory = $true)]
    [switch]$Independent,

    [switch]$AuthoredCandidate,
    [switch]$InspectedSource,
    [switch]$ReceivedWalkthrough,
    [ValidateRange(0, 1000)]
    [int]$AssistanceEvents = 0,

    [Parameter(Mandatory = $true)]
    [double]$FirstAuthoredDecisionMs,

    [Parameter(Mandatory = $true)]
    [double]$FirstAcceptedConsequenceMs,

    [Parameter(Mandatory = $true)]
    [string]$ChosenStrategyId,

    [Parameter(Mandatory = $true)]
    [string]$ObservedPlayerRoleId,

    [Parameter(Mandatory = $true)]
    [string]$ObservedImmediateConflictId,

    [Parameter(Mandatory = $true)]
    [string]$ObservedAuthoredChoiceId,

    [Parameter(Mandatory = $true)]
    [string]$ObservedAcceptedConsequenceId,

    [Parameter(Mandatory = $true)]
    [string]$ObservedNextPlayableActionId,

    [ValidateRange(0, 10000)]
    [int]$WrongTurns = 0,

    [ValidateRange(0, 10000)]
    [int]$Knockdowns = 0,

    [ValidateRange(0, 10000)]
    [int]$Retries = 0,

    [switch]$AbandonedBeforeConsequence,
    [Nullable[bool]]$VoluntarilyContinuedAfterConsequence,

    [string]$OutputPath
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-FullPath([string]$Value, [string]$Base) {
    if ([System.IO.Path]::IsPathRooted($Value)) { return [System.IO.Path]::GetFullPath($Value) }
    return [System.IO.Path]::GetFullPath((Join-Path $Base $Value))
}

function Require-File([string]$Path, [string]$Label) {
    if (-not (Test-Path $Path -PathType Leaf)) { throw "$Label is absent: $Path" }
}

function Require-Digest([string]$Value, [string]$Prefix, [string]$Label) {
    if ($Value -notmatch ('^' + [regex]::Escape($Prefix) + '[0-9a-f]{64}$')) { throw "$Label is malformed: $Value" }
}

function Answer([string]$Expected, [string]$Observed, [string]$Adjudicator) {
    return [ordered]@{
        expectedId = $Expected
        observedId = $Observed
        matched = ($Expected -eq $Observed)
        adjudicatorId = $Adjudicator
    }
}

$worldRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$trainPath = Resolve-FullPath $PlayerProductTrainReceipt (Get-Location).Path
$sessionPath = Resolve-FullPath $PlayerSessionReceipt (Get-Location).Path
if ([string]::IsNullOrWhiteSpace($ComprehensionContract)) { $ComprehensionContract = Join-Path $worldRoot "unity\Fixtures\underdrain.comprehension-contract.json" }
$contractPath = Resolve-FullPath $ComprehensionContract $worldRoot
foreach ($entry in @(@($trainPath, "Player-product train receipt"), @($sessionPath, "Player session receipt"), @($contractPath, "Comprehension contract"))) { Require-File $entry[0] $entry[1] }

$train = Get-Content $trainPath -Raw | ConvertFrom-Json
$session = Get-Content $sessionPath -Raw | ConvertFrom-Json
$contract = Get-Content $contractPath -Raw | ConvertFrom-Json
if ($train.format -ne "rodoh-underdrain-unity6000-player-product-train/1" -or $train.status -ne "pass") { throw "Player-product train receipt is not accepted for human evidence." }
if ($train.windowsBuild -ne "pass" -or [string]::IsNullOrWhiteSpace([string]$train.windowsProductSha256)) { throw "Independent comprehension requires the exact qualified Windows product." }
if ($session.format -ne "rodoh-underdrain-windows-player-session/2" -or $session.status -ne "pass") { throw "Player session receipt is not an accepted Windows mechanic session." }
if ($contract.format -ne "rodoh-underdrain-comprehension-contract/1") { throw "UNDERDRAIN comprehension contract format is unsupported." }
if ($train.productId -ne $contract.productId -or $train.challengeId -ne $contract.challengeId -or $train.timingProfileId -ne $contract.timingProfileId) { throw "Comprehension contract differs from the exact player product." }
if ($session.playerProductId -ne $train.productId -or $session.playerProductProfileSha256 -ne $train.productProfileSha256) { throw "Player session differs from the exact player-product identity." }
if ($session.worldCommit -ne $train.worldCommit -or $session.arcCommit -ne $train.arcCommit) { throw "Player session differs from the exact World or Arc source authority." }
if ($session.windowsProductSha256 -ne $train.windowsProductSha256) { throw "Player session used a different Windows product." }
if ($session.actionSpecDigest -ne $train.actionSpecDigest -or $session.arcDigest -ne $train.arcDigest -or $session.timingProfileId -ne $train.timingProfileId) { throw "Player session differs from the exact Arc action product." }
if ($session.presentationManifestId -ne $train.presentationManifestId -or $session.sceneJobDigest -ne $train.sceneJobDigest) { throw "Player session differs from the exact authored presentation or scene job." }
if ($session.presentationAdapterId -ne "production.prefab/v1" -or $session.candidateAuthority -ne "Arc replay required") { throw "Player session crossed the presentation or candidate-authority boundary." }
if ($session.allRequiredCuesObserved -ne $true -or $session.performance.withinBudget -ne $true) { throw "Player session lacks complete semantic-cue or frame-pacing evidence." }
if ($session.device -ne $Device) { throw "Declared comprehension device $Device differs from session device $($session.device)." }

$acceptedPath = Resolve-FullPath ([string]$session.acceptedReceipt) ([System.IO.Path]::GetDirectoryName($sessionPath))
Require-File $acceptedPath "Accepted Arc action receipt"
$accepted = Get-Content $acceptedPath -Raw | ConvertFrom-Json
if ($accepted.format -ne "axm-action-receipt/1") { throw "Accepted Arc receipt format is unsupported." }
if ($accepted.receiptDigest -ne $session.acceptedReceiptDigest) { throw "Accepted Arc receipt digest differs from the player-session receipt." }
if ($accepted.timingProfileId -ne $train.timingProfileId) { throw "Accepted Arc receipt lost timing-profile custody." }
$outcome = [string]$accepted.result.outcome
if ($outcome -notin @("success", "partial", "failure")) { throw "Accepted Arc receipt has an unsupported outcome: $outcome" }
$consequence = $contract.acceptedConsequenceByOutcome.$outcome
if ($null -eq $consequence -or [string]::IsNullOrWhiteSpace([string]$consequence.expectedId)) { throw "Comprehension contract has no consequence for outcome $outcome." }

$requiredObjectives = @($contract.learningSequence | ForEach-Object { [string]$_.objectiveId })
$completedObjectives = @($accepted.result.completedObjectiveIds | ForEach-Object { [string]$_ })
$missingObjectives = @($requiredObjectives | Where-Object { $_ -notin $completedObjectives })
if ($missingObjectives.Count -gt 0) { throw "Independent comprehension session did not complete teach, practice, and mastery: $($missingObjectives -join ', ')" }

if (-not $Independent) { throw "Independent human evidence requires -Independent." }
if ($AuthoredCandidate) { throw "The independent player may not have authored the candidate." }
if ($InspectedSource) { throw "The independent player may not inspect source before adjudication." }
if ($ReceivedWalkthrough) { throw "The independent player may not receive a walkthrough before adjudication." }
if ($AssistanceEvents -gt [int]$contract.humanEvidence.maximumAssistanceEvents) { throw "Independent player received too many assistance events." }
if ($ObserverId -eq $AdjudicatorId -and $contract.humanEvidence.observerAndAdjudicatorMustDiffer -eq $true) { throw "Observer and adjudicator must be different people." }
if ([string]::IsNullOrWhiteSpace($ObserverAttestation) -or [string]::IsNullOrWhiteSpace($AdjudicatorAttestation)) { throw "Observer and adjudicator attestations are required." }
if ($CompletedAt.ToUniversalTime() -le $StartedAt.ToUniversalTime()) { throw "Comprehension completion time must follow its start time." }
if ($FirstAuthoredDecisionMs -lt 0 -or $FirstAcceptedConsequenceMs -lt $FirstAuthoredDecisionMs) { throw "Comprehension timing is invalid." }
if ($ChosenStrategyId -notin @($contract.authoredChoice.allowedIds)) { throw "Chosen strategy is not an authored Pump Seven commitment: $ChosenStrategyId" }
if ($ObservedAuthoredChoiceId -ne $ChosenStrategyId) { throw "Player could not identify the authored choice they made." }
if ($AbandonedBeforeConsequence) { throw "A player who abandoned before consequence cannot pass comprehension." }

$answers = [ordered]@{
    playerRole = Answer ([string]$contract.playerRole.expectedId) $ObservedPlayerRoleId $AdjudicatorId
    immediateConflict = Answer ([string]$contract.immediateConflict.expectedId) $ObservedImmediateConflictId $AdjudicatorId
    authoredChoice = Answer $ChosenStrategyId $ObservedAuthoredChoiceId $AdjudicatorId
    acceptedConsequence = Answer ([string]$consequence.expectedId) $ObservedAcceptedConsequenceId $AdjudicatorId
    nextPlayableAction = Answer ([string]$contract.nextPlayableAction.expectedId) $ObservedNextPlayableActionId $AdjudicatorId
}
$answerValues = @($answers.playerRole, $answers.immediateConflict, $answers.authoredChoice, $answers.acceptedConsequence, $answers.nextPlayableAction)
if (@($answerValues | Where-Object { $_.matched -ne $true }).Count -gt 0) { throw "Independent player comprehension did not match every canonical answer." }

if ([string]::IsNullOrWhiteSpace($RunId)) { $RunId = "underdrain-comprehension-" + $CompletedAt.ToUniversalTime().ToString("yyyyMMdd-HHmmss") }
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Join-Path ([System.IO.Path]::GetDirectoryName($sessionPath)) "independent-comprehension.json"
}
$output = Resolve-FullPath $OutputPath (Get-Location).Path
New-Item -ItemType Directory -Force ([System.IO.Path]::GetDirectoryName($output)) | Out-Null
$receipt = [ordered]@{
    format = "rodoh-underdrain-independent-comprehension/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "pass"
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
    run = [ordered]@{
        id = $RunId
        startedAt = $StartedAt.ToUniversalTime().ToString("o")
        completedAt = $CompletedAt.ToUniversalTime().ToString("o")
        device = $Device
        viewport = $Viewport
        playerSessionReceipt = $sessionPath
        acceptedArcReceipt = $acceptedPath
        acceptedArcReceiptDigest = $accepted.receiptDigest
        outcome = $outcome
    }
    observer = [ordered]@{
        observerId = $ObserverId
        adjudicatorId = $AdjudicatorId
        independent = $true
        authoredCandidate = $false
        inspectedSource = $false
        receivedWalkthrough = $false
        assistanceEvents = $AssistanceEvents
        observerAttestation = $ObserverAttestation
        adjudicatorAttestation = $AdjudicatorAttestation
    }
    timing = [ordered]@{
        firstAuthoredDecisionMs = $FirstAuthoredDecisionMs
        firstAcceptedConsequenceMs = $FirstAcceptedConsequenceMs
    }
    learning = [ordered]@{
        requiredObjectiveIds = $requiredObjectives
        completedObjectiveIds = $completedObjectives
        teachPracticeMasterComplete = $true
    }
    comprehension = $answers
    behavior = [ordered]@{
        wrongTurns = $WrongTurns
        knockdowns = $Knockdowns
        retries = $Retries
        abandonedBeforeConsequence = $false
        voluntarilyContinuedAfterConsequence = if ($null -eq $VoluntarilyContinuedAfterConsequence) { $null } else { [bool]$VoluntarilyContinuedAfterConsequence }
    }
    runtimeIssued = $false
    humanEvidenceAuthority = "independent observer and separate adjudicator"
    productAcceptance = "not-issued"
    comprehensionContract = $contractPath
    playerProductTrainReceipt = $trainPath
}
$receipt | ConvertTo-Json -Depth 30 | Set-Content -Encoding utf8 $output
$shaPath = $output + ".sha256"
$hash = (Get-FileHash $output -Algorithm SHA256).Hash.ToLowerInvariant()
"$hash  $([System.IO.Path]::GetFileName($output))" | Set-Content -Encoding ascii $shaPath
Write-Host "UNDERDRAIN independent comprehension passed its human-evidence boundary."
Write-Host "This receipt does not by itself accept the player product."
Write-Host $output

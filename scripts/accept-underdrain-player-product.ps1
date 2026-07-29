[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$PlayerProductTrainReceipt,

    [Parameter(Mandatory = $true)]
    [string]$KeyboardMouseSessionReceipt,

    [Parameter(Mandatory = $true)]
    [string]$GamepadSessionReceipt,

    [Parameter(Mandatory = $true)]
    [string]$IndependentComprehensionReceipt,

    [Parameter(Mandatory = $true)]
    [string]$AcceptorId,

    [Parameter(Mandatory = $true)]
    [string]$AcceptanceName,

    [Parameter(Mandatory = $true)]
    [string]$AcceptorAttestation,

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

function Require-Equal([object]$Left, [object]$Right, [string]$Label) {
    if ([string]$Left -ne [string]$Right) { throw "$Label differs: '$Left' versus '$Right'." }
}

function Require-Identity([object]$Evidence, [object]$Train, [string]$Label) {
    Require-Equal $Evidence.productId $Train.productId "$Label productId"
    Require-Equal $Evidence.worldCommit $Train.worldCommit "$Label World commit"
    Require-Equal $Evidence.arcCommit $Train.arcCommit "$Label Arc commit"
    Require-Equal $Evidence.productProfileSha256 $Train.productProfileSha256 "$Label product-profile digest"
    Require-Equal $Evidence.windowsProductSha256 $Train.windowsProductSha256 "$Label Windows product digest"
    Require-Equal $Evidence.actionSpecDigest $Train.actionSpecDigest "$Label action-spec digest"
    Require-Equal $Evidence.arcDigest $Train.arcDigest "$Label Arc cartridge digest"
    Require-Equal $Evidence.challengeId $Train.challengeId "$Label challenge"
    Require-Equal $Evidence.timingProfileId $Train.timingProfileId "$Label timing profile"
    Require-Equal $Evidence.presentationManifestId $Train.presentationManifestId "$Label presentation manifest"
    Require-Equal $Evidence.sceneJobDigest $Train.sceneJobDigest "$Label scene job"
}

function Load-SessionEvidence([object]$Session, [string]$SessionPath, [string]$Label) {
    $path = Resolve-FullPath ([string]$Session.sessionEvidence) ([System.IO.Path]::GetDirectoryName($SessionPath))
    Require-File $path "$Label raw player-session evidence"
    $value = Get-Content $path -Raw | ConvertFrom-Json
    if ($value.format -ne "rodoh-action-player-session-evidence/2" -or $value.status -ne "pass") { throw "$Label raw player-session evidence is not accepted." }
    return [ordered]@{ path = $path; value = $value }
}

$trainPath = Resolve-FullPath $PlayerProductTrainReceipt (Get-Location).Path
$keyboardPath = Resolve-FullPath $KeyboardMouseSessionReceipt (Get-Location).Path
$gamepadPath = Resolve-FullPath $GamepadSessionReceipt (Get-Location).Path
$comprehensionPath = Resolve-FullPath $IndependentComprehensionReceipt (Get-Location).Path
foreach ($entry in @(@($trainPath, "Player-product train receipt"), @($keyboardPath, "Keyboard/mouse session receipt"), @($gamepadPath, "Gamepad session receipt"), @($comprehensionPath, "Independent comprehension receipt"))) { Require-File $entry[0] $entry[1] }
if ([string]::IsNullOrWhiteSpace($AcceptorId) -or [string]::IsNullOrWhiteSpace($AcceptanceName) -or [string]::IsNullOrWhiteSpace($AcceptorAttestation)) { throw "Named product acceptance requires an acceptor, acceptance name, and attestation." }

$train = Get-Content $trainPath -Raw | ConvertFrom-Json
$keyboard = Get-Content $keyboardPath -Raw | ConvertFrom-Json
$gamepad = Get-Content $gamepadPath -Raw | ConvertFrom-Json
$comprehension = Get-Content $comprehensionPath -Raw | ConvertFrom-Json
if ($train.format -ne "rodoh-underdrain-unity6000-player-product-train/1" -or $train.status -ne "pass") { throw "Player-product train receipt is not accepted." }
if ($train.windowsBuild -ne "pass" -or $train.exactSourceCustody -ne $true -or $train.exactCueParity -ne $true) { throw "Player-product train lacks Windows build, source custody, or exact cue parity." }
if ($train.primitiveFallback -ne $false -or $train.diagnosticPresentation -ne $false -or $train.activePhysicsAuthority -ne $false) { throw "Player-product train crossed the primitive, diagnostic, or physics-authority boundary." }
if ($train.productionAssetCount -ne 7 -or @($train.productionAssetSourceDigests).Count -ne 7) { throw "Player-product train lacks the complete seven-asset production floor." }
if ($train.presentationAdapterId -ne "production.prefab/v1" -or $train.cameraCollision -ne $true -or $train.runtimeRebinding -ne $true) { throw "Player-product train lacks the production adapter, camera collision, or runtime rebinding." }

$assetApprovalPath = Resolve-FullPath ([string]$train.assetApprovalReceipt) ([System.IO.Path]::GetDirectoryName($trainPath))
Require-File $assetApprovalPath "Named production-asset approval receipt"
$assetApproval = Get-Content $assetApprovalPath -Raw | ConvertFrom-Json
if ($assetApproval.format -ne "rodoh-action-production-asset-approval/1" -or $assetApproval.status -ne "approved") { throw "Named production-asset approval receipt is unsupported or not approved." }
if ($assetApproval.productId -ne $train.productId -or $assetApproval.presentationManifestId -ne $train.presentationManifestId) { throw "Named production-asset approval differs from the accepted player product." }
if ($assetApproval.assetCount -ne 7 -or $assetApproval.confirmedAllAssets -ne $true -or $assetApproval.productionApproved -ne $true -or $assetApproval.generatedPrimitive -ne $false -or $assetApproval.activePhysicsAuthority -ne $false) { throw "Named production-asset approval does not cover the complete safe seven-asset floor." }
if ($assetApproval.playerProductAcceptance -ne "not-issued" -or $assetApproval.authorityAuthentication -ne "not-performed") { throw "Named asset approval crossed product-acceptance authority or misrepresented authentication." }
if ($train.assetApprovalId -ne $assetApproval.approvalId -or $train.assetApprovalAuthorityId -ne $assetApproval.approvalAuthorityId -or $train.assetApprovalName -ne $assetApproval.approvalName) { throw "Player-product train lost named asset-approval custody." }
$assetApprovalSha = (Get-FileHash $assetApprovalPath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($train.assetApprovalReceiptSha256 -ne $assetApprovalSha) { throw "Player-product train asset-approval receipt digest mismatch." }
if ($assetApproval.approvalAuthorityId -eq $AcceptorId) { throw "Presentation-asset approver and final player-product acceptor must be different named actors." }

foreach ($entry in @(@($keyboard, $keyboardPath, "keyboard-mouse", "Keyboard/mouse"), @($gamepad, $gamepadPath, "gamepad", "Gamepad"))) {
    $session = $entry[0]
    $path = $entry[1]
    $device = $entry[2]
    $label = $entry[3]
    if ($session.format -ne "rodoh-underdrain-windows-player-session/2" -or $session.status -ne "pass") { throw "$label session is not accepted." }
    if ($session.device -ne $device) { throw "$label receipt has device '$($session.device)' instead of '$device'." }
    Require-Identity $session $train $label
    if ($session.presentationAdapterId -ne "production.prefab/v1" -or $session.candidateAuthority -ne "Arc replay required") { throw "$label session crossed presentation or candidate authority." }
    if ($session.allRequiredCuesObserved -ne $true -or $session.performance.withinBudget -ne $true) { throw "$label session lacks cue or frame-pacing acceptance." }
    if ($session.provisionalParity -ne $true -or [string]::IsNullOrWhiteSpace([string]$session.acceptedReceiptDigest)) { throw "$label session was not accepted by exact Arc replay." }
    if ($session.comprehensionReceipt -ne "not-issued" -or $session.namedPlayerProductAcceptance -ne "not-issued") { throw "$label mechanic session crossed the human-evidence or product-acceptance boundary." }
    Require-File (Resolve-FullPath ([string]$session.acceptedReceipt) ([System.IO.Path]::GetDirectoryName($path))) "$label accepted Arc receipt"
}

$keyboardRaw = Load-SessionEvidence $keyboard $keyboardPath "Keyboard/mouse"
$gamepadRaw = Load-SessionEvidence $gamepad $gamepadPath "Gamepad"
if ($keyboardRaw.value.sawKeyboardMouse -ne $true -or $gamepadRaw.value.sawGamepad -ne $true) { throw "Required physical input devices were not observed by the built player." }
if ($keyboardRaw.value.rebindingAvailable -ne $true -or $gamepadRaw.value.rebindingAvailable -ne $true) { throw "Built-player sessions did not retain runtime rebinding." }
if ($gamepad.bindingProfileDigest -eq $train.bindingProfileDigest) { throw "Gamepad acceptance must include a persisted runtime rebind; its binding profile still equals the qualified default." }
if (($keyboard.cameraCollisionAdjustments + $gamepad.cameraCollisionAdjustments) -lt 1) { throw "Neither Windows session exercised a real camera-collision adjustment." }

if ($comprehension.format -ne "rodoh-underdrain-independent-comprehension/1" -or $comprehension.status -ne "pass") { throw "Independent comprehension receipt is not accepted." }
Require-Identity $comprehension $train "Independent comprehension"
if ($comprehension.runtimeIssued -ne $false -or $comprehension.productAcceptance -ne "not-issued") { throw "Independent comprehension crossed runtime or product-acceptance authority." }
if ($comprehension.observer.independent -ne $true -or $comprehension.observer.authoredCandidate -ne $false -or $comprehension.observer.inspectedSource -ne $false -or $comprehension.observer.receivedWalkthrough -ne $false -or $comprehension.observer.assistanceEvents -ne 0) { throw "Independent comprehension observer conditions were not satisfied." }
if ($comprehension.observer.observerId -eq $comprehension.observer.adjudicatorId) { throw "Independent comprehension observer and adjudicator are not separate." }
if ($comprehension.learning.teachPracticeMasterComplete -ne $true) { throw "Independent player did not complete teach, practice, and mastery." }
$answers = @($comprehension.comprehension.playerRole, $comprehension.comprehension.immediateConflict, $comprehension.comprehension.authoredChoice, $comprehension.comprehension.acceptedConsequence, $comprehension.comprehension.nextPlayableAction)
if (@($answers | Where-Object { $_.matched -ne $true }).Count -ne 0) { throw "Independent comprehension did not match all five canonical answers." }
if ($comprehension.behavior.abandonedBeforeConsequence -ne $false) { throw "Independent player abandoned before an accepted consequence." }
if ($comprehension.behavior.voluntarilyContinuedAfterConsequence -ne $true) { throw "Named product acceptance requires the independent player to voluntarily enter the next playable action after consequence." }
$comprehensionSessionPath = Resolve-FullPath ([string]$comprehension.run.playerSessionReceipt) ([System.IO.Path]::GetDirectoryName($comprehensionPath))
if ($comprehensionSessionPath -ne $keyboardPath -and $comprehensionSessionPath -ne $gamepadPath) { throw "Independent comprehension does not cite either accepted physical input session." }

$evidenceFiles = @($trainPath, $assetApprovalPath, $keyboardPath, $gamepadPath, $keyboardRaw.path, $gamepadRaw.path, $comprehensionPath)
$evidence = @($evidenceFiles | ForEach-Object {
    [ordered]@{
        path = $_
        sha256 = (Get-FileHash $_ -Algorithm SHA256).Hash.ToLowerInvariant()
    }
})
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Join-Path ([System.IO.Path]::GetDirectoryName($trainPath)) "underdrain-player-product-acceptance.json"
}
$output = Resolve-FullPath $OutputPath (Get-Location).Path
New-Item -ItemType Directory -Force ([System.IO.Path]::GetDirectoryName($output)) | Out-Null
$receipt = [ordered]@{
    format = "rodoh-underdrain-player-product-acceptance/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "accepted"
    accepted = $true
    acceptanceName = $AcceptanceName
    acceptorId = $AcceptorId
    acceptorAttestation = $AcceptorAttestation
    scope = "windows-player-product"
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
    exactCueParity = $train.exactCueParity
    namedAssetApproval = [ordered]@{
        receipt = $assetApprovalPath
        receiptSha256 = $assetApprovalSha
        approvalId = $assetApproval.approvalId
        approvalAuthorityId = $assetApproval.approvalAuthorityId
        approvalName = $assetApproval.approvalName
        approvedAt = $assetApproval.approvedAt
        authorityAuthentication = $assetApproval.authorityAuthentication
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
    independentComprehension = [ordered]@{
        receipt = $comprehensionPath
        runId = $comprehension.run.id
        observerId = $comprehension.observer.observerId
        adjudicatorId = $comprehension.observer.adjudicatorId
        acceptedArcReceiptDigest = $comprehension.run.acceptedArcReceiptDigest
        teachPracticeMasterComplete = $comprehension.learning.teachPracticeMasterComplete
        nextPlayableActionId = $comprehension.comprehension.nextPlayableAction.observedId
        voluntarilyContinuedAfterConsequence = $comprehension.behavior.voluntarilyContinuedAfterConsequence
    }
    evidence = $evidence
    questAcceptance = "not-issued"
    physicalQuestAcceptance = "open"
    authority = "named Windows player-product acceptance over exact Arc, Unity, named asset approval, device, performance, and independent human evidence"
}
$receipt | ConvertTo-Json -Depth 30 | Set-Content -Encoding utf8 $output
$shaPath = $output + ".sha256"
$hash = (Get-FileHash $output -Algorithm SHA256).Hash.ToLowerInvariant()
"$hash  $([System.IO.Path]::GetFileName($output))" | Set-Content -Encoding ascii $shaPath
Write-Host "UNDERDRAIN Windows player product received named acceptance."
Write-Host "Quest and physical Quest acceptance remain separate and open."
Write-Host $output

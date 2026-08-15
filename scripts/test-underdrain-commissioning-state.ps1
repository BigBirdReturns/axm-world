[CmdletBinding()]
param(
    [string]$OutputRoot
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Json([string]$Path, [object]$Value) {
    New-Item -ItemType Directory -Force ([System.IO.Path]::GetDirectoryName($Path)) | Out-Null
    $Value | ConvertTo-Json -Depth 60 | Set-Content -Encoding utf8 $Path
}

function Sha([string]$Path) {
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function New-FixtureGit([string]$Path, [string]$Name) {
    New-Item -ItemType Directory -Force $Path | Out-Null
    & git -C $Path init --quiet
    if ($LASTEXITCODE -ne 0) { throw "Could not initialize $Name fixture repository." }
    & git -C $Path config user.email "fixture@axm.tools"
    & git -C $Path config user.name "AXM Fixture"
    "$Name fixture" | Set-Content -Encoding utf8 (Join-Path $Path "FIXTURE.txt")
    & git -C $Path add FIXTURE.txt
    & git -C $Path commit --quiet -m "Initialize $Name fixture"
    if ($LASTEXITCODE -ne 0) { throw "Could not commit $Name fixture repository." }
    return (& git -C $Path rev-parse HEAD).Trim().ToLowerInvariant()
}

function New-Project([string]$Root, [string]$Name) {
    $project = Join-Path $Root $Name
    New-Item -ItemType Directory -Force `
        (Join-Path $project "Assets"), `
        (Join-Path $project "Packages"), `
        (Join-Path $project "ProjectSettings") | Out-Null
    "m_EditorVersion: 6000.0.66f2" | Set-Content -Encoding utf8 (Join-Path $project "ProjectSettings\ProjectVersion.txt")
    return $project
}

function Get-Paths([string]$Project, [string]$JobId) {
    $job = Join-Path $Project "local\scene-jobs\$JobId"
    return [ordered]@{
        job = $job
        materialization = Join-Path $job "output\representation-materialization\underdrain-representation-materialization-run.json"
        preflight = Join-Path $job "preflight\underdrain-unity6000-machine-preflight-v2.json"
        approval = Join-Path $job "output\player-train\production-asset-approval\production-asset-approval.json"
        train = Join-Path $job "output\player-train\underdrain-unity6000-player-product-train.json"
        keyboard = Join-Path $job "build\receipts\player-session-keyboard-mouse\session-run.json"
        gamepad = Join-Path $job "build\receipts\player-session-gamepad\session-run.json"
        reviewRoot = Join-Path $job "output\player-train\role-separated-review"
        reviewKit = Join-Path $job "output\player-train\role-separated-review\review-kit-receipt.json"
        review = Join-Path $job "output\player-train\role-separated-review\role-separated-review.json"
        acceptance = Join-Path $job "output\player-train\underdrain-player-product-acceptance.json"
        state = Join-Path $job "output\commissioning-state"
        windowsProduct = Join-Path $job "build\windows\UNDERDRAIN.exe"
    }
}

function Write-CompleteEvidence(
    [string]$Project,
    [string]$JobId,
    [string]$WorldCommit,
    [string]$ArcCommit,
    [switch]$StaleAcceptance
) {
    $p = Get-Paths $Project $JobId
    $hex64a = "a" * 64
    $hex64b = "b" * 64
    $hex64c = "c" * 64
    $hex64d = "d" * 64
    $hex64e = "e" * 64
    $hex64f = "f" * 64
    $profile = "profile1_$hex64a"
    $action = "actspec1_$hex64c"
    $arc = "cart1_$hex64d"
    $scene = "scenejob1_$hex64e"
    $bindingDefault = "bindings1_$hex64a"
    $bindingChanged = "bindings1_$hex64b"
    $acceptedDigest = "actionreceipt1_$hex64f"

    $nativeMaterialization = Join-Path ([System.IO.Path]::GetDirectoryName($p.materialization)) "underdrain-representation-materialization.json"
    Write-Json $nativeMaterialization ([ordered]@{ format = "rodoh-underdrain-representation-materialization/1"; status = "pass" })
    Write-Json $p.materialization ([ordered]@{
        format = "rodoh-underdrain-representation-materialization-run/1"
        status = "pass"
        worldCommit = $WorldCommit
        arcCommit = $ArcCommit
        unityVersion = "6000.0.66f2"
        materializationReceipt = $nativeMaterialization
        materializationReceiptSha256 = Sha $nativeMaterialization
        productionAssetCount = 7
        declaredBindingCount = 27
        uniqueDeclaredAssetCount = 23
        namedAssetReview = "open"
        approvalIssued = $false
        productAcceptance = "not-issued"
    })

    $legacyPath = Join-Path ([System.IO.Path]::GetDirectoryName($p.preflight)) "legacy-v1\underdrain-unity6000-machine-preflight.json"
    Write-Json $legacyPath ([ordered]@{ format = "rodoh-underdrain-unity6000-machine-preflight/1"; status = "pass" })
    Write-Json $p.preflight ([ordered]@{
        format = "rodoh-underdrain-unity6000-machine-preflight/2"
        status = "pass"
        machineReadyForNamedAssetReview = $true
        legacyReceipt = $legacyPath
        legacyReceiptSha256 = Sha $legacyPath
        identities = [ordered]@{
            worldCommit = $WorldCommit
            arcCommit = $ArcCommit
            productId = "underdrain-bloom-below-unity6000-v1"
            challengeId = "breach-crown-pump"
            timingProfileId = "forgiving"
            presentationAdapterId = "production.prefab/v1"
        }
        productAcceptance = "not-issued"
        physicalHumanEvidence = "separate"
        questAcceptance = "open"
    })

    Write-Json $p.approval ([ordered]@{
        format = "rodoh-action-production-asset-approval/2"
        status = "approved"
        productId = "underdrain-bloom-below-unity6000-v1"
        approvalId = "fixture-approval"
        approvalAuthorityId = "seat:presentation-approver"
        approvalName = "Fixture presentation"
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

    New-Item -ItemType Directory -Force ([System.IO.Path]::GetDirectoryName($p.windowsProduct)) | Out-Null
    "fixture windows product" | Set-Content -Encoding ascii $p.windowsProduct
    $windowsSha = Sha $p.windowsProduct
    Write-Json $p.train ([ordered]@{
        format = "rodoh-underdrain-unity6000-player-product-train/1"
        status = "pass"
        productId = "underdrain-bloom-below-unity6000-v1"
        worldCommit = $WorldCommit
        arcCommit = $ArcCommit
        unityVersion = "6000.0.66f2"
        productProfileSha256 = $profile
        windowsProduct = $p.windowsProduct
        windowsProductSha256 = $windowsSha
        actionSpecDigest = $action
        arcDigest = $arc
        challengeId = "breach-crown-pump"
        timingProfileId = "forgiving"
        presentationManifestId = "underdrain-bloom-below-v1"
        sceneJobDigest = $scene
        presentationAdapterId = "production.prefab/v1"
        productionAssetCount = 7
        declaredBindingCount = 27
        uniqueDeclaredAssetCount = 23
        declaredBindingClosureSha256 = $hex64a
        exactSourceCustody = $true
        exactDependencyCustody = $true
        exactPrefabCustody = $true
        exactBindingCustody = $true
        exactRepresentationCustody = $true
        exactCueParity = $true
        primitiveFallback = $false
        diagnosticPresentation = $false
        activePhysicsAuthority = $false
        cameraCollision = $true
        runtimeRebinding = $true
        bindingProfileDigest = $bindingDefault
        windowsBuild = "pass"
        roleSeparatedSoftwareReview = "open"
        namedPlayerProductAcceptance = "not-issued"
        questAcceptance = "open"
        assetApprovalReceipt = $p.approval
        assetApprovalReceiptSha256 = Sha $p.approval
        assetApprovalId = "fixture-approval"
        assetApprovalAuthorityId = "seat:presentation-approver"
    })

    $sessionBase = [ordered]@{
        format = "rodoh-underdrain-windows-player-session/2"
        status = "pass"
        worldCommit = $WorldCommit
        arcCommit = $ArcCommit
        playerProductId = "underdrain-bloom-below-unity6000-v1"
        playerProductProfileSha256 = $profile
        windowsProductSha256 = $windowsSha
        actionSpecDigest = $action
        arcDigest = $arc
        challengeId = "breach-crown-pump"
        timingProfileId = "forgiving"
        presentationManifestId = "underdrain-bloom-below-v1"
        sceneJobDigest = $scene
        presentationAdapterId = "production.prefab/v1"
        allRequiredCuesObserved = $true
        candidateAuthority = "Arc replay required"
        acceptedReceiptDigest = $acceptedDigest
        provisionalParity = $true
        namedPlayerProductAcceptance = "not-issued"
        performance = [ordered]@{ withinBudget = $true; p95FrameMilliseconds = 16.0; p99FrameMilliseconds = 20.0 }
    }
    $keyboard = [ordered]@{}
    foreach ($entry in $sessionBase.GetEnumerator()) { $keyboard[$entry.Key] = $entry.Value }
    $keyboard.device = "keyboard-mouse"
    $keyboard.bindingProfileDigest = $bindingDefault
    $keyboard.cameraCollisionAdjustments = 1
    Write-Json $p.keyboard $keyboard

    $gamepad = [ordered]@{}
    foreach ($entry in $sessionBase.GetEnumerator()) { $gamepad[$entry.Key] = $entry.Value }
    $gamepad.device = "gamepad"
    $gamepad.bindingProfileDigest = $bindingChanged
    $gamepad.cameraCollisionAdjustments = 0
    Write-Json $p.gamepad $gamepad

    Write-Json $p.reviewKit ([ordered]@{
        format = "rodoh-underdrain-role-separated-review-kit/1"
        status = "ready"
        productId = "underdrain-bloom-below-unity6000-v1"
        worldCommit = $WorldCommit
        arcCommit = $ArcCommit
        playerSessionReceipt = $p.keyboard
        playerSessionReceiptSha256 = Sha $p.keyboard
        reviewIssued = $false
        productAcceptance = "not-issued"
        physicalInstallationEvidence = "separate"
    })

    Write-Json $p.review ([ordered]@{
        format = "rodoh-underdrain-role-separated-review-receipt/1"
        status = "pass"
        productId = "underdrain-bloom-below-unity6000-v1"
        worldCommit = $WorldCommit
        arcCommit = $ArcCommit
        productProfileSha256 = $profile
        windowsProductSha256 = $windowsSha
        actionSpecDigest = $action
        arcDigest = $arc
        challengeId = "breach-crown-pump"
        timingProfileId = "forgiving"
        presentationManifestId = "underdrain-bloom-below-v1"
        sceneJobDigest = $scene
        playerSessionReceipt = $p.keyboard
        playerSessionReceiptSha256 = Sha $p.keyboard
        acceptedArcReceiptDigest = $acceptedDigest
        independence = [ordered]@{
            distinctSeats = $true
            distinctLineages = $true
            distinctContexts = $true
            sourceIsolated = $true
            artifactMutationCapability = $false
        }
        learning = [ordered]@{ teachPracticeMasterComplete = $true }
        behavior = [ordered]@{ voluntarilyContinuedAfterConsequence = $true }
        runtimeIssued = $false
        candidateAuthorIssued = $false
        productAcceptance = "not-issued"
        physicalHumanEvidence = "separate-not-inferred"
    })

    $acceptanceWorld = if ($StaleAcceptance) { "0" * 40 } else { $WorldCommit }
    Write-Json $p.acceptance ([ordered]@{
        format = "rodoh-underdrain-player-product-acceptance/2"
        status = "accepted"
        accepted = $true
        scope = "windows-software-player-product"
        acceptanceSeat = [ordered]@{
            seatId = "seat:software-product-acceptor"
            lineageId = "lineage1_$hex64d"
            contextDigest = "ctx1_$hex64d"
            artifactMutationCapability = $false
        }
        productId = "underdrain-bloom-below-unity6000-v1"
        worldCommit = $acceptanceWorld
        arcCommit = $ArcCommit
        productProfileSha256 = $profile
        windowsProductSha256 = $windowsSha
        actionSpecDigest = $action
        arcDigest = $arc
        challengeId = "breach-crown-pump"
        timingProfileId = "forgiving"
        presentationManifestId = "underdrain-bloom-below-v1"
        sceneJobDigest = $scene
        presentationAdapterId = "production.prefab/v1"
        productionAssetCount = 7
        declaredBindingCount = 27
        uniqueDeclaredAssetCount = 23
        declaredBindingClosureSha256 = $hex64a
        exactSourceCustody = $true
        exactDependencyCustody = $true
        exactPrefabCustody = $true
        exactBindingCustody = $true
        exactRepresentationCustody = $true
        exactCueParity = $true
        keyboardMouseSession = [ordered]@{ receipt = $p.keyboard }
        gamepadAndRebindingSession = [ordered]@{ receipt = $p.gamepad }
        roleSeparatedReview = [ordered]@{ receipt = $p.review; receiptSha256 = Sha $p.review }
        physicalHumanEvidence = "separate-not-required-for-software-scope"
        questAcceptance = "not-issued"
        physicalQuestAcceptance = "open"
    })
    return $p
}

function Invoke-StateCase(
    [string]$Name,
    [string]$Project,
    [string]$WorldRoot,
    [string]$ArcRoot,
    [string]$WorldCommit,
    [string]$ArcCommit,
    [int]$ExpectedExit
) {
    $caseRoot = Join-Path $OutputRoot $Name
    New-Item -ItemType Directory -Force $caseRoot | Out-Null
    $hostPowerShell = (Get-Process -Id $PID).Path
    $arguments = @(
        "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
        "-File", (Join-Path $PSScriptRoot "get-underdrain-commissioning-state.ps1"),
        "-WorldRoot", $WorldRoot,
        "-ArcRoot", $ArcRoot,
        "-EmbodiedArLabRoot", $Project,
        "-ExpectedWorldCommit", $WorldCommit,
        "-ExpectedArcCommit", $ArcCommit,
        "-OutputRoot", $caseRoot
    )
    $lines = @(& $hostPowerShell @arguments 2>&1)
    $exit = $LASTEXITCODE
    foreach ($line in $lines) { Write-Host "[$Name] $line" }
    if ($exit -ne $ExpectedExit) { throw "State case $Name exited $exit, expected $ExpectedExit." }
    $statePath = Join-Path $caseRoot "underdrain-commissioning-state.json"
    if (-not (Test-Path -LiteralPath $statePath -PathType Leaf)) { throw "State case $Name did not write a receipt." }
    return [ordered]@{ path = $statePath; value = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json; exitCode = $exit }
}

if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    $OutputRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("underdrain-commissioning-state-" + [guid]::NewGuid().ToString("N"))
}
$OutputRoot = [System.IO.Path]::GetFullPath($OutputRoot)
New-Item -ItemType Directory -Force $OutputRoot | Out-Null
$worldRoot = Join-Path $OutputRoot "world"
$arcRoot = Join-Path $OutputRoot "arc"
$worldCommit = New-FixtureGit $worldRoot "World"
$arcCommit = New-FixtureGit $arcRoot "Arc"

$openProject = New-Project $OutputRoot "project-open"
$open = Invoke-StateCase "open" $openProject $worldRoot $arcRoot $worldCommit $arcCommit 0
if ($open.value.status -ne "open" -or $open.value.firstDivergence.id -ne "representation-materialization") { throw "Open fixture did not stop at representation materialization." }
if ($open.value.evidencePaths.keyboardMouseSession -notmatch 'build[\\/]receipts[\\/]player-session-keyboard-mouse[\\/]session-run.json$') { throw "State fixture does not expose the executable keyboard-session path." }
if ($open.value.evidencePaths.gamepadSession -notmatch 'build[\\/]receipts[\\/]player-session-gamepad[\\/]session-run.json$') { throw "State fixture does not expose the executable gamepad-session path." }

$blockedControllerRoot = Join-Path $OutputRoot "controller-blocked"
$hostPowerShell = (Get-Process -Id $PID).Path
& $hostPowerShell -NoProfile -NonInteractive -ExecutionPolicy Bypass `
    -File (Join-Path $PSScriptRoot "invoke-underdrain-commissioning.ps1") `
    -WorldRoot $worldRoot `
    -ArcRoot $arcRoot `
    -EmbodiedArLabRoot $openProject `
    -ExpectedWorldCommit $worldCommit `
    -ExpectedArcCommit $arcCommit `
    -StateOutputRoot $blockedControllerRoot `
    -Mode advance
if ($LASTEXITCODE -ne 0) { throw "Commissioning controller blocked advance returned an unexpected exit." }
$blockedReceipt = Get-ChildItem (Join-Path $blockedControllerRoot "runs") -Filter *.json | Sort-Object Name | Select-Object -Last 1
$blockedController = Get-Content $blockedReceipt.FullName -Raw | ConvertFrom-Json
if ($blockedController.status -ne "blocked" -or $blockedController.blocked.gate -ne "representation-materialization") { throw "Commissioning controller did not stop cleanly for missing representation inputs." }
if (Test-Path -LiteralPath (Get-Paths $openProject "underdrain-unity6000-player-v1").materialization -PathType Leaf) { throw "Blocked controller advance mutated the open fixture." }

$failedProject = New-Project $OutputRoot "project-failed"
$failedPaths = Get-Paths $failedProject "underdrain-unity6000-player-v1"
Write-Json $failedPaths.materialization ([ordered]@{ format = "rodoh-underdrain-representation-materialization-run/1"; status = "fail" })
$failed = Invoke-StateCase "failed-materialization" $failedProject $worldRoot $arcRoot $worldCommit $arcCommit 2
if ($failed.value.status -ne "held" -or $failed.value.firstDivergence.id -ne "representation-materialization") { throw "Failed materialization was not held." }

$outOfOrderProject = New-Project $OutputRoot "project-out-of-order"
$outOfOrderPaths = Get-Paths $outOfOrderProject "underdrain-unity6000-player-v1"
Write-Json $outOfOrderPaths.acceptance ([ordered]@{ format = "rodoh-underdrain-player-product-acceptance/2"; status = "accepted"; accepted = $true })
$outOfOrder = Invoke-StateCase "out-of-order" $outOfOrderProject $worldRoot $arcRoot $worldCommit $arcCommit 2
if ($outOfOrder.value.status -ne "held" -or @($outOfOrder.value.outOfOrderEvidence).Count -ne 1 -or $outOfOrder.value.outOfOrderEvidence[0].id -ne "windows-software-product-acceptance") { throw "Out-of-order evidence was not held." }

$completeProject = New-Project $OutputRoot "project-complete"
$completePaths = Write-CompleteEvidence $completeProject "underdrain-unity6000-player-v1" $worldCommit $arcCommit
$complete = Invoke-StateCase "complete" $completeProject $worldRoot $arcRoot $worldCommit $arcCommit 0
if ($complete.value.status -ne "pass" -or $complete.value.windowsSoftwareProductAcceptance -ne "accepted") { throw "Complete commissioning fixture did not pass." }
if (@($complete.value.gates | Where-Object { $_.status -ne "pass" }).Count -ne 0) { throw "Complete commissioning fixture retained a non-passing gate." }

$controllerRoot = Join-Path $OutputRoot "controller-inspect"
$hostPowerShell = (Get-Process -Id $PID).Path
& $hostPowerShell -NoProfile -NonInteractive -ExecutionPolicy Bypass `
    -File (Join-Path $PSScriptRoot "invoke-underdrain-commissioning.ps1") `
    -WorldRoot $worldRoot `
    -ArcRoot $arcRoot `
    -EmbodiedArLabRoot $completeProject `
    -ExpectedWorldCommit $worldCommit `
    -ExpectedArcCommit $arcCommit `
    -StateOutputRoot $controllerRoot `
    -Mode inspect
if ($LASTEXITCODE -ne 0) { throw "Commissioning controller inspect mode failed." }
$controllerReceipt = Get-ChildItem (Join-Path $controllerRoot "runs") -Filter *.json | Sort-Object Name | Select-Object -Last 1
if ($null -eq $controllerReceipt) { throw "Commissioning controller did not write a run receipt." }
$controller = Get-Content $controllerReceipt.FullName -Raw | ConvertFrom-Json
if ($controller.format -ne "rodoh-underdrain-windows-commissioning-run/1" -or $controller.status -ne "pass" -or $controller.mode -ne "inspect") { throw "Commissioning controller inspect receipt is invalid." }

$bundleRoot = Join-Path $OutputRoot "bundles"
& $hostPowerShell -NoProfile -NonInteractive -ExecutionPolicy Bypass `
    -File (Join-Path $PSScriptRoot "export-underdrain-commissioning-evidence.ps1") `
    -EmbodiedArLabRoot $completeProject `
    -OutputRoot $bundleRoot
if ($LASTEXITCODE -ne 0) { throw "Commissioning evidence exporter failed." }
$bundlePointer = Join-Path $bundleRoot "LATEST_BUNDLE.txt"
if (-not (Test-Path -LiteralPath $bundlePointer -PathType Leaf)) { throw "Evidence exporter did not write its latest-bundle pointer." }
$bundlePath = (Get-Content -LiteralPath $bundlePointer -Raw).Trim()
if (-not (Test-Path -LiteralPath $bundlePath -PathType Leaf)) { throw "Evidence exporter bundle is absent: $bundlePath" }
$bundleInspect = Join-Path $OutputRoot "bundle-inspect"
Expand-Archive -LiteralPath $bundlePath -DestinationPath $bundleInspect
if (Get-ChildItem -LiteralPath $bundleInspect -File -Recurse | Where-Object { $_.Extension -eq ".exe" }) { throw "Diagnostic bundle included an executable." }
$bundleManifest = Get-Content (Join-Path $bundleInspect "BUNDLE_MANIFEST.json") -Raw | ConvertFrom-Json
if ($bundleManifest.status -ne "sealed" -or $bundleManifest.executableIncluded -ne $false -or $bundleManifest.sourceAssetsIncluded -ne $false) { throw "Diagnostic bundle manifest crossed its evidence boundary." }
$ledger = Join-Path $bundleInspect "SHA256SUMS"
foreach ($line in (Get-Content -LiteralPath $ledger)) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    $parts = $line -split '\s+', 2
    $target = Join-Path $bundleInspect $parts[1]
    if (-not (Test-Path -LiteralPath $target -PathType Leaf) -or (Sha $target) -ne $parts[0]) { throw "Diagnostic bundle ledger failed for $($parts[1])." }
}

$staleProject = New-Project $OutputRoot "project-stale"
$null = Write-CompleteEvidence $staleProject "underdrain-unity6000-player-v1" $worldCommit $arcCommit -StaleAcceptance
$stale = Invoke-StateCase "stale-acceptance" $staleProject $worldRoot $arcRoot $worldCommit $arcCommit 2
if ($stale.value.status -ne "held" -or $stale.value.firstDivergence.id -ne "windows-software-product-acceptance") { throw "Stale acceptance identity was not held." }

$qualification = [ordered]@{
    format = "rodoh-underdrain-commissioning-state-fixture-qualification/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "pass"
    worldCommit = $worldCommit
    arcCommit = $arcCommit
    cases = @(
        [ordered]@{ id = "open"; status = $open.value.status; firstDivergence = $open.value.firstDivergence.id },
        [ordered]@{ id = "failed-materialization"; status = $failed.value.status; firstDivergence = $failed.value.firstDivergence.id },
        [ordered]@{ id = "out-of-order"; status = $outOfOrder.value.status; outOfOrderEvidence = @($outOfOrder.value.outOfOrderEvidence).Count },
        [ordered]@{ id = "complete"; status = $complete.value.status; acceptance = $complete.value.windowsSoftwareProductAcceptance },
        [ordered]@{ id = "stale-acceptance"; status = $stale.value.status; firstDivergence = $stale.value.firstDivergence.id }
    )
    executableSessionPathsVerified = $true
    controllerInspectVerified = $true
    controllerBlockedAdvanceVerified = $true
    diagnosticBundleVerified = $true
    unityInvoked = $false
    productAcceptanceIssued = $false
    questInvoked = $false
    physicalAcceptanceIssued = $false
}
$qualificationPath = Join-Path $OutputRoot "underdrain-commissioning-state-fixture-qualification.json"
Write-Json $qualificationPath $qualification
"$(Sha $qualificationPath)  $([System.IO.Path]::GetFileName($qualificationPath))" | Set-Content -Encoding ascii ($qualificationPath + ".sha256")
Write-Host "UNDERDRAIN commissioning-state admission, refusal, controller, and evidence fixtures passed."
Write-Host $qualificationPath

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$EmbodiedArLabRoot,

    [Parameter(Mandatory = $true)]
    [string]$ArcRoot,

    [Parameter(Mandatory = $true)]
    [string]$JobId,

    [ValidateSet("keyboard-mouse", "gamepad")]
    [string]$Device,

    [int]$TimeoutSeconds = 900,
    [int]$ScreenWidth = 1600,
    [int]$ScreenHeight = 900,
    [bool]$RequireAllCues = $true,
    [switch]$InstallArcDependencies,
    [switch]$ForceCloseExistingPlayer
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ExpectedArcCommit = "aaa5685903a348b3c1ba875622fbe99d90c1da35"

function Resolve-FullPath([string]$Value, [string]$Base) {
    if ([System.IO.Path]::IsPathRooted($Value)) { return [System.IO.Path]::GetFullPath($Value) }
    return [System.IO.Path]::GetFullPath((Join-Path $Base $Value))
}

$worldRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$projectRoot = Resolve-FullPath $EmbodiedArLabRoot (Get-Location).Path
$arcPath = Resolve-FullPath $ArcRoot (Get-Location).Path
$jobRoot = Join-Path $projectRoot "local\scene-jobs\$JobId"
$inputRoot = Join-Path $jobRoot "input"
$outputRoot = Join-Path $jobRoot "output"
$buildReceiptRoot = Join-Path $jobRoot "build\receipts"
$buildRunPath = Join-Path $buildReceiptRoot "build-run-windows.json"
$productRunPath = Join-Path $outputRoot "player-product-run.json"
$productProfilePath = Join-Path $worldRoot "unity\Fixtures\underdrain.player-product.json"
$nativeSpecPath = Join-Path $inputRoot "underdrain.action-spec.json"
foreach ($path in @($buildRunPath, $productRunPath, $productProfilePath, $nativeSpecPath)) { if (-not (Test-Path $path)) { throw "Required UNDERDRAIN player-session input is absent: $path" } }
$buildRun = Get-Content $buildRunPath -Raw | ConvertFrom-Json
$productRun = Get-Content $productRunPath -Raw | ConvertFrom-Json
$profile = Get-Content $productProfilePath -Raw | ConvertFrom-Json
if ($buildRun.status -ne "pass" -or $buildRun.playerProductRequired -ne $true) { throw "Windows player is not bound to a qualified player product." }
if ($productRun.status -ne "pass" -or $productRun.buildEligible -ne $true) { throw "Unity player product is not build-eligible." }
if ($buildRun.playerProductId -ne $productRun.productId -or $buildRun.playerProductProfileSha256 -ne $productRun.productProfileSha256) { throw "Windows build and Unity player-product identities differ." }
$playerPath = [System.IO.Path]::GetFullPath([string]$buildRun.product)
if (-not (Test-Path $playerPath)) { throw "Built Windows player is absent: $playerPath" }
$arcHead = (& git -C $arcPath rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $arcHead -ne $ExpectedArcCommit) { throw "Arc checkout is $arcHead; expected exact authority $ExpectedArcCommit." }
if (& git -C $arcPath status --porcelain) { throw "Arc checkout is dirty before the player session." }

$sessionRoot = Join-Path $buildReceiptRoot "player-session-$Device"
if (Test-Path $sessionRoot) { Remove-Item -Recurse -Force $sessionRoot }
New-Item -ItemType Directory -Force $sessionRoot | Out-Null
$sessionEvidencePath = Join-Path $sessionRoot "player-session-evidence.json"
$performancePath = Join-Path $sessionRoot "performance.json"
$playerLog = Join-Path $sessionRoot "player.log"
$sessionRunPath = Join-Path $sessionRoot "session-run.json"
$replayRoot = Join-Path $sessionRoot "arc-replay"

$running = Get-Process -Name ([System.IO.Path]::GetFileNameWithoutExtension($playerPath)) -ErrorAction SilentlyContinue
if ($running) {
    if (-not $ForceCloseExistingPlayer) { throw "The UNDERDRAIN player is already running. Close it or pass -ForceCloseExistingPlayer." }
    $running | Stop-Process -Force
    Start-Sleep -Seconds 1
}

$arguments = @(
    "-screen-fullscreen", "0",
    "-screen-width", [string]$ScreenWidth,
    "-screen-height", [string]$ScreenHeight,
    "-axmActionSessionEvidence", $sessionEvidencePath,
    "-axmActionRequiredDevice", $Device,
    "-axmWorldCommit", [string]$productRun.worldCommit,
    "-axmArcCommit", [string]$productRun.arcCommit,
    "-axmActionRequireAllCues", $(if ($RequireAllCues) { "true" } else { "false" }),
    "-axmActionExitOnEvidence", "true",
    "-axmActionSessionTimeout", [string]$TimeoutSeconds,
    "-axmActionPerformanceReceipt", $performancePath,
    "-axmActionTargetFps", [string]$profile.performance.targetFps,
    "-axmActionMaxP95Milliseconds", ([string]$profile.performance.maximumP95FrameMilliseconds),
    "-axmActionMaxP99Milliseconds", ([string]$profile.performance.maximumP99FrameMilliseconds),
    "-logFile", $playerLog
)
Write-Host "Launching the exact UNDERDRAIN Windows player for the $Device session."
Write-Host "Complete the full teach, practice, and mastery sequence. The player will close after terminal evidence is written."
$player = Start-Process -FilePath $playerPath -ArgumentList $arguments -PassThru
try {
    Wait-Process -Id $player.Id -Timeout ($TimeoutSeconds + 90) -ErrorAction Stop
} catch {
    if (-not $player.HasExited) { Stop-Process -Id $player.Id -Force }
    throw "UNDERDRAIN $Device session exceeded its timeout. See $playerLog"
}
$player.Refresh()
if ($player.ExitCode -ne 0) { throw "UNDERDRAIN $Device session exited $($player.ExitCode). See $playerLog" }
foreach ($path in @($sessionEvidencePath, $performancePath)) { if (-not (Test-Path $path)) { throw "Built player did not write required session evidence: $path" } }
$session = Get-Content $sessionEvidencePath -Raw | ConvertFrom-Json
$performance = Get-Content $performancePath -Raw | ConvertFrom-Json
if ($session.format -ne "rodoh-action-player-session-evidence/2") { throw "Built player emitted an unsupported session-evidence format." }
if ($session.status -ne "pass" -or $session.terminal -ne $true) { throw "Built-player mechanic session did not pass: $($session.error)" }
if ($session.playerProductIdentityValid -ne $true -or $session.playerProductQualification -ne "source-and-scene-qualified") { throw "Built-player session did not validate its serialized product identity." }
if ($session.playerProductId -ne $productRun.productId -or $session.playerProductProfileSha256 -ne $productRun.productProfileSha256) { throw "Built-player session loaded a different player-product identity." }
if ($session.worldCommit -ne $productRun.worldCommit -or $session.arcCommit -ne $productRun.arcCommit) { throw "Built-player session lost exact World or Arc commit custody." }
if ($session.presentationManifestId -ne $productRun.presentationManifestId -or $session.sceneJobDigest -ne $productRun.sceneJobDigest) { throw "Built-player session loaded a different presentation or scene-job identity." }
if ($session.presentationAdapterId -ne "production.prefab/v1" -or $session.diagnosticPresentation -ne $false) { throw "Built-player session lost the production presentation adapter." }
if ($session.actionSpecDigest -ne $productRun.actionSpecDigest -or $session.arcDigest -ne $productRun.arcDigest -or $session.timingProfileId -ne $productRun.timingProfileId) { throw "Built-player session loaded different Arc or timing-profile authority." }
if ($session.candidateAuthority -ne "Arc replay required" -or $session.comprehensionReceipt -ne "not-issued-by-runtime" -or $session.acceptance -ne "diagnostic-mechanic-session-only") { throw "Built-player session crossed the candidate or human-evidence authority boundary." }
if ($session.cameraCollisionEnabled -ne $true -or $session.rebindingAvailable -ne $true) { throw "Built-player session lacks camera collision or runtime rebinding." }
if ($RequireAllCues -and ($session.allRequiredCuesObserved -ne $true -or $session.missingCueIds.Count -ne 0)) { throw "Built-player session did not exercise all required Arc semantic cues." }
if ($Device -eq "keyboard-mouse" -and $session.sawKeyboardMouse -ne $true) { throw "Keyboard/mouse input was not observed in the required session." }
if ($Device -eq "gamepad" -and $session.sawGamepad -ne $true) { throw "Gamepad input was not observed in the required session." }
if ($performance.status -ne "pass" -or $performance.withinBudget -ne $true) { throw "Built-player frame pacing did not pass: p95=$($performance.p95FrameMilliseconds) p99=$($performance.p99FrameMilliseconds)" }
if ($performance.actionSpecDigest -ne $session.actionSpecDigest -or $performance.arcDigest -ne $session.arcDigest) { throw "Performance receipt loaded a different action product." }
$candidatePath = [System.IO.Path]::GetFullPath([string]$session.candidatePath)
if (-not (Test-Path $candidatePath)) { throw "Built-player provisional candidate is absent: $candidatePath" }
$candidateSha = (Get-FileHash $candidatePath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($candidateSha -ne $session.candidateSha256) { throw "Built-player provisional candidate digest mismatch." }

$replayScript = Join-Path $worldRoot "scripts\replay-unity-action-candidate.ps1"
$replayArgs = @(
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $replayScript,
    "-ArcRoot", $arcPath,
    "-NativeActionSpec", $nativeSpecPath,
    "-Candidate", $candidatePath,
    "-OutputRoot", $replayRoot,
    "-ArcActionAuthorityCommit", $ExpectedArcCommit
)
if ($InstallArcDependencies) { $replayArgs += "-InstallDependencies" }
Write-Host "Returning the real built-player candidate through exact Arc replay..."
& powershell.exe @replayArgs
if ($LASTEXITCODE -ne 0) { throw "Exact Arc replay of the $Device candidate failed with exit $LASTEXITCODE." }
$replayRunPath = Join-Path $replayRoot "arc-replay-run.json"
$acceptedReceiptPath = Join-Path $replayRoot "accepted-action-receipt.json"
$reconciliationPath = Join-Path $replayRoot "result-reconciliation.json"
foreach ($path in @($replayRunPath, $acceptedReceiptPath, $reconciliationPath)) { if (-not (Test-Path $path)) { throw "Exact Arc replay output is absent: $path" } }
$replay = Get-Content $replayRunPath -Raw | ConvertFrom-Json
$accepted = Get-Content $acceptedReceiptPath -Raw | ConvertFrom-Json
$reconciliation = Get-Content $reconciliationPath -Raw | ConvertFrom-Json
if ($replay.status -ne "pass" -or $reconciliation.status -ne "accepted") { throw "Exact Arc authority did not accept the built-player candidate." }
if ($accepted.timingProfileId -ne $productRun.timingProfileId) { throw "Accepted Arc receipt lost the built-player timing profile." }

$receipt = [ordered]@{
    format = "rodoh-underdrain-windows-player-session/2"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "pass"
    device = $Device
    worldCommit = $productRun.worldCommit
    arcCommit = $productRun.arcCommit
    playerProductId = $session.playerProductId
    playerProductProfileSha256 = $session.playerProductProfileSha256
    playerProductQualification = $session.playerProductQualification
    presentationManifestId = $session.presentationManifestId
    sceneJobDigest = $session.sceneJobDigest
    windowsProduct = $playerPath
    windowsProductSha256 = $buildRun.productSha256
    actionSpecDigest = $session.actionSpecDigest
    arcDigest = $session.arcDigest
    challengeId = $session.challengeId
    timingProfileId = $session.timingProfileId
    presentationAdapterId = $session.presentationAdapterId
    bindingProfileDigest = $session.bindingProfileDigest
    allRequiredCuesObserved = $session.allRequiredCuesObserved
    observedCueIds = $session.observedCueIds
    cameraCollisionEnabled = $session.cameraCollisionEnabled
    cameraCollisionAdjustments = $session.cameraCollisionAdjustments
    nearestCameraCollisionDistance = $session.nearestCameraCollisionDistance
    performance = [ordered]@{
        targetFps = $performance.targetFps
        p50FrameMilliseconds = $performance.p50FrameMilliseconds
        p95FrameMilliseconds = $performance.p95FrameMilliseconds
        p99FrameMilliseconds = $performance.p99FrameMilliseconds
        maximumFrameMilliseconds = $performance.maximumFrameMilliseconds
        withinBudget = $performance.withinBudget
    }
    provisionalCandidate = $candidatePath
    provisionalCandidateSha256 = $candidateSha
    candidateAuthority = $session.candidateAuthority
    acceptedReceipt = $acceptedReceiptPath
    acceptedReceiptDigest = $accepted.receiptDigest
    reconciliation = $reconciliationPath
    provisionalParity = $reconciliation.provisionalParity
    comprehensionReceipt = "not-issued"
    independentComprehension = "open"
    namedPlayerProductAcceptance = "not-issued"
    questAcceptance = "open"
    sessionEvidence = $sessionEvidencePath
    performanceReceipt = $performancePath
    playerLog = $playerLog
    arcReplay = $replayRunPath
}
$receipt | ConvertTo-Json -Depth 24 | Set-Content -Encoding utf8 $sessionRunPath
$checksumPath = Join-Path $sessionRoot "SHA256SUMS"
Get-ChildItem $sessionRoot -File -Recurse |
    Where-Object { $_.FullName -ne $checksumPath } |
    Sort-Object FullName |
    ForEach-Object {
        $relative = [IO.Path]::GetRelativePath($sessionRoot, $_.FullName).Replace('\','/')
        $hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        "$hash  $relative"
    } | Set-Content -Encoding ascii $checksumPath

Write-Host "UNDERDRAIN $Device Windows player session passed its product identity, mechanic, device, frame-pacing, and exact Arc-replay boundary."
Write-Host "This is not an independent comprehension or final product-acceptance receipt."
Write-Host $sessionRunPath

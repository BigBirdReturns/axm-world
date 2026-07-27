[CmdletBinding()]
param(
    [ValidateSet("Prepare", "Status", "Complete")]
    [string]$Phase = "Prepare",

    [string]$PlanPath,
    [string]$WorldRepositoryRoot = "D:\Projects\axm-world",
    [string]$ArcRepositoryRoot = "D:\Projects\axm-arc",
    [string]$EmbodiedRepositoryRoot = "D:\Projects\axm-embodied",
    [string]$EmbodiedArLabRoot = "D:\Projects\Embodied-AR-Lab\worktrees\scene-compiler-v0.1-integration",
    [string]$AcceptanceRoot,
    [string]$SessionId,
    [string]$JobId,
    [string]$DeviceId = "quest-3-primary",
    [Parameter(Mandatory = $false)]
    [string]$QuestSerial,
    [string]$ApplicationIdentifier,
    [string]$Adb = "adb",
    [string]$TrackedHeadPath,
    [ValidateSet("left", "right")]
    [string]$DominantHand = "right",
    [switch]$OneHanded,
    [switch]$ReducedMotion,
    [switch]$HighContrast,
    [ValidateSet("low", "standard", "high")]
    [string]$InitialQuality = "standard",
    [switch]$DevelopmentBuild,
    [switch]$NoLaunch,
    [switch]$AllowFetch,
    [switch]$ForceCloseUnity,
    [string]$UnityVersion = "6000.0.66f2",
    [string]$UnityEditor
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$WorldCandidate = "52162c757f905aae5c2383f6896de3b258e7cf8f"
$ArcActionAuthority = "6eef311836ee7cb3a43a94ce51f448a2699c3b04"
$EmbodiedCustodyDonor = "69b7f9a7bad5b4a94210313ca267a9b479402f09"
$GenesisKernel = "9074e7fb2e9cedde692b248cdd0c6a805e77d8ac"

function Resolve-FullPath([string]$Value, [string]$Base) {
    if ([string]::IsNullOrWhiteSpace($Value)) { return $null }
    if ([System.IO.Path]::IsPathRooted($Value)) { return [System.IO.Path]::GetFullPath($Value) }
    return [System.IO.Path]::GetFullPath((Join-Path $Base $Value))
}

function Invoke-GitText([string]$Repository, [string[]]$Arguments) {
    $value = & git.exe -C $Repository @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) { throw "git -C $Repository $($Arguments -join ' ') failed: $($value -join ' ')" }
    return ([string]($value -join "`n")).Trim()
}

function Resolve-Repository([string]$Value, [string]$Label) {
    $root = Resolve-FullPath $Value (Get-Location).Path
    foreach ($candidate in @($root, (Join-Path $root "main"))) {
        if ($null -eq $candidate -or -not (Test-Path $candidate)) { continue }
        try {
            $inside = Invoke-GitText $candidate @("rev-parse", "--is-inside-work-tree")
            if ($inside -eq "true") { return [System.IO.Path]::GetFullPath($candidate) }
        } catch {
            continue
        }
    }
    throw "$Label is not a Git worktree at $root or $root\main."
}

function Require-Path([string]$Value, [string]$Label) {
    if ([string]::IsNullOrWhiteSpace($Value) -or -not (Test-Path $Value)) { throw "$Label is absent: $Value" }
}

function Ensure-Commit([string]$Repository, [string]$Commit, [string]$Label, [bool]$MayFetch) {
    & git.exe -C $Repository cat-file -e "$Commit^{commit}" *> $null
    if ($LASTEXITCODE -eq 0) { return }
    if (-not $MayFetch) { throw "$Label does not contain $Commit. Re-run with -AllowFetch only when network retrieval is acceptable." }
    & git.exe -C $Repository fetch --no-tags origin $Commit
    if ($LASTEXITCODE -ne 0) { throw "Unable to fetch $Commit into $Label." }
    & git.exe -C $Repository cat-file -e "$Commit^{commit}" *> $null
    if ($LASTEXITCODE -ne 0) { throw "$Label still does not contain $Commit after fetch." }
}

function Ensure-DetachedWorktree([string]$Repository, [string]$Commit, [string]$Path, [string]$Label) {
    if (Test-Path $Path) {
        $actual = Invoke-GitText $Path @("rev-parse", "HEAD")
        if ($actual -ne $Commit) { throw "$Label worktree names $actual instead of ${Commit}: $Path" }
        if (Invoke-GitText $Path @("status", "--porcelain")) { throw "$Label worktree is dirty: $Path" }
        return [System.IO.Path]::GetFullPath($Path)
    }
    New-Item -ItemType Directory -Force ([System.IO.Path]::GetDirectoryName($Path)) | Out-Null
    & git.exe -C $Repository worktree add --detach $Path $Commit
    if ($LASTEXITCODE -ne 0) { throw "Unable to create the $Label worktree at $Path." }
    if ((Invoke-GitText $Path @("rev-parse", "HEAD")) -ne $Commit) { throw "$Label worktree did not land on $Commit." }
    if (Invoke-GitText $Path @("status", "--porcelain")) { throw "$Label worktree is dirty after creation." }
    return [System.IO.Path]::GetFullPath($Path)
}

function Resolve-Adb([string]$Command) {
    return (Get-Command $Command -ErrorAction Stop).Source
}

function Get-AdbPrefix([string]$Serial) {
    if ([string]::IsNullOrWhiteSpace($Serial)) { return @() }
    return @("-s", $Serial)
}

function Invoke-AdbText([string]$Command, [string[]]$Prefix, [string[]]$Arguments, [string]$Label) {
    $value = & $Command @($Prefix + $Arguments) 2>&1
    if ($LASTEXITCODE -ne 0) { throw "$Label failed with exit ${LASTEXITCODE}: $($value -join ' ')" }
    return ([string]($value -join "`n")).Trim()
}

function Test-AdbPath([string]$Command, [string[]]$Prefix, [string]$Path) {
    & $Command @($Prefix + @("shell", "ls", $Path)) *> $null
    return $LASTEXITCODE -eq 0
}

function Find-AndroidApplicationIdentifier([string]$ProjectRoot, [string]$Override) {
    if (-not [string]::IsNullOrWhiteSpace($Override)) { return $Override.Trim() }
    $settingsPath = Join-Path $ProjectRoot "ProjectSettings\ProjectSettings.asset"
    Require-Path $settingsPath "Unity ProjectSettings.asset"
    $lines = Get-Content $settingsPath
    $inside = $false
    foreach ($line in $lines) {
        if ($line -match '^\s*applicationIdentifier:\s*$') {
            $inside = $true
            continue
        }
        if ($inside -and $line -match '^\s+Android:\s*([^\s#]+)') { return $Matches[1] }
        if ($inside -and $line -match '^\S') { $inside = $false }
    }
    foreach ($line in $lines) {
        if ($line -match '^\s*bundleIdentifier:\s*([^\s#]+)') { return $Matches[1] }
    }
    throw "Unable to determine the Android application identifier from $settingsPath. Supply -ApplicationIdentifier explicitly."
}

function Get-RemoteSpoolStatus([string]$Command, [string[]]$Prefix, [string]$RemotePath) {
    $startPresent = Test-AdbPath $Command $Prefix "$RemotePath/session-start.json"
    $indexPresent = Test-AdbPath $Command $Prefix "$RemotePath/index.json"
    $entries = @()
    if (Test-AdbPath $Command $Prefix "$RemotePath/entries") {
        $text = Invoke-AdbText $Command $Prefix @("shell", "ls", "$RemotePath/entries") "Listing remote action-session entries"
        if (-not [string]::IsNullOrWhiteSpace($text)) { $entries = @($text -split "`r?`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) }
    }
    $candidates = @($entries | Where-Object { $_ -match '-action_candidate\.entry\.json$' })
    $safety = @($entries | Where-Object { $_ -match '-physical_session_stopped\.entry\.json$' })
    return [ordered]@{
        sessionStartPresent = $startPresent
        indexPresent = $indexPresent
        entryCount = $entries.Count
        candidateCount = $candidates.Count
        safetyObservationCount = $safety.Count
        readyForArcReplay = $startPresent -and $indexPresent -and $candidates.Count -eq 1
    }
}

function Read-Plan([string]$Path) {
    Require-Path $Path "Physical acceptance plan"
    $value = Get-Content $Path -Raw | ConvertFrom-Json
    if ($value.format -ne "rodoh-action-physical-acceptance-plan/1") { throw "Physical acceptance plan format is unsupported." }
    if ($value.status -ne "awaiting-physical-execution") { throw "Physical acceptance plan is not awaiting physical execution." }
    if ($value.worldCandidate -ne $WorldCandidate -or $value.arcActionAuthority -ne $ArcActionAuthority -or $value.embodiedCustodyDonor -ne $EmbodiedCustodyDonor) {
        throw "Physical acceptance plan does not bind the kit's exact authority set."
    }
    return $value
}

$workingRoot = (Get-Location).Path
$labRoot = Resolve-FullPath $EmbodiedArLabRoot $workingRoot
if ([string]::IsNullOrWhiteSpace($AcceptanceRoot)) { $AcceptanceRoot = Join-Path $labRoot "local\rodoh-action-physical-acceptance" }
$acceptanceRootPath = Resolve-FullPath $AcceptanceRoot $workingRoot

if ($Phase -eq "Prepare") {
    Require-Path $labRoot "Embodied-AR-Lab root"
    foreach ($directory in @("Assets", "Packages", "ProjectSettings")) { Require-Path (Join-Path $labRoot $directory) "Embodied-AR-Lab $directory" }
    if ([string]::IsNullOrWhiteSpace($QuestSerial)) { throw "QuestSerial is required for a device-bound physical acceptance run." }
    if ([string]::IsNullOrWhiteSpace($SessionId)) { $SessionId = "first-charter-quest-" + (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss") }
    if ([string]::IsNullOrWhiteSpace($JobId)) { $JobId = $SessionId }

    $worldRepository = Resolve-Repository $WorldRepositoryRoot "World repository"
    $arcRepository = Resolve-Repository $ArcRepositoryRoot "Arc repository"
    $embodiedRepository = Resolve-Repository $EmbodiedRepositoryRoot "Embodied repository"
    Ensure-Commit $worldRepository $WorldCandidate "World repository" ([bool]$AllowFetch)
    Ensure-Commit $arcRepository $ArcActionAuthority "Arc repository" ([bool]$AllowFetch)
    Ensure-Commit $embodiedRepository $EmbodiedCustodyDonor "Embodied repository" ([bool]$AllowFetch)

    $worktreeRoot = Join-Path $acceptanceRootPath "worktrees"
    $worldWorktree = Ensure-DetachedWorktree $worldRepository $WorldCandidate (Join-Path $worktreeRoot ("world-" + $WorldCandidate.Substring(0, 12))) "World candidate"
    $embodiedWorktree = Ensure-DetachedWorktree $embodiedRepository $EmbodiedCustodyDonor (Join-Path $worktreeRoot ("embodied-" + $EmbodiedCustodyDonor.Substring(0, 12))) "Embodied custody donor"
    Require-Path (Join-Path $embodiedWorktree "src\axm_embodied\action_spool.py") "Embodied action spool"

    $adbCommand = Resolve-Adb $Adb
    $adbPrefix = Get-AdbPrefix $QuestSerial
    if ((Invoke-AdbText $adbCommand $adbPrefix @("get-state") "Quest ADB connectivity check") -ne "device") { throw "Quest ADB device is not ready." }
    $questModel = Invoke-AdbText $adbCommand $adbPrefix @("shell", "getprop", "ro.product.model") "Reading Quest model"
    $applicationId = Find-AndroidApplicationIdentifier $labRoot $ApplicationIdentifier
    if ($applicationId -notmatch '^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+$') { throw "Android application identifier is malformed: $applicationId" }
    $remoteSpool = "/sdcard/Android/data/$applicationId/files/axm-action-session-spool/$SessionId"
    if (Test-AdbPath $adbCommand $adbPrefix $remoteSpool) { throw "Quest already contains $remoteSpool. Choose a new SessionId; immutable evidence is never replaced." }

    $launcher = Join-Path $worldWorktree "scripts\run-first-charter-action.ps1"
    Require-Path $launcher "Frozen First Charter action launcher"
    & $launcher `
        -EmbodiedArLabRoot $labRoot `
        -ArcRepositoryRoot $arcRepository `
        -JobId $JobId `
        -SessionId $SessionId `
        -DeviceId $DeviceId `
        -InitialQuality $InitialQuality `
        -TrackedHeadPath $TrackedHeadPath `
        -ReducedMotion:$ReducedMotion `
        -HighContrast:$HighContrast `
        -Quest `
        -DominantHand $DominantHand `
        -OneHanded:$OneHanded `
        -BuildWindows `
        -BuildQuest `
        -InstallQuest `
        -QuestSerial $QuestSerial `
        -Adb $Adb `
        -DevelopmentBuild:$DevelopmentBuild `
        -UnityVersion $UnityVersion `
        -UnityEditor $UnityEditor `
        -ForceCloseUnity:$ForceCloseUnity

    $jobRoot = Join-Path $labRoot "local\scene-jobs\$JobId"
    $firstCharterReceiptPath = Join-Path $jobRoot "output\first-charter-local-run.json"
    Require-Path $firstCharterReceiptPath "First Charter local-run receipt"
    $run = Get-Content $firstCharterReceiptPath -Raw | ConvertFrom-Json
    if ($run.format -ne "rodoh-first-charter-action-local-run/1" -or $run.status -ne "pass") { throw "First Charter local run did not pass." }
    if ($run.worldCommit -ne $WorldCandidate -or $run.arcActionAuthorityCommit -ne $ArcActionAuthority) { throw "First Charter local run differs from the frozen authority set." }
    foreach ($field in @("unityEstateReceipt", "governedProductionReceipt", "windowsBuildReceipt", "questBuildReceipt")) {
        if ([string]::IsNullOrWhiteSpace([string]$run.$field)) { throw "First Charter receipt lacks $field." }
        Require-Path ([string]$run.$field) "First Charter $field"
    }
    $estate = Get-Content ([string]$run.unityEstateReceipt) -Raw | ConvertFrom-Json
    $production = Get-Content ([string]$run.governedProductionReceipt) -Raw | ConvertFrom-Json
    $windows = Get-Content ([string]$run.windowsBuildReceipt) -Raw | ConvertFrom-Json
    $quest = Get-Content ([string]$run.questBuildReceipt) -Raw | ConvertFrom-Json
    if ($estate.status -ne "pass" -or $estate.editModeTests -ne "pass" -or $estate.deterministicReplay -ne $true -or $estate.activePhysicsAuthority -ne $false) { throw "Unity estate receipt does not prove the required deterministic EditMode boundary." }
    if ($production.format -ne "rodoh-action-governed-production-run/1" -or $production.status -ne "pass" -or $production.bodyPrefabs -ne 6 -or $production.enemyKits -ne 5 -or $production.controllers -ne 2 -or $production.prefabsBound -ne 6 -or $production.rootMotion -ne $false) { throw "Governed production receipt is incomplete." }
    if ($windows.status -ne "pass" -or $windows.playerSmoke -ne "pass") { throw "Windows standalone build did not pass its terminal smoke." }
    if ($quest.status -ne "pass" -or $quest.installed -ne "pass") { throw "Quest APK was not installed on the named device." }
    if ((Invoke-AdbText $adbCommand $adbPrefix @("shell", "pm", "path", $applicationId) "Verifying installed Quest package") -notmatch '^package:') { throw "Installed Quest package cannot be resolved: $applicationId" }

    $launchStatus = "not-requested"
    if (-not $NoLaunch) {
        Invoke-AdbText $adbCommand $adbPrefix @("shell", "monkey", "-p", $applicationId, "-c", "android.intent.category.LAUNCHER", "1") "Launching frozen Quest action package" | Out-Null
        $launchStatus = "pass"
    }

    $sessionRoot = Join-Path $acceptanceRootPath ("sessions\" + $SessionId)
    if (Test-Path $sessionRoot) { throw "Local physical acceptance session already exists: $sessionRoot" }
    New-Item -ItemType Directory -Force $sessionRoot | Out-Null
    $journalPath = Join-Path $sessionRoot "journal"
    $pullRoot = Join-Path $sessionRoot "pulled-spool"
    $planOutput = Join-Path $sessionRoot "physical-acceptance-plan.json"
    $plan = [ordered]@{
        format = "rodoh-action-physical-acceptance-plan/1"
        generatedAt = (Get-Date).ToUniversalTime().ToString("o")
        status = "awaiting-physical-execution"
        authority = "No physical or campaign outcome accepted until immutable Quest spool ingestion and exact Arc replay"
        worldCandidate = $WorldCandidate
        arcActionAuthority = $ArcActionAuthority
        embodiedCustodyDonor = $EmbodiedCustodyDonor
        genesisKernel = $GenesisKernel
        worldWorktree = $worldWorktree
        embodiedWorktree = $embodiedWorktree
        arcRepository = $arcRepository
        labRoot = $labRoot
        jobId = $JobId
        sessionId = $SessionId
        deviceId = $DeviceId
        questSerial = $QuestSerial
        questModel = $questModel
        applicationIdentifier = $applicationId
        remoteSpool = $remoteSpool
        journalPath = $journalPath
        pullRoot = $pullRoot
        launch = $launchStatus
        firstCharterReceipt = $firstCharterReceiptPath
        firstCharterReceiptSha256 = (Get-FileHash $firstCharterReceiptPath -Algorithm SHA256).Hash.ToLowerInvariant()
        actionSpecDigest = $run.actionSpecDigest
        arcDigest = $run.arcDigest
        unityEstateReceipt = $run.unityEstateReceipt
        governedProductionReceipt = $run.governedProductionReceipt
        windowsBuildReceipt = $run.windowsBuildReceipt
        questBuildReceipt = $run.questBuildReceipt
        windowsProductSha256 = $windows.productSha256
        questApkSha256 = $quest.apkSha256
        next = "Run this kit with -Phase Status -PlanPath `"$planOutput`" after completing the headset encounter."
        completion = "Run this kit with -Phase Complete -PlanPath `"$planOutput`" only after Status reports candidate-ready."
    }
    $plan | ConvertTo-Json -Depth 12 | Set-Content -Encoding utf8 $planOutput
    Write-Host "Windows and Quest products passed their machine gates. The physical result remains explicitly unaccepted."
    Write-Host $planOutput
    return
}

if ([string]::IsNullOrWhiteSpace($PlanPath)) { throw "PlanPath is required for $Phase." }
$resolvedPlan = Resolve-FullPath $PlanPath $workingRoot
$planValue = Read-Plan $resolvedPlan
$adbCommand = Resolve-Adb $Adb
$effectiveSerial = if ([string]::IsNullOrWhiteSpace($QuestSerial)) { [string]$planValue.questSerial } else { $QuestSerial }
$adbPrefix = Get-AdbPrefix $effectiveSerial
if ((Invoke-AdbText $adbCommand $adbPrefix @("get-state") "Quest ADB connectivity check") -ne "device") { throw "Quest ADB device is not ready." }
if ((Invoke-AdbText $adbCommand $adbPrefix @("shell", "pm", "path", [string]$planValue.applicationIdentifier) "Verifying prepared Quest package") -notmatch '^package:') { throw "Prepared Quest package is not installed." }
$status = Get-RemoteSpoolStatus $adbCommand $adbPrefix ([string]$planValue.remoteSpool)
$statusReceipt = [ordered]@{
    format = "rodoh-action-physical-acceptance-status/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = if ($status.readyForArcReplay) { "candidate-ready" } else { "awaiting-physical-execution" }
    authority = "Quest spool observation only; Arc replay still required"
    plan = $resolvedPlan
    planSha256 = (Get-FileHash $resolvedPlan -Algorithm SHA256).Hash.ToLowerInvariant()
    questSerial = $effectiveSerial
    questModel = Invoke-AdbText $adbCommand $adbPrefix @("shell", "getprop", "ro.product.model") "Reading Quest model"
    remoteSpool = $planValue.remoteSpool
    sessionStartPresent = $status.sessionStartPresent
    indexPresent = $status.indexPresent
    entryCount = $status.entryCount
    candidateCount = $status.candidateCount
    safetyObservationCount = $status.safetyObservationCount
    readyForArcReplay = $status.readyForArcReplay
}
$statusPath = Join-Path ([System.IO.Path]::GetDirectoryName($resolvedPlan)) "physical-acceptance-status.json"
$statusReceipt | ConvertTo-Json -Depth 10 | Set-Content -Encoding utf8 $statusPath
if ($Phase -eq "Status") {
    Write-Host "Quest spool status was recorded without accepting an outcome."
    Write-Host $statusPath
    return
}

if (-not $status.readyForArcReplay) { throw "Physical session is not ready for exact Arc replay. See $statusPath" }
if (Test-Path ([string]$planValue.journalPath)) { throw "Embodied journal already exists; completion is single-use." }
$completionScript = Join-Path ([string]$planValue.worldWorktree) "scripts\complete-embodied-action-session.ps1"
Require-Path $completionScript "Frozen embodied action-session completion script"
& $completionScript `
    -AxmEmbodiedRoot ([string]$planValue.embodiedWorktree) `
    -FirstCharterRunReceipt ([string]$planValue.firstCharterReceipt) `
    -JournalPath ([string]$planValue.journalPath) `
    -RemoteSpoolPath ([string]$planValue.remoteSpool) `
    -QuestSerial $effectiveSerial `
    -Adb $Adb `
    -PullRoot ([string]$planValue.pullRoot) `
    -InstallArcDependencies `
    -KeepPulledSpool

$completionReceipt = Join-Path ([string]$planValue.journalPath) "completion-run.json"
Require-Path $completionReceipt "Embodied action-session completion receipt"
$completion = Get-Content $completionReceipt -Raw | ConvertFrom-Json
if ($completion.format -ne "rodoh-embodied-action-session-completion/1" -or $completion.status -ne "pass") { throw "Embodied action-session completion did not pass." }
if ($completion.arcActionAuthorityCommit -ne $ArcActionAuthority -or $completion.actionSpecDigest -ne $planValue.actionSpecDigest) { throw "Completed session differs from the frozen Arc authority or action spec." }
Require-Path ([string]$completion.acceptedReceipt) "Accepted Arc action receipt"
Require-Path ([string]$completion.genesisShard) "Genesis-facing embodied shard"
$sessionStartPath = Join-Path ([string]$completion.effectiveSpool) "session-start.json"
Require-Path $sessionStartPath "Pulled Quest session start"
$sessionStart = Get-Content $sessionStartPath -Raw | ConvertFrom-Json
if ($sessionStart.platform -ne "Android" -or $sessionStart.sessionId -ne $planValue.sessionId -or $sessionStart.deviceId -ne $planValue.deviceId) { throw "Pulled spool does not prove the prepared Android session and device identity." }
if ($sessionStart.arcDigest -ne $planValue.arcDigest -or $sessionStart.actionSpecDigest -ne $planValue.actionSpecDigest) { throw "Pulled spool differs from the prepared Arc or action-spec identity." }
$final = [ordered]@{
    format = "rodoh-action-physical-acceptance/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "pass"
    source = "named Quest device via ADB"
    plan = $resolvedPlan
    planSha256 = (Get-FileHash $resolvedPlan -Algorithm SHA256).Hash.ToLowerInvariant()
    worldCandidate = $WorldCandidate
    arcActionAuthority = $ArcActionAuthority
    embodiedCustodyDonor = $EmbodiedCustodyDonor
    genesisKernel = $GenesisKernel
    questSerial = $effectiveSerial
    questModel = $statusReceipt.questModel
    applicationIdentifier = $planValue.applicationIdentifier
    sessionId = $planValue.sessionId
    deviceId = $planValue.deviceId
    platform = $sessionStart.platform
    arcDigest = $planValue.arcDigest
    actionSpecDigest = $completion.actionSpecDigest
    candidateSha256 = $completion.candidateSha256
    provisionalParity = $completion.provisionalParity
    resolution = $completion.resolution
    acceptedReceipt = $completion.acceptedReceipt
    acceptedReceiptSha256 = (Get-FileHash $completion.acceptedReceipt -Algorithm SHA256).Hash.ToLowerInvariant()
    journal = $completion.journal
    genesisShard = $completion.genesisShard
    genesisShardSha256 = (Get-FileHash $completion.genesisShard -Algorithm SHA256).Hash.ToLowerInvariant()
    completionReceipt = $completionReceipt
}
$finalPath = Join-Path ([System.IO.Path]::GetDirectoryName($resolvedPlan)) "physical-acceptance.json"
$final | ConvertTo-Json -Depth 12 | Set-Content -Encoding utf8 $finalPath
Write-Host "RODOH First Charter physical action acceptance passed through exact Arc replay and embodied custody."
Write-Host $finalPath

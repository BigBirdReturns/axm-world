[CmdletBinding()]
param(
    [ValidateSet("Prepare", "Status", "Complete")]
    [string]$Phase = "Prepare",

    [string]$EmbodiedArLabRoot,
    [string]$ArcRepositoryRoot = "D:\Projects\axm-arc",
    [string]$AxmEmbodiedRoot = "D:\Projects\axm-embodied",
    [string]$JobId = "first-charter-quest-001",
    [string]$SessionId = "first-charter-quest-001",
    [string]$DeviceId = "quest-3-primary",
    [string]$PlanPath,
    [string]$JournalPath,
    [string]$PullRoot,
    [string]$QuestSerial,
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
    [switch]$InstallArcDependencies,
    [switch]$KeepPulledSpool,
    [string]$UnityVersion = "6000.0.66f2",
    [string]$UnityEditor,
    [switch]$ForceCloseUnity
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-FullPath([string]$Value, [string]$Base) {
    if ([string]::IsNullOrWhiteSpace($Value)) { return $null }
    if ([System.IO.Path]::IsPathRooted($Value)) { return [System.IO.Path]::GetFullPath($Value) }
    return [System.IO.Path]::GetFullPath((Join-Path $Base $Value))
}

function Resolve-RepositoryRoot([string]$Value, [string]$Base, [string]$Marker) {
    $root = Resolve-FullPath $Value $Base
    if ($null -eq $root) { return $null }
    if (Test-Path (Join-Path $root $Marker)) { return $root }
    $main = Join-Path $root "main"
    if (Test-Path (Join-Path $main $Marker)) { return [System.IO.Path]::GetFullPath($main) }
    return $root
}

function Require-Path([string]$Value, [string]$Label) {
    if ([string]::IsNullOrWhiteSpace($Value) -or -not (Test-Path $Value)) { throw "$Label is absent: $Value" }
}

function Resolve-AdbCommand([string]$Command) {
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

function Get-RemoteSpoolStatus([string]$Command, [string[]]$Prefix, [string]$RemotePath) {
    $start = Test-AdbPath $Command $Prefix "$RemotePath/session-start.json"
    $index = Test-AdbPath $Command $Prefix "$RemotePath/index.json"
    $entryRoot = "$RemotePath/entries"
    $entries = @()
    if (Test-AdbPath $Command $Prefix $entryRoot) {
        $entryText = Invoke-AdbText $Command $Prefix @("shell", "ls", $entryRoot) "Listing remote action-session entries"
        if (-not [string]::IsNullOrWhiteSpace($entryText)) { $entries = @($entryText -split "`r?`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) }
    }
    $candidateEntries = @($entries | Where-Object { $_ -match '-action_candidate\.entry\.json$' })
    $safetyEntries = @($entries | Where-Object { $_ -match '-physical_session_stopped\.entry\.json$' })
    return [ordered]@{
        remoteSpool = $RemotePath
        sessionStartPresent = $start
        indexPresent = $index
        entriesPresent = $entries.Count
        candidateEntries = $candidateEntries.Count
        safetyEntries = $safetyEntries.Count
        readyForCompletion = $start -and $index -and $candidateEntries.Count -eq 1
    }
}

function Read-Plan([string]$Path) {
    Require-Path $Path "Physical-session plan"
    $value = Get-Content $Path -Raw | ConvertFrom-Json
    if ($value.format -ne "rodoh-first-charter-physical-session-plan/1") { throw "Physical-session plan format is unsupported." }
    if ($value.status -ne "awaiting-physical-execution") { throw "Physical-session plan is not awaiting physical execution: $($value.status)" }
    return $value
}

$worldRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$workingRoot = (Get-Location).Path
if (-not [string]::IsNullOrWhiteSpace($EmbodiedArLabRoot)) { $EmbodiedArLabRoot = Resolve-FullPath $EmbodiedArLabRoot $workingRoot }
$AxmEmbodiedRoot = Resolve-RepositoryRoot $AxmEmbodiedRoot $workingRoot "src\axm_embodied\action_spool.py"
$ArcRepositoryRoot = Resolve-RepositoryRoot $ArcRepositoryRoot $workingRoot ".git"

if ($Phase -eq "Prepare") {
    Require-Path $EmbodiedArLabRoot "Embodied-AR-Lab root"
    Require-Path (Join-Path $EmbodiedArLabRoot "Assets") "Embodied-AR-Lab Assets"
    Require-Path $AxmEmbodiedRoot "axm-embodied root"
    Require-Path (Join-Path $AxmEmbodiedRoot "src\axm_embodied\action_spool.py") "axm-embodied action spool"
    Require-Path $ArcRepositoryRoot "Arc repository root"
    Require-Path (Join-Path $ArcRepositoryRoot ".git") "Arc Git identity"
    $adbCommand = Resolve-AdbCommand $Adb
    $adbPrefix = Get-AdbPrefix $QuestSerial
    $state = Invoke-AdbText $adbCommand $adbPrefix @("get-state") "Quest ADB connectivity check"
    if ($state -ne "device") { throw "Quest ADB state is $state, expected device." }
    $questModel = Invoke-AdbText $adbCommand $adbPrefix @("shell", "getprop", "ro.product.model") "Reading Quest model"

    $launcher = Join-Path $worldRoot "scripts\run-first-charter-action.ps1"
    Require-Path $launcher "First Charter action launcher"
    $parameters = @{
        EmbodiedArLabRoot = $EmbodiedArLabRoot
        ArcRepositoryRoot = $ArcRepositoryRoot
        JobId = $JobId
        SessionId = $SessionId
        DeviceId = $DeviceId
        InitialQuality = $InitialQuality
        TrackedHeadPath = $TrackedHeadPath
        ReducedMotion = $ReducedMotion
        HighContrast = $HighContrast
        Quest = $true
        DominantHand = $DominantHand
        OneHanded = $OneHanded
        BuildWindows = $true
        BuildQuest = $true
        InstallQuest = $true
        QuestSerial = $QuestSerial
        Adb = $Adb
        DevelopmentBuild = $DevelopmentBuild
        UnityVersion = $UnityVersion
        UnityEditor = $UnityEditor
        ForceCloseUnity = $ForceCloseUnity
    }
    & $launcher @parameters

    $jobRoot = Join-Path $EmbodiedArLabRoot "local\scene-jobs\$JobId"
    $runReceiptPath = Join-Path $jobRoot "output\first-charter-local-run.json"
    Require-Path $runReceiptPath "First Charter local-run receipt"
    $run = Get-Content $runReceiptPath -Raw | ConvertFrom-Json
    if ($run.format -ne "rodoh-first-charter-action-local-run/1" -or $run.status -ne "pass") { throw "First Charter local run did not pass." }
    foreach ($required in @("questBuildReceipt", "windowsBuildReceipt", "unityEstateReceipt", "governedProductionReceipt")) {
        if ([string]::IsNullOrWhiteSpace([string]$run.$required)) { throw "First Charter local run lacks $required." }
        Require-Path ([string]$run.$required) "First Charter $required"
    }
    $quest = Get-Content ([string]$run.questBuildReceipt) -Raw | ConvertFrom-Json
    $windows = Get-Content ([string]$run.windowsBuildReceipt) -Raw | ConvertFrom-Json
    $estate = Get-Content ([string]$run.unityEstateReceipt) -Raw | ConvertFrom-Json
    $production = Get-Content ([string]$run.governedProductionReceipt) -Raw | ConvertFrom-Json
    if ($quest.format -ne "rodoh-unity-action-quest-build-run/1" -or $quest.status -ne "pass" -or $quest.installed -ne "pass") { throw "Quest build was not installed successfully." }
    if ($windows.format -ne "rodoh-unity-action-build-run/1" -or $windows.status -ne "pass" -or $windows.playerSmoke -ne "pass") { throw "Windows standalone build did not pass its internal action smoke." }
    if ($estate.format -ne "rodoh-unity-action-estate-v3-local-run/1" -or $estate.status -ne "pass" -or $estate.editModeTests -ne "pass") { throw "Unity estate did not preserve a passing EditMode receipt." }
    if ($production.format -ne "rodoh-action-governed-production-run/1" -or $production.status -ne "pass" -or $production.controllers -ne 2 -or $production.prefabsBound -ne 6) { throw "Governed production did not preserve its complete runtime-bound body and motion set." }
    if ([string]::IsNullOrWhiteSpace([string]$quest.applicationIdentifier) -or [string]::IsNullOrWhiteSpace([string]$quest.remoteSpoolRoot)) { throw "Quest build receipt lacks package or spool identity." }
    $remoteSpool = ([string]$quest.remoteSpoolRoot).TrimEnd('/') + "/" + $SessionId
    if (Test-AdbPath $adbCommand $adbPrefix $remoteSpool) { throw "Quest already contains spool identity $remoteSpool. Choose a new SessionId rather than replacing immutable evidence." }
    $packagePath = Invoke-AdbText $adbCommand $adbPrefix @("shell", "pm", "path", [string]$quest.applicationIdentifier) "Verifying installed Quest package"
    if ($packagePath -notmatch '^package:') { throw "Quest package is not installed: $($quest.applicationIdentifier)" }

    $launchStatus = "not-requested"
    if (-not $NoLaunch) {
        Invoke-AdbText $adbCommand $adbPrefix @("shell", "monkey", "-p", [string]$quest.applicationIdentifier, "-c", "android.intent.category.LAUNCHER", "1") "Launching the exact Quest action package" | Out-Null
        $launchStatus = "pass"
    }

    if ([string]::IsNullOrWhiteSpace($JournalPath)) { $JournalPath = Join-Path $AxmEmbodiedRoot "local\action-sessions\$SessionId" }
    $JournalPath = Resolve-FullPath $JournalPath $workingRoot
    if (Test-Path $JournalPath) { throw "Embodied journal path already exists. Choose a new SessionId or JournalPath: $JournalPath" }
    if ([string]::IsNullOrWhiteSpace($PullRoot)) { $PullRoot = Join-Path $AxmEmbodiedRoot "local\quest-action-spools" }
    $PullRoot = Resolve-FullPath $PullRoot $workingRoot
    if ([string]::IsNullOrWhiteSpace($PlanPath)) { $PlanPath = Join-Path $jobRoot "physical\physical-session-plan.json" }
    $PlanPath = Resolve-FullPath $PlanPath $workingRoot
    New-Item -ItemType Directory -Force ([System.IO.Path]::GetDirectoryName($PlanPath)) | Out-Null
    $plan = [ordered]@{
        format = "rodoh-first-charter-physical-session-plan/1"
        generatedAt = (Get-Date).ToUniversalTime().ToString("o")
        status = "awaiting-physical-execution"
        authority = "No physical or campaign outcome accepted until Quest spool ingestion and exact Arc replay"
        worldCommit = $run.worldCommit
        arcActionAuthorityCommit = $run.arcActionAuthorityCommit
        arcDigest = $run.arcDigest
        actionSpecDigest = $run.actionSpecDigest
        sceneJobDigest = $estate.sceneJobDigest
        jobId = $JobId
        sessionId = $SessionId
        deviceId = $DeviceId
        questSerial = $QuestSerial
        questModel = $questModel
        applicationIdentifier = $quest.applicationIdentifier
        remoteSpool = $remoteSpool
        launch = $launchStatus
        firstCharterRunReceipt = $runReceiptPath
        unityEstateReceipt = $run.unityEstateReceipt
        governedProductionReceipt = $run.governedProductionReceipt
        windowsBuildReceipt = $run.windowsBuildReceipt
        questBuildReceipt = $run.questBuildReceipt
        windowsProductSha256 = $windows.productSha256
        questApkSha256 = $quest.apkSha256
        axmEmbodiedRoot = $AxmEmbodiedRoot
        journalPath = $JournalPath
        pullRoot = $PullRoot
        nextCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Phase Status -PlanPath `"$PlanPath`" -Adb `"$Adb`""
        completionCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Phase Complete -PlanPath `"$PlanPath`" -Adb `"$Adb`""
        requiredPhysicalFacts = @(
            "The installed package starts on the named Quest device.",
            "The action receiver acquires tracked input and a valid physical envelope.",
            "The encounter reaches a real terminal action state or emits an explicit safety stop.",
            "Exactly one provisional action candidate is written to the immutable Quest spool.",
            "No campaign result is accepted before exact Arc replay."
        )
    }
    $plan | ConvertTo-Json -Depth 12 | Set-Content -Encoding utf8 $PlanPath
    Write-Host "First Charter Quest build is installed and the physical session remains explicitly unaccepted."
    Write-Host "Wear the headset, complete the encounter, then run the Status command recorded in:"
    Write-Host $PlanPath
    return
}

if ([string]::IsNullOrWhiteSpace($PlanPath)) { throw "PlanPath is required for $Phase." }
$PlanPath = Resolve-FullPath $PlanPath $workingRoot
$planValue = Read-Plan $PlanPath
$adbCommand = Resolve-AdbCommand $Adb
$effectiveSerial = if ([string]::IsNullOrWhiteSpace($QuestSerial)) { [string]$planValue.questSerial } else { $QuestSerial }
$adbPrefix = Get-AdbPrefix $effectiveSerial
$state = Invoke-AdbText $adbCommand $adbPrefix @("get-state") "Quest ADB connectivity check"
if ($state -ne "device") { throw "Quest ADB state is $state, expected device." }
$packagePath = Invoke-AdbText $adbCommand $adbPrefix @("shell", "pm", "path", [string]$planValue.applicationIdentifier) "Verifying prepared Quest package"
if ($packagePath -notmatch '^package:') { throw "Prepared Quest package is not installed: $($planValue.applicationIdentifier)" }
$status = Get-RemoteSpoolStatus $adbCommand $adbPrefix ([string]$planValue.remoteSpool)
$statusReceipt = [ordered]@{
    format = "rodoh-first-charter-physical-session-status/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = if ($status.readyForCompletion) { "candidate-ready" } else { "awaiting-physical-execution" }
    authority = "Quest spool observation only; Arc replay still required"
    plan = $PlanPath
    planSha256 = (Get-FileHash $PlanPath -Algorithm SHA256).Hash.ToLowerInvariant()
    questSerial = $effectiveSerial
    questModel = Invoke-AdbText $adbCommand $adbPrefix @("shell", "getprop", "ro.product.model") "Reading Quest model"
    applicationIdentifier = $planValue.applicationIdentifier
    remoteSpool = $status.remoteSpool
    sessionStartPresent = $status.sessionStartPresent
    indexPresent = $status.indexPresent
    entriesPresent = $status.entriesPresent
    candidateEntries = $status.candidateEntries
    safetyEntries = $status.safetyEntries
    readyForCompletion = $status.readyForCompletion
}
$statusPath = Join-Path ([System.IO.Path]::GetDirectoryName($PlanPath)) "physical-session-status.json"
$statusReceipt | ConvertTo-Json -Depth 10 | Set-Content -Encoding utf8 $statusPath
if ($Phase -eq "Status") {
    Write-Host "Quest physical-session status recorded without accepting an outcome."
    Write-Host $statusPath
    if (-not $status.readyForCompletion) { Write-Host "The exact candidate is not ready for Arc replay." }
    else { Write-Host "Exactly one candidate is ready. Run the completion command recorded in the plan." }
    return
}

if (-not $status.readyForCompletion) { throw "Physical session is not ready for completion. See $statusPath" }
$completionScript = Join-Path $worldRoot "scripts\complete-embodied-action-session.ps1"
Require-Path $completionScript "Embodied action-session completion script"
$completionParameters = @{
    AxmEmbodiedRoot = [string]$planValue.axmEmbodiedRoot
    FirstCharterRunReceipt = [string]$planValue.firstCharterRunReceipt
    JournalPath = [string]$planValue.journalPath
    RemoteSpoolPath = [string]$planValue.remoteSpool
    QuestSerial = $effectiveSerial
    Adb = $Adb
    PullRoot = [string]$planValue.pullRoot
    InstallArcDependencies = $InstallArcDependencies
    KeepPulledSpool = $KeepPulledSpool
}
& $completionScript @completionParameters
$completionReceiptPath = Join-Path ([string]$planValue.journalPath) "completion-run.json"
Require-Path $completionReceiptPath "Embodied action-session completion receipt"
$completion = Get-Content $completionReceiptPath -Raw | ConvertFrom-Json
if ($completion.format -ne "rodoh-embodied-action-session-completion/1" -or $completion.status -ne "pass") { throw "Embodied action-session completion did not pass." }
if ($completion.actionSpecDigest -ne $planValue.actionSpecDigest -or $completion.arcActionAuthorityCommit -ne $planValue.arcActionAuthorityCommit) { throw "Completed physical session differs from the prepared action authority." }
Require-Path ([string]$completion.acceptedReceipt) "Accepted Arc action receipt"
Require-Path ([string]$completion.genesisShard) "Genesis-facing embodied shard"
$effectiveSpool = [string]$completion.effectiveSpool
$sessionStartPath = Join-Path $effectiveSpool "session-start.json"
Require-Path $sessionStartPath "Pulled Quest session start"
$sessionStart = Get-Content $sessionStartPath -Raw | ConvertFrom-Json
if ($sessionStart.platform -ne "Android" -or $sessionStart.sessionId -ne $planValue.sessionId -or $sessionStart.deviceId -ne $planValue.deviceId) { throw "Pulled spool does not prove the prepared Android physical-session identity." }
if ($sessionStart.arcDigest -ne $planValue.arcDigest -or $sessionStart.actionSpecDigest -ne $planValue.actionSpecDigest -or $sessionStart.unityJobDigest -ne $planValue.sceneJobDigest) { throw "Pulled spool differs from the prepared Arc, action-spec, or Unity job identity." }

$final = [ordered]@{
    format = "rodoh-first-charter-physical-session-completion/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "pass"
    plan = $PlanPath
    planSha256 = (Get-FileHash $PlanPath -Algorithm SHA256).Hash.ToLowerInvariant()
    source = "quest-adb"
    questSerial = $effectiveSerial
    questModel = $statusReceipt.questModel
    applicationIdentifier = $planValue.applicationIdentifier
    sessionId = $planValue.sessionId
    deviceId = $planValue.deviceId
    platform = $sessionStart.platform
    worldCommit = $planValue.worldCommit
    arcActionAuthorityCommit = $completion.arcActionAuthorityCommit
    arcDigest = $planValue.arcDigest
    actionSpecDigest = $completion.actionSpecDigest
    sceneJobDigest = $planValue.sceneJobDigest
    candidateSha256 = $completion.candidateSha256
    provisionalParity = $completion.provisionalParity
    resolution = $completion.resolution
    acceptedReceipt = $completion.acceptedReceipt
    acceptedReceiptSha256 = (Get-FileHash $completion.acceptedReceipt -Algorithm SHA256).Hash.ToLowerInvariant()
    embodiedJournal = $completion.journal
    genesisShard = $completion.genesisShard
    genesisShardSha256 = (Get-FileHash $completion.genesisShard -Algorithm SHA256).Hash.ToLowerInvariant()
    completionReceipt = $completionReceiptPath
}
$finalPath = Join-Path ([System.IO.Path]::GetDirectoryName($PlanPath)) "physical-session-completion.json"
$final | ConvertTo-Json -Depth 12 | Set-Content -Encoding utf8 $finalPath
Write-Host "First Charter Quest physical session completed through exact Arc and embodied custody."
Write-Host $finalPath

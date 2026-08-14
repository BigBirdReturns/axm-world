[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)] [string]$WorldRoot,
    [Parameter(Mandatory = $true)] [string]$ArcRoot,
    [Parameter(Mandatory = $true)] [string]$EmbodiedArLabRoot,
    [string]$JobId = "underdrain-unity6000-player-v1",
    [string]$ExpectedWorldCommit,
    [string]$ExpectedArcCommit = "aaa5685903a348b3c1ba875622fbe99d90c1da35",
    [ValidateSet("inspect", "advance", "auto")]
    [string]$Mode = "inspect",
    [string]$SourceManifest,
    [string]$SourceRoot,
    [string]$ApprovalId,
    [string]$ApprovalAuthorityId,
    [string]$ApprovalName,
    [string]$ApprovalAttestation,
    [switch]$ConfirmAllAssets,
    [ValidateSet("keyboard-mouse", "gamepad")]
    [string]$ReviewSession = "keyboard-mouse",
    [string]$PlayerPacket,
    [string]$ObserverPacket,
    [string]$AdjudicatorPacket,
    [string]$AcceptanceSeatId,
    [string]$AcceptanceLineageId,
    [string]$AcceptanceContextDigest,
    [string]$AcceptanceName,
    [string]$AcceptanceAttestation,
    [string]$StateOutputRoot,
    [string]$PreflightRoot,
    [string]$ReviewRoot,
    [string]$UnityEditor,
    [switch]$ForceCloseUnity,
    [switch]$SkipNpmInstall,
    [switch]$SkipUnityTests,
    [switch]$SkipWindowsSmoke,
    [switch]$DevelopmentBuild,
    [switch]$InstallArcDependencies,
    [switch]$ForceCloseExistingPlayer,
    [switch]$SealEvidence
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-FullPath([string]$Value, [string]$Base) {
    if ([string]::IsNullOrWhiteSpace($Value)) { return $null }
    if ([System.IO.Path]::IsPathRooted($Value)) { return [System.IO.Path]::GetFullPath($Value) }
    return [System.IO.Path]::GetFullPath((Join-Path $Base $Value))
}

function Require-Input([string]$Value, [string]$Label) {
    if ([string]::IsNullOrWhiteSpace($Value)) { throw "$Label is required for this gate." }
}

function Write-Json([string]$Path, [object]$Value) {
    $directory = [System.IO.Path]::GetDirectoryName($Path)
    if (-not [string]::IsNullOrWhiteSpace($directory)) {
        New-Item -ItemType Directory -Force $directory | Out-Null
    }
    $Value | ConvertTo-Json -Depth 60 | Set-Content -Encoding utf8 $Path
}

function Get-Sha256([string]$Path) {
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Add-Argument([System.Collections.ArrayList]$Arguments, [string]$Name, [object]$Value) {
    if ($Value -is [System.Management.Automation.SwitchParameter] -or $Value -is [bool]) {
        if ([bool]$Value) { [void]$Arguments.Add("-$Name") }
        return
    }
    if ($null -ne $Value -and -not [string]::IsNullOrWhiteSpace([string]$Value)) {
        [void]$Arguments.Add("-$Name")
        [void]$Arguments.Add([string]$Value)
    }
}

function Invoke-ChildScript(
    [string]$Script,
    [hashtable]$Parameters,
    [string]$Label,
    [string]$LogPath
) {
    if (-not (Test-Path -LiteralPath $Script -PathType Leaf)) { throw "$Label script is absent: $Script" }
    $arguments = [System.Collections.ArrayList]::new()
    foreach ($value in @("-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", $Script)) {
        [void]$arguments.Add($value)
    }
    foreach ($key in ($Parameters.Keys | Sort-Object)) { Add-Argument $arguments $key $Parameters[$key] }
    New-Item -ItemType Directory -Force ([System.IO.Path]::GetDirectoryName($LogPath)) | Out-Null
    Write-Host $Label
    & $script:HostPowerShell @arguments 2>&1 | Tee-Object -FilePath $LogPath -Append
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) { throw "$Label failed with exit $exitCode. See $LogPath" }
}

function Invoke-StateInspection {
    $parameters = @{
        WorldRoot = $script:WorldPath
        ArcRoot = $script:ArcPath
        EmbodiedArLabRoot = $script:ProjectRoot
        JobId = $JobId
        ExpectedWorldCommit = $ExpectedWorldCommit
        ExpectedArcCommit = $ExpectedArcCommit
        PreflightRoot = $script:PreflightOutput
        ReviewRoot = $script:ReviewOutput
        OutputRoot = $script:StateOutput
        NoFail = $true
    }
    $arguments = [System.Collections.ArrayList]::new()
    foreach ($value in @("-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", $script:StateScript)) {
        [void]$arguments.Add($value)
    }
    foreach ($key in ($parameters.Keys | Sort-Object)) { Add-Argument $arguments $key $parameters[$key] }
    & $script:HostPowerShell @arguments
    if ($LASTEXITCODE -ne 0) { throw "Commissioning-state inspection failed with exit $LASTEXITCODE." }
    $path = Join-Path $script:StateOutput "underdrain-commissioning-state.json"
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Commissioning-state receipt is absent: $path" }
    return [ordered]@{
        path = $path
        sha256 = Get-Sha256 $path
        value = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
    }
}

function Test-DirectoryHasFiles([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path -PathType Container)) { return $false }
    return @(Get-ChildItem -LiteralPath $Path -Force -ErrorAction SilentlyContinue).Count -gt 0
}

$script:WorldPath = Resolve-FullPath $WorldRoot (Get-Location).Path
$script:ArcPath = Resolve-FullPath $ArcRoot (Get-Location).Path
$script:ProjectRoot = Resolve-FullPath $EmbodiedArLabRoot (Get-Location).Path
$script:JobRoot = Join-Path $script:ProjectRoot "local\scene-jobs\$JobId"
if ([string]::IsNullOrWhiteSpace($StateOutputRoot)) { $StateOutputRoot = Join-Path $script:JobRoot "output\commissioning-state" }
if ([string]::IsNullOrWhiteSpace($PreflightRoot)) { $PreflightRoot = Join-Path $script:JobRoot "preflight" }
if ([string]::IsNullOrWhiteSpace($ReviewRoot)) { $ReviewRoot = Join-Path $script:JobRoot "output\player-train\role-separated-review" }
$script:StateOutput = Resolve-FullPath $StateOutputRoot $script:ProjectRoot
$script:PreflightOutput = Resolve-FullPath $PreflightRoot $script:ProjectRoot
$script:ReviewOutput = Resolve-FullPath $ReviewRoot $script:ProjectRoot
New-Item -ItemType Directory -Force $script:StateOutput | Out-Null

$script:HostPowerShell = (Get-Process -Id $PID).Path
$script:StateScript = Join-Path $PSScriptRoot "get-underdrain-commissioning-state.ps1"
if (-not (Test-Path -LiteralPath $script:StateScript -PathType Leaf)) { throw "Commissioning-state inspector is absent: $script:StateScript" }

$trainPath = Join-Path $script:JobRoot "output\player-train\underdrain-unity6000-player-product-train.json"
$approvalPath = Join-Path $script:JobRoot "output\player-train\production-asset-approval\production-asset-approval.json"
$keyboardPath = Join-Path $script:JobRoot "build\receipts\player-session-keyboard-mouse\session-run.json"
$gamepadPath = Join-Path $script:JobRoot "build\receipts\player-session-gamepad\session-run.json"
$reviewKitPath = Join-Path $script:ReviewOutput "review-kit-receipt.json"
$reviewPath = Join-Path $script:ReviewOutput "role-separated-review.json"
$acceptancePath = Join-Path $script:JobRoot "output\player-train\underdrain-player-product-acceptance.json"
$runRoot = Join-Path $script:StateOutput "runs"
New-Item -ItemType Directory -Force $runRoot | Out-Null
$runId = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssfffZ")
$runLog = Join-Path $runRoot "$runId.log"
$actions = [System.Collections.ArrayList]::new()
$blocked = $null
$before = Invoke-StateInspection
if ([string]::IsNullOrWhiteSpace($ExpectedWorldCommit)) { $ExpectedWorldCommit = [string]$before.value.worldCommit }
if ([string]::IsNullOrWhiteSpace($ExpectedArcCommit)) { $ExpectedArcCommit = [string]$before.value.arcCommit }
$current = $before

if ($Mode -ne "inspect") {
    $maximumSteps = if ($Mode -eq "auto") { 10 } else { 1 }
    for ($step = 0; $step -lt $maximumSteps; $step++) {
        $state = $current.value
        if ($state.status -eq "pass") { break }
        if ($state.status -eq "held") {
            $blocked = [ordered]@{
                gate = if ($state.firstDivergence) { $state.firstDivergence.id } else { "unknown" }
                reason = if ($state.firstDivergence) { $state.firstDivergence.message } else { "Commissioning state is held." }
            }
            break
        }
        if ($null -eq $state.firstDivergence) { throw "Open commissioning state lacks a first divergence." }
        $gate = [string]$state.firstDivergence.id
        $action = [ordered]@{
            gate = $gate
            startedAt = (Get-Date).ToUniversalTime().ToString("o")
            script = $null
            status = "started"
        }

        try {
            switch ($gate) {
            "source-custody" {
                $blocked = [ordered]@{ gate = $gate; reason = $state.firstDivergence.message }
            }
            "representation-materialization" {
                if ([string]::IsNullOrWhiteSpace($SourceManifest) -or [string]::IsNullOrWhiteSpace($SourceRoot)) {
                    $blocked = [ordered]@{ gate = $gate; reason = "SourceManifest and SourceRoot are required. Preserve any prior attempt and supply the resolved seven-role source pack." }
                    break
                }
                $action.script = Join-Path $script:WorldPath "scripts\materialize-underdrain-production-representation.ps1"
                Invoke-ChildScript $action.script @{
                    WorldRoot = $script:WorldPath
                    ArcRoot = $script:ArcPath
                    EmbodiedArLabRoot = $script:ProjectRoot
                    ExpectedWorldCommit = $ExpectedWorldCommit
                    ExpectedArcCommit = $ExpectedArcCommit
                    SourceManifest = Resolve-FullPath $SourceManifest (Get-Location).Path
                    SourceRoot = Resolve-FullPath $SourceRoot (Get-Location).Path
                    UnityEditor = $UnityEditor
                    ForceCloseUnity = $ForceCloseUnity
                } "Materializing the exact seven-role UNDERDRAIN representation..." $runLog
            }
            "machine-preflight-v2" {
                $action.script = Join-Path $script:WorldPath "scripts\preflight-underdrain-unity6000-player-product-v2.ps1"
                Invoke-ChildScript $action.script @{
                    WorldRoot = $script:WorldPath
                    ExpectedWorldCommit = $ExpectedWorldCommit
                    ArcRoot = $script:ArcPath
                    EmbodiedArLabRoot = $script:ProjectRoot
                    OutputRoot = $script:PreflightOutput
                    UnityEditor = $UnityEditor
                } "Running read-only machine preflight v2..." $runLog
            }
            "presentation-asset-approval" {
                if (-not $ConfirmAllAssets -or [string]::IsNullOrWhiteSpace($ApprovalId) -or [string]::IsNullOrWhiteSpace($ApprovalAuthorityId) -or [string]::IsNullOrWhiteSpace($ApprovalName) -or [string]::IsNullOrWhiteSpace($ApprovalAttestation)) {
                    $blocked = [ordered]@{ gate = $gate; reason = "Visual review is required. Supply ApprovalId, ApprovalAuthorityId, ApprovalName, ApprovalAttestation, and -ConfirmAllAssets only after inspecting all seven exact prefabs in Unity." }
                    break
                }
                $action.script = Join-Path $script:WorldPath "scripts\approve-underdrain-production-assets.ps1"
                Invoke-ChildScript $action.script @{
                    EmbodiedArLabRoot = $script:ProjectRoot
                    PresentationManifest = Join-Path $script:WorldPath "unity\Fixtures\underdrain.authored-presentation.template.json"
                    ProductProfile = Join-Path $script:WorldPath "unity\Fixtures\underdrain.player-product.json"
                    OutputRoot = [System.IO.Path]::GetDirectoryName($approvalPath)
                    ApprovalId = $ApprovalId
                    ApprovalAuthorityId = $ApprovalAuthorityId
                    ApprovalName = $ApprovalName
                    ApprovalAttestation = $ApprovalAttestation
                    ConfirmAllAssets = $ConfirmAllAssets
                    UnityEditor = $UnityEditor
                    ForceCloseUnity = $ForceCloseUnity
                } "Recording named presentation-asset approval..." $runLog
            }
            "player-product-train" {
                $action.script = Join-Path $script:WorldPath "scripts\run-underdrain-unity6000-player-product.ps1"
                Invoke-ChildScript $action.script @{
                    EmbodiedArLabRoot = $script:ProjectRoot
                    ArcRoot = $script:ArcPath
                    AssetApprovalReceipt = $approvalPath
                    JobId = $JobId
                    UnityEditor = $UnityEditor
                    ForceCloseUnity = $ForceCloseUnity
                    SkipNpmInstall = $SkipNpmInstall
                    SkipUnityTests = $SkipUnityTests
                    SkipWindowsSmoke = $SkipWindowsSmoke
                    DevelopmentBuild = $DevelopmentBuild
                } "Building and qualifying the exact UNDERDRAIN Windows product..." $runLog
            }
            "keyboard-mouse-session" {
                $sessionRoot = [System.IO.Path]::GetDirectoryName($keyboardPath)
                if (Test-DirectoryHasFiles $sessionRoot) {
                    $blocked = [ordered]@{ gate = $gate; reason = "The keyboard-session directory contains evidence without an accepted session receipt. Preserve it and use a new JobId for another attempt." }
                    break
                }
                $action.script = Join-Path $script:WorldPath "scripts\run-underdrain-player-session.ps1"
                Invoke-ChildScript $action.script @{
                    EmbodiedArLabRoot = $script:ProjectRoot
                    ArcRoot = $script:ArcPath
                    JobId = $JobId
                    Device = "keyboard-mouse"
                    InstallArcDependencies = $InstallArcDependencies
                    ForceCloseExistingPlayer = $ForceCloseExistingPlayer
                } "Launching the keyboard and mouse session..." $runLog
            }
            "gamepad-session" {
                $sessionRoot = [System.IO.Path]::GetDirectoryName($gamepadPath)
                if (Test-DirectoryHasFiles $sessionRoot) {
                    $blocked = [ordered]@{ gate = $gate; reason = "The gamepad-session directory contains evidence without an accepted session receipt. Preserve it and use a new JobId for another attempt." }
                    break
                }
                $action.script = Join-Path $script:WorldPath "scripts\run-underdrain-player-session.ps1"
                Invoke-ChildScript $action.script @{
                    EmbodiedArLabRoot = $script:ProjectRoot
                    ArcRoot = $script:ArcPath
                    JobId = $JobId
                    Device = "gamepad"
                    InstallArcDependencies = $InstallArcDependencies
                    ForceCloseExistingPlayer = $ForceCloseExistingPlayer
                } "Launching the gamepad and persisted-rebind session..." $runLog
            }
            "role-review-kit" {
                if (Test-DirectoryHasFiles $script:ReviewOutput) {
                    $blocked = [ordered]@{ gate = $gate; reason = "The review directory is not empty and lacks an accepted kit receipt. Preserve it and use a new ReviewRoot or JobId." }
                    break
                }
                $sessionPath = if ($ReviewSession -eq "gamepad") { $gamepadPath } else { $keyboardPath }
                $action.script = Join-Path $script:WorldPath "scripts\new-underdrain-role-separated-review-kit.ps1"
                Invoke-ChildScript $action.script @{
                    PlayerProductTrainReceipt = $trainPath
                    PlayerSessionReceipt = $sessionPath
                    OutputRoot = $script:ReviewOutput
                } "Creating the role-separated review kit..." $runLog
            }
            "role-separated-software-review" {
                if ([string]::IsNullOrWhiteSpace($PlayerPacket)) { $PlayerPacket = Join-Path $script:ReviewOutput "player-packet.json" }
                if ([string]::IsNullOrWhiteSpace($ObserverPacket)) { $ObserverPacket = Join-Path $script:ReviewOutput "observer-packet.json" }
                if ([string]::IsNullOrWhiteSpace($AdjudicatorPacket)) { $AdjudicatorPacket = Join-Path $script:ReviewOutput "adjudicator-packet.json" }
                $requiredPackets = @($PlayerPacket, $ObserverPacket, $AdjudicatorPacket)
                $missingPackets = @($requiredPackets | Where-Object { -not (Test-Path -LiteralPath $_ -PathType Leaf) })
                if ($missingPackets.Count -gt 0) {
                    $blocked = [ordered]@{ gate = $gate; reason = "Complete the three isolated packet functions. Missing: $($missingPackets -join ', ')" }
                    break
                }
                $kit = Get-Content -LiteralPath $reviewKitPath -Raw | ConvertFrom-Json
                $action.script = Join-Path $script:WorldPath "scripts\record-underdrain-role-separated-software-review.ps1"
                Invoke-ChildScript $action.script @{
                    PlayerProductTrainReceipt = $trainPath
                    PlayerSessionReceipt = [string]$kit.playerSessionReceipt
                    PlayerPacket = Resolve-FullPath $PlayerPacket (Get-Location).Path
                    ObserverPacket = Resolve-FullPath $ObserverPacket (Get-Location).Path
                    AdjudicatorPacket = Resolve-FullPath $AdjudicatorPacket (Get-Location).Path
                    OutputPath = $reviewPath
                } "Recording the three-seat role-separated software review..." $runLog
            }
            "windows-software-product-acceptance" {
                $missingAcceptance = @()
                foreach ($entry in @(
                    @($AcceptanceSeatId, "AcceptanceSeatId"),
                    @($AcceptanceLineageId, "AcceptanceLineageId"),
                    @($AcceptanceContextDigest, "AcceptanceContextDigest"),
                    @($AcceptanceName, "AcceptanceName"),
                    @($AcceptanceAttestation, "AcceptanceAttestation")
                )) {
                    if ([string]::IsNullOrWhiteSpace([string]$entry[0])) { $missingAcceptance += [string]$entry[1] }
                }
                if ($missingAcceptance.Count -gt 0) {
                    $blocked = [ordered]@{ gate = $gate; reason = "Fourth-seat acceptance inputs are missing: $($missingAcceptance -join ', ')" }
                    break
                }
                $action.script = Join-Path $script:WorldPath "scripts\accept-underdrain-player-product.ps1"
                Invoke-ChildScript $action.script @{
                    PlayerProductTrainReceipt = $trainPath
                    KeyboardMouseSessionReceipt = $keyboardPath
                    GamepadSessionReceipt = $gamepadPath
                    RoleSeparatedReviewReceipt = $reviewPath
                    AcceptanceSeatId = $AcceptanceSeatId
                    AcceptanceLineageId = $AcceptanceLineageId
                    AcceptanceContextDigest = $AcceptanceContextDigest
                    AcceptanceName = $AcceptanceName
                    AcceptanceAttestation = $AcceptanceAttestation
                    OutputPath = $acceptancePath
                } "Issuing bounded fourth-seat Windows software-product acceptance..." $runLog
            }
            default { throw "Unsupported commissioning gate: $gate" }
            }
        } catch {
            $action.status = "failed"
            $action.completedAt = (Get-Date).ToUniversalTime().ToString("o")
            $action.error = $_.Exception.Message
            [void]$actions.Add($action)
            $blocked = [ordered]@{ gate = $gate; reason = $_.Exception.Message }
        }

        if ($null -ne $blocked) {
            if ($action.status -eq "started") {
                $action.status = "blocked"
                $action.completedAt = (Get-Date).ToUniversalTime().ToString("o")
                $action.reason = $blocked.reason
                [void]$actions.Add($action)
            }
            break
        }
        $action.status = "completed"
        $action.completedAt = (Get-Date).ToUniversalTime().ToString("o")
        [void]$actions.Add($action)
        $current = Invoke-StateInspection
        if ($Mode -eq "advance") { break }
    }
}

$final = if ($Mode -eq "inspect") { $before } else { Invoke-StateInspection }
$runStatus = if ($null -ne $blocked) { "blocked" } else { [string]$final.value.status }
$runReceipt = [ordered]@{
    format = "rodoh-underdrain-windows-commissioning-run/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    runId = $runId
    status = $runStatus
    mode = $Mode
    productId = "underdrain-bloom-below-unity6000-v1"
    worldCommit = $ExpectedWorldCommit
    arcCommit = $ExpectedArcCommit
    jobId = $JobId
    beforeState = $before.path
    beforeStateSha256 = $before.sha256
    afterState = $final.path
    afterStateSha256 = $final.sha256
    actions = @($actions)
    blocked = $blocked
    nextCommand = $final.value.nextCommand
    windowsSoftwareProductAcceptance = $final.value.windowsSoftwareProductAcceptance
    physicalHumanEvidence = "separate"
    questAcceptance = "open"
    physicalAcceptance = "not-issued"
    authority = "Windows software commissioning orchestration only; no human, household, Quest, or physical acceptance"
    log = if (Test-Path -LiteralPath $runLog -PathType Leaf) { $runLog } else { $null }
}
$runPath = Join-Path $runRoot "$runId.json"
Write-Json $runPath $runReceipt
"$(Get-Sha256 $runPath)  $([System.IO.Path]::GetFileName($runPath))" | Set-Content -Encoding ascii ($runPath + ".sha256")

$bundlePath = $null
if ($SealEvidence) {
    $exportScript = Join-Path $PSScriptRoot "export-underdrain-commissioning-evidence.ps1"
    Invoke-ChildScript $exportScript @{
        EmbodiedArLabRoot = $script:ProjectRoot
        JobId = $JobId
        OutputRoot = Join-Path $script:StateOutput "bundles"
    } "Sealing the current commissioning diagnostic bundle..." $runLog
    $bundlePointer = Join-Path (Join-Path $script:StateOutput "bundles") "LATEST_BUNDLE.txt"
    if (Test-Path -LiteralPath $bundlePointer -PathType Leaf) { $bundlePath = (Get-Content -LiteralPath $bundlePointer -Raw).Trim() }
    $runReceipt.diagnosticBundle = $bundlePath
    Write-Json $runPath $runReceipt
    "$(Get-Sha256 $runPath)  $([System.IO.Path]::GetFileName($runPath))" | Set-Content -Encoding ascii ($runPath + ".sha256")
}

Write-Host "UNDERDRAIN commissioning run status: $runStatus"
if ($null -ne $blocked) { Write-Host "Blocked at $($blocked.gate): $($blocked.reason)" }
Write-Host $runPath

if ($runStatus -eq "held") { exit 2 }
exit 0

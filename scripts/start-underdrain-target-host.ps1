[CmdletBinding()]
param(
    [string]$WorldRoot,
    [string]$ArcRoot,
    [string]$EmbodiedArLabRoot,
    [string]$UnityEditor,
    [string]$ShineStandalone,
    [string]$ResolvedSourceManifest,
    [string]$ResolvedSourceRoot,
    [string[]]$SearchRoots,
    [ValidateRange(1, 12)] [int]$MaxDepth = 6,
    [string]$JobId = "underdrain-unity6000-player-v1",
    [string]$ExpectedWorldCommit,
    [string]$ExpectedWorldTree,
    [string]$ExpectedArcCommit = "aaa5685903a348b3c1ba875622fbe99d90c1da35",
    [string]$ExpectedArcTree = "9b28737462ae0aecd8ab0ffab5537d12e8892364",
    [ValidateSet("inspect", "advance", "auto")] [string]$Mode = "inspect",
    [switch]$ConfirmMutation,
    [string]$SourceManifest,
    [string]$SourceRoot,
    [string]$ApprovalId,
    [string]$ApprovalAuthorityId,
    [string]$ApprovalName,
    [string]$ApprovalAttestation,
    [switch]$ConfirmAllAssets,
    [ValidateSet("keyboard-mouse", "gamepad")] [string]$ReviewSession = "keyboard-mouse",
    [string]$PlayerPacket,
    [string]$ObserverPacket,
    [string]$AdjudicatorPacket,
    [string]$AcceptanceSeatId,
    [string]$AcceptanceLineageId,
    [string]$AcceptanceContextDigest,
    [string]$AcceptanceName,
    [string]$AcceptanceAttestation,
    [string]$PreflightRoot,
    [string]$ReviewRoot,
    [switch]$ForceCloseUnity,
    [switch]$SkipNpmInstall,
    [switch]$SkipUnityTests,
    [switch]$SkipWindowsSmoke,
    [switch]$DevelopmentBuild,
    [switch]$InstallArcDependencies,
    [switch]$ForceCloseExistingPlayer,
    [switch]$SealEvidence,
    [string]$OutputRoot,
    [switch]$DeepSearch,
    [switch]$NoFail
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-FullPath([string]$Value, [string]$Base) {
    if ([string]::IsNullOrWhiteSpace($Value)) { return $null }
    if ([System.IO.Path]::IsPathRooted($Value)) { return [System.IO.Path]::GetFullPath($Value) }
    return [System.IO.Path]::GetFullPath((Join-Path $Base $Value))
}

function Write-Json([string]$Path, [object]$Value) {
    $directory = [System.IO.Path]::GetDirectoryName($Path)
    if (-not [string]::IsNullOrWhiteSpace($directory)) {
        New-Item -ItemType Directory -Force $directory | Out-Null
    }
    $Value | ConvertTo-Json -Depth 80 | Set-Content -Encoding utf8 $Path
}

function Get-Sha256([string]$Path) {
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Require-Hex([string]$Value, [int]$Length, [string]$Label) {
    if ([string]::IsNullOrWhiteSpace($Value) -or $Value -notmatch "^[0-9a-f]{$Length}$") {
        throw "$Label is not $Length lowercase hexadecimal characters: $Value"
    }
}

function Add-Argument(
    [System.Collections.ArrayList]$Arguments,
    [string]$Name,
    [object]$Value
) {
    if ($Value -is [System.Management.Automation.SwitchParameter] -or $Value -is [bool]) {
        if ([bool]$Value) { [void]$Arguments.Add("-$Name") }
        return
    }
    if ($Value -is [System.Array]) {
        if (@($Value).Count -gt 0) {
            [void]$Arguments.Add("-$Name")
            foreach ($item in @($Value)) { [void]$Arguments.Add([string]$item) }
        }
        return
    }
    if ($null -ne $Value -and -not [string]::IsNullOrWhiteSpace([string]$Value)) {
        [void]$Arguments.Add("-$Name")
        [void]$Arguments.Add([string]$Value)
    }
}

function Invoke-Child(
    [string]$Script,
    [System.Collections.IDictionary]$Parameters,
    [string]$LogPath
) {
    if (-not (Test-Path -LiteralPath $Script -PathType Leaf)) {
        throw "Required target-host child script is absent: $Script"
    }
    $arguments = [System.Collections.ArrayList]::new()
    foreach ($value in @(
        "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
        "-File", $Script
    )) { [void]$arguments.Add($value) }
    foreach ($key in ($Parameters.Keys | Sort-Object)) {
        Add-Argument $arguments $key $Parameters[$key]
    }
    New-Item -ItemType Directory -Force ([System.IO.Path]::GetDirectoryName($LogPath)) | Out-Null
    $hostPowerShell = (Get-Process -Id $PID).Path
    $childOutput = @(& $hostPowerShell @arguments 2>&1)
    $exitCode = $LASTEXITCODE
    foreach ($line in $childOutput) {
        Add-Content -LiteralPath $LogPath -Value ([string]$line) -Encoding utf8
        Write-Host $line
    }
    return [pscustomobject]@{ exitCode = $exitCode; output = @($childOutput) }
}

function Resolve-SourceAuthority {
    $lockPath = Join-Path (Split-Path $PSScriptRoot -Parent) "TARGET_HOST_STARTER_LOCK.json"
    if (Test-Path -LiteralPath $lockPath -PathType Leaf) {
        $lock = Get-Content -LiteralPath $lockPath -Raw | ConvertFrom-Json
        if ($lock.format -ne "rodoh-underdrain-target-host-starter-lock/1") {
            throw "Target-host starter lock format is unsupported."
        }
        if ([string]::IsNullOrWhiteSpace($script:ExpectedWorldCommit)) {
            $script:ExpectedWorldCommit = [string]$lock.world.commit
        }
        if ([string]::IsNullOrWhiteSpace($script:ExpectedWorldTree)) {
            $script:ExpectedWorldTree = [string]$lock.world.tree
        }
        if ($script:ExpectedArcCommit -ne [string]$lock.arc.commit -or
            $script:ExpectedArcTree -ne [string]$lock.arc.tree) {
            throw "Target-host starter ARC authority differs from its lock."
        }
        return
    }

    $candidateWorld = if (-not [string]::IsNullOrWhiteSpace($script:WorldRoot)) {
        Resolve-FullPath $script:WorldRoot (Get-Location).Path
    } else {
        [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
    }
    if ([string]::IsNullOrWhiteSpace($script:ExpectedWorldCommit)) {
        $head = @(& git -C $candidateWorld rev-parse HEAD 2>$null)
        if ($LASTEXITCODE -ne 0 -or $head.Count -ne 1) {
            throw "ExpectedWorldCommit is required when the starter is outside a resolvable World checkout."
        }
        $script:ExpectedWorldCommit = ([string]$head[0]).Trim().ToLowerInvariant()
    }
    if ([string]::IsNullOrWhiteSpace($script:ExpectedWorldTree)) {
        $tree = @(& git -C $candidateWorld rev-parse "HEAD^{tree}" 2>$null)
        if ($LASTEXITCODE -ne 0 -or $tree.Count -ne 1) {
            throw "ExpectedWorldTree is required when the starter is outside a resolvable World checkout."
        }
        $script:ExpectedWorldTree = ([string]$tree[0]).Trim().ToLowerInvariant()
    }
}

Resolve-SourceAuthority
Require-Hex $ExpectedWorldCommit 40 "Expected World commit"
Require-Hex $ExpectedWorldTree 40 "Expected World tree"
Require-Hex $ExpectedArcCommit 40 "Expected ARC commit"
Require-Hex $ExpectedArcTree 40 "Expected ARC tree"

$mutationConfirmationMissing = $Mode -ne "inspect" -and -not $ConfirmMutation

if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    if (-not [string]::IsNullOrWhiteSpace($EmbodiedArLabRoot)) {
        $project = Resolve-FullPath $EmbodiedArLabRoot (Get-Location).Path
        $OutputRoot = Join-Path $project "local\scene-jobs\$JobId\output\target-host-start"
    } else {
        $OutputRoot = Join-Path (Get-Location).Path "underdrain-target-host-start"
    }
}
$output = Resolve-FullPath $OutputRoot (Get-Location).Path
New-Item -ItemType Directory -Force $output | Out-Null
$runId = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssfffZ")
$runRoot = Join-Path $output "runs\$runId"
New-Item -ItemType Directory -Force $runRoot | Out-Null
$logPath = Join-Path $runRoot "target-host-start.log"

$bootstrapScript = Join-Path $PSScriptRoot "bootstrap-underdrain-windows-host.ps1"
$bootstrapOutput = Join-Path $runRoot "bootstrap"
$bootstrapParameters = [ordered]@{
    WorldRoot = $WorldRoot
    ArcRoot = $ArcRoot
    EmbodiedArLabRoot = $EmbodiedArLabRoot
    UnityEditor = $UnityEditor
    ShineStandalone = $ShineStandalone
    ResolvedSourceManifest = $ResolvedSourceManifest
    ResolvedSourceRoot = $ResolvedSourceRoot
    SearchRoots = $SearchRoots
    MaxDepth = $MaxDepth
    JobId = $JobId
    ExpectedWorldCommit = $ExpectedWorldCommit
    ExpectedWorldTree = $ExpectedWorldTree
    ExpectedArcCommit = $ExpectedArcCommit
    ExpectedArcTree = $ExpectedArcTree
    OutputRoot = $bootstrapOutput
    DeepSearch = [bool]$DeepSearch
    NoFail = $true
}
$bootstrapInvocation = Invoke-Child $bootstrapScript $bootstrapParameters $logPath
$bootstrapReceiptPath = Join-Path $bootstrapOutput "underdrain-windows-host-bootstrap.json"
if (-not (Test-Path -LiteralPath $bootstrapReceiptPath -PathType Leaf)) {
    throw "Target-host bootstrap receipt is absent: $bootstrapReceiptPath"
}
$bootstrap = Get-Content -LiteralPath $bootstrapReceiptPath -Raw | ConvertFrom-Json
if ($bootstrap.format -ne "rodoh-underdrain-windows-host-bootstrap/1") {
    throw "Target-host bootstrap format is unsupported."
}
if ($bootstrap.mutation.repositoriesChanged -ne $false -or
    $bootstrap.mutation.unityInvoked -ne $false -or
    $bootstrap.mutation.representationMaterialized -ne $false -or
    $bootstrap.mutation.approvalIssued -ne $false -or
    $bootstrap.mutation.reviewIssued -ne $false -or
    $bootstrap.mutation.productAcceptanceIssued -ne $false -or
    $bootstrap.mutation.questInvoked -ne $false -or
    $bootstrap.mutation.physicalAcceptanceIssued -ne $false) {
    throw "Target-host bootstrap crossed its read-only authority boundary."
}

$delegated = $false
$commissioningExit = $null
$commissioningReceiptPath = $null
$commissioningReceiptSha256 = $null
$commissioningStatus = "not-invoked"
$blocked = $null

if ($Mode -eq "inspect") {
    $blocked = [ordered]@{
        reason = "Inspect mode completed without requesting a commissioning mutation."
        gate = if ($bootstrap.commissioning.firstDivergence) {
            [string]$bootstrap.commissioning.firstDivergence.id
        } else { $null }
    }
} elseif ($mutationConfirmationMissing) {
    $blocked = [ordered]@{
        reason = "Mode '$Mode' requires -ConfirmMutation before the commissioning controller may be invoked."
        gate = if ($bootstrap.commissioning.firstDivergence) {
            [string]$bootstrap.commissioning.firstDivergence.id
        } else { "explicit-mutation-confirmation" }
    }
} elseif ($bootstrap.status -ne "pass") {
    $blocked = [ordered]@{
        reason = "Target-host bootstrap is '$($bootstrap.status)' and cannot delegate a commissioning mutation."
        gate = if ($bootstrap.commissioning.firstDivergence) {
            [string]$bootstrap.commissioning.firstDivergence.id
        } else { "target-host-bootstrap" }
    }
} else {
    $resolvedWorld = [string]$bootstrap.roots.world
    $resolvedArc = [string]$bootstrap.roots.arc
    $resolvedProject = [string]$bootstrap.roots.embodiedArLab
    foreach ($rootEntry in @(
        [pscustomobject]@{ path = $resolvedWorld; label = "World" },
        [pscustomobject]@{ path = $resolvedArc; label = "ARC" },
        [pscustomobject]@{ path = $resolvedProject; label = "Embodied-AR-Lab" }
    )) {
        if ([string]::IsNullOrWhiteSpace([string]$rootEntry.path)) {
            throw "$($rootEntry.label) root was not retained by the target-host bootstrap."
        }
    }

    if ([string]::IsNullOrWhiteSpace($SourceManifest) -and
        -not [string]::IsNullOrWhiteSpace([string]$bootstrap.roots.resolvedSourceManifest)) {
        $SourceManifest = [string]$bootstrap.roots.resolvedSourceManifest
    }
    if ([string]::IsNullOrWhiteSpace($SourceRoot) -and
        -not [string]::IsNullOrWhiteSpace([string]$bootstrap.roots.resolvedSourceRoot)) {
        $SourceRoot = [string]$bootstrap.roots.resolvedSourceRoot
    }
    if ([string]::IsNullOrWhiteSpace($UnityEditor) -and
        -not [string]::IsNullOrWhiteSpace([string]$bootstrap.roots.unityEditor)) {
        $UnityEditor = [string]$bootstrap.roots.unityEditor
    }

    $commissioningScript = Join-Path $PSScriptRoot "invoke-underdrain-commissioning.ps1"
    $commissioningParameters = [ordered]@{
        WorldRoot = $resolvedWorld
        ArcRoot = $resolvedArc
        EmbodiedArLabRoot = $resolvedProject
        JobId = $JobId
        ExpectedWorldCommit = $ExpectedWorldCommit
        ExpectedArcCommit = $ExpectedArcCommit
        Mode = $Mode
        SourceManifest = $SourceManifest
        SourceRoot = $SourceRoot
        ApprovalId = $ApprovalId
        ApprovalAuthorityId = $ApprovalAuthorityId
        ApprovalName = $ApprovalName
        ApprovalAttestation = $ApprovalAttestation
        ConfirmAllAssets = [bool]$ConfirmAllAssets
        ReviewSession = $ReviewSession
        PlayerPacket = $PlayerPacket
        ObserverPacket = $ObserverPacket
        AdjudicatorPacket = $AdjudicatorPacket
        AcceptanceSeatId = $AcceptanceSeatId
        AcceptanceLineageId = $AcceptanceLineageId
        AcceptanceContextDigest = $AcceptanceContextDigest
        AcceptanceName = $AcceptanceName
        AcceptanceAttestation = $AcceptanceAttestation
        PreflightRoot = $PreflightRoot
        ReviewRoot = $ReviewRoot
        UnityEditor = $UnityEditor
        ForceCloseUnity = [bool]$ForceCloseUnity
        SkipNpmInstall = [bool]$SkipNpmInstall
        SkipUnityTests = [bool]$SkipUnityTests
        SkipWindowsSmoke = [bool]$SkipWindowsSmoke
        DevelopmentBuild = [bool]$DevelopmentBuild
        InstallArcDependencies = [bool]$InstallArcDependencies
        ForceCloseExistingPlayer = [bool]$ForceCloseExistingPlayer
        SealEvidence = [bool]$SealEvidence
    }

    $stateRoot = Join-Path $resolvedProject "local\scene-jobs\$JobId\output\commissioning-state"
    $runReceipts = Join-Path $stateRoot "runs"
    $before = @()
    if (Test-Path -LiteralPath $runReceipts -PathType Container) {
        $before = @(
            Get-ChildItem -LiteralPath $runReceipts -File -Filter "*.json" |
                ForEach-Object { $_.FullName }
        )
    }

    $delegated = $true
    $commissioningInvocation = Invoke-Child $commissioningScript $commissioningParameters $logPath
    $commissioningExit = $commissioningInvocation.exitCode

    $after = @()
    if (Test-Path -LiteralPath $runReceipts -PathType Container) {
        $after = @(
            Get-ChildItem -LiteralPath $runReceipts -File -Filter "*.json" |
                ForEach-Object { $_.FullName }
        )
    }
    $newRuns = @($after | Where-Object { $_ -notin $before })
    if ($newRuns.Count -ne 1) {
        throw "Commissioning delegation produced $($newRuns.Count) new run receipts; exactly one is required."
    }

    $commissioningReceiptPath = [System.IO.Path]::GetFullPath($newRuns[0])
    $commissioningReceipt = Get-Content -LiteralPath $commissioningReceiptPath -Raw | ConvertFrom-Json
    if ($commissioningReceipt.format -ne "rodoh-underdrain-windows-commissioning-run/1") {
        throw "Commissioning run format is unsupported."
    }
    if ($commissioningReceipt.mode -ne $Mode) {
        throw "Commissioning run mode differs. Expected '$Mode', observed '$($commissioningReceipt.mode)'."
    }
    if ($commissioningReceipt.worldCommit -ne $ExpectedWorldCommit -or
        $commissioningReceipt.arcCommit -ne $ExpectedArcCommit) {
        throw "Commissioning run lost exact World or ARC custody."
    }
    if ($commissioningReceipt.physicalHumanEvidence -ne "separate" -or
        $commissioningReceipt.questAcceptance -ne "open" -or
        $commissioningReceipt.physicalAcceptance -ne "not-issued") {
        throw "Commissioning run crossed human, Quest, or physical authority."
    }
    if ($commissioningExit -notin @(0, 2)) {
        throw "Commissioning delegation failed with exit $commissioningExit."
    }

    $commissioningStatus = [string]$commissioningReceipt.status
    $commissioningReceiptSha256 = Get-Sha256 $commissioningReceiptPath
}

$status = if ($bootstrap.status -eq "held") {
    "held"
} elseif ($Mode -eq "inspect") {
    [string]$bootstrap.status
} elseif (-not $delegated) {
    "blocked"
} elseif ($commissioningStatus -eq "held") {
    "held"
} else {
    $commissioningStatus
}

$receipt = [ordered]@{
    format = "rodoh-underdrain-target-host-start/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    runId = $runId
    status = $status
    mode = $Mode
    mutationConfirmed = [bool]$ConfirmMutation
    productId = "underdrain-bloom-below-unity6000-v1"
    worldCommit = $ExpectedWorldCommit
    worldTree = $ExpectedWorldTree
    arcCommit = $ExpectedArcCommit
    arcTree = $ExpectedArcTree
    jobId = $JobId
    bootstrap = [ordered]@{
        status = [string]$bootstrap.status
        receipt = $bootstrapReceiptPath
        receiptSha256 = Get-Sha256 $bootstrapReceiptPath
        exitCode = $bootstrapInvocation.exitCode
        firstDivergence = if ($bootstrap.commissioning.firstDivergence) {
            [string]$bootstrap.commissioning.firstDivergence.id
        } else { $null }
        nextCommand = [string]$bootstrap.next.command
    }
    commissioning = [ordered]@{
        delegated = $delegated
        status = $commissioningStatus
        receipt = $commissioningReceiptPath
        receiptSha256 = $commissioningReceiptSha256
        exitCode = $commissioningExit
    }
    blocked = $blocked
    authority = [ordered]@{
        discoveryAndInspectionDefault = $true
        commissioningDelegationRequiresExplicitConfirmation = $true
        directUnityAuthority = $false
        reviewAuthority = $false
        productAcceptanceAuthority = $false
        humanOrHouseholdAcceptanceAuthority = $false
        questAuthority = $false
        physicalAcceptanceAuthority = $false
    }
    physicalHumanEvidence = "separate"
    questAcceptance = "open"
    physicalAcceptance = "not-issued"
}

$receiptPath = Join-Path $runRoot "underdrain-target-host-start.json"
Write-Json $receiptPath $receipt
"$(Get-Sha256 $receiptPath)  underdrain-target-host-start.json" |
    Set-Content -Encoding ascii ($receiptPath + ".sha256")
Copy-Item -LiteralPath $receiptPath -Destination (Join-Path $output "underdrain-target-host-start.json") -Force
Copy-Item -LiteralPath ($receiptPath + ".sha256") -Destination (Join-Path $output "underdrain-target-host-start.json.sha256") -Force

Write-Host "UNDERDRAIN target-host start: $status"
Write-Host $receiptPath
if ($status -eq "held" -and -not $NoFail) { exit 2 }
exit 0

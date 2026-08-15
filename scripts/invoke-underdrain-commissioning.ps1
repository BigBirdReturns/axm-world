[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)] [string]$WorldRoot,
    [Parameter(Mandatory = $true)] [string]$ArcRoot,
    [Parameter(Mandatory = $true)] [string]$EmbodiedArLabRoot,
    [string]$JobId = "underdrain-unity6000-player-v1",
    [string]$ExpectedWorldCommit,
    [string]$ExpectedArcCommit = "aaa5685903a348b3c1ba875622fbe99d90c1da35",
    [ValidateSet("inspect", "advance", "auto")] [string]$Mode = "inspect",
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

$controller = Join-Path $PSScriptRoot "lib\underdrain-commissioning-controller-v1.ps1"
if (-not (Test-Path -LiteralPath $controller -PathType Leaf)) {
    throw "UNDERDRAIN commissioning controller is absent: $controller"
}
. $controller

$options = [ordered]@{
    ScriptsRoot = $PSScriptRoot
    WorldRoot = $WorldRoot
    ArcRoot = $ArcRoot
    EmbodiedArLabRoot = $EmbodiedArLabRoot
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
    StateOutputRoot = $StateOutputRoot
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

exit (Invoke-UnderdrainCommissioning -Options $options)

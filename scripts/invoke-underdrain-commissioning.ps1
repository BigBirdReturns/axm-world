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
    $inspectionOutput = @(& $script:HostPowerShell @arguments 2>&1)
    $inspectionExitCode = $LASTEXITCODE
    foreach ($line in $inspectionOutput) { Write-Host "[state] $line" }
    if ($inspectionExitCode -ne 0) { throw "Commissioning-state inspection failed with exit $inspectionExitCode." }
    $path = Join-Path $script:StateOutput "underdrain-commissioning-state.json"
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Commissioning-state receipt is absent: $path" }
    return [pscustomobject]@{
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
            $blocked = [ordered]
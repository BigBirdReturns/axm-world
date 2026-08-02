[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Discover', 'Inspect', 'Qualify', 'Plan', 'StageProfile', 'SnapshotSaves', 'Selftest')]
    [string] $Command,

    [string] $GameDir,
    [string] $ModsDir,
    [string] $SourceModsDir,
    [string] $SavesDir,
    [string] $BackupRoot,
    [string] $ProfileDir,
    [string] $ProfileName = 'stardew-default',

    [ValidateSet('native-2d', 'desktop-3d', 'hmd-vr', 'cabinet-tv')]
    [string] $Mode = 'desktop-3d',

    [string] $OutFile,
    [switch] $DeepHash
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Node = Get-Command node -ErrorAction Stop
$Cli = Join-Path (Split-Path -Parent $PSScriptRoot) 'bin\stardew-seam.mjs'
if (-not (Test-Path -LiteralPath $Cli -PathType Leaf)) {
    throw "Stardew Host Seam CLI not found: $Cli"
}

function Add-Option {
    param(
        [System.Collections.Generic.List[string]] $Arguments,
        [string] $Name,
        [AllowNull()][string] $Value
    )
    if (-not [string]::IsNullOrWhiteSpace($Value)) {
        $Arguments.Add("--$Name")
        $Arguments.Add($Value)
    }
}

$Subcommand = switch ($Command) {
    'Discover'      { 'discover' }
    'Inspect'       { 'inspect' }
    'Qualify'       { 'qualify' }
    'Plan'          { 'plan' }
    'StageProfile'  { 'stage-profile' }
    'SnapshotSaves' { 'snapshot-saves' }
    'Selftest'      { 'selftest' }
    default         { throw "Unhandled command: $Command" }
}

$Arguments = [System.Collections.Generic.List[string]]::new()
$Arguments.Add($Cli)
$Arguments.Add($Subcommand)

if ($Command -in @('Inspect', 'Qualify', 'Plan', 'StageProfile')) {
    if ([string]::IsNullOrWhiteSpace($GameDir)) {
        throw '-GameDir is required for this command.'
    }
    Add-Option $Arguments 'game-dir' ([System.IO.Path]::GetFullPath($GameDir))
}

if ($Command -eq 'StageProfile') {
    if ([string]::IsNullOrWhiteSpace($SourceModsDir)) {
        throw '-SourceModsDir is required for StageProfile.'
    }
    if ([string]::IsNullOrWhiteSpace($ProfileDir)) {
        throw '-ProfileDir is required for StageProfile.'
    }
    Add-Option $Arguments 'source-mods-dir' ([System.IO.Path]::GetFullPath($SourceModsDir))
    Add-Option $Arguments 'profile-dir' ([System.IO.Path]::GetFullPath($ProfileDir))
    Add-Option $Arguments 'profile' $ProfileName
    Add-Option $Arguments 'mode' $Mode
}
elseif ($Command -eq 'SnapshotSaves') {
    if ([string]::IsNullOrWhiteSpace($SavesDir)) {
        throw '-SavesDir is required for SnapshotSaves.'
    }
    if ([string]::IsNullOrWhiteSpace($BackupRoot)) {
        throw '-BackupRoot is required for SnapshotSaves.'
    }
    Add-Option $Arguments 'saves-dir' ([System.IO.Path]::GetFullPath($SavesDir))
    Add-Option $Arguments 'backup-root' ([System.IO.Path]::GetFullPath($BackupRoot))
}
else {
    Add-Option $Arguments 'mods-dir' $ModsDir
    Add-Option $Arguments 'saves-dir' $SavesDir
    if ($Command -in @('Qualify', 'Plan')) {
        Add-Option $Arguments 'mode' $Mode
    }
    if ($Command -eq 'Qualify') {
        Add-Option $Arguments 'profile' $ProfileName
    }
}

if ($DeepHash) {
    $Arguments.Add('--deep-hash')
}
Add-Option $Arguments 'out' $OutFile

Write-Verbose ("node " + (($Arguments | ForEach-Object { '"' + ($_ -replace '"', '\"') + '"' }) -join ' '))
& $Node.Source @Arguments
$ExitCode = $LASTEXITCODE

switch ($ExitCode) {
    0 { return }
    2 { throw "Stardew seam qualification was blocked by the discovered installation or mod graph." }
    64 { throw "Stardew seam command line was invalid." }
    default { throw "Stardew seam command failed with exit code $ExitCode." }
}

[CmdletBinding()]
param(
    [ValidateSet('Serve', 'Probe', 'Arm', 'Heartbeat', 'Disarm', 'Recenter', 'Fallback', 'CaptureFrame', 'RendererMode', 'Events', 'Shutdown', 'Selftest', 'DefaultConfig')]
    [string]$Command = 'Probe',
    [string]$Config,
    [string]$TransactionId,
    [ValidateSet('synthetic', 'commissioning', 'operational')]
    [string]$AuthorityMode = 'commissioning',
    [int]$LeaseTtlMs = 5000,
    [ValidateSet('controller', 'native-2d')]
    [string]$Fallback = 'controller',
    [ValidateSet('native-2d', 'desktop-3d', 'hmd-vr', 'cabinet-tv')]
    [string]$Mode = 'native-2d',
    [string]$Name = 'frame',
    [string]$Reason = 'requested-by-powershell',
    [switch]$Fixture
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$cli = Join-Path $root 'bin/motiondeck-cabinet-runtime.mjs'
if (-not (Test-Path -LiteralPath $cli -PathType Leaf)) { throw "Runtime CLI not found: $cli" }

$args = @($cli)
switch ($Command) {
    'Serve' {
        $args += 'serve'
        if ($Fixture) { $args += '--fixture' }
    }
    'Probe' { $args += 'probe' }
    'Arm' {
        $args += @('arm', '--authority-mode', $AuthorityMode, '--lease-ttl-ms', [string]$LeaseTtlMs)
        if ($TransactionId) { $args += @('--transaction', $TransactionId) }
    }
    'Heartbeat' { $args += @('heartbeat', '--transaction', $TransactionId) }
    'Disarm' {
        $args += @('disarm', '--reason', $Reason)
        if ($TransactionId) { $args += @('--transaction', $TransactionId) }
    }
    'Recenter' { $args += @('recenter', '--transaction', $TransactionId) }
    'Fallback' { $args += @('fallback', '--transaction', $TransactionId, '--fallback', $Fallback) }
    'CaptureFrame' { $args += @('capture-frame', '--transaction', $TransactionId, '--name', $Name) }
    'RendererMode' {
        $args += @('renderer-mode', '--mode', $Mode)
        if ($TransactionId) { $args += @('--transaction', $TransactionId) }
    }
    'Events' { $args += 'events' }
    'Shutdown' { $args += 'shutdown' }
    'Selftest' { $args += 'selftest' }
    'DefaultConfig' { $args += 'default-config' }
}
if ($Config) { $args += @('--config', (Resolve-Path -LiteralPath $Config).Path) }

& node @args
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

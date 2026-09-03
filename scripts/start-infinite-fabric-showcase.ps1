[CmdletBinding()]
param(
  [int]$Port = 8765,
  [switch]$SkipInstall,
  [switch]$Muted,
  [switch]$CleanCapture
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $Root

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js is required to run the AXM Infinite Fabric showcase.'
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw 'npm is required to run the AXM Infinite Fabric showcase.'
}

if (-not (Test-Path -LiteralPath (Join-Path $Root 'node_modules'))) {
  if ($SkipInstall) {
    throw 'node_modules is absent and -SkipInstall was supplied.'
  }
  Write-Host 'Installing the locked AXM-WORLD product dependencies...'
  & npm ci --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw "npm ci failed with exit code $LASTEXITCODE" }
}

$query = @('autoplay=1', 'loop=1')
if ($Muted) { $query += 'sound=0' }
if ($CleanCapture) { $query += 'clean=1' }
$Url = "http://127.0.0.1:$Port/showcase.html?" + ($query -join '&')

Write-Host "AXM Infinite Fabric Showcase: $Url"
Start-Process $Url
& npm run dev -- --host 127.0.0.1 --port $Port --strictPort
exit $LASTEXITCODE

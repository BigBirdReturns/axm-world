[CmdletBinding()]
param(
  [int]$Port = 5173,
  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Url = "http://127.0.0.1:$Port/classics.html"

Push-Location $RepoRoot
try {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js is not available on PATH."
  }
  if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw "npm.cmd is not available on PATH."
  }

  if (-not $SkipInstall -and -not (Test-Path -LiteralPath (Join-Path $RepoRoot "node_modules"))) {
    Write-Host "Installing the locked AXM-WORLD dependencies..."
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) {
      throw "npm ci failed with exit code $LASTEXITCODE."
    }
  }

  $Arguments = @(
    "run", "dev", "--",
    "--host", "127.0.0.1",
    "--port", [string]$Port,
    "--strictPort"
  )
  $Server = Start-Process `
    -FilePath "npm.cmd" `
    -ArgumentList $Arguments `
    -WorkingDirectory $RepoRoot `
    -PassThru

  try {
    $Deadline = [DateTime]::UtcNow.AddSeconds(45)
    $Ready = $false
    while ([DateTime]::UtcNow -lt $Deadline) {
      if ($Server.HasExited) {
        throw "The Vite server exited before the Classic Trials became available."
      }
      try {
        $Response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
        if ($Response.StatusCode -eq 200) {
          $Ready = $true
          break
        }
      } catch {
        Start-Sleep -Milliseconds 350
      }
    }
    if (-not $Ready) {
      throw "The Classic Trials did not become available at $Url within 45 seconds."
    }

    Write-Host "Opening The First Charter Classic Trials at $Url"
    Start-Process $Url | Out-Null
    Write-Host "Vite process id: $($Server.Id)"
    Write-Host "Close this window or press Ctrl+C to stop the local game server."
    Wait-Process -Id $Server.Id
  } finally {
    if (-not $Server.HasExited) {
      Stop-Process -Id $Server.Id -Force -ErrorAction SilentlyContinue
    }
  }
} finally {
  Pop-Location
}

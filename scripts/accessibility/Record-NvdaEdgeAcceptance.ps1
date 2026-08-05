[CmdletBinding()]
param(
  [string]$EstateRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")),
  [string]$OutputPath,
  [string]$Notes = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Get-Sha256Hex([string]$Text) {
  $bytes = [Text.Encoding]::UTF8.GetBytes($Text)
  $hash = [Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
  return -join ($hash | ForEach-Object { $_.ToString("x2") })
}

function Find-ExecutableVersion([string[]]$Candidates) {
  foreach ($candidate in $Candidates) {
    if (-not $candidate) { continue }
    $expanded = [Environment]::ExpandEnvironmentVariables($candidate)
    if (Test-Path -LiteralPath $expanded) {
      $version = (Get-Item -LiteralPath $expanded).VersionInfo.ProductVersion
      if ($version) { return $version }
    }
    $command = Get-Command $candidate -ErrorAction SilentlyContinue
    if ($command) {
      $version = (Get-Item -LiteralPath $command.Source).VersionInfo.ProductVersion
      if ($version) { return $version }
    }
  }
  throw "Required executable was not found: $($Candidates -join ', ')"
}

function Invoke-GitText([string]$Repository, [string[]]$GitArguments) {
  $output = & git -C $Repository @GitArguments 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "git -C $Repository $($GitArguments -join ' ') failed: $($output | Out-String)"
  }
  return ($output | Out-String).Trim()
}

function Invoke-ToolText([string]$WorkingDirectory, [string]$Command, [string[]]$Arguments) {
  Push-Location $WorkingDirectory
  try {
    $output = & $Command @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
      throw "$Command $($Arguments -join ' ') failed: $($output | Out-String)"
    }
    return ($output | Out-String).Trim()
  } finally {
    Pop-Location
  }
}

function Confirm-Check([string]$Label) {
  Write-Host ""
  Write-Host $Label -ForegroundColor Cyan
  $answer = Read-Host "Type YES only after completing this check"
  if ($answer -cne "YES") { throw "Acceptance stopped at: $Label" }
  return $true
}

$root = (Resolve-Path -LiteralPath $EstateRoot).Path
$worldRepo = if (Test-Path (Join-Path $root ".git")) { $root } else { Join-Path $root "axm-world" }
$lockPath = Join-Path $worldRepo "estate\estate.lock.json"
if (-not (Test-Path -LiteralPath $lockPath)) { throw "Estate lock not found: $lockPath" }
$lock = Get-Content -LiteralPath $lockPath -Raw | ConvertFrom-Json
$arcRepo = if (Test-Path (Join-Path $root "axm-arc\.git")) { Join-Path $root "axm-arc" } else { Join-Path (Split-Path $worldRepo -Parent) "axm-arc" }
if (-not (Test-Path (Join-Path $worldRepo ".git"))) { throw "World checkout not found: $worldRepo" }
if (-not (Test-Path (Join-Path $arcRepo ".git"))) { throw "Arc checkout not found: $arcRepo" }

$worldCommit = Invoke-GitText $worldRepo @("rev-parse", "HEAD")
$arcCommit = Invoke-GitText $arcRepo @("rev-parse", "HEAD")
$worldBranch = Invoke-GitText $worldRepo @("rev-parse", "--abbrev-ref", "HEAD")
$arcBranch = Invoke-GitText $arcRepo @("rev-parse", "--abbrev-ref", "HEAD")
$worldDirty = Invoke-GitText $worldRepo @("status", "--porcelain")
$arcDirty = Invoke-GitText $arcRepo @("status", "--porcelain")
if ($worldDirty) { throw "World checkout must be clean before acceptance." }
if ($arcDirty) { throw "Arc checkout must be clean before acceptance." }
if ($worldBranch -ne $lock.repositories.world.branch) {
  throw "World branch $worldBranch does not match estate lock $($lock.repositories.world.branch)."
}
if ($arcBranch -ne $lock.repositories.arc.branch) {
  throw "Arc branch $arcBranch does not match estate lock $($lock.repositories.arc.branch)."
}
if ($arcCommit -ne $lock.repositories.arc.requiredCommit) {
  throw "Arc checkout $arcCommit does not match estate lock $($lock.repositories.arc.requiredCommit)."
}
& git -C $worldRepo merge-base --is-ancestor $lock.repositories.world.requiredAncestor $worldCommit
if ($LASTEXITCODE -ne 0) {
  throw "World checkout $worldCommit does not descend from required ancestor $($lock.repositories.world.requiredAncestor)."
}
$worldPackageVersion = [string]((Get-Content -LiteralPath (Join-Path $worldRepo 'package.json') -Raw | ConvertFrom-Json).version)
$arcPackageVersion = [string]((Get-Content -LiteralPath (Join-Path $arcRepo 'package.json') -Raw | ConvertFrom-Json).version)
if ($worldPackageVersion -ne $lock.repositories.world.packageVersion) {
  throw "World package version $worldPackageVersion does not match estate lock $($lock.repositories.world.packageVersion)."
}
if ($arcPackageVersion -ne $lock.repositories.arc.packageVersion) {
  throw "Arc package version $arcPackageVersion does not match estate lock $($lock.repositories.arc.packageVersion)."
}

$nodeVersion = Invoke-ToolText $worldRepo "node" @("--version")
$npmVersion = Invoke-ToolText $worldRepo "npm.cmd" @("--version")
$playwrightVersion = Invoke-ToolText $worldRepo "node" @("-p", "require('./node_modules/@playwright/test/package.json').version")
$edgeVersion = Find-ExecutableVersion @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "msedge.exe"
)
$nvdaVersion = Find-ExecutableVersion @(
  "${env:ProgramFiles(x86)}\NVDA\nvda.exe",
  "$env:ProgramFiles\NVDA\nvda.exe",
  "$env:LOCALAPPDATA\Programs\NVDA\nvda.exe",
  "nvda.exe"
)
$os = Get-CimInstance Win32_OperatingSystem
$machineGuid = (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Cryptography").MachineGuid
$fingerprint = Get-Sha256Hex("$machineGuid|$($os.Version)|$edgeVersion|$nvdaVersion")

Write-Host "RODOH NVDA + Edge acceptance" -ForegroundColor Yellow
Write-Host "World:      $worldCommit"
Write-Host "Arc:        $arcCommit"
Write-Host "Edge:       $edgeVersion"
Write-Host "NVDA:       $nvdaVersion"
Write-Host "Node:       $nodeVersion"
Write-Host "npm:        $npmVersion"
Write-Host "Playwright: $playwrightVersion"
Write-Host ""
Write-Host "Use keyboard and NVDA speech/braille output. Do not answer YES from visual inspection alone." -ForegroundColor Yellow

$checks = [ordered]@{
  shelfAndIdentity = Confirm-Check "The cartridge shelf announces all five first-party programs, imported ownership, trust, and exact identity without relying on color."
  keyboardEntry = Confirm-Check "Keyboard-only entry reaches a cartridge, resolves its opening decision, and never traps focus."
  viewSwitcher = Confirm-Check "Board, Map, Hall, Aperture, World, Underworld, and Common Ship controls announce useful names and selected state where applicable."
  contractAndParty = Confirm-Check "Contract requirements, recommended party, roster changes, feasibility, and actionable fixes are read in a coherent order."
  decisionAndConsequence = Confirm-Check "Decision options, previews, selected response, consequences, dissent, and uncertainty are announced without hidden visual-only facts."
  encounterAndRecord = Confirm-Check "Encounter commit, resolution, result, leave, ledger, and recorded map state are reachable and distinguishable."
  runExportRestore = Confirm-Check "Exact run export, file selection, import result, resumable state, and restored campaign position are announced."
  holderEstate = Confirm-Check "Holder-estate export, preflight, merge, exact replace, cancellation, success, and failure messages are announced and operable."
  forcedColorsAndMotion = Confirm-Check "Forced-colors and reduced-motion settings preserve focus, state, text, and control meaning."
  semanticRedundancy = Confirm-Check "No required state or action depends solely on a diagram, palette, animation, spatial position, or procedural sound."
}

if (-not $OutputPath) {
  $receiptDir = Join-Path (Split-Path $worldRepo -Parent) ".rodoh-estate\receipts"
  New-Item -ItemType Directory -Force -Path $receiptDir | Out-Null
  $OutputPath = Join-Path $receiptDir "nvda-edge-acceptance.json"
}

$receipt = [ordered]@{
  format = "rodoh-nvda-edge-acceptance/1"
  acceptedAt = [DateTimeOffset]::UtcNow.ToString("o")
  machineFingerprintSha256 = $fingerprint
  operatingSystem = "$($os.Caption) $($os.Version) build $($os.BuildNumber)"
  edgeVersion = $edgeVersion
  nvdaVersion = $nvdaVersion
  nodeVersion = $nodeVersion
  npmVersion = $npmVersion
  playwrightVersion = $playwrightVersion
  worldCommit = $worldCommit
  arcCommit = $arcCommit
  checks = $checks
  notes = $Notes
  status = "pass"
}
$receipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $OutputPath -Encoding utf8
Write-Host "Acceptance receipt written: $OutputPath" -ForegroundColor Green

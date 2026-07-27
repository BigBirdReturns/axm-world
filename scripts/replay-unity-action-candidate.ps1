[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ArcRoot,

    [Parameter(Mandatory = $true)]
    [string]$NativeActionSpec,

    [Parameter(Mandatory = $true)]
    [string]$Candidate,

    [string]$OutputRoot,
    [string]$ArcActionAuthorityCommit = "6eef311836ee7cb3a43a94ce51f448a2699c3b04",
    [switch]$InstallDependencies,
    [string]$Node,
    [string]$Npm,
    [string]$Npx
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-FullPath([string]$Value, [string]$Base) {
    if ([System.IO.Path]::IsPathRooted($Value)) { return [System.IO.Path]::GetFullPath($Value) }
    return [System.IO.Path]::GetFullPath((Join-Path $Base $Value))
}

$worldRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$arc = Resolve-FullPath $ArcRoot (Get-Location).Path
$spec = Resolve-FullPath $NativeActionSpec (Get-Location).Path
$candidatePath = Resolve-FullPath $Candidate (Get-Location).Path
if (-not (Test-Path (Join-Path $arc ".git"))) { throw "ArcRoot is not a git checkout: $arc" }
if (-not (Test-Path $spec)) { throw "Native Arc action spec is absent: $spec" }
if (-not (Test-Path $candidatePath)) { throw "Unity action candidate is absent: $candidatePath" }
$head = (git -C $arc rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0) { throw "Unable to resolve Arc head." }
if ($head -ne $ArcActionAuthorityCommit) { throw "Arc checkout is $head; expected exact action authority $ArcActionAuthorityCommit." }
if ((git -C $arc status --porcelain).Length -ne 0) { throw "Arc checkout is not clean before candidate replay." }

if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    $OutputRoot = Join-Path ([System.IO.Path]::GetDirectoryName($candidatePath)) "arc-replay"
}
$output = Resolve-FullPath $OutputRoot (Get-Location).Path
New-Item -ItemType Directory -Force $output | Out-Null
$receiptPath = Join-Path $output "accepted-action-receipt.json"
$reconciliationPath = Join-Path $output "result-reconciliation.json"
$logPath = Join-Path $output "arc-replay.log"

if ([string]::IsNullOrWhiteSpace($Node)) { $Node = (Get-Command node -ErrorAction Stop).Source }
if ([string]::IsNullOrWhiteSpace($Npm)) { $Npm = (Get-Command npm -ErrorAction Stop).Source }
if ([string]::IsNullOrWhiteSpace($Npx)) { $Npx = (Get-Command npx -ErrorAction Stop).Source }

if ($InstallDependencies -or -not (Test-Path (Join-Path $arc "node_modules"))) {
    Write-Host "Installing exact Arc dependencies..."
    & $Npm --prefix $arc ci --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw "Arc dependency installation failed with exit $LASTEXITCODE." }
}

$temporaryTest = Join-Path $arc "tests\action\unity-receipt-adapter.test.ts"
$adapterSource = Join-Path $worldRoot "unity\Conformance\arc-receipt-adapter.test.ts"
if (-not (Test-Path $adapterSource)) { throw "Arc receipt adapter source is absent: $adapterSource" }
if (Test-Path $temporaryTest) { throw "Temporary Arc receipt adapter path already exists: $temporaryTest" }
New-Item -ItemType Directory -Force ([System.IO.Path]::GetDirectoryName($temporaryTest)) | Out-Null
Copy-Item $adapterSource $temporaryTest -ErrorAction Stop

$priorSpec = $env:AXM_ACTION_NATIVE_SPEC
$priorCandidate = $env:AXM_ACTION_CANDIDATE
$priorReceipt = $env:AXM_ACTION_RECEIPT_OUT
$priorReconciliation = $env:AXM_ACTION_RECONCILIATION_OUT
$priorAuthority = $env:ARC_ACTION_AUTHORITY_SHA
try {
    $env:AXM_ACTION_NATIVE_SPEC = $spec
    $env:AXM_ACTION_CANDIDATE = $candidatePath
    $env:AXM_ACTION_RECEIPT_OUT = $receiptPath
    $env:AXM_ACTION_RECONCILIATION_OUT = $reconciliationPath
    $env:ARC_ACTION_AUTHORITY_SHA = $ArcActionAuthorityCommit
    Write-Host "Replaying the Unity trace through exact Arc action authority..."
    Push-Location $arc
    try {
        & $Npx vitest run tests/action/unity-receipt-adapter.test.ts --reporter=verbose *>&1 | Tee-Object $logPath
        if ($LASTEXITCODE -ne 0) { throw "Arc action replay failed with exit $LASTEXITCODE. See $logPath" }
    } finally {
        Pop-Location
    }
} finally {
    Remove-Item $temporaryTest -Force -ErrorAction SilentlyContinue
    $env:AXM_ACTION_NATIVE_SPEC = $priorSpec
    $env:AXM_ACTION_CANDIDATE = $priorCandidate
    $env:AXM_ACTION_RECEIPT_OUT = $priorReceipt
    $env:AXM_ACTION_RECONCILIATION_OUT = $priorReconciliation
    $env:ARC_ACTION_AUTHORITY_SHA = $priorAuthority
}

if ((git -C $arc status --porcelain).Length -ne 0) { throw "Arc replay left the source checkout dirty." }
if (-not (Test-Path $receiptPath)) { throw "Arc replay did not write $receiptPath" }
if (-not (Test-Path $reconciliationPath)) { throw "Arc replay did not write $reconciliationPath" }
$receipt = Get-Content $receiptPath -Raw | ConvertFrom-Json
$reconciliation = Get-Content $reconciliationPath -Raw | ConvertFrom-Json
if ($receipt.format -ne "axm-action-receipt/1") { throw "Arc replay emitted an unsupported receipt format." }
if ($reconciliation.status -ne "accepted") { throw "Arc replay reconciliation did not accept the candidate." }

$runReceipt = [ordered]@{
    format = "rodoh-unity-action-arc-replay-run/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "pass"
    arcActionAuthorityCommit = $ArcActionAuthorityCommit
    nativeActionSpec = $spec
    candidate = $candidatePath
    acceptedReceipt = $receiptPath
    reconciliation = $reconciliationPath
    provisionalParity = $reconciliation.provisionalParity
    resolution = $reconciliation.resolution
    campaignAuthority = $reconciliation.campaignAuthority
}
$runReceiptPath = Join-Path $output "arc-replay-run.json"
$runReceipt | ConvertTo-Json -Depth 10 | Set-Content -Encoding utf8 $runReceiptPath
Write-Host "Exact Arc action replay passed."
Write-Host $runReceiptPath

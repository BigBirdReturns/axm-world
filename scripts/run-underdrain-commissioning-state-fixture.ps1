[CmdletBinding()]
param(
    [string]$OutputRoot
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$fixture = Join-Path $PSScriptRoot "test-underdrain-commissioning-state.ps1"
if (-not (Test-Path -LiteralPath $fixture -PathType Leaf)) {
    throw "Commissioning-state fixture body is absent: $fixture"
}

& $fixture -OutputRoot $OutputRoot

if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    throw "OutputRoot is required when the qualification wrapper is used."
}
$qualificationPath = Join-Path ([System.IO.Path]::GetFullPath($OutputRoot)) "underdrain-commissioning-state-fixture-qualification.json"
if (-not (Test-Path -LiteralPath $qualificationPath -PathType Leaf)) {
    throw "Commissioning-state fixture did not write its qualification receipt: $qualificationPath"
}
$receipt = Get-Content -LiteralPath $qualificationPath -Raw | ConvertFrom-Json
if ($receipt.format -ne "rodoh-underdrain-commissioning-state-fixture-qualification/1" -or $receipt.status -ne "pass") {
    throw "Commissioning fixture receipt is unsupported or failed."
}
if (
    $receipt.executableSessionPathsVerified -ne $true -or
    $receipt.controllerInspectVerified -ne $true -or
    $receipt.controllerBlockedAdvanceVerified -ne $true -or
    $receipt.diagnosticBundleVerified -ne $true
) {
    throw "Commissioning fixture did not prove its complete source boundary."
}
if (
    $receipt.unityInvoked -ne $false -or
    $receipt.productAcceptanceIssued -ne $false -or
    $receipt.questInvoked -ne $false -or
    $receipt.physicalAcceptanceIssued -ne $false
) {
    throw "Commissioning source qualification crossed runtime or acceptance authority."
}

Write-Host "UNDERDRAIN commissioning-state qualification receipt accepted."
Write-Host $qualificationPath
exit 0

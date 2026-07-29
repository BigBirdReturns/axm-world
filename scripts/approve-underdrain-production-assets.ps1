[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$EmbodiedArLabRoot,

    [Parameter(Mandatory = $true)]
    [string]$PresentationManifest,

    [Parameter(Mandatory = $true)]
    [string]$ProductProfile,

    [Parameter(Mandatory = $true)]
    [string]$OutputRoot,

    [Parameter(Mandatory = $true)]
    [string]$ApprovalId,

    [Parameter(Mandatory = $true)]
    [string]$ApprovalAuthorityId,

    [Parameter(Mandatory = $true)]
    [string]$ApprovalName,

    [Parameter(Mandatory = $true)]
    [string]$ApprovalAttestation,

    [Parameter(Mandatory = $true)]
    [switch]$ConfirmAllAssets,

    [string]$UnityVersion = "6000.0.66f2",
    [string]$UnityEditor,
    [switch]$ForceCloseUnity
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-FullPath([string]$Value, [string]$Base) {
    if ([System.IO.Path]::IsPathRooted($Value)) { return [System.IO.Path]::GetFullPath($Value) }
    return [System.IO.Path]::GetFullPath((Join-Path $Base $Value))
}

$worldRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$projectRoot = Resolve-FullPath $EmbodiedArLabRoot (Get-Location).Path
$presentationPath = Resolve-FullPath $PresentationManifest $worldRoot
$profilePath = Resolve-FullPath $ProductProfile $worldRoot
$output = Resolve-FullPath $OutputRoot $projectRoot
foreach ($directory in @("Assets", "Packages", "ProjectSettings")) {
    if (-not (Test-Path (Join-Path $projectRoot $directory))) { throw "Embodied-AR-Lab $directory directory is absent: $projectRoot" }
}
foreach ($path in @($presentationPath, $profilePath)) { if (-not (Test-Path $path)) { throw "Production-asset approval input is absent: $path" } }
if (-not $ConfirmAllAssets) { throw "Named asset approval requires -ConfirmAllAssets after reviewing all seven prefabs." }
foreach ($value in @($ApprovalId, $ApprovalAuthorityId, $ApprovalName, $ApprovalAttestation)) {
    if ([string]::IsNullOrWhiteSpace($value)) { throw "Named asset approval identity and attestation fields may not be empty." }
}
if ([string]::IsNullOrWhiteSpace($UnityEditor)) { $UnityEditor = "C:\Program Files\Unity\Hub\Editor\$UnityVersion\Editor\Unity.exe" }
$unityPath = [System.IO.Path]::GetFullPath($UnityEditor)
if (-not (Test-Path $unityPath)) { throw "Unity Editor is absent: $unityPath" }

$sourcePackage = Join-Path $worldRoot "unity\Packages\com.axm.rodoh-action"
$embeddedPackage = Join-Path $projectRoot "Packages\com.axm.rodoh-action"
if (-not (Test-Path (Join-Path $sourcePackage "package.json"))) { throw "World Unity action package is incomplete: $sourcePackage" }
New-Item -ItemType Directory -Force $embeddedPackage, $output | Out-Null
& robocopy.exe $sourcePackage $embeddedPackage /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -gt 7) { throw "RODOH Unity package copy failed with robocopy exit $LASTEXITCODE." }

$unityProcesses = Get-Process Unity -ErrorAction SilentlyContinue
if ($unityProcesses) {
    if (-not $ForceCloseUnity) { throw "Unity Editor is running. Close it first or pass -ForceCloseUnity." }
    $unityProcesses | Stop-Process -Force
    Start-Sleep -Seconds 2
}

$logPath = Join-Path $output "unity-production-asset-approval.log"
$arguments = @(
    "-batchmode",
    "-nographics",
    "-quit",
    "-projectPath", $projectRoot,
    "-executeMethod", "Axm.Rodoh.Action.Editor.ActionProductionAssetApprovalBatch.Run",
    "-presentation", $presentationPath,
    "-productProfile", $profilePath,
    "-approvalId", $ApprovalId,
    "-approvalAuthorityId", $ApprovalAuthorityId,
    "-approvalName", $ApprovalName,
    "-approvalAttestation", $ApprovalAttestation,
    "-confirmAllAssets", "true",
    "-outputRoot", $output,
    "-logFile", $logPath
)
Write-Host "Recording named approval over the exact imported visual sources of all seven UNDERDRAIN prefabs..."
$process = Start-Process -FilePath $unityPath -ArgumentList $arguments -Wait -PassThru -NoNewWindow
if ($process.ExitCode -ne 0) { throw "UNDERDRAIN production-asset approval failed with exit $($process.ExitCode). See $logPath" }
$receiptPath = Join-Path $output "production-asset-approval.json"
if (-not (Test-Path $receiptPath)) { throw "Unity did not write the production-asset approval receipt: $receiptPath" }
$receipt = Get-Content $receiptPath -Raw | ConvertFrom-Json
if ($receipt.format -ne "rodoh-action-production-asset-approval/1" -or $receipt.status -ne "approved") { throw "Production-asset approval did not complete: $($receipt.error)" }
if ($receipt.productId -ne (Get-Content $profilePath -Raw | ConvertFrom-Json).productId) { throw "Production-asset approval product identity differs from the product profile." }
if ($receipt.approvalId -ne $ApprovalId -or $receipt.approvalAuthorityId -ne $ApprovalAuthorityId -or $receipt.approvalName -ne $ApprovalName) { throw "Production-asset approval lost the named authority assertion." }
if ($receipt.assetCount -ne 7 -or $receipt.confirmedAllAssets -ne $true -or $receipt.productionApproved -ne $true -or $receipt.generatedPrimitive -ne $false -or $receipt.activePhysicsAuthority -ne $false) { throw "Production-asset approval did not establish the complete seven-asset floor." }
foreach ($asset in @($receipt.assets)) {
    if ($asset.approved -ne $true -or $asset.approvalId -ne $ApprovalId -or $asset.approvalAuthorityId -ne $ApprovalAuthorityId) { throw "Production asset $($asset.assetId) lost named approval custody." }
    if ($asset.sourceSha256 -notmatch '^[0-9a-f]{64}$' -or @($asset.visualSourcePaths).Count -lt 1) { throw "Production asset $($asset.assetId) lacks exact imported-source custody." }
}

$worldCommit = (& git -C $worldRoot rev-parse HEAD).Trim()
$run = [ordered]@{
    format = "rodoh-underdrain-production-asset-approval-run/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "approved"
    worldCommit = $worldCommit
    projectRoot = $projectRoot
    unityEditor = $unityPath
    unityVersion = $receipt.unityVersion
    productId = $receipt.productId
    presentationManifestId = $receipt.presentationManifestId
    approvalId = $receipt.approvalId
    approvalAuthorityId = $receipt.approvalAuthorityId
    approvalName = $receipt.approvalName
    approvalAttestation = $receipt.approvalAttestation
    approvedAt = $receipt.approvedAt
    assetCount = $receipt.assetCount
    sourceDigests = @($receipt.assets | ForEach-Object { [ordered]@{ assetId = $_.assetId; role = $_.role; sourceSha256 = $_.sourceSha256; visualSourcePaths = $_.visualSourcePaths } })
    authorityAuthentication = "not-performed"
    playerProductAcceptance = "not-issued"
    approvalReceipt = $receiptPath
    unityLog = $logPath
}
$runPath = Join-Path $output "production-asset-approval-run.json"
$run | ConvertTo-Json -Depth 24 | Set-Content -Encoding utf8 $runPath
$shaPath = $receiptPath + ".sha256"
$hash = (Get-FileHash $receiptPath -Algorithm SHA256).Hash.ToLowerInvariant()
"$hash  $([System.IO.Path]::GetFileName($receiptPath))" | Set-Content -Encoding ascii $shaPath
Write-Host "UNDERDRAIN production assets received named presentation-asset approval."
Write-Host "The approval assertion is preserved but not authenticated, and it does not accept the player product."
Write-Host $runPath

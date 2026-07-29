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
foreach ($path in @($presentationPath, $profilePath)) { if (-not (Test-Path $path)) { throw "Production-asset intake input is absent: $path" } }
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

$logPath = Join-Path $output "unity-production-asset-intake.log"
$arguments = @(
    "-batchmode",
    "-nographics",
    "-quit",
    "-projectPath", $projectRoot,
    "-executeMethod", "Axm.Rodoh.Action.Editor.ActionProductionAssetIntakeBatch.Run",
    "-presentation", $presentationPath,
    "-productProfile", $profilePath,
    "-outputRoot", $output,
    "-logFile", $logPath
)
Write-Host "Admitting the real UNDERDRAIN prefabs through imported-source and physics custody..."
$process = Start-Process -FilePath $unityPath -ArgumentList $arguments -Wait -PassThru -NoNewWindow
if ($process.ExitCode -ne 0) { throw "UNDERDRAIN production-asset intake failed with exit $($process.ExitCode). See $logPath" }
$receiptPath = Join-Path $output "production-asset-intake.json"
if (-not (Test-Path $receiptPath)) { throw "Unity did not write the production-asset intake receipt: $receiptPath" }
$receipt = Get-Content $receiptPath -Raw | ConvertFrom-Json
if ($receipt.status -ne "pass" -or $receipt.assetCount -ne 7) { throw "Production-asset intake did not admit the complete seven-asset floor: $($receipt.error)" }
if ($receipt.productionApproved -ne $true -or $receipt.generatedPrimitive -ne $false -or $receipt.activePhysicsAuthority -ne $false) { throw "Production-asset intake crossed the approval, primitive, or physics boundary." }
foreach ($asset in @($receipt.assets)) {
    if ($asset.sourceSha256 -notmatch '^[0-9a-f]{64}$' -or @($asset.visualSourcePaths).Count -lt 1) { throw "Production asset $($asset.assetId) lacks imported-source custody." }
}

$worldCommit = (& git -C $worldRoot rev-parse HEAD).Trim()
$run = [ordered]@{
    format = "rodoh-underdrain-production-asset-intake-run/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "pass"
    worldCommit = $worldCommit
    projectRoot = $projectRoot
    unityEditor = $unityPath
    unityVersion = $receipt.unityVersion
    productId = $receipt.productId
    presentationManifestId = $receipt.presentationManifestId
    presentationManifest = $presentationPath
    productProfile = $profilePath
    assetCount = $receipt.assetCount
    assetIds = @($receipt.assets | ForEach-Object { $_.assetId })
    sourceDigests = @($receipt.assets | ForEach-Object { [ordered]@{ assetId = $_.assetId; sourceSha256 = $_.sourceSha256; visualSourcePaths = $_.visualSourcePaths } })
    productionApproved = $receipt.productionApproved
    generatedPrimitive = $receipt.generatedPrimitive
    activePhysicsAuthority = $receipt.activePhysicsAuthority
    intakeReceipt = $receiptPath
    unityLog = $logPath
}
$runPath = Join-Path $output "production-asset-intake-run.json"
$run | ConvertTo-Json -Depth 20 | Set-Content -Encoding utf8 $runPath
Write-Host "UNDERDRAIN production assets passed imported-source intake."
Write-Host $runPath

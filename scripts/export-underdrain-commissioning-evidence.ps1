[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)] [string]$EmbodiedArLabRoot,
    [string]$JobId = "underdrain-unity6000-player-v1",
    [string]$OutputRoot,
    [switch]$IncludeImages
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-FullPath([string]$Value, [string]$Base) {
    if ([System.IO.Path]::IsPathRooted($Value)) { return [System.IO.Path]::GetFullPath($Value) }
    return [System.IO.Path]::GetFullPath((Join-Path $Base $Value))
}

function Get-Sha256([string]$Path) {
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Write-Json([string]$Path, [object]$Value) {
    $Value | ConvertTo-Json -Depth 50 | Set-Content -Encoding utf8 $Path
}

function Assert-UnderRoot([string]$Path, [string]$Root, [string]$Label) {
    $full = [System.IO.Path]::GetFullPath($Path)
    $rootFull = [System.IO.Path]::GetFullPath($Root).TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
    $comparison = if ([System.IO.Path]::DirectorySeparatorChar -eq '\') { [System.StringComparison]::OrdinalIgnoreCase } else { [System.StringComparison]::Ordinal }
    if ($full -ne $rootFull -and -not $full.StartsWith($rootFull + [System.IO.Path]::DirectorySeparatorChar, $comparison)) {
        throw "$Label escaped the job root: $full"
    }
    return $full
}

$projectRoot = Resolve-FullPath $EmbodiedArLabRoot (Get-Location).Path
$jobRoot = Join-Path $projectRoot "local\scene-jobs\$JobId"
if (-not (Test-Path -LiteralPath $jobRoot -PathType Container)) { throw "UNDERDRAIN job root is absent: $jobRoot" }
if ([string]::IsNullOrWhiteSpace($OutputRoot)) { $OutputRoot = Join-Path $jobRoot "output\commissioning-bundles" }
$output = Resolve-FullPath $OutputRoot $projectRoot
New-Item -ItemType Directory -Force $output | Out-Null

$bundleId = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssfffZ")
$staging = Join-Path ([System.IO.Path]::GetTempPath()) "underdrain-commissioning-evidence-$bundleId"
if (Test-Path -LiteralPath $staging) { Remove-Item -LiteralPath $staging -Recurse -Force }
New-Item -ItemType Directory -Force $staging | Out-Null

$allowedExtensions = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
foreach ($extension in @(".json", ".sha256", ".txt", ".log", ".md", ".csv")) { [void]$allowedExtensions.Add($extension) }
if ($IncludeImages) {
    foreach ($extension in @(".png", ".jpg", ".jpeg", ".webp")) { [void]$allowedExtensions.Add($extension) }
}

$excludedRoots = @(
    [System.IO.Path]::GetFullPath($output),
    [System.IO.Path]::GetFullPath((Join-Path $jobRoot "build\windows")),
    [System.IO.Path]::GetFullPath((Join-Path $jobRoot "build\quest"))
)
$comparison = if ([System.IO.Path]::DirectorySeparatorChar -eq '\') { [System.StringComparison]::OrdinalIgnoreCase } else { [System.StringComparison]::Ordinal }
function Is-Excluded([string]$Path) {
    $full = [System.IO.Path]::GetFullPath($Path)
    foreach ($root in $excludedRoots) {
        $trimmed = $root.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
        if ($full -eq $trimmed -or $full.StartsWith($trimmed + [System.IO.Path]::DirectorySeparatorChar, $comparison)) { return $true }
    }
    return $false
}

$inventory = [System.Collections.ArrayList]::new()
try {
    foreach ($source in (Get-ChildItem -LiteralPath $jobRoot -File -Recurse -Force | Sort-Object FullName)) {
        if (Is-Excluded $source.FullName) { continue }
        if (-not $allowedExtensions.Contains($source.Extension)) { continue }
        $full = Assert-UnderRoot $source.FullName $jobRoot "Evidence file"
        $relative = [System.IO.Path]::GetRelativePath($jobRoot, $full)
        if ($relative.StartsWith("..")) { throw "Evidence relative path escaped the job root: $relative" }
        $target = Join-Path $staging $relative
        New-Item -ItemType Directory -Force ([System.IO.Path]::GetDirectoryName($target)) | Out-Null
        Copy-Item -LiteralPath $full -Destination $target -Force
        [void]$inventory.Add([ordered]@{
            path = $relative.Replace('\', '/')
            bytes = $source.Length
            sha256 = Get-Sha256 $source.FullName
        })
    }

    $currentState = Join-Path $jobRoot "output\commissioning-state\underdrain-commissioning-state.json"
    $state = if (Test-Path -LiteralPath $currentState -PathType Leaf) { Get-Content -LiteralPath $currentState -Raw | ConvertFrom-Json } else { $null }
    $manifest = [ordered]@{
        format = "rodoh-underdrain-commissioning-evidence-bundle/1"
        generatedAt = (Get-Date).ToUniversalTime().ToString("o")
        status = "sealed"
        bundleId = $bundleId
        jobId = $JobId
        productId = if ($state) { $state.productId } else { "underdrain-bloom-below-unity6000-v1" }
        worldCommit = if ($state) { $state.worldCommit } else { $null }
        arcCommit = if ($state) { $state.arcCommit } else { $null }
        commissioningStatus = if ($state) { $state.status } else { "uninspected" }
        fileCount = $inventory.Count
        includeImages = [bool]$IncludeImages
        files = @($inventory)
        executableIncluded = $false
        sourceAssetsIncluded = $false
        productAcceptanceIssued = $false
        physicalHumanEvidence = "separate"
        questAcceptance = "open"
        physicalAcceptance = "not-issued"
        authority = "diagnostic evidence packaging only"
    }
    $manifestPath = Join-Path $staging "BUNDLE_MANIFEST.json"
    Write-Json $manifestPath $manifest

    $ledgerPath = Join-Path $staging "SHA256SUMS"
    Get-ChildItem -LiteralPath $staging -File -Recurse |
        Where-Object { $_.FullName -ne $ledgerPath } |
        Sort-Object FullName |
        ForEach-Object {
            $relative = [System.IO.Path]::GetRelativePath($staging, $_.FullName).Replace('\', '/')
            "$(Get-Sha256 $_.FullName)  $relative"
        } | Set-Content -Encoding ascii $ledgerPath

    $zipPath = Join-Path $output "underdrain-commissioning-evidence-$bundleId.zip"
    if (Test-Path -LiteralPath $zipPath) { throw "Evidence bundle already exists: $zipPath" }
    Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $zipPath -CompressionLevel Optimal
    if (-not (Test-Path -LiteralPath $zipPath -PathType Leaf)) { throw "Evidence bundle was not created: $zipPath" }
    $zipSha = Get-Sha256 $zipPath
    "$zipSha  $([System.IO.Path]::GetFileName($zipPath))" | Set-Content -Encoding ascii ($zipPath + ".sha256")

    $receipt = [ordered]@{
        format = "rodoh-underdrain-commissioning-evidence-bundle-receipt/1"
        generatedAt = (Get-Date).ToUniversalTime().ToString("o")
        status = "sealed"
        bundleId = $bundleId
        jobId = $JobId
        bundle = $zipPath
        bundleSha256 = $zipSha
        fileCount = $inventory.Count
        includeImages = [bool]$IncludeImages
        productAcceptanceIssued = $false
        questInvoked = $false
        physicalAcceptanceIssued = $false
    }
    $receiptPath = Join-Path $output "underdrain-commissioning-evidence-$bundleId.json"
    Write-Json $receiptPath $receipt
    "$(Get-Sha256 $receiptPath)  $([System.IO.Path]::GetFileName($receiptPath))" | Set-Content -Encoding ascii ($receiptPath + ".sha256")
    $zipPath | Set-Content -Encoding utf8 (Join-Path $output "LATEST_BUNDLE.txt")

    Write-Host "UNDERDRAIN commissioning diagnostic evidence sealed."
    Write-Host $zipPath
} finally {
    if (Test-Path -LiteralPath $staging) { Remove-Item -LiteralPath $staging -Recurse -Force }
}

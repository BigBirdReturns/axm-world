[CmdletBinding()]
param(
    [string]$OutputRoot
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Json([string]$Path, [object]$Value) {
    New-Item -ItemType Directory -Force ([System.IO.Path]::GetDirectoryName($Path)) | Out-Null
    $Value | ConvertTo-Json -Depth 60 | Set-Content -Encoding utf8 $Path
}

function Sha([string]$Path) {
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function New-FixtureGit([string]$Path, [string]$Name) {
    New-Item -ItemType Directory -Force $Path | Out-Null
    & git -C $Path init --quiet
    if ($LASTEXITCODE -ne 0) { throw "Could not initialize $Name fixture repository." }
    & git -C $Path config user.email "fixture@axm.tools"
    & git -C $Path config user.name "AXM Fixture"
    "$Name fixture" | Set-Content -Encoding utf8 (Join-Path $Path "FIXTURE.txt")
    & git -C $Path add FIXTURE.txt
    & git -C $Path commit --quiet -m "Initialize $Name fixture"
    if ($LASTEXITCODE -ne 0) { throw "Could not commit $Name fixture repository." }
    return [pscustomobject]@{
        head = (& git -C $Path rev-parse HEAD).Trim().ToLowerInvariant()
        tree = (& git -C $Path rev-parse "HEAD^{tree}").Trim().ToLowerInvariant()
    }
}

function New-Project([string]$Path) {
    New-Item -ItemType Directory -Force `
        (Join-Path $Path "Assets"), `
        (Join-Path $Path "Packages"), `
        (Join-Path $Path "ProjectSettings") | Out-Null
    "m_EditorVersion: 6000.0.66f2" | Set-Content -Encoding utf8 (Join-Path $Path "ProjectSettings\ProjectVersion.txt")
    return $Path
}

function New-FakeUnity([string]$Root) {
    $path = Join-Path $Root "Unity\Hub\Editor\6000.0.66f2\Editor\Unity.exe"
    New-Item -ItemType Directory -Force ([System.IO.Path]::GetDirectoryName($path)) | Out-Null
    "fixture Unity executable; must never be launched" | Set-Content -Encoding ascii $path
    return $path
}

function New-ResolvedSource([string]$Root) {
    New-Item -ItemType Directory -Force $Root | Out-Null
    $roles = @(
        @("player:rhea-venn", "rhea-venn.png"),
        @("enemy:skirmisher", "capling-skirmisher.png"),
        @("enemy:duelist", "crown-duelist.png"),
        @("enemy:swarm", "signal-spore-swarm.png"),
        @("enemy:hexer", "discharge-hexer.png"),
        @("enemy:breaker", "root-breaker.png"),
        @("arena:pump-seven", "pump-seven-arena.png")
    )
    $assets = @()
    for ($index = 0; $index -lt $roles.Count; $index++) {
        $path = Join-Path $Root $roles[$index][1]
        "fixture asset $index" | Set-Content -Encoding ascii $path
        $assets += [ordered]@{
            assetId = "fixture:$index"
            role = $roles[$index][0]
            sourceKey = "fixture-source-$index"
            fileName = $roles[$index][1]
            sha256 = Sha $path
            pixelsPerUnit = 256
            displayScale = 1.0
            pivotX = 0.5
            pivotY = 0.1
        }
    }
    $manifest = Join-Path $Root "resolved-representation-source.json"
    Write-Json $manifest ([ordered]@{
        format = "rodoh-underdrain-resolved-representation-source/1"
        productId = "underdrain-bloom-below-unity6000-v1"
        themeId = "underdrain-bloom-below"
        unityVersion = "6000.0.66f2"
        sourceStandaloneFileName = "UNDERDRAIN_The_Bloom_Below_Shine_v0.4.html"
        sourceStandaloneSha256 = "ab9e1a542f89d66733d0b9946fd9f2b724e5e09395a74611fa760d336c209311"
        sourceAssetObject = "ASSET_DATA"
        extractionReceipt = "../shine-extraction/shine-extraction.json"
        extractionReceiptSha256 = "a" * 64
        roleMap = "fixture-role-map.json"
        roleMapSha256 = "b" * 64
        assets = $assets
        distinctPreparedProducts = $true
        templateOnly = $false
        reviewRequired = $true
        approvalIssued = $false
        productAcceptance = "not-issued"
        authority = "resolved project-owned sprite-source custody only"
    })
    return $manifest
}

function Invoke-Bootstrap(
    [string]$Name,
    [hashtable]$Parameters,
    [int]$ExpectedExit,
    [string]$ExpectedStatus
) {
    $caseRoot = Join-Path $OutputRoot $Name
    New-Item -ItemType Directory -Force $caseRoot | Out-Null
    $arguments = [System.Collections.ArrayList]::new()
    foreach ($value in @(
        "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
        "-File", (Join-Path $PSScriptRoot "bootstrap-underdrain-windows-host.ps1")
    )) {
        [void]$arguments.Add($value)
    }
    $Parameters.OutputRoot = $caseRoot
    foreach ($key in ($Parameters.Keys | Sort-Object)) {
        $value = $Parameters[$key]
        if ($value -is [bool]) {
            if ($value) { [void]$arguments.Add("-$key") }
        } elseif ($value -is [System.Array]) {
            [void]$arguments.Add("-$key")
            foreach ($item in $value) { [void]$arguments.Add([string]$item) }
        } elseif ($null -ne $value -and -not [string]::IsNullOrWhiteSpace([string]$value)) {
            [void]$arguments.Add("-$key")
            [void]$arguments.Add([string]$value)
        }
    }
    $hostPowerShell = (Get-Process -Id $PID).Path
    $output = @(& $hostPowerShell @arguments 2>&1)
    $exitCode = $LASTEXITCODE
    foreach ($line in $output) { Write-Host "[$Name] $line" }
    if ($exitCode -ne $ExpectedExit) {
        throw "$Name bootstrap exit was $exitCode, expected $ExpectedExit."
    }
    $receiptPath = Join-Path $caseRoot "underdrain-windows-host-bootstrap.json"
    if (-not (Test-Path -LiteralPath $receiptPath -PathType Leaf)) {
        throw "$Name bootstrap receipt is absent."
    }
    $receipt = Get-Content -LiteralPath $receiptPath -Raw | ConvertFrom-Json
    if ($receipt.format -ne "rodoh-underdrain-windows-host-bootstrap/1") {
        throw "$Name bootstrap format is unsupported."
    }
    if ($receipt.status -ne $ExpectedStatus) {
        throw "$Name bootstrap status was $($receipt.status), expected $ExpectedStatus."
    }
    if ($receipt.mutation.repositoriesChanged -ne $false -or
        $receipt.mutation.unityInvoked -ne $false -or
        $receipt.mutation.representationMaterialized -ne $false -or
        $receipt.mutation.approvalIssued -ne $false -or
        $receipt.mutation.reviewIssued -ne $false -or
        $receipt.mutation.productAcceptanceIssued -ne $false -or
        $receipt.mutation.questInvoked -ne $false -or
        $receipt.mutation.physicalAcceptanceIssued -ne $false) {
        throw "$Name bootstrap crossed its read-only authority boundary."
    }
    return $receipt
}

if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    $OutputRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("underdrain-host-bootstrap-" + [Guid]::NewGuid().ToString("N"))
}
$OutputRoot = [System.IO.Path]::GetFullPath($OutputRoot)
if (Test-Path -LiteralPath $OutputRoot) { Remove-Item -LiteralPath $OutputRoot -Recurse -Force }
New-Item -ItemType Directory -Force $OutputRoot | Out-Null

$estate = Join-Path $OutputRoot "estate"
$world = Join-Path $estate "Organs\AXM\axm-world\main"
$arc = Join-Path $estate "Organs\AXM\axm-arc\main"
$project = New-Project (Join-Path $estate "Embodied-AR-Lab")
$unity = New-FakeUnity $estate
$worldIdentity = New-FixtureGit $world "World"
$arcIdentity = New-FixtureGit $arc "ARC"
$resolvedRoot = Join-Path $estate "Evidence\underdrain\resolved-role-assets"
$resolvedManifest = New-ResolvedSource $resolvedRoot

$base = @{
    ExpectedWorldCommit = $worldIdentity.head
    ExpectedWorldTree = $worldIdentity.tree
    ExpectedArcCommit = $arcIdentity.head
    ExpectedArcTree = $arcIdentity.tree
    ExpectedUnityVersion = "6000.0.66f2"
    JobId = "underdrain-host-bootstrap-fixture"
}

$openParameters = $base.Clone()
$openParameters.WorldRoot = $world
$openParameters.ArcRoot = $arc
$openParameters.EmbodiedArLabRoot = $project
$openParameters.UnityEditor = $unity
$openReceipt = Invoke-Bootstrap "explicit-open" $openParameters 0 "open"
if ($openReceipt.commissioning.status -ne "open" -or $openReceipt.commissioning.firstDivergence.id -ne "representation-materialization") {
    throw "Explicit open case did not locate the first representation-materialization divergence."
}
if ($openReceipt.roots.world -ne [System.IO.Path]::GetFullPath($world) -or
    $openReceipt.roots.arc -ne [System.IO.Path]::GetFullPath($arc) -or
    $openReceipt.roots.embodiedArLab -ne [System.IO.Path]::GetFullPath($project)) {
    throw "Explicit open case lost exact root custody."
}

$readyParameters = $base.Clone()
$readyParameters.WorldRoot = $world
$readyParameters.ArcRoot = $arc
$readyParameters.EmbodiedArLabRoot = $project
$readyParameters.UnityEditor = $unity
$readyParameters.ResolvedSourceManifest = $resolvedManifest
$readyParameters.ResolvedSourceRoot = $resolvedRoot
$readyReceipt = Invoke-Bootstrap "explicit-ready" $readyParameters 0 "pass"
if ($readyReceipt.next.command -notlike "*materialize-underdrain-production-representation.ps1*" -or
    $readyReceipt.next.command -notlike "*$resolvedManifest*" -or
    $readyReceipt.next.command -notlike "*$unity*") {
    throw "Explicit ready case did not emit the exact materialization command."
}

$discoveryParameters = $base.Clone()
$discoveryParameters.SearchRoots = @($estate)
$discoveryParameters.DeepSearch = $true
$discoveryReceipt = Invoke-Bootstrap "bounded-discovery" $discoveryParameters 0 "pass"
if ($discoveryReceipt.roots.world -ne [System.IO.Path]::GetFullPath($world) -or
    $discoveryReceipt.roots.arc -ne [System.IO.Path]::GetFullPath($arc) -or
    $discoveryReceipt.roots.embodiedArLab -ne [System.IO.Path]::GetFullPath($project) -or
    $discoveryReceipt.roots.resolvedSourceManifest -ne [System.IO.Path]::GetFullPath($resolvedManifest)) {
    throw "Bounded discovery did not resolve the exact fixture estate."
}

"dirty" | Add-Content -Encoding utf8 (Join-Path $world "FIXTURE.txt")
$dirtyParameters = $base.Clone()
$dirtyParameters.WorldRoot = $world
$dirtyParameters.ArcRoot = $arc
$dirtyParameters.EmbodiedArLabRoot = $project
$dirtyParameters.UnityEditor = $unity
$dirtyReceipt = Invoke-Bootstrap "dirty-world" $dirtyParameters 2 "held"
if (@($dirtyReceipt.checks | Where-Object { $_.id -eq "world-custody" -and $_.status -eq "held" }).Count -ne 1) {
    throw "Dirty World case was not held at World custody."
}
& git -C $world checkout -- FIXTURE.txt
if ($LASTEXITCODE -ne 0) { throw "Could not restore the World fixture." }

$projectVersionPath = Join-Path $project "ProjectSettings\ProjectVersion.txt"
"m_EditorVersion: 6000.0.65f1" | Set-Content -Encoding utf8 $projectVersionPath
$versionParameters = $base.Clone()
$versionParameters.WorldRoot = $world
$versionParameters.ArcRoot = $arc
$versionParameters.EmbodiedArLabRoot = $project
$versionParameters.UnityEditor = $unity
$versionReceipt = Invoke-Bootstrap "wrong-unity-project-version" $versionParameters 2 "held"
if (@($versionReceipt.checks | Where-Object { $_.id -eq "unity-project" -and $_.status -eq "held" }).Count -ne 1) {
    throw "Wrong Unity project version was not held."
}
"m_EditorVersion: 6000.0.66f2" | Set-Content -Encoding utf8 $projectVersionPath

$duplicate = Join-Path $estate "axm-world"
& git clone --quiet $world $duplicate
if ($LASTEXITCODE -ne 0) { throw "Could not create the duplicate World fixture." }
$ambiguousParameters = $base.Clone()
$ambiguousParameters.SearchRoots = @($estate)
$ambiguousReceipt = Invoke-Bootstrap "ambiguous-world" $ambiguousParameters 2 "held"
if (@($ambiguousReceipt.checks | Where-Object { $_.id -eq "world-custody" -and $_.status -eq "held" }).Count -ne 1) {
    throw "Ambiguous World discovery was not held."
}
Remove-Item -LiteralPath $duplicate -Recurse -Force

$staleAsset = Join-Path $resolvedRoot "rhea-venn.png"
"mutated fixture asset" | Set-Content -Encoding ascii $staleAsset
$staleParameters = $base.Clone()
$staleParameters.WorldRoot = $world
$staleParameters.ArcRoot = $arc
$staleParameters.EmbodiedArLabRoot = $project
$staleParameters.UnityEditor = $unity
$staleParameters.ResolvedSourceManifest = $resolvedManifest
$staleParameters.ResolvedSourceRoot = $resolvedRoot
$staleReceipt = Invoke-Bootstrap "stale-resolved-source" $staleParameters 2 "held"
if (@($staleReceipt.checks | Where-Object { $_.id -eq "resolved-seven-role-source" -and $_.status -eq "held" }).Count -ne 1) {
    throw "Stale resolved source was not held."
}

$qualificationPath = Join-Path $OutputRoot "underdrain-windows-host-bootstrap-fixture-qualification.json"
Write-Json $qualificationPath ([ordered]@{
    format = "rodoh-underdrain-windows-host-bootstrap-fixture-qualification/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "pass"
    worldCommit = $worldIdentity.head
    worldTree = $worldIdentity.tree
    arcCommit = $arcIdentity.head
    arcTree = $arcIdentity.tree
    cases = @(
        "explicit-open",
        "explicit-ready",
        "bounded-discovery",
        "dirty-world",
        "wrong-unity-project-version",
        "ambiguous-world",
        "stale-resolved-source"
    )
    exactRootsVerified = $true
    boundedDiscoveryVerified = $true
    resolvedSourceAdmissionVerified = $true
    dirtyCheckoutRefusalVerified = $true
    identityAmbiguityRefusalVerified = $true
    staleSourceRefusalVerified = $true
    commissioningStateVerified = $true
    unityInvoked = $false
    representationMaterialized = $false
    approvalIssued = $false
    reviewIssued = $false
    productAcceptanceIssued = $false
    questInvoked = $false
    physicalAcceptanceIssued = $false
})
"$(Sha $qualificationPath)  underdrain-windows-host-bootstrap-fixture-qualification.json" |
    Set-Content -Encoding ascii ($qualificationPath + ".sha256")

Write-Host "UNDERDRAIN Windows host bootstrap admission and refusal fixtures passed."
Write-Host $qualificationPath
exit 0

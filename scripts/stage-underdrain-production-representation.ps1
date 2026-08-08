[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$WorldRoot,

    [Parameter(Mandatory = $true)]
    [string]$ArcRoot,

    [Parameter(Mandatory = $true)]
    [string]$EmbodiedArLabRoot,

    [Parameter(Mandatory = $true)]
    [string]$ShineStandalone,

    [string]$MachineLock,
    [string]$ExpectedWorldCommit,
    [string]$ExpectedArcCommit,
    [string]$OperatorId = "local-representation-operator",
    [string]$AuthoringSelection,
    [string]$OutputRoot,
    [string]$UnityVersion = "6000.0.66f2",
    [string]$UnityEditor,
    [switch]$InstallDependencies,
    [switch]$Replace,
    [switch]$NoOpen,
    [switch]$ForceCloseUnity
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-FullPath([string]$Value, [string]$Base) {
    if ([string]::IsNullOrWhiteSpace($Value)) { return $null }
    if ([System.IO.Path]::IsPathRooted($Value)) { return [System.IO.Path]::GetFullPath($Value) }
    return [System.IO.Path]::GetFullPath((Join-Path $Base $Value))
}

function Require-File([string]$Path, [string]$Label) {
    if (-not (Test-Path $Path -PathType Leaf)) { throw "$Label is absent: $Path" }
}

function Require-Directory([string]$Path, [string]$Label) {
    if (-not (Test-Path $Path -PathType Container)) { throw "$Label is absent: $Path" }
}

function Resolve-CleanGitCommit([string]$Root, [string]$Label, [string]$ExpectedCommit) {
    Require-Directory $Root "$Label checkout root"
    $commitOutput = @(& git -C $Root rev-parse HEAD 2>$null)
    if ($LASTEXITCODE -ne 0 -or $commitOutput.Count -ne 1) { throw "$Label checkout commit could not be resolved: $Root" }
    $commit = ([string]$commitOutput[0]).Trim().ToLowerInvariant()
    if ($commit -notmatch '^[0-9a-f]{40}$') { throw "$Label checkout commit is malformed: $commit" }
    $dirty = @(& git -C $Root status --porcelain)
    if ($LASTEXITCODE -ne 0) { throw "$Label checkout status could not be read: $Root" }
    if ($dirty.Count -gt 0) { throw "$Label checkout must be clean before representation staging." }
    if ([string]::IsNullOrWhiteSpace($ExpectedCommit)) { throw "Expected $Label commit is absent. Use the packaged MACHINE_LOCK.json or supply the exact commit explicitly." }
    $expected = $ExpectedCommit.Trim().ToLowerInvariant()
    if ($expected -notmatch '^[0-9a-f]{40}$') { throw "Expected $Label commit is malformed: $ExpectedCommit" }
    if ($commit -ne $expected) { throw "$Label checkout is $commit, expected $expected." }
    return $commit
}

function Invoke-Native([string]$FilePath, [string[]]$Arguments, [string]$Label, [int[]]$AllowedExitCodes = @(0)) {
    & $FilePath @Arguments | Out-Host
    $code = [int]$LASTEXITCODE
    if ($AllowedExitCodes -notcontains $code) { throw "$Label failed with exit $code." }
    return $code
}

function Resolve-MachineLockPath([string]$ExplicitPath, [string]$ToolRoot) {
    $candidates = @()
    if (-not [string]::IsNullOrWhiteSpace($ExplicitPath)) { $candidates += (Resolve-FullPath $ExplicitPath (Get-Location).Path) }
    $candidates += (Join-Path $ToolRoot "MACHINE_LOCK.json")
    $candidates += (Join-Path $PSScriptRoot "MACHINE_LOCK.json")
    foreach ($candidate in $candidates) {
        if (Test-Path $candidate -PathType Leaf) { return [System.IO.Path]::GetFullPath($candidate) }
    }
    return $null
}

$world = Resolve-FullPath $WorldRoot (Get-Location).Path
$arc = Resolve-FullPath $ArcRoot (Get-Location).Path
$embodied = Resolve-FullPath $EmbodiedArLabRoot (Get-Location).Path
$shine = Resolve-FullPath $ShineStandalone (Get-Location).Path
$authoringSelectionPath = Resolve-FullPath $AuthoringSelection (Get-Location).Path
$toolRoot = [System.IO.Path]::GetFullPath((Split-Path $PSScriptRoot -Parent))
$lockPath = Resolve-MachineLockPath $MachineLock $toolRoot
$lock = $null
if ($null -ne $lockPath) {
    $lock = Get-Content $lockPath -Raw | ConvertFrom-Json
    if ($lock.format -ne "rodoh-underdrain-unity6000-machine-lock/2") { throw "Machine lock format is unsupported: $lockPath" }
    if ([string]::IsNullOrWhiteSpace($ExpectedWorldCommit)) { $ExpectedWorldCommit = [string]$lock.world.commit }
    if ([string]::IsNullOrWhiteSpace($ExpectedArcCommit)) { $ExpectedArcCommit = [string]$lock.arc.commit }
    if ([string]::IsNullOrWhiteSpace($UnityVersion)) { $UnityVersion = [string]$lock.unityVersion }
}

$worldCommit = Resolve-CleanGitCommit $world "World" $ExpectedWorldCommit
$arcCommit = Resolve-CleanGitCommit $arc "Arc" $ExpectedArcCommit
Require-Directory $embodied "Embodied-AR-Lab root"
Require-File $shine "Exact UNDERDRAIN Shine standalone"
if ($null -ne $authoringSelectionPath) { Require-File $authoringSelectionPath "Representation authoring selection" }
foreach ($directory in @("Assets", "Packages", "ProjectSettings")) {
    Require-Directory (Join-Path $embodied $directory) "Embodied-AR-Lab $directory directory"
}

$projectVersionPath = Join-Path $embodied "ProjectSettings\ProjectVersion.txt"
Require-File $projectVersionPath "Unity project-version file"
$projectVersion = [regex]::Match((Get-Content $projectVersionPath -Raw), '(?m)^m_EditorVersion:\s*(\S+)\s*$').Groups[1].Value
if ($projectVersion -ne $UnityVersion) { throw "Embodied-AR-Lab uses Unity '$projectVersion', expected '$UnityVersion'." }
if ([string]::IsNullOrWhiteSpace($UnityEditor)) { $UnityEditor = "C:\Program Files\Unity\Hub\Editor\$UnityVersion\Editor\Unity.exe" }
$unityPath = Resolve-FullPath $UnityEditor (Get-Location).Path
Require-File $unityPath "Unity Editor"

$expectedShineSha = if ($null -ne $lock) { [string]$lock.shineSource.sha256 } else { "ab9e1a542f89d66733d0b9946fd9f2b724e5e09395a74611fa760d336c209311" }
if ($expectedShineSha -notmatch '^[0-9a-f]{64}$') { throw "Machine lock contains a malformed Shine SHA-256." }
$shineSha = (Get-FileHash $shine -Algorithm SHA256).Hash.ToLowerInvariant()
if ($shineSha -ne $expectedShineSha) { throw "Shine standalone digest is $shineSha, expected $expectedShineSha." }

if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    $OutputRoot = Join-Path $embodied "local\scene-jobs\underdrain-unity6000-player-v1\representation-staging"
}
$output = Resolve-FullPath $OutputRoot $embodied
if (Test-Path $output) {
    $existing = @(Get-ChildItem $output -Force -ErrorAction SilentlyContinue)
    if ($existing.Count -gt 0 -and -not $Replace) { throw "Representation staging output is not empty: $output. Use -Replace for an explicit replacement." }
    if ($Replace) { Remove-Item $output -Recurse -Force }
}
New-Item -ItemType Directory -Force $output | Out-Null

$extractor = Join-Path $PSScriptRoot "extract-underdrain-shine-assets.mjs"
$author = Join-Path $PSScriptRoot "author-underdrain-production-representation.mjs"
$materializer = Join-Path $PSScriptRoot "materialize-underdrain-production-representation.ps1"
$preflight = Join-Path $PSScriptRoot "preflight-underdrain-unity6000-player-product.ps1"
foreach ($entry in @(@($extractor, "Shine extractor"), @($author, "representation authoring console"), @($materializer, "Unity materializer"), @($preflight, "machine preflight"))) {
    Require-File $entry[0] $entry[1]
}
$node = (Get-Command node.exe -ErrorAction Stop).Source

$packageJson = Join-Path $toolRoot "package.json"
Require-File $packageJson "Machine-kit package manifest"
$playwrightPackage = Join-Path $toolRoot "node_modules\playwright\package.json"
if (-not (Test-Path $playwrightPackage -PathType Leaf)) {
    if (-not $InstallDependencies) { throw "Playwright dependencies are not installed. Run INSTALL_SHINE_EXTRACTOR.ps1 or repeat with -InstallDependencies." }
    $npm = (Get-Command npm.cmd -ErrorAction Stop).Source
    $npx = (Get-Command npx.cmd -ErrorAction Stop).Source
    Push-Location $toolRoot
    try {
        Invoke-Native $npm @("ci", "--no-audit", "--no-fund") "Exact machine-kit dependency installation" | Out-Null
        Invoke-Native $npx @("playwright", "install", "chromium") "Local Chromium installation" | Out-Null
    }
    finally {
        Pop-Location
    }
}

$baselineRoot = Join-Path $output "baseline-preflight"
$baselineArgs = @(
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $preflight,
    "-WorldRoot", $world,
    "-ExpectedWorldCommit", $worldCommit,
    "-ArcRoot", $arc,
    "-EmbodiedArLabRoot", $embodied,
    "-UnityEditor", $unityPath,
    "-OutputRoot", $baselineRoot
)
$baselineExit = Invoke-Native "powershell.exe" $baselineArgs "Untouched-project baseline preflight" @(0, 2)
$baselineReceiptPath = Join-Path $baselineRoot "underdrain-unity6000-machine-preflight.json"
Require-File $baselineReceiptPath "Untouched-project baseline preflight receipt"
$baselineReceipt = Get-Content $baselineReceiptPath -Raw | ConvertFrom-Json
if ($baselineExit -eq 2) {
    $allowedAssetFailures = @("assets.files", "assets.meta", "assets.roots", "assets.extensions")
    $unexpected = @($baselineReceipt.checks | Where-Object { $_.blocking -eq $true -and $_.status -eq "fail" -and $allowedAssetFailures -notcontains $_.id })
    if ($unexpected.Count -gt 0) { throw "Baseline preflight is held outside the representation-asset plane: $(@($unexpected.id) -join ', ')." }
}
elseif ($baselineReceipt.status -ne "pass") {
    throw "Baseline preflight returned exit 0 without a pass receipt."
}

$extractionRoot = Join-Path $output "shine-extraction"
$extractArgs = @(
    $extractor,
    "--input", $shine,
    "--output", $extractionRoot,
    "--expected-sha256", $expectedShineSha
)
Invoke-Native $node $extractArgs "Exact Shine extraction" | Out-Null
$extractionReceipt = Join-Path $extractionRoot "shine-extraction.json"
Require-File $extractionReceipt "Shine extraction receipt"

$preparedRoot = Join-Path $output "resolved-representation"
$authorArgs = @(
    $author,
    "--extraction", $extractionReceipt,
    "--output", $preparedRoot,
    "--operator-id", $OperatorId
)
if ($null -ne $authoringSelectionPath) { $authorArgs += @("--selection", $authoringSelectionPath) }
if ($NoOpen) { $authorArgs += "--no-open" }
Invoke-Native $node $authorArgs "Local seven-role representation authoring" | Out-Null
$authoringReceipt = Join-Path $preparedRoot "representation-authoring-receipt.json"
$sourceManifest = Join-Path $preparedRoot "resolved-representation-source.json"
Require-File $authoringReceipt "Representation authoring receipt"
Require-File $sourceManifest "Resolved representation source manifest"
$authoring = Get-Content $authoringReceipt -Raw | ConvertFrom-Json
if ($authoring.status -ne "pass" -or $authoring.preparedRoleCount -ne 7 -or $authoring.distinctPreparedProductCount -ne 7) {
    throw "Representation authoring did not produce seven byte-distinct role products."
}

$materializationRoot = Join-Path $output "unity-materialization"
$materializerArgs = @(
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $materializer,
    "-WorldRoot", $world,
    "-ArcRoot", $arc,
    "-ExpectedWorldCommit", $worldCommit,
    "-ExpectedArcCommit", $arcCommit,
    "-EmbodiedArLabRoot", $embodied,
    "-SourceManifest", $sourceManifest,
    "-SourceRoot", $preparedRoot,
    "-OutputRoot", $materializationRoot,
    "-UnityVersion", $UnityVersion,
    "-UnityEditor", $unityPath
)
if ($ForceCloseUnity) { $materializerArgs += "-ForceCloseUnity" }
Invoke-Native "powershell.exe" $materializerArgs "Unity representation materialization and post-materialization preflight" | Out-Null

$materializationRunPath = Join-Path $materializationRoot "underdrain-representation-materialization-run.json"
Require-File $materializationRunPath "Representation materialization run receipt"
$materializationRun = Get-Content $materializationRunPath -Raw | ConvertFrom-Json
if ($materializationRun.status -ne "pass" -or $materializationRun.postMaterializationPreflight -ne "pass" -or $materializationRun.namedAssetReview -ne "open") {
    throw "Representation materialization did not open named asset review."
}

$stageReceipt = [ordered]@{
    format = "rodoh-underdrain-windows-representation-staging/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "pass"
    worldCommit = $worldCommit
    arcCommit = $arcCommit
    unityVersion = $UnityVersion
    projectRoot = $embodied
    machineLock = $lockPath
    machineLockSha256 = if ($null -ne $lockPath) { (Get-FileHash $lockPath -Algorithm SHA256).Hash.ToLowerInvariant() } else { $null }
    shineStandalone = $shine
    shineStandaloneSha256 = $shineSha
    baselinePreflightStatus = [string]$baselineReceipt.status
    baselinePreflightReceipt = $baselineReceiptPath
    baselinePreflightReceiptSha256 = (Get-FileHash $baselineReceiptPath -Algorithm SHA256).Hash.ToLowerInvariant()
    extractionReceipt = $extractionReceipt
    extractionReceiptSha256 = (Get-FileHash $extractionReceipt -Algorithm SHA256).Hash.ToLowerInvariant()
    authoringSelectionInput = $authoringSelectionPath
    authoringSelectionInputSha256 = if ($null -ne $authoringSelectionPath) { (Get-FileHash $authoringSelectionPath -Algorithm SHA256).Hash.ToLowerInvariant() } else { $null }
    authoringReceipt = $authoringReceipt
    authoringReceiptSha256 = (Get-FileHash $authoringReceipt -Algorithm SHA256).Hash.ToLowerInvariant()
    resolvedRepresentationManifest = $sourceManifest
    resolvedRepresentationManifestSha256 = (Get-FileHash $sourceManifest -Algorithm SHA256).Hash.ToLowerInvariant()
    materializationRunReceipt = $materializationRunPath
    materializationRunReceiptSha256 = (Get-FileHash $materializationRunPath -Algorithm SHA256).Hash.ToLowerInvariant()
    postMaterializationPreflight = "pass"
    postMaterializationPreflightReceipt = [string]$materializationRun.postMaterializationPreflightReceipt
    reviewScene = [string]$materializationRun.reviewScene
    preparedRoleCount = 7
    distinctPreparedProductCount = 7
    namedAssetReview = "open"
    approvalIssued = $false
    productAcceptance = "not-issued"
    authority = "local source preparation, Unity materialization, and read-only machine preflight only"
}
$stageReceiptPath = Join-Path $output "underdrain-windows-representation-staging.json"
$stageReceipt | ConvertTo-Json -Depth 20 | Set-Content -Encoding utf8 $stageReceiptPath
$stageReceiptSha = (Get-FileHash $stageReceiptPath -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -Encoding ascii -Path "$stageReceiptPath.sha256" -Value "$stageReceiptSha  $(Split-Path $stageReceiptPath -Leaf)"
@(
    "UNDERDRAIN Windows representation staging",
    "status: pass",
    "World: $worldCommit",
    "Arc: $arcCommit",
    "Unity: $UnityVersion",
    "prepared roles: 7 byte-distinct products",
    "post-materialization preflight: pass",
    "next gate: inspect Assets/AXM/Underdrain/Production/Review/UnderdrainRepresentationReview.unity and issue separate named approval only if acceptable",
    "approval issued: false",
    "product acceptance: not-issued",
    "receipt: $stageReceiptPath"
) | Set-Content -Encoding utf8 (Join-Path $output "underdrain-windows-representation-staging.txt")

Write-Host "UNDERDRAIN Windows representation staging passed."
Write-Host "Open the generated Unity review scene before issuing any named asset approval:"
Write-Host ([string]$materializationRun.reviewScene)
Write-Host $stageReceiptPath

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$EmbodiedArLabRoot,

    [Parameter(Mandatory = $true)]
    [string]$ArcRoot,

    [string]$AuthoredPresentationTemplate,
    [string]$ProductProfile,
    [string]$JobId = "underdrain-unity6000-player-v1",
    [string]$SessionId,
    [string]$DeviceId = "windows-local",
    [ValidateSet("low", "standard", "high")]
    [string]$InitialQuality = "standard",
    [string]$UnityVersion = "6000.0.66f2",
    [string]$UnityEditor,
    [switch]$ReducedMotion,
    [switch]$HighContrast,
    [switch]$SkipNpmInstall,
    [switch]$SkipUnityTests,
    [switch]$SkipWindowsBuild,
    [switch]$SkipWindowsSmoke,
    [switch]$DevelopmentBuild,
    [switch]$ForceCloseUnity
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-FullPath([string]$Value, [string]$Base) {
    if ([System.IO.Path]::IsPathRooted($Value)) { return [System.IO.Path]::GetFullPath($Value) }
    return [System.IO.Path]::GetFullPath((Join-Path $Base $Value))
}

function Invoke-CheckedPowerShell([string]$Script, [hashtable]$Parameters, [string]$Label) {
    $arguments = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $Script)
    foreach ($key in $Parameters.Keys) {
        $value = $Parameters[$key]
        if ($value -is [System.Management.Automation.SwitchParameter] -or $value -is [bool]) {
            if ([bool]$value) { $arguments += "-$key" }
        } elseif ($null -ne $value -and -not [string]::IsNullOrWhiteSpace([string]$value)) {
            $arguments += @("-$key", [string]$value)
        }
    }
    Write-Host $Label
    & powershell.exe @arguments
    if ($LASTEXITCODE -ne 0) { throw "$Label failed with exit $LASTEXITCODE." }
}

function Index-ByAssetId([object[]]$Assets, [string]$Label) {
    $index = @{}
    foreach ($asset in @($Assets)) {
        $id = [string]$asset.assetId
        if ([string]::IsNullOrWhiteSpace($id)) { throw "$Label contains an asset without an assetId." }
        if ($index.ContainsKey($id)) { throw "$Label contains duplicate assetId $id." }
        $index[$id] = $asset
    }
    return $index
}

$worldRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$projectRoot = Resolve-FullPath $EmbodiedArLabRoot (Get-Location).Path
$arcPath = Resolve-FullPath $ArcRoot (Get-Location).Path
if ([string]::IsNullOrWhiteSpace($AuthoredPresentationTemplate)) { $AuthoredPresentationTemplate = Join-Path $worldRoot "unity\Fixtures\underdrain.authored-presentation.template.json" }
if ([string]::IsNullOrWhiteSpace($ProductProfile)) { $ProductProfile = Join-Path $worldRoot "unity\Fixtures\underdrain.player-product.json" }
$templatePath = Resolve-FullPath $AuthoredPresentationTemplate $worldRoot
$profilePath = Resolve-FullPath $ProductProfile $worldRoot
foreach ($path in @($templatePath, $profilePath)) { if (-not (Test-Path $path)) { throw "UNDERDRAIN player-product input is absent: $path" } }
if ([string]::IsNullOrWhiteSpace($SessionId)) { $SessionId = $JobId }
if ([string]::IsNullOrWhiteSpace($UnityEditor)) { $UnityEditor = "C:\Program Files\Unity\Hub\Editor\$UnityVersion\Editor\Unity.exe" }
$unityPath = [System.IO.Path]::GetFullPath($UnityEditor)
if (-not (Test-Path $unityPath)) { throw "Unity Editor is absent: $unityPath" }

$worldCommit = (& git -C $worldRoot rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $worldCommit -notmatch '^[0-9a-f]{40}$') { throw "World checkout identity could not be resolved." }
if (& git -C $worldRoot status --porcelain) { throw "World checkout must be clean before production qualification." }

$jobRoot = Join-Path $projectRoot "local\scene-jobs\$JobId"
$outputRoot = Join-Path $jobRoot "output"
$trainRoot = Join-Path $outputRoot "player-train"
$intakeRoot = Join-Path $trainRoot "production-asset-intake"
$auditRoot = Join-Path $trainRoot "production-asset-audit"
New-Item -ItemType Directory -Force $intakeRoot, $auditRoot | Out-Null

$intakeScript = Join-Path $worldRoot "scripts\prepare-underdrain-production-assets.ps1"
$sourceTrainScript = Join-Path $worldRoot "scripts\run-underdrain-unity6000-player-train.ps1"
$auditScript = Join-Path $worldRoot "scripts\audit-underdrain-production-assets.ps1"
foreach ($script in @($intakeScript, $sourceTrainScript, $auditScript)) { if (-not (Test-Path $script)) { throw "Required UNDERDRAIN product script is absent: $script" } }

Invoke-CheckedPowerShell $intakeScript @{
    EmbodiedArLabRoot = $projectRoot
    PresentationManifest = $templatePath
    ProductProfile = $profilePath
    OutputRoot = $intakeRoot
    UnityVersion = $UnityVersion
    UnityEditor = $unityPath
    ForceCloseUnity = $ForceCloseUnity
} "Admitting the seven real UNDERDRAIN production prefabs through imported-source custody..."
$intakeRunPath = Join-Path $intakeRoot "production-asset-intake-run.json"
if (-not (Test-Path $intakeRunPath)) { throw "UNDERDRAIN production-asset intake run is absent: $intakeRunPath" }
$intake = Get-Content $intakeRunPath -Raw | ConvertFrom-Json
if ($intake.status -ne "pass" -or $intake.assetCount -ne 7 -or $intake.generatedPrimitive -ne $false -or $intake.activePhysicsAuthority -ne $false) { throw "UNDERDRAIN production-asset intake did not pass." }

Invoke-CheckedPowerShell $sourceTrainScript @{
    EmbodiedArLabRoot = $projectRoot
    ArcRoot = $arcPath
    AuthoredPresentationTemplate = $templatePath
    ProductProfile = $profilePath
    JobId = $JobId
    SessionId = $SessionId
    DeviceId = $DeviceId
    InitialQuality = $InitialQuality
    UnityVersion = $UnityVersion
    UnityEditor = $unityPath
    ReducedMotion = $ReducedMotion
    HighContrast = $HighContrast
    SkipNpmInstall = $SkipNpmInstall
    SkipUnityTests = $SkipUnityTests
    SkipWindowsBuild = $SkipWindowsBuild
    SkipWindowsSmoke = $SkipWindowsSmoke
    DevelopmentBuild = $DevelopmentBuild
    ForceCloseUnity = $ForceCloseUnity
} "Running exact Arc generation, Unity scene serialization, product qualification, and Windows build..."

$sourceTrainPath = Join-Path $trainRoot "underdrain-unity6000-player-train.json"
$productRunPath = Join-Path $outputRoot "player-product-run.json"
foreach ($path in @($sourceTrainPath, $productRunPath)) { if (-not (Test-Path $path)) { throw "UNDERDRAIN product train output is absent: $path" } }
$sourceTrain = Get-Content $sourceTrainPath -Raw | ConvertFrom-Json
$productRun = Get-Content $productRunPath -Raw | ConvertFrom-Json
if ($sourceTrain.status -ne "pass" -or $productRun.status -ne "pass" -or $productRun.buildEligible -ne $true) { throw "UNDERDRAIN source train or player-product qualification did not pass." }
if ($sourceTrain.worldCommit -ne $worldCommit -or $productRun.worldCommit -ne $worldCommit) { throw "UNDERDRAIN player product lost exact World commit custody." }
$effectivePresentationPath = [System.IO.Path]::GetFullPath([string]$productRun.presentationManifest)
if (-not (Test-Path $effectivePresentationPath)) { throw "Effective authored presentation manifest is absent: $effectivePresentationPath" }

Invoke-CheckedPowerShell $auditScript @{
    EmbodiedArLabRoot = $projectRoot
    PresentationManifest = $effectivePresentationPath
    ProductProfile = $profilePath
    OutputRoot = $auditRoot
    UnityVersion = $UnityVersion
    UnityEditor = $unityPath
    ForceCloseUnity = $ForceCloseUnity
} "Recomputing production-prefab source custody after serialized-scene qualification..."
$auditRunPath = Join-Path $auditRoot "production-asset-audit-run.json"
if (-not (Test-Path $auditRunPath)) { throw "UNDERDRAIN production-asset audit run is absent: $auditRunPath" }
$audit = Get-Content $auditRunPath -Raw | ConvertFrom-Json
if ($audit.status -ne "pass" -or $audit.assetCount -ne 7 -or $audit.exactSourceCustody -ne $true -or $audit.generatedPrimitive -ne $false -or $audit.activePhysicsAuthority -ne $false) { throw "UNDERDRAIN production-asset audit did not pass." }

$qualificationPath = [System.IO.Path]::GetFullPath([string]$productRun.qualificationReceipt)
if (-not (Test-Path $qualificationPath)) { throw "Player-product qualification receipt is absent: $qualificationPath" }
$qualification = Get-Content $qualificationPath -Raw | ConvertFrom-Json
$intakeById = Index-ByAssetId @($intake.sourceDigests) "Production-asset intake"
$auditById = Index-ByAssetId @($audit.assetReceipts) "Production-asset audit"
$productById = Index-ByAssetId @($qualification.assets) "Player-product qualification"
if ($intakeById.Count -ne 7 -or $auditById.Count -ne 7 -or $productById.Count -ne 7) { throw "Production-asset evidence planes do not each contain seven assets." }
foreach ($id in $auditById.Keys) {
    if (-not $intakeById.ContainsKey($id) -or -not $productById.ContainsKey($id)) { throw "Production asset $id is absent from one evidence plane." }
    $intakeAsset = $intakeById[$id]
    $auditAsset = $auditById[$id]
    $productAsset = $productById[$id]
    if ($intakeAsset.sourceSha256 -ne $auditAsset.computedSourceSha256 -or $productAsset.sourceSha256 -ne $auditAsset.computedSourceSha256) {
        throw "Production asset $id changed between intake, player-product qualification, and read-only audit."
    }
    if ($productAsset.prefabSha256 -ne $auditAsset.prefabSha256) { throw "Production prefab $id changed after player-product qualification." }
}

$buildRunPath = Join-Path $jobRoot "build\receipts\build-run-windows.json"
$buildRun = if (Test-Path $buildRunPath) { Get-Content $buildRunPath -Raw | ConvertFrom-Json } else { $null }
if (-not $SkipWindowsBuild -and ($null -eq $buildRun -or $buildRun.status -ne "pass" -or $buildRun.playerProductRequired -ne $true)) { throw "Qualified Windows player build did not pass." }

$receipt = [ordered]@{
    format = "rodoh-underdrain-unity6000-player-product-train/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "pass"
    productId = $productRun.productId
    worldCommit = $worldCommit
    arcCommit = $productRun.arcCommit
    unityVersion = $productRun.unityVersion
    projectRoot = $projectRoot
    jobId = $JobId
    sessionId = $SessionId
    actionSpecDigest = $productRun.actionSpecDigest
    arcDigest = $productRun.arcDigest
    challengeId = $productRun.challengeId
    timingProfileId = $productRun.timingProfileId
    presentationManifest = $effectivePresentationPath
    presentationManifestId = $productRun.presentationManifestId
    presentationManifestSha256 = $productRun.presentationManifestSha256
    scenePath = $productRun.scenePath
    sceneSha256 = $productRun.sceneSha256
    sceneJobDigest = $productRun.sceneJobDigest
    productProfile = $profilePath
    productProfileSha256 = $productRun.productProfileSha256
    presentationAdapterId = "production.prefab/v1"
    primitiveFallback = $false
    diagnosticPresentation = $false
    activePhysicsAuthority = $false
    productionAssetCount = 7
    productionAssetIds = @($productRun.productionAssetIds)
    productionAssetSourceDigests = @($audit.assetReceipts | ForEach-Object { [ordered]@{ assetId = $_.assetId; sourceSha256 = $_.computedSourceSha256; prefabSha256 = $_.prefabSha256; visualSourcePaths = $_.visualSourcePaths } })
    exactSourceCustody = $true
    exactCueParity = $sourceTrain.exactCueParity
    cameraCollision = $productRun.cameraCollision
    runtimeRebinding = $productRun.runtimeRebinding
    bindingProfileDigest = $productRun.bindingProfileDigest
    windowsBuild = if ($buildRun) { "pass" } else { "skipped" }
    windowsProduct = if ($buildRun) { $buildRun.product } else { $null }
    windowsProductSha256 = if ($buildRun) { $buildRun.productSha256 } else { $null }
    keyboardMouseSession = "open"
    gamepadSession = "open"
    independentComprehension = "open"
    namedPlayerProductAcceptance = "not-issued"
    questAcceptance = "open"
    productionAssetIntake = $intakeRunPath
    sourceTrainReceipt = $sourceTrainPath
    playerProductReceipt = $productRunPath
    playerProductQualification = $qualificationPath
    productionAssetAudit = $auditRunPath
    windowsBuildReceipt = if ($buildRun) { $buildRunPath } else { $null }
}
$receiptPath = Join-Path $trainRoot "underdrain-unity6000-player-product-train.json"
$receipt | ConvertTo-Json -Depth 30 | Set-Content -Encoding utf8 $receiptPath
$checksumPath = Join-Path $trainRoot "PLAYER_PRODUCT_SHA256SUMS"
Get-ChildItem $trainRoot -File -Recurse |
    Where-Object { $_.FullName -ne $checksumPath } |
    Sort-Object FullName |
    ForEach-Object {
        $relative = [IO.Path]::GetRelativePath($trainRoot, $_.FullName).Replace('\','/')
        $hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        "$hash  $relative"
    } | Set-Content -Encoding ascii $checksumPath

Write-Host "UNDERDRAIN Unity 6000 player product passed imported-source intake, exact Arc/C# law, serialized-scene qualification, read-only asset audit, and the requested Windows build boundary."
Write-Host "Keyboard/mouse, gamepad, independent comprehension, named acceptance, and Quest remain separate evidence gates."
Write-Host $receiptPath

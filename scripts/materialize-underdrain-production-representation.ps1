[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$EmbodiedArLabRoot,

    [Parameter(Mandatory = $true)]
    [string]$SourceManifest,

    [Parameter(Mandatory = $true)]
    [string]$SourceRoot,

    [string]$WorldRoot,
    [string]$ArcRoot,
    [string]$PresentationManifest,
    [string]$ProductProfile,
    [string]$OutputRoot,
    [string]$UnityVersion = "6000.0.66f2",
    [string]$UnityEditor,
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

if ([string]::IsNullOrWhiteSpace($WorldRoot)) { $WorldRoot = Join-Path $PSScriptRoot ".." }
$worldRoot = Resolve-FullPath $WorldRoot (Get-Location).Path
$projectRoot = Resolve-FullPath $EmbodiedArLabRoot (Get-Location).Path
$sourceManifestPath = Resolve-FullPath $SourceManifest (Get-Location).Path
$sourceRootPath = Resolve-FullPath $SourceRoot (Get-Location).Path
if ([string]::IsNullOrWhiteSpace($PresentationManifest)) { $PresentationManifest = Join-Path $worldRoot "unity\Fixtures\underdrain.authored-presentation.template.json" }
if ([string]::IsNullOrWhiteSpace($ProductProfile)) { $ProductProfile = Join-Path $worldRoot "unity\Fixtures\underdrain.player-product.json" }
$presentationPath = Resolve-FullPath $PresentationManifest $worldRoot
$profilePath = Resolve-FullPath $ProductProfile $worldRoot
if ([string]::IsNullOrWhiteSpace($OutputRoot)) { $OutputRoot = Join-Path $projectRoot "local\scene-jobs\underdrain-unity6000-player-v1\output\representation-materialization" }
$output = Resolve-FullPath $OutputRoot $projectRoot
if ([string]::IsNullOrWhiteSpace($UnityEditor)) { $UnityEditor = "C:\Program Files\Unity\Hub\Editor\$UnityVersion\Editor\Unity.exe" }
$unityPath = Resolve-FullPath $UnityEditor (Get-Location).Path

foreach ($directory in @("Assets", "Packages", "ProjectSettings")) {
    if (-not (Test-Path (Join-Path $projectRoot $directory) -PathType Container)) { throw "Embodied-AR-Lab $directory directory is absent: $projectRoot" }
}
foreach ($entry in @(@($sourceManifestPath, "Resolved representation source manifest"), @($presentationPath, "Authored presentation manifest"), @($profilePath, "Player-product profile"), @($unityPath, "Unity Editor"))) {
    Require-File $entry[0] $entry[1]
}
if (-not (Test-Path $sourceRootPath -PathType Container)) { throw "Resolved representation source root is absent: $sourceRootPath" }
$projectVersionPath = Join-Path $projectRoot "ProjectSettings\ProjectVersion.txt"
Require-File $projectVersionPath "Unity project-version file"
$projectVersion = [regex]::Match((Get-Content $projectVersionPath -Raw), '(?m)^m_EditorVersion:\s*(\S+)\s*$').Groups[1].Value
if ($projectVersion -ne $UnityVersion) { throw "Embodied-AR-Lab uses Unity '$projectVersion', expected '$UnityVersion'." }
if (& git -C $worldRoot status --porcelain) { throw "World checkout must be clean before representation materialization." }

$sourcePackage = Join-Path $worldRoot "unity\Packages\com.axm.rodoh-action"
$embeddedPackage = Join-Path $projectRoot "Packages\com.axm.rodoh-action"
Require-File (Join-Path $sourcePackage "package.json") "World Unity action package"
New-Item -ItemType Directory -Force $embeddedPackage, $output | Out-Null
& robocopy.exe $sourcePackage $embeddedPackage /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -gt 7) { throw "RODOH Unity package copy failed with robocopy exit $LASTEXITCODE." }

$unityProcesses = Get-Process Unity -ErrorAction SilentlyContinue
if ($unityProcesses) {
    if (-not $ForceCloseUnity) { throw "Unity Editor is running. Close it first or pass -ForceCloseUnity." }
    $unityProcesses | Stop-Process -Force
    Start-Sleep -Seconds 2
}

$logPath = Join-Path $output "unity-underdrain-representation-materialization.log"
$arguments = @(
    "-batchmode",
    "-nographics",
    "-quit",
    "-projectPath", $projectRoot,
    "-executeMethod", "Axm.Rodoh.Action.Editor.ActionUnderdrainRepresentationMaterializerBatch.Run",
    "-sourceManifest", $sourceManifestPath,
    "-sourceRoot", $sourceRootPath,
    "-presentation", $presentationPath,
    "-productProfile", $profilePath,
    "-assetRoot", "Assets/AXM/Underdrain/Production",
    "-outputRoot", $output,
    "-logFile", $logPath
)
Write-Host "Materializing the project-owned UNDERDRAIN 2.5D representation pack..."
$process = Start-Process -FilePath $unityPath -ArgumentList $arguments -Wait -PassThru -NoNewWindow
if ($process.ExitCode -ne 0) { throw "UNDERDRAIN representation materialization failed with exit $($process.ExitCode). See $logPath" }

$receiptPath = Join-Path $output "underdrain-representation-materialization.json"
Require-File $receiptPath "UNDERDRAIN representation materialization receipt"
$receipt = Get-Content $receiptPath -Raw | ConvertFrom-Json
if ($receipt.format -ne "rodoh-underdrain-representation-materialization/1" -or $receipt.status -ne "pass") { throw "UNDERDRAIN representation materialization did not pass: $($receipt.error)" }
if ($receipt.unityVersion -ne $UnityVersion -or $receipt.productionAssetCount -ne 7 -or $receipt.declaredBindingCount -ne 27 -or $receipt.uniqueDeclaredAssetCount -ne 23) { throw "UNDERDRAIN representation materialization lost Unity, core-asset, or declared-binding custody." }
if (@($receipt.feedbackPrefabs).Count -ne 7 -or @($receipt.audioClips).Count -ne 7 -or @($receipt.controllerParameters).Count -ne 14) { throw "UNDERDRAIN representation materialization lacks feedback, audio, or controller parameters." }
if ($receipt.actorColliderCount -ne 0 -or $receipt.activeRigidBodyCount -ne 0 -or $receipt.arenaCameraCollisionSurface -ne $true -or $receipt.generatedPrimitive -ne $false -or $receipt.gameplayAuthority -ne $false) { throw "UNDERDRAIN representation materialization crossed the actor-physics, primitive, or gameplay-authority boundary." }
if ($receipt.approvalIssued -ne $false -or $receipt.productAcceptance -ne "not-issued") { throw "Representation materialization crossed approval or product-acceptance authority." }

$preflightPath = $null
$preflightStatus = "not-run"
if (-not [string]::IsNullOrWhiteSpace($ArcRoot)) {
    $arcPath = Resolve-FullPath $ArcRoot (Get-Location).Path
    if (& git -C $arcPath status --porcelain) { throw "Arc checkout must be clean before real machine preflight." }
    $worldCommit = (& git -C $worldRoot rev-parse HEAD).Trim()
    $preflightRoot = Join-Path $output "preflight"
    & powershell.exe -NoProfile -ExecutionPolicy Bypass `
        -File (Join-Path $worldRoot "scripts\preflight-underdrain-unity6000-player-product.ps1") `
        -WorldRoot $worldRoot `
        -ExpectedWorldCommit $worldCommit `
        -ArcRoot $arcPath `
        -EmbodiedArLabRoot $projectRoot `
        -OutputRoot $preflightRoot
    if ($LASTEXITCODE -ne 0) { throw "Real project preflight remained held after representation materialization with exit $LASTEXITCODE." }
    $preflightPath = Join-Path $preflightRoot "underdrain-unity6000-machine-preflight.json"
    Require-File $preflightPath "Post-materialization machine preflight receipt"
    $preflight = Get-Content $preflightPath -Raw | ConvertFrom-Json
    if ($preflight.status -ne "pass" -or $preflight.machineReadyForNamedAssetReview -ne $true) { throw "Post-materialization machine preflight did not open named asset review." }
    $preflightStatus = "pass"
}

$worldSha = (& git -C $worldRoot rev-parse HEAD).Trim()
$run = [ordered]@{
    format = "rodoh-underdrain-representation-materialization-run/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "pass"
    worldCommit = $worldSha
    unityVersion = $UnityVersion
    projectRoot = $projectRoot
    sourceManifest = $sourceManifestPath
    sourceManifestSha256 = (Get-FileHash $sourceManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
    sourceRoot = $sourceRootPath
    materializationReceipt = $receiptPath
    materializationReceiptSha256 = (Get-FileHash $receiptPath -Algorithm SHA256).Hash.ToLowerInvariant()
    declaredBindingClosureSha256 = $receipt.declaredBindingClosureSha256
    productionAssetCount = $receipt.productionAssetCount
    declaredBindingCount = $receipt.declaredBindingCount
    uniqueDeclaredAssetCount = $receipt.uniqueDeclaredAssetCount
    reviewScene = $receipt.reviewScene
    postMaterializationPreflight = $preflightStatus
    postMaterializationPreflightReceipt = $preflightPath
    namedAssetReview = "open"
    approvalIssued = $false
    productAcceptance = "not-issued"
    authority = "representation materialization and optional read-only machine preflight only"
    unityLog = $logPath
}
$runPath = Join-Path $output "underdrain-representation-materialization-run.json"
$run | ConvertTo-Json -Depth 20 | Set-Content -Encoding utf8 $runPath
Write-Host "UNDERDRAIN representation materialization passed."
Write-Host $runPath

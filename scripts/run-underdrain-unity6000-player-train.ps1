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

$ExpectedArcCommit = "aaa5685903a348b3c1ba875622fbe99d90c1da35"
$ExpectedTimingProfile = "forgiving"

function Resolve-FullPath([string]$Value, [string]$Base) {
    if ([System.IO.Path]::IsPathRooted($Value)) { return [System.IO.Path]::GetFullPath($Value) }
    return [System.IO.Path]::GetFullPath((Join-Path $Base $Value))
}

function Invoke-Checked([string]$FilePath, [string[]]$Arguments, [string]$Label, [string]$LogPath) {
    Write-Host $Label
    New-Item -ItemType Directory -Force ([System.IO.Path]::GetDirectoryName($LogPath)) | Out-Null
    & $FilePath @Arguments 2>&1 | Tee-Object -FilePath $LogPath
    if ($LASTEXITCODE -ne 0) { throw "$Label failed with exit $LASTEXITCODE. See $LogPath" }
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

function Require-CleanExactGit([string]$Root, [string]$ExpectedCommit, [string]$Label) {
    if (-not (Test-Path (Join-Path $Root ".git"))) { throw "$Label is not a Git checkout: $Root" }
    $head = (& git -C $Root rev-parse HEAD).Trim()
    if ($LASTEXITCODE -ne 0 -or $head -ne $ExpectedCommit) { throw "$Label must be exactly $ExpectedCommit; found $head" }
    $dirty = (& git -C $Root status --porcelain)
    if ($LASTEXITCODE -ne 0) { throw "$Label Git status failed." }
    if ($dirty) { throw "$Label checkout is dirty. Commit, stash, or clean it before production qualification." }
}

function Require-ProjectAsset([string]$ProjectRoot, [string]$AssetPath, [string]$Label) {
    if ([string]::IsNullOrWhiteSpace($AssetPath) -or -not $AssetPath.Replace('\','/').StartsWith("Assets/")) { throw "$Label is not a project-owned Assets path: $AssetPath" }
    $full = Join-Path $ProjectRoot ($AssetPath -replace '/', '\')
    if (-not (Test-Path $full)) { throw "$Label is absent from Embodied-AR-Lab: $full" }
    return [System.IO.Path]::GetFullPath($full)
}

$worldRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$projectRoot = Resolve-FullPath $EmbodiedArLabRoot (Get-Location).Path
$arcPath = Resolve-FullPath $ArcRoot (Get-Location).Path
foreach ($directory in @("Assets", "Packages", "ProjectSettings")) {
    if (-not (Test-Path (Join-Path $projectRoot $directory))) { throw "Embodied-AR-Lab $directory directory is absent: $projectRoot" }
}
if ([string]::IsNullOrWhiteSpace($AuthoredPresentationTemplate)) { $AuthoredPresentationTemplate = Join-Path $worldRoot "unity\Fixtures\underdrain.authored-presentation.template.json" }
if ([string]::IsNullOrWhiteSpace($ProductProfile)) { $ProductProfile = Join-Path $worldRoot "unity\Fixtures\underdrain.player-product.json" }
$templatePath = Resolve-FullPath $AuthoredPresentationTemplate $worldRoot
$profilePath = Resolve-FullPath $ProductProfile $worldRoot
foreach ($path in @($templatePath, $profilePath)) { if (-not (Test-Path $path)) { throw "UNDERDRAIN player-train input is absent: $path" } }
if ([string]::IsNullOrWhiteSpace($SessionId)) { $SessionId = $JobId }
if ([string]::IsNullOrWhiteSpace($UnityEditor)) { $UnityEditor = "C:\Program Files\Unity\Hub\Editor\$UnityVersion\Editor\Unity.exe" }
$unityPath = [System.IO.Path]::GetFullPath($UnityEditor)
if (-not (Test-Path $unityPath)) { throw "Unity Editor is absent: $unityPath" }

$worldCommit = (& git -C $worldRoot rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $worldCommit -notmatch '^[0-9a-f]{40}$') { throw "World checkout identity could not be resolved." }
Require-CleanExactGit $worldRoot $worldCommit "World"
Require-CleanExactGit $arcPath $ExpectedArcCommit "Arc"

$template = Get-Content $templatePath -Raw | ConvertFrom-Json
$profile = Get-Content $profilePath -Raw | ConvertFrom-Json
if ($template.format -ne "rodoh-action-presentation-manifest/1" -or $template.themeId -ne "underdrain-bloom-below") { throw "Authored UNDERDRAIN presentation template is unsupported." }
if ($profile.format -ne "rodoh-action-player-product-profile/1" -or $profile.challengeId -ne "breach-crown-pump" -or $profile.timingProfileId -ne $ExpectedTimingProfile) { throw "UNDERDRAIN player-product profile is unsupported." }
if ($template.player.neutralFallback -ne $false -or $template.arena.neutralFallback -ne $false -or ($template.enemies | Where-Object { $_.neutralFallback -ne $false })) { throw "Authored UNDERDRAIN presentation still permits primitive fallback." }
$assetPaths = @(
    $template.player.bodyPrefab,
    $template.player.animatorController,
    $template.arena.recipe
)
$assetPaths += @($template.enemies | ForEach-Object { $_.bodyPrefab; $_.animatorController })
$assetPaths += @($template.feedback | ForEach-Object { $_.vfxPrefab; $_.audioClip })
foreach ($asset in ($assetPaths | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) } | Sort-Object -Unique)) {
    Require-ProjectAsset $projectRoot ([string]$asset) "Authored UNDERDRAIN production asset" | Out-Null
    foreach ($forbidden in @($profile.forbiddenAssetRoots)) {
        $root = ([string]$forbidden).Replace('\','/').TrimEnd('/')
        $value = ([string]$asset).Replace('\','/')
        if ($value -eq $root -or $value.StartsWith("$root/")) { throw "Authored UNDERDRAIN asset uses forbidden generated primitive custody: $value" }
    }
}

$jobRoot = Join-Path $projectRoot "local\scene-jobs\$JobId"
$inputRoot = Join-Path $jobRoot "input"
$outputRoot = Join-Path $jobRoot "output"
$logRoot = Join-Path $jobRoot "logs"
$trainRoot = Join-Path $outputRoot "player-train"
New-Item -ItemType Directory -Force $inputRoot, $outputRoot, $logRoot, $trainRoot | Out-Null
$arcReferencePath = Join-Path $inputRoot "underdrain.arc-reference.json"
$nativeSpecPath = Join-Path $inputRoot "underdrain.action-spec.json"
$unityProjectionPath = Join-Path $inputRoot "underdrain.unity-action-spec.json"
$effectivePresentationPath = Join-Path $inputRoot "underdrain.authored-presentation.json"
$cueParityPath = Join-Path $trainRoot "csharp-cue-parity.json"
$referenceCandidatePath = Join-Path $trainRoot "reference-unity-candidate.json"
$temporaryTool = Join-Path $arcPath "tools\world-build-action-player-spec.ts"
if (Test-Path $temporaryTool) { throw "Temporary World action-spec tool already exists in Arc custody: $temporaryTool" }

if (-not $SkipNpmInstall) {
    Invoke-Checked "npm.cmd" @("--prefix", $arcPath, "ci", "--no-audit", "--no-fund") "Installing exact Arc dependencies..." (Join-Path $logRoot "arc-npm-ci.log")
}

try {
    Invoke-Checked "npm.cmd" @(
        "--prefix", $arcPath,
        "run", "build:action-player-reference", "--",
        "--output", $arcReferencePath,
        "--timing-profile", $ExpectedTimingProfile
    ) "Generating the exact Arc action-player reference..." (Join-Path $logRoot "arc-reference.log")

    Copy-Item (Join-Path $worldRoot "unity\Conformance\build-action-player-spec.ts") $temporaryTool
    Push-Location $arcPath
    try {
        Invoke-Checked "npx.cmd" @(
            "vite-node", "tools/world-build-action-player-spec.ts",
            "--output", $nativeSpecPath,
            "--timing-profile", $ExpectedTimingProfile
        ) "Generating the exact selected Arc action specification..." (Join-Path $logRoot "arc-action-spec.log")
    } finally {
        Pop-Location
    }
} finally {
    if (Test-Path $temporaryTool) { Remove-Item -Force $temporaryTool }
}
if ((& git -C $arcPath status --porcelain)) { throw "Arc checkout is dirty after action-spec generation." }

Invoke-Checked "node.exe" @(
    (Join-Path $worldRoot "unity\Conformance\project-action-spec.mjs"),
    $nativeSpecPath,
    $unityProjectionPath
) "Projecting the exact Arc law into the C# receiver..." (Join-Path $logRoot "unity-projection.log")

Invoke-Checked "node.exe" @(
    (Join-Path $worldRoot "unity\Conformance\project-authored-action-presentation.mjs"),
    $nativeSpecPath,
    $templatePath,
    $effectivePresentationPath,
    $profilePath
) "Binding the authored UNDERDRAIN assets to the exact Arc specification..." (Join-Path $logRoot "authored-presentation.log")

Invoke-Checked "dotnet.exe" @(
    "run", "--project", (Join-Path $worldRoot "unity\Conformance\Axm.Rodoh.Action.Cues.csproj"), "--",
    $unityProjectionPath,
    $arcReferencePath,
    $cueParityPath,
    $referenceCandidatePath
) "Requiring exact Arc-to-C# semantic cue and candidate parity..." (Join-Path $logRoot "csharp-cue-parity.log")
$parity = Get-Content $cueParityPath -Raw | ConvertFrom-Json
if ($parity.status -ne "pass" -or $parity.exactCueParity -ne $true -or $parity.candidateTimingProfilePreserved -ne $true) { throw "C# semantic cue parity did not pass." }

$estateScript = Join-Path $worldRoot "scripts\run-unity-action-estate-v3.ps1"
$qualifierScript = Join-Path $worldRoot "scripts\qualify-unity-action-player-product.ps1"
$buildScript = Join-Path $worldRoot "scripts\build-unity-action-player.ps1"
foreach ($script in @($estateScript, $qualifierScript, $buildScript)) { if (-not (Test-Path $script)) { throw "Required UNDERDRAIN player-train script is absent: $script" } }

Invoke-CheckedPowerShell $estateScript @{
    EmbodiedArLabRoot = $projectRoot
    NativeActionSpec = $nativeSpecPath
    PresentationManifest = $effectivePresentationPath
    JobId = $JobId
    SessionId = $SessionId
    DeviceId = $DeviceId
    InitialQuality = $InitialQuality
    ReducedMotion = $ReducedMotion
    HighContrast = $HighContrast
    SkipUnityTests = $SkipUnityTests
    UnityVersion = $UnityVersion
    UnityEditor = $unityPath
    ForceCloseUnity = $ForceCloseUnity
} "Compiling, serializing, and polishing the authored UNDERDRAIN Unity 6000 scene..."

Invoke-CheckedPowerShell $qualifierScript @{
    EmbodiedArLabRoot = $projectRoot
    JobId = $JobId
    ProductProfile = $profilePath
    WorldCommit = $worldCommit
    ArcCommit = $ExpectedArcCommit
    PresentationManifest = $effectivePresentationPath
    UnityVersion = $UnityVersion
    UnityEditor = $unityPath
    ForceCloseUnity = $ForceCloseUnity
} "Qualifying authored assets, player controls, camera collision, cue coverage, and scene custody..."

$buildRunPath = $null
if (-not $SkipWindowsBuild) {
    Invoke-CheckedPowerShell $buildScript @{
        EmbodiedArLabRoot = $projectRoot
        JobId = $JobId
        Target = "windows"
        UnityVersion = $UnityVersion
        UnityEditor = $unityPath
        DevelopmentBuild = $DevelopmentBuild
        RequirePlayerProduct = $true
        SkipWindowsSmoke = $SkipWindowsSmoke
        ForceCloseUnity = $ForceCloseUnity
    } "Building the exact qualified Windows player..."
    $buildRunPath = Join-Path $jobRoot "build\receipts\build-run-windows.json"
    if (-not (Test-Path $buildRunPath)) { throw "Qualified Windows player build receipt is absent: $buildRunPath" }
}

$estateRun = Get-Content (Join-Path $outputRoot "local-run-v3.json") -Raw | ConvertFrom-Json
$productRunPath = Join-Path $outputRoot "player-product-run.json"
$productRun = Get-Content $productRunPath -Raw | ConvertFrom-Json
if ($estateRun.status -ne "pass" -or $productRun.status -ne "pass" -or $productRun.buildEligible -ne $true) { throw "UNDERDRAIN Unity player train contains a failing estate or product receipt." }
$buildRun = if ($buildRunPath) { Get-Content $buildRunPath -Raw | ConvertFrom-Json } else { $null }
if ($buildRun -and $buildRun.status -ne "pass") { throw "UNDERDRAIN Windows player build did not pass." }

$trainReceipt = [ordered]@{
    format = "rodoh-underdrain-unity6000-player-train/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "pass"
    worldCommit = $worldCommit
    arcCommit = $ExpectedArcCommit
    unityVersion = $UnityVersion
    projectRoot = $projectRoot
    jobId = $JobId
    sessionId = $SessionId
    actionSpecDigest = $productRun.actionSpecDigest
    arcDigest = $productRun.arcDigest
    challengeId = $productRun.challengeId
    timingProfileId = $productRun.timingProfileId
    cueParity = $cueParityPath
    exactCueParity = $parity.exactCueParity
    authoredPresentationTemplate = $templatePath
    authoredPresentation = $effectivePresentationPath
    presentationManifestId = $productRun.presentationManifestId
    productProfile = $profilePath
    productProfileSha256 = $productRun.productProfileSha256
    scenePath = $productRun.scenePath
    sceneSha256 = $productRun.sceneSha256
    productionAssetIds = $productRun.productionAssetIds
    primitiveFallback = $false
    diagnosticPresentation = $false
    activePhysicsAuthority = $false
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
    estateReceipt = Join-Path $outputRoot "local-run-v3.json"
    productReceipt = $productRunPath
    buildReceipt = $buildRunPath
}
$trainReceiptPath = Join-Path $trainRoot "underdrain-unity6000-player-train.json"
$trainReceipt | ConvertTo-Json -Depth 24 | Set-Content -Encoding utf8 $trainReceiptPath

$checksumPath = Join-Path $trainRoot "SHA256SUMS"
Get-ChildItem $trainRoot -File -Recurse |
    Where-Object { $_.FullName -ne $checksumPath } |
    Sort-Object FullName |
    ForEach-Object {
        $relative = [IO.Path]::GetRelativePath($trainRoot, $_.FullName).Replace('\','/')
        $hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        "$hash  $relative"
    } | Set-Content -Encoding ascii $checksumPath

Write-Host "UNDERDRAIN Unity 6000 player train passed its current machine boundary."
Write-Host "Real keyboard/mouse, gamepad, independent comprehension, named acceptance, and Quest receipts remain open."
Write-Host $trainReceiptPath

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$EmbodiedArLabRoot,

    [string]$ArcRepositoryRoot = "D:\Projects\axm-arc",
    [string]$JobId = "first-charter-action-001",
    [string]$SessionId = "first-charter-action-001",
    [string]$DeviceId = "unity-local",
    [ValidateSet("low", "standard", "high")]
    [string]$InitialQuality = "standard",
    [string]$TrackedHeadPath,
    [switch]$ReducedMotion,
    [switch]$HighContrast,
    [switch]$Quest,
    [ValidateSet("left", "right")]
    [string]$DominantHand = "right",
    [switch]$OneHanded,
    [switch]$NeutralPresentation,
    [string]$GovernedAssetRoot = "Assets/AXM/Generated/ActionProduction/GovernedV1",
    [switch]$DisableAdaptiveQuality,
    [switch]$BuildWindows,
    [switch]$BuildQuest,
    [switch]$InstallQuest,
    [string]$QuestSerial,
    [string]$Adb = "adb",
    [switch]$DevelopmentBuild,
    [switch]$SkipUnityTests,
    [string]$UnityVersion = "6000.0.66f2",
    [string]$UnityEditor,
    [switch]$ForceCloseUnity
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ArcActionAuthority = "6eef311836ee7cb3a43a94ce51f448a2699c3b04"

function Resolve-FullPath([string]$Value, [string]$Base) {
    if ([System.IO.Path]::IsPathRooted($Value)) { return [System.IO.Path]::GetFullPath($Value) }
    return [System.IO.Path]::GetFullPath((Join-Path $Base $Value))
}

function Invoke-Native([string]$FilePath, [string[]]$Arguments, [string]$WorkingDirectory, [string]$Label, [string]$LogPath) {
    Write-Host $Label
    Push-Location $WorkingDirectory
    try {
        & $FilePath @Arguments *>&1 | Tee-Object -FilePath $LogPath
        if ($LASTEXITCODE -ne 0) { throw "$Label failed with exit $LASTEXITCODE. See $LogPath" }
    } finally {
        Pop-Location
    }
}

function Get-GitText([string]$Repository, [string[]]$Arguments) {
    $value = & git.exe -C $Repository @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) { throw "git -C $Repository $($Arguments -join ' ') failed: $value" }
    return ([string]($value -join "`n")).Trim()
}

$worldRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$labRoot = Resolve-FullPath $EmbodiedArLabRoot (Get-Location).Path
$arcRepo = Resolve-FullPath $ArcRepositoryRoot (Get-Location).Path
foreach ($path in @($worldRoot, $labRoot, $arcRepo)) {
    if (-not (Test-Path $path)) { throw "Required root is absent: $path" }
}
foreach ($directory in @("Assets", "Packages", "ProjectSettings")) {
    if (-not (Test-Path (Join-Path $labRoot $directory))) { throw "Embodied-AR-Lab $directory directory is absent: $labRoot" }
}
if (-not (Test-Path (Join-Path $arcRepo ".git")) -and -not (Test-Path (Join-Path $arcRepo "HEAD"))) {
    throw "ArcRepositoryRoot is not a Git checkout: $arcRepo"
}

$worldHead = Get-GitText $worldRoot @("rev-parse", "HEAD")
if (Get-GitText $worldRoot @("status", "--porcelain")) { throw "World checkout must be clean before a local action run." }
& git.exe -C $arcRepo cat-file -e "$ArcActionAuthority^{commit}"
if ($LASTEXITCODE -ne 0) { throw "Arc repository does not contain action authority $ArcActionAuthority." }

$authorityParent = Join-Path $labRoot "local\action-authority"
$authorityRoot = Join-Path $authorityParent "axm-arc-$($ArcActionAuthority.Substring(0, 12))"
New-Item -ItemType Directory -Force $authorityParent | Out-Null
if (Test-Path $authorityRoot) {
    $authorityHead = Get-GitText $authorityRoot @("rev-parse", "HEAD")
    if ($authorityHead -ne $ArcActionAuthority) { throw "Existing authority worktree names $authorityHead instead of ${ArcActionAuthority}: $authorityRoot" }
    if (Get-GitText $authorityRoot @("status", "--porcelain")) { throw "Existing Arc authority worktree is dirty: $authorityRoot" }
} else {
    & git.exe -C $arcRepo worktree add --detach $authorityRoot $ArcActionAuthority
    if ($LASTEXITCODE -ne 0) { throw "Unable to create detached Arc authority worktree at $authorityRoot." }
}
if ((Get-GitText $authorityRoot @("rev-parse", "HEAD")) -ne $ArcActionAuthority) { throw "Arc authority worktree identity changed unexpectedly." }

$jobRoot = Join-Path $labRoot "local\scene-jobs\$JobId"
$authorityOutput = Join-Path $jobRoot "authority"
$inputRoot = Join-Path $jobRoot "input"
$logRoot = Join-Path $jobRoot "logs"
$outputRoot = Join-Path $jobRoot "output"
New-Item -ItemType Directory -Force $authorityOutput, $inputRoot, $logRoot, $outputRoot | Out-Null
$nativeSpec = Join-Path $authorityOutput "first-charter.action-spec.json"
$adapterReceipt = "$nativeSpec.receipt.json"
$sourcePresentation = Join-Path $authorityOutput "first-charter.presentation.json"
$adapterLog = Join-Path $logRoot "first-charter-action-spec.log"
$presentationLog = Join-Path $logRoot "first-charter-presentation.log"

$npm = (Get-Command npm.cmd -ErrorAction Stop).Source
$npx = (Get-Command npx.cmd -ErrorAction Stop).Source
$node = (Get-Command node.exe -ErrorAction Stop).Source
Invoke-Native $npm @("ci", "--no-audit", "--no-fund") $authorityRoot "Installing exact Arc authority dependencies..." (Join-Path $logRoot "arc-npm-ci.log")

$adapterSource = Join-Path $worldRoot "unity\Conformance\arc-real-action-spec-adapter.test.ts"
$adapterDestination = Join-Path $authorityRoot "tests\action\unity-real-action-spec.test.ts"
if (-not (Test-Path $adapterSource)) { throw "Real Arc adapter is absent: $adapterSource" }
if (Test-Path $adapterDestination) { throw "Temporary Arc adapter path is already occupied: $adapterDestination" }
try {
    Copy-Item $adapterSource $adapterDestination
    $previousSpecOut = $env:AXM_REAL_ACTION_SPEC_OUT
    $previousAuthority = $env:ARC_ACTION_AUTHORITY_SHA
    $env:AXM_REAL_ACTION_SPEC_OUT = $nativeSpec
    $env:ARC_ACTION_AUTHORITY_SHA = $ArcActionAuthority
    try {
        Invoke-Native $npx @("vitest", "run", "tests/action/unity-real-action-spec.test.ts", "--reporter=verbose") $authorityRoot "Compiling The First Charter / The Cellar through exact Arc authority..." $adapterLog
    } finally {
        $env:AXM_REAL_ACTION_SPEC_OUT = $previousSpecOut
        $env:ARC_ACTION_AUTHORITY_SHA = $previousAuthority
    }
} finally {
    Remove-Item $adapterDestination -Force -ErrorAction SilentlyContinue
}
if (Get-GitText $authorityRoot @("status", "--porcelain")) { throw "Arc authority worktree changed during action-spec compilation." }
foreach ($path in @($nativeSpec, $adapterReceipt)) { if (-not (Test-Path $path)) { throw "Exact Arc compilation output is absent: $path" } }
$adapter = Get-Content $adapterReceipt -Raw | ConvertFrom-Json
if ($adapter.status -ne "pass" -or $adapter.arcActionAuthorityCommit -ne $ArcActionAuthority) { throw "Arc adapter receipt did not bind the exact action authority." }

$presentationTemplate = Join-Path $worldRoot "unity\Fixtures\frog-pit.presentation.json"
$presentationProjector = Join-Path $worldRoot "unity\Conformance\project-presentation-manifest.mjs"
Invoke-Native $node @($presentationProjector, $nativeSpec, $presentationTemplate, $sourcePresentation) $worldRoot "Binding the source presentation floor to the exact First Charter spec..." $presentationLog
$sourcePresentationValue = Get-Content $sourcePresentation -Raw | ConvertFrom-Json
if ($sourcePresentationValue.sourceActionSpecDigest -ne $adapter.actionSpecDigest) { throw "Projected presentation does not bind the exact action spec." }

$estateScript = Join-Path $worldRoot "scripts\run-unity-action-estate-v3.ps1"
$estateParameters = @{
    EmbodiedArLabRoot = $labRoot
    NativeActionSpec = $nativeSpec
    PresentationManifest = $sourcePresentation
    JobId = $JobId
    SessionId = $SessionId
    DeviceId = $DeviceId
    InitialQuality = $InitialQuality
    TrackedHeadPath = $TrackedHeadPath
    ReducedMotion = $ReducedMotion
    HighContrast = $HighContrast
    Quest = $Quest
    DominantHand = $DominantHand
    OneHanded = $OneHanded
    GovernedProduction = -not $NeutralPresentation
    GovernedAssetRoot = $GovernedAssetRoot
    DisableAdaptiveQuality = $DisableAdaptiveQuality
    SkipUnityTests = $SkipUnityTests
    UnityVersion = $UnityVersion
    UnityEditor = $UnityEditor
    ForceCloseUnity = $ForceCloseUnity
}
& $estateScript @estateParameters
if ($LASTEXITCODE -ne 0) { throw "Unity action estate v3 failed with exit $LASTEXITCODE." }
$v3ReceiptPath = Join-Path $outputRoot "local-run-v3.json"
if (-not (Test-Path $v3ReceiptPath)) { throw "Unity v3 receipt is absent: $v3ReceiptPath" }
$v3 = Get-Content $v3ReceiptPath -Raw | ConvertFrom-Json
if ($v3.status -ne "pass" -or $v3.actionSpecDigest -ne $adapter.actionSpecDigest) { throw "Unity v3 receipt does not accept the exact First Charter action spec." }
if (-not $NeutralPresentation) {
    if ($v3.governedProduction -ne $true) { throw "The First Charter run did not enable governed production assets." }
    if ([string]::IsNullOrWhiteSpace([string]$v3.governedProductionReceipt) -or -not (Test-Path $v3.governedProductionReceipt)) { throw "Governed production receipt is absent." }
}
$effectivePresentation = [string]$v3.presentationManifest
if ([string]::IsNullOrWhiteSpace($effectivePresentation) -or -not (Test-Path $effectivePresentation)) { throw "Unity v3 receipt did not retain the effective presentation manifest." }
$effectivePresentationValue = Get-Content $effectivePresentation -Raw | ConvertFrom-Json
if ($effectivePresentationValue.sourceActionSpecDigest -ne $adapter.actionSpecDigest) { throw "Effective presentation manifest lost the exact action-spec identity." }

$windowsReceiptPath = $null
if ($BuildWindows) {
    $windowsScript = Join-Path $worldRoot "scripts\build-unity-action-player.ps1"
    & $windowsScript -EmbodiedArLabRoot $labRoot -JobId $JobId -Target windows -UnityVersion $UnityVersion -UnityEditor $UnityEditor -DevelopmentBuild:$DevelopmentBuild -ForceCloseUnity:$ForceCloseUnity
    if ($LASTEXITCODE -ne 0) { throw "Windows action-player build failed with exit $LASTEXITCODE." }
    $windowsReceiptPath = Join-Path $jobRoot "build\receipts\build-run-windows.json"
    if (-not (Test-Path $windowsReceiptPath)) { throw "Windows build receipt is absent: $windowsReceiptPath" }
}

$questReceiptPath = $null
if ($BuildQuest -or $InstallQuest) {
    $questScript = Join-Path $worldRoot "scripts\build-unity-action-quest.ps1"
    & $questScript -EmbodiedArLabRoot $labRoot -JobId $JobId -TrackedHeadPath $TrackedHeadPath -DominantHand $DominantHand -OneHanded:$OneHanded -UnityVersion $UnityVersion -UnityEditor $UnityEditor -DevelopmentBuild:$DevelopmentBuild -Install:$InstallQuest -QuestSerial $QuestSerial -Adb $Adb -ForceCloseUnity:$ForceCloseUnity
    if ($LASTEXITCODE -ne 0) { throw "Quest action-player build failed with exit $LASTEXITCODE." }
    $questReceiptPath = Join-Path $jobRoot "build\receipts\quest-build-run.json"
    if (-not (Test-Path $questReceiptPath)) { throw "Quest build receipt is absent: $questReceiptPath" }
}

$receipt = [ordered]@{
    format = "rodoh-first-charter-action-local-run/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "pass"
    worldCommit = $worldHead
    arcActionAuthorityCommit = $ArcActionAuthority
    arcAuthorityWorktree = $authorityRoot
    arcDigest = $adapter.arcDigest
    challengeId = $adapter.challengeId
    actionSpecDigest = $adapter.actionSpecDigest
    nativeActionSpec = $nativeSpec
    nativeActionSpecSha256 = (Get-FileHash $nativeSpec -Algorithm SHA256).Hash.ToLowerInvariant()
    adapterReceipt = $adapterReceipt
    sourcePresentationManifest = $sourcePresentation
    sourcePresentationManifestSha256 = (Get-FileHash $sourcePresentation -Algorithm SHA256).Hash.ToLowerInvariant()
    presentationManifest = $effectivePresentation
    presentationManifestSha256 = (Get-FileHash $effectivePresentation -Algorithm SHA256).Hash.ToLowerInvariant()
    presentationManifestId = $effectivePresentationValue.manifestId
    governedProduction = -not [bool]$NeutralPresentation
    governedProductionReceipt = $v3.governedProductionReceipt
    unityEstateReceipt = $v3ReceiptPath
    windowsBuildReceipt = $windowsReceiptPath
    questBuildReceipt = $questReceiptPath
    unityVersion = $UnityVersion
    jobId = $JobId
    sessionId = $SessionId
    deviceId = $DeviceId
}
$receiptPath = Join-Path $outputRoot "first-charter-local-run.json"
$receipt | ConvertTo-Json -Depth 10 | Set-Content -Encoding utf8 $receiptPath
Write-Host "First Charter action estate passed."
Write-Host $receiptPath

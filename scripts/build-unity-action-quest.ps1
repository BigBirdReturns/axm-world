[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$EmbodiedArLabRoot,

    [Parameter(Mandatory = $true)]
    [string]$JobId,

    [string]$TrackedHeadPath,
    [ValidateSet("left", "right")]
    [string]$DominantHand = "right",
    [switch]$OneHanded,
    [string]$UnityVersion = "6000.0.66f2",
    [string]$UnityEditor,
    [switch]$DevelopmentBuild,
    [switch]$Install,
    [string]$QuestSerial,
    [string]$Adb = "adb",
    [switch]$ForceCloseUnity
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-FullPath([string]$Value, [string]$Base) {
    if ([System.IO.Path]::IsPathRooted($Value)) { return [System.IO.Path]::GetFullPath($Value) }
    return [System.IO.Path]::GetFullPath((Join-Path $Base $Value))
}

function Invoke-CheckedScript([string]$Script, [hashtable]$Parameters, [string]$Label) {
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

$worldRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$projectRoot = Resolve-FullPath $EmbodiedArLabRoot (Get-Location).Path
$prepareScript = Join-Path $worldRoot "scripts\prepare-unity-action-quest.ps1"
$buildScript = Join-Path $worldRoot "scripts\build-unity-action-player.ps1"
foreach ($script in @($prepareScript, $buildScript)) { if (-not (Test-Path $script)) { throw "Required action script is absent: $script" } }

Invoke-CheckedScript $prepareScript @{
    EmbodiedArLabRoot = $projectRoot
    JobId = $JobId
    TrackedHeadPath = $TrackedHeadPath
    DominantHand = $DominantHand
    OneHanded = $OneHanded
    UnityVersion = $UnityVersion
    UnityEditor = $UnityEditor
    ForceCloseUnity = $ForceCloseUnity
} "Preparing the generated action estate for Quest and OpenXR..."

Invoke-CheckedScript $buildScript @{
    EmbodiedArLabRoot = $projectRoot
    JobId = $JobId
    Target = "quest"
    UnityVersion = $UnityVersion
    UnityEditor = $UnityEditor
    DevelopmentBuild = $DevelopmentBuild
    SkipWindowsSmoke = $true
    ForceCloseUnity = $ForceCloseUnity
} "Building the exact Quest APK..."

$jobRoot = Join-Path $projectRoot "local\scene-jobs\$JobId"
$outputRoot = Join-Path $jobRoot "output"
$buildReceiptPath = Join-Path $jobRoot "build\receipts\build-run-quest.json"
$prepareReceiptPath = Join-Path $outputRoot "quest-prepare-run.json"
if (-not (Test-Path $buildReceiptPath)) { throw "Quest build-run receipt is absent: $buildReceiptPath" }
if (-not (Test-Path $prepareReceiptPath)) { throw "Quest prepare receipt is absent: $prepareReceiptPath" }
$buildReceipt = Get-Content $buildReceiptPath -Raw | ConvertFrom-Json
$prepareReceipt = Get-Content $prepareReceiptPath -Raw | ConvertFrom-Json
if ($buildReceipt.status -ne "pass" -or $prepareReceipt.status -ne "pass") { throw "Quest preparation or build did not pass." }
$applicationIdentifier = [string]$buildReceipt.applicationIdentifier
if ([string]::IsNullOrWhiteSpace($applicationIdentifier)) { throw "Quest build receipt does not name its Android application identifier." }
$apk = [System.IO.Path]::GetFullPath([string]$buildReceipt.product)
if (-not (Test-Path $apk)) { throw "Quest APK is absent: $apk" }
$remoteSpoolRoot = "/sdcard/Android/data/$applicationIdentifier/files/axm-action-session-spool"

$installation = "not-requested"
$device = $null
if ($Install) {
    $adbCommand = (Get-Command $Adb -ErrorAction Stop).Source
    $adbArguments = @()
    if (-not [string]::IsNullOrWhiteSpace($QuestSerial)) { $adbArguments += @("-s", $QuestSerial) }
    & $adbCommand @($adbArguments + @("get-state"))
    if ($LASTEXITCODE -ne 0) { throw "Quest ADB connectivity check failed." }
    $device = (& $adbCommand @($adbArguments + @("shell", "getprop", "ro.product.model"))).Trim()
    if ($LASTEXITCODE -ne 0) { throw "Unable to read Quest device model." }
    Write-Host "Installing the exact action APK on $device..."
    & $adbCommand @($adbArguments + @("install", "-r", "-d", $apk))
    if ($LASTEXITCODE -ne 0) { throw "Quest APK installation failed with exit $LASTEXITCODE." }
    $installation = "pass"
}

$receipt = [ordered]@{
    format = "rodoh-unity-action-quest-build-run/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "pass"
    projectRoot = $projectRoot
    jobId = $JobId
    scenePath = $prepareReceipt.scenePath
    actionSpecDigest = $buildReceipt.actionSpecDigest
    sceneJob = $buildReceipt.sceneJob
    applicationIdentifier = $applicationIdentifier
    remoteSpoolRoot = $remoteSpoolRoot
    apk = $apk
    apkSha256 = $buildReceipt.productSha256
    apkBytes = $buildReceipt.totalBytes
    developmentBuild = [bool]$DevelopmentBuild
    installed = $installation
    questSerial = if ($Install) { $QuestSerial } else { $null }
    questModel = $device
    dominantHand = $DominantHand
    oneHanded = [bool]$OneHanded
    prepareReceipt = $prepareReceiptPath
    buildReceipt = $buildReceiptPath
}
$receiptPath = Join-Path $jobRoot "build\receipts\quest-build-run.json"
$receipt | ConvertTo-Json -Depth 10 | Set-Content -Encoding utf8 $receiptPath
Write-Host "RODOH Quest action build passed."
Write-Host $receiptPath

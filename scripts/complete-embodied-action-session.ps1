[CmdletBinding(DefaultParameterSetName = "Local")]
param(
    [string]$ArcRoot,

    [Parameter(Mandatory = $true)]
    [string]$AxmEmbodiedRoot,

    [string]$NativeActionSpec,
    [string]$FirstCharterRunReceipt,

    [Parameter(Mandatory = $true)]
    [string]$JournalPath,

    [Parameter(Mandatory = $true, ParameterSetName = "Local")]
    [string]$SpoolPath,

    [Parameter(Mandatory = $true, ParameterSetName = "Quest")]
    [string]$RemoteSpoolPath,

    [Parameter(ParameterSetName = "Quest")]
    [string]$QuestSerial,

    [Parameter(ParameterSetName = "Quest")]
    [string]$Adb = "adb",

    [string]$PullRoot,
    [string]$Python,
    [string]$ArcActionAuthorityCommit = "6eef311836ee7cb3a43a94ce51f448a2699c3b04",
    [switch]$InstallArcDependencies,
    [switch]$KeepPulledSpool
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-FullPath([string]$Value, [string]$Base) {
    if ([System.IO.Path]::IsPathRooted($Value)) { return [System.IO.Path]::GetFullPath($Value) }
    return [System.IO.Path]::GetFullPath((Join-Path $Base $Value))
}

function Invoke-CheckedScript([string]$ScriptPath, [hashtable]$Arguments, [string]$Label) {
    Write-Host $Label
    $parameterList = @()
    foreach ($key in $Arguments.Keys) {
        $value = $Arguments[$key]
        if ($value -is [switch] -or $value -is [System.Management.Automation.SwitchParameter]) {
            if ([bool]$value) { $parameterList += "-$key" }
        } elseif ($null -ne $value -and -not [string]::IsNullOrWhiteSpace([string]$value)) {
            $parameterList += @("-$key", [string]$value)
        }
    }
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $ScriptPath @parameterList
    if ($LASTEXITCODE -ne 0) { throw "$Label failed with exit $LASTEXITCODE." }
}

function Invoke-GitText([string]$Repository, [string[]]$Arguments) {
    $value = & git.exe -C $Repository @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) { throw "git -C $Repository $($Arguments -join ' ') failed: $value" }
    return ([string]($value -join "`n")).Trim()
}

$worldRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$embodied = Resolve-FullPath $AxmEmbodiedRoot (Get-Location).Path
$journal = Resolve-FullPath $JournalPath (Get-Location).Path
$localRun = $null
$localRunReceiptPath = $null
if (-not [string]::IsNullOrWhiteSpace($FirstCharterRunReceipt)) {
    $localRunReceiptPath = Resolve-FullPath $FirstCharterRunReceipt (Get-Location).Path
    if (-not (Test-Path $localRunReceiptPath)) { throw "First Charter local-run receipt is absent: $localRunReceiptPath" }
    $localRun = Get-Content $localRunReceiptPath -Raw | ConvertFrom-Json
    if ($localRun.format -ne "rodoh-first-charter-action-local-run/1" -or $localRun.status -ne "pass") {
        throw "First Charter local-run receipt is not an accepted rodoh-first-charter-action-local-run/1 record."
    }
    if ($localRun.arcActionAuthorityCommit -ne $ArcActionAuthorityCommit) {
        throw "First Charter local-run receipt names Arc authority $($localRun.arcActionAuthorityCommit), expected $ArcActionAuthorityCommit."
    }
    if ([string]::IsNullOrWhiteSpace($ArcRoot)) { $ArcRoot = [string]$localRun.arcAuthorityWorktree }
    if ([string]::IsNullOrWhiteSpace($NativeActionSpec)) { $NativeActionSpec = [string]$localRun.nativeActionSpec }
}
if ([string]::IsNullOrWhiteSpace($ArcRoot)) { throw "ArcRoot is required unless FirstCharterRunReceipt supplies the exact authority worktree." }
if ([string]::IsNullOrWhiteSpace($NativeActionSpec)) { throw "NativeActionSpec is required unless FirstCharterRunReceipt supplies the exact spec." }

$arc = Resolve-FullPath $ArcRoot (Get-Location).Path
$spec = Resolve-FullPath $NativeActionSpec (Get-Location).Path
if (-not (Test-Path (Join-Path $arc ".git"))) { throw "Arc checkout is absent: $arc" }
if (-not (Test-Path (Join-Path $embodied "src\axm_embodied\action_spool.py"))) { throw "axm-embodied action spool module is absent: $embodied" }
if (-not (Test-Path $spec)) { throw "Native action spec is absent: $spec" }
$arcHead = Invoke-GitText $arc @("rev-parse", "HEAD")
if ($arcHead -ne $ArcActionAuthorityCommit) { throw "Arc replay checkout is $arcHead, expected action authority $ArcActionAuthorityCommit." }
if (Invoke-GitText $arc @("status", "--porcelain")) { throw "Arc replay checkout must be clean: $arc" }

$specValue = Get-Content $spec -Raw | ConvertFrom-Json
if ($specValue.format -ne "axm-action-spec/1" -or [string]$specValue.specDigest -notmatch '^actspec1_[0-9a-f]{64}$') {
    throw "Native action spec is not a digest-bound axm-action-spec/1 record."
}
$specSha256 = (Get-FileHash $spec -Algorithm SHA256).Hash.ToLowerInvariant()
if ($null -ne $localRun) {
    if ($localRun.actionSpecDigest -ne $specValue.specDigest) { throw "First Charter local-run receipt names a different action-spec digest." }
    if ($localRun.nativeActionSpecSha256 -ne $specSha256) { throw "Native action spec bytes differ from the First Charter local-run receipt." }
}
if ([string]::IsNullOrWhiteSpace($Python)) { $Python = (Get-Command python -ErrorAction Stop).Source }

$ingestScript = Join-Path $embodied "scripts\ingest-rodoh-action-session.ps1"
if (-not (Test-Path $ingestScript)) { throw "axm-embodied ingestion runner is absent: $ingestScript" }
$ingestArguments = @{
    JournalPath = $journal
    Python = $Python
}
$effectiveSpool = $null
if ($PSCmdlet.ParameterSetName -eq "Quest") {
    $ingestArguments.RemoteSpoolPath = $RemoteSpoolPath
    $ingestArguments.Adb = $Adb
    $ingestArguments.QuestSerial = $QuestSerial
    $ingestArguments.PullRoot = $PullRoot
    $ingestArguments.KeepPulledSpool = $KeepPulledSpool
    if ([string]::IsNullOrWhiteSpace($PullRoot)) { $PullRoot = Join-Path $embodied "local\quest-action-spools" }
    $sessionName = [System.IO.Path]::GetFileName($RemoteSpoolPath.TrimEnd('/', '\'))
    if ([string]::IsNullOrWhiteSpace($sessionName)) { $sessionName = "quest-action-session" }
    $effectiveSpool = Join-Path (Resolve-FullPath $PullRoot $embodied) $sessionName
} else {
    $effectiveSpool = Resolve-FullPath $SpoolPath (Get-Location).Path
    $ingestArguments.SpoolPath = $effectiveSpool
}

Invoke-CheckedScript $ingestScript $ingestArguments "Ingesting the physical Unity or Quest session..."
if (-not (Test-Path $effectiveSpool)) { throw "Effective action spool is absent after ingestion: $effectiveSpool" }

$candidateEntries = @()
Get-ChildItem (Join-Path $effectiveSpool "entries") -Filter "*.entry.json" -File | Sort-Object Name | ForEach-Object {
    $entry = Get-Content $_.FullName -Raw | ConvertFrom-Json
    if ($entry.kind -eq "action_candidate") {
        $candidateEntries += [pscustomobject]@{ Entry = $_.FullName; Value = $entry }
    }
}
if ($candidateEntries.Count -ne 1) { throw "Expected exactly one action_candidate spool entry; found $($candidateEntries.Count)." }
$candidateRelative = [string]$candidateEntries[0].Value.payloadFile
$candidatePath = [System.IO.Path]::GetFullPath((Join-Path $effectiveSpool $candidateRelative))
$spoolRootFull = [System.IO.Path]::GetFullPath($effectiveSpool).TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
if (-not $candidatePath.StartsWith($spoolRootFull, [System.StringComparison]::OrdinalIgnoreCase)) { throw "Candidate payload escapes the action spool root." }
if (-not (Test-Path $candidatePath)) { throw "Candidate payload is absent: $candidatePath" }
$candidateValue = Get-Content $candidatePath -Raw | ConvertFrom-Json
if ($candidateValue.format -ne "rodoh-action-execution-candidate/1") { throw "Spool candidate format is unsupported." }
if ($candidateValue.authority -ne "Arc replay required") { throw "Spool candidate claims unsupported action authority." }
if ($candidateValue.actionSpecDigest -ne $specValue.specDigest) { throw "Spool candidate names a different action-spec digest." }

$replayRoot = Join-Path $journal "arc-replay"
$replayScript = Join-Path $worldRoot "scripts\replay-unity-action-candidate.ps1"
$replayArguments = @{
    ArcRoot = $arc
    NativeActionSpec = $spec
    Candidate = $candidatePath
    OutputRoot = $replayRoot
    ArcActionAuthorityCommit = $ArcActionAuthorityCommit
    InstallDependencies = $InstallArcDependencies
}
Invoke-CheckedScript $replayScript $replayArguments "Replaying the candidate through exact Arc action authority..."
$acceptedReceipt = Join-Path $replayRoot "accepted-action-receipt.json"
$reconciliation = Join-Path $replayRoot "result-reconciliation.json"
if (-not (Test-Path $acceptedReceipt)) { throw "Accepted Arc receipt is absent: $acceptedReceipt" }
if (-not (Test-Path $reconciliation)) { throw "Action reconciliation receipt is absent: $reconciliation" }

$priorPythonPath = $env:PYTHONPATH
try {
    $env:PYTHONPATH = if ([string]::IsNullOrWhiteSpace($priorPythonPath)) {
        Join-Path $embodied "src"
    } else {
        (Join-Path $embodied "src") + [System.IO.Path]::PathSeparator + $priorPythonPath
    }
    & $Python -m axm_embodied.action_session attach-receipt $journal $acceptedReceipt
    if ($LASTEXITCODE -ne 0) { throw "Attaching the Arc receipt to the embodied journal failed with exit $LASTEXITCODE." }
    & $Python -m axm_embodied.action_session verify $journal
    if ($LASTEXITCODE -ne 0) { throw "Final embodied journal verification failed with exit $LASTEXITCODE." }
    $shardPath = Join-Path $journal "genesis-shard.json"
    & $Python -m axm_embodied.action_session shard $journal --output $shardPath
    if ($LASTEXITCODE -ne 0) { throw "Genesis-facing shard projection failed with exit $LASTEXITCODE." }
} finally {
    $env:PYTHONPATH = $priorPythonPath
}

$reconciliationValue = Get-Content $reconciliation -Raw | ConvertFrom-Json
$runReceipt = [ordered]@{
    format = "rodoh-embodied-action-session-completion/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "pass"
    source = if ($PSCmdlet.ParameterSetName -eq "Quest") { "quest-adb" } else { "local-spool" }
    firstCharterRunReceipt = $localRunReceiptPath
    worldCommit = if ($null -eq $localRun) { $null } else { $localRun.worldCommit }
    effectiveSpool = $effectiveSpool
    journal = $journal
    arcActionAuthorityCommit = $ArcActionAuthorityCommit
    nativeActionSpec = $spec
    nativeActionSpecSha256 = $specSha256
    actionSpecDigest = $specValue.specDigest
    candidate = $candidatePath
    candidateSha256 = (Get-FileHash $candidatePath -Algorithm SHA256).Hash.ToLowerInvariant()
    acceptedReceipt = $acceptedReceipt
    reconciliation = $reconciliation
    provisionalParity = $reconciliationValue.provisionalParity
    resolution = $reconciliationValue.resolution
    genesisShard = $shardPath
}
$receiptPath = Join-Path $journal "completion-run.json"
$runReceipt | ConvertTo-Json -Depth 10 | Set-Content -Encoding utf8 $receiptPath
Write-Host "RODOH embodied action session completed through Arc receipt custody."
Write-Host $receiptPath

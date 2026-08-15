[CmdletBinding()]
param(
    [string]$OutputRoot
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Json([string]$Path, [object]$Value) {
    New-Item -ItemType Directory -Force ([System.IO.Path]::GetDirectoryName($Path)) | Out-Null
    $Value | ConvertTo-Json -Depth 80 | Set-Content -Encoding utf8 $Path
}

function Sha([string]$Path) {
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Invoke-Starter(
    [string]$Name,
    [hashtable]$Parameters,
    [int]$ExpectedExit,
    [string]$ExpectedStatus,
    [string]$FixtureScripts
) {
    $caseRoot = Join-Path $OutputRoot $Name
    New-Item -ItemType Directory -Force $caseRoot | Out-Null
    $arguments = [System.Collections.ArrayList]::new()
    foreach ($value in @(
        "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
        "-File", (Join-Path $FixtureScripts "start-underdrain-target-host.ps1")
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
        throw "$Name starter exit was $exitCode, expected $ExpectedExit."
    }
    $receiptPath = Join-Path $caseRoot "underdrain-target-host-start.json"
    if (-not (Test-Path -LiteralPath $receiptPath -PathType Leaf)) {
        throw "$Name starter receipt is absent."
    }
    $receipt = Get-Content -LiteralPath $receiptPath -Raw | ConvertFrom-Json
    if ($receipt.format -ne "rodoh-underdrain-target-host-start/1") {
        throw "$Name starter format is unsupported."
    }
    if ($receipt.status -ne $ExpectedStatus) {
        throw "$Name starter status was $($receipt.status), expected $ExpectedStatus."
    }
    if ($receipt.authority.directUnityAuthority -ne $false -or
        $receipt.authority.reviewAuthority -ne $false -or
        $receipt.authority.productAcceptanceAuthority -ne $false -or
        $receipt.authority.humanOrHouseholdAcceptanceAuthority -ne $false -or
        $receipt.authority.questAuthority -ne $false -or
        $receipt.authority.physicalAcceptanceAuthority -ne $false) {
        throw "$Name starter crossed its authority boundary."
    }
    return $receipt
}

if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    $OutputRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("underdrain-target-host-starter-" + [Guid]::NewGuid().ToString("N"))
}
$OutputRoot = [System.IO.Path]::GetFullPath($OutputRoot)
if (Test-Path -LiteralPath $OutputRoot) { Remove-Item -LiteralPath $OutputRoot -Recurse -Force }
New-Item -ItemType Directory -Force $OutputRoot | Out-Null

# Reuse the established host-bootstrap fixture to create an exact synthetic estate.
$bootstrapFixture = Join-Path $OutputRoot "bootstrap-fixture"
& (Join-Path $PSScriptRoot "test-underdrain-windows-host-bootstrap.ps1") -OutputRoot $bootstrapFixture
if ($LASTEXITCODE -ne 0) { throw "Host-bootstrap prerequisite fixture failed." }
$qualification = Get-Content (Join-Path $bootstrapFixture "underdrain-windows-host-bootstrap-fixture-qualification.json") -Raw | ConvertFrom-Json
if ($qualification.status -ne "pass") { throw "Host-bootstrap prerequisite qualification did not pass." }

$estate = Join-Path $bootstrapFixture "estate"
$world = Join-Path $estate "Organs\AXM\axm-world\main"
$arc = Join-Path $estate "Organs\AXM\axm-arc\main"
$project = Join-Path $estate "Embodied-AR-Lab"
$unity = Join-Path $estate "Unity\Hub\Editor\6000.0.66f2\Editor\Unity.exe"
$resolvedRoot = Join-Path $estate "Evidence\underdrain\resolved-role-assets"
$resolvedManifest = Join-Path $resolvedRoot "resolved-representation-source.json"

# The prerequisite fixture ends with a deliberate stale-asset refusal. Restore the
# original bytes named by its concrete source manifest before starter cases run.
"fixture asset 0" | Set-Content -Encoding ascii (Join-Path $resolvedRoot "rhea-venn.png")
if ((Sha (Join-Path $resolvedRoot "rhea-venn.png")) -ne
    [string]((Get-Content $resolvedManifest -Raw | ConvertFrom-Json).assets[0].sha256)) {
    throw "Could not restore the resolved source fixture."
}

$fixtureScripts = Join-Path $OutputRoot "fixture-scripts"
New-Item -ItemType Directory -Force $fixtureScripts | Out-Null
foreach ($name in @(
    "start-underdrain-target-host.ps1",
    "bootstrap-underdrain-windows-host.ps1",
    "get-underdrain-commissioning-state.ps1"
)) {
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination (Join-Path $fixtureScripts $name)
}

# A bounded commissioning stub proves delegation and receipt custody without
# invoking Unity or any product gate.
$stubPath = Join-Path $fixtureScripts "invoke-underdrain-commissioning.ps1"
@'
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$WorldRoot,
    [Parameter(Mandatory=$true)][string]$ArcRoot,
    [Parameter(Mandatory=$true)][string]$EmbodiedArLabRoot,
    [string]$JobId,
    [string]$ExpectedWorldCommit,
    [string]$ExpectedArcCommit,
    [ValidateSet("inspect","advance","auto")][string]$Mode,
    [string]$SourceManifest,
    [string]$SourceRoot,
    [string]$ReviewSession,
    [string]$UnityEditor
)
$ErrorActionPreference = "Stop"
$stateRoot = Join-Path $EmbodiedArLabRoot "local\scene-jobs\$JobId\output\commissioning-state"
$runRoot = Join-Path $stateRoot "runs"
New-Item -ItemType Directory -Force $runRoot | Out-Null
$marker = Join-Path $stateRoot "stub-invoked.txt"
("{0}|{1}|{2}" -f $Mode, $SourceManifest, $SourceRoot) | Set-Content -Encoding utf8 $marker
$path = Join-Path $runRoot ((Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssfffZ") + ".json")
[ordered]@{
    format = "rodoh-underdrain-windows-commissioning-run/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    runId = [System.IO.Path]::GetFileNameWithoutExtension($path)
    status = "open"
    mode = $Mode
    productId = "underdrain-bloom-below-unity6000-v1"
    worldCommit = $ExpectedWorldCommit
    arcCommit = $ExpectedArcCommit
    jobId = $JobId
    actions = @()
    blocked = [ordered]@{ gate = "representation-materialization"; reason = "fixture commissioning stub" }
    nextCommand = "fixture-next"
    windowsSoftwareProductAcceptance = "not-issued"
    physicalHumanEvidence = "separate"
    questAcceptance = "open"
    physicalAcceptance = "not-issued"
    authority = "fixture commissioning stub only"
} | ConvertTo-Json -Depth 20 | Set-Content -Encoding utf8 $path
exit 0
'@ | Set-Content -Encoding utf8 $stubPath

$base = @{
    WorldRoot = $world
    ArcRoot = $arc
    EmbodiedArLabRoot = $project
    UnityEditor = $unity
    ExpectedWorldCommit = [string]$qualification.worldCommit
    ExpectedWorldTree = [string]$qualification.worldTree
    ExpectedArcCommit = [string]$qualification.arcCommit
    ExpectedArcTree = [string]$qualification.arcTree
    JobId = "underdrain-target-host-starter-fixture"
}

$inspectParameters = $base.Clone()
$inspectParameters.ResolvedSourceManifest = $resolvedManifest
$inspectParameters.ResolvedSourceRoot = $resolvedRoot
$inspectReceipt = Invoke-Starter "inspect-ready" $inspectParameters 0 "pass" $fixtureScripts
if ($inspectReceipt.mode -ne "inspect" -or $inspectReceipt.commissioning.delegated -ne $false) {
    throw "Inspect case delegated a commissioning mutation."
}
if ($inspectReceipt.bootstrap.firstDivergence -ne "representation-materialization") {
    throw "Inspect case lost the first representation-materialization divergence."
}

$stateRoot = Join-Path $project "local\scene-jobs\underdrain-target-host-starter-fixture\output\commissioning-state"
$marker = Join-Path $stateRoot "stub-invoked.txt"
if (Test-Path -LiteralPath $marker) { throw "Inspect case invoked the commissioning stub." }

$unconfirmedParameters = $base.Clone()
$unconfirmedParameters.Mode = "advance"
$unconfirmedParameters.ResolvedSourceManifest = $resolvedManifest
$unconfirmedParameters.ResolvedSourceRoot = $resolvedRoot
$unconfirmedReceipt = Invoke-Starter "advance-unconfirmed" $unconfirmedParameters 0 "blocked" $fixtureScripts
if ($unconfirmedReceipt.commissioning.delegated -ne $false -or
    $unconfirmedReceipt.blocked.reason -notlike "*ConfirmMutation*") {
    throw "Unconfirmed advance was not blocked at explicit mutation confirmation."
}
if (Test-Path -LiteralPath $marker) { throw "Unconfirmed advance invoked the commissioning stub." }

$incompleteParameters = $base.Clone()
$incompleteParameters.Mode = "advance"
$incompleteParameters.ConfirmMutation = $true
$incompleteReceipt = Invoke-Starter "advance-incomplete" $incompleteParameters 0 "blocked" $fixtureScripts
if ($incompleteReceipt.commissioning.delegated -ne $false -or
    $incompleteReceipt.bootstrap.status -ne "open") {
    throw "Incomplete advance delegated despite an open bootstrap."
}
if (Test-Path -LiteralPath $marker) { throw "Incomplete advance invoked the commissioning stub." }

$advanceParameters = $base.Clone()
$advanceParameters.Mode = "advance"
$advanceParameters.ConfirmMutation = $true
$advanceParameters.ResolvedSourceManifest = $resolvedManifest
$advanceParameters.ResolvedSourceRoot = $resolvedRoot
$advanceReceipt = Invoke-Starter "advance-confirmed" $advanceParameters 0 "open" $fixtureScripts
if ($advanceReceipt.commissioning.delegated -ne $true -or
    $advanceReceipt.commissioning.status -ne "open" -or
    [string]::IsNullOrWhiteSpace([string]$advanceReceipt.commissioning.receipt)) {
    throw "Confirmed advance did not delegate exactly one bounded commissioning run."
}
if (-not (Test-Path -LiteralPath $marker -PathType Leaf)) {
    throw "Confirmed advance did not invoke the commissioning stub."
}
$markerText = Get-Content -LiteralPath $marker -Raw
if ($markerText -notlike "advance|*$resolvedManifest*|*$resolvedRoot*") {
    throw "Confirmed advance lost resolved source custody."
}

"dirty" | Add-Content -Encoding utf8 (Join-Path $world "FIXTURE.txt")
$dirtyParameters = $base.Clone()
$dirtyParameters.Mode = "advance"
$dirtyParameters.ConfirmMutation = $true
$dirtyParameters.ResolvedSourceManifest = $resolvedManifest
$dirtyParameters.ResolvedSourceRoot = $resolvedRoot
$dirtyReceipt = Invoke-Starter "advance-dirty-world" $dirtyParameters 2 "held" $fixtureScripts
if ($dirtyReceipt.commissioning.delegated -ne $false -or
    $dirtyReceipt.bootstrap.status -ne "held") {
    throw "Dirty World advance was not held before delegation."
}

$qualificationPath = Join-Path $OutputRoot "underdrain-target-host-starter-fixture-qualification.json"
Write-Json $qualificationPath ([ordered]@{
    format = "rodoh-underdrain-target-host-starter-fixture-qualification/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "pass"
    cases = @(
        "inspect-ready",
        "advance-unconfirmed",
        "advance-incomplete",
        "advance-confirmed",
        "advance-dirty-world"
    )
    inspectDefaultVerified = $true
    explicitMutationConfirmationVerified = $true
    openBootstrapRefusalVerified = $true
    oneCommissioningDelegationVerified = $true
    dirtyCheckoutRefusalVerified = $true
    directUnityAuthority = $false
    reviewAuthority = $false
    productAcceptanceAuthority = $false
    questAuthority = $false
    physicalAcceptanceAuthority = $false
})
"$(Sha $qualificationPath)  underdrain-target-host-starter-fixture-qualification.json" |
    Set-Content -Encoding ascii ($qualificationPath + ".sha256")

Write-Host "UNDERDRAIN target-host starter admission and refusal fixtures passed."
Write-Host $qualificationPath
exit 0

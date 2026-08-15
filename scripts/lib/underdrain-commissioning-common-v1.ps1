Set-StrictMode -Version Latest

function Resolve-CommissioningPath([string]$Value, [string]$Base) {
    if ([string]::IsNullOrWhiteSpace($Value)) { return $null }
    if ([System.IO.Path]::IsPathRooted($Value)) { return [System.IO.Path]::GetFullPath($Value) }
    return [System.IO.Path]::GetFullPath((Join-Path $Base $Value))
}

function Write-CommissioningJson([string]$Path, [object]$Value) {
    $directory = [System.IO.Path]::GetDirectoryName($Path)
    if (-not [string]::IsNullOrWhiteSpace($directory)) {
        New-Item -ItemType Directory -Force $directory | Out-Null
    }
    $Value | ConvertTo-Json -Depth 60 | Set-Content -Encoding utf8 $Path
}

function Get-CommissioningSha256([string]$Path) {
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Add-CommissioningArgument(
    [System.Collections.ArrayList]$Arguments,
    [string]$Name,
    [object]$Value
) {
    if ($Value -is [System.Management.Automation.SwitchParameter] -or $Value -is [bool]) {
        if ([bool]$Value) { [void]$Arguments.Add("-$Name") }
        return
    }
    if ($null -ne $Value -and -not [string]::IsNullOrWhiteSpace([string]$Value)) {
        [void]$Arguments.Add("-$Name")
        [void]$Arguments.Add([string]$Value)
    }
}

function Invoke-CommissioningChild(
    [pscustomobject]$Context,
    [string]$Script,
    [hashtable]$Parameters,
    [string]$Label,
    [string]$LogPath
) {
    if (-not (Test-Path -LiteralPath $Script -PathType Leaf)) {
        throw "$Label script is absent: $Script"
    }
    $arguments = [System.Collections.ArrayList]::new()
    foreach ($value in @("-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", $Script)) {
        [void]$arguments.Add($value)
    }
    foreach ($key in ($Parameters.Keys | Sort-Object)) {
        Add-CommissioningArgument $arguments $key $Parameters[$key]
    }
    New-Item -ItemType Directory -Force ([System.IO.Path]::GetDirectoryName($LogPath)) | Out-Null
    Write-Host $Label
    $childOutput = @(& $Context.HostPowerShell @arguments 2>&1)
    $childExit = $LASTEXITCODE
    foreach ($line in $childOutput) {
        Add-Content -LiteralPath $LogPath -Value ([string]$line) -Encoding utf8
        Write-Host $line
    }
    if ($childExit -ne 0) { throw "$Label failed with exit $childExit. See $LogPath" }
}

function Invoke-CommissioningState(
    [pscustomobject]$Context,
    [System.Collections.IDictionary]$Options
) {
    $parameters = @{
        WorldRoot = $Context.WorldPath
        ArcRoot = $Context.ArcPath
        EmbodiedArLabRoot = $Context.ProjectRoot
        JobId = $Options.JobId
        ExpectedWorldCommit = $Options.ExpectedWorldCommit
        ExpectedArcCommit = $Options.ExpectedArcCommit
        PreflightRoot = $Context.PreflightOutput
        ReviewRoot = $Context.ReviewOutput
        OutputRoot = $Context.StateOutput
        NoFail = $true
    }
    $arguments = [System.Collections.ArrayList]::new()
    foreach ($value in @("-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", $Context.StateScript)) {
        [void]$arguments.Add($value)
    }
    foreach ($key in ($parameters.Keys | Sort-Object)) {
        Add-CommissioningArgument $arguments $key $parameters[$key]
    }
    $inspectionOutput = @(& $Context.HostPowerShell @arguments 2>&1)
    $inspectionExitCode = $LASTEXITCODE
    foreach ($line in $inspectionOutput) { Write-Host "[state] $line" }
    if ($inspectionExitCode -ne 0) {
        throw "Commissioning-state inspection failed with exit $inspectionExitCode."
    }
    $path = Join-Path $Context.StateOutput "underdrain-commissioning-state.json"
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "Commissioning-state receipt is absent: $path"
    }
    return [pscustomobject]@{
        path = $path
        sha256 = Get-CommissioningSha256 $path
        value = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
    }
}

function Test-CommissioningDirectoryHasFiles([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path -PathType Container)) { return $false }
    return @(Get-ChildItem -LiteralPath $Path -Force -ErrorAction SilentlyContinue).Count -gt 0
}

function New-CommissioningGateResult(
    [string]$Status,
    [string]$Script,
    [string]$Reason
) {
    return [pscustomobject]@{ status = $Status; script = $Script; reason = $Reason }
}

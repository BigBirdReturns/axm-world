$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-UnderdrainPath([string]$Value, [string]$Base) {
    if ([string]::IsNullOrWhiteSpace($Value)) { throw "Path value is empty." }
    if ([System.IO.Path]::IsPathRooted($Value)) { return [System.IO.Path]::GetFullPath($Value) }
    return [System.IO.Path]::GetFullPath((Join-Path $Base $Value))
}

function Read-UnderdrainJson([string]$Path, [string]$Label) {
    if (-not (Test-Path $Path -PathType Leaf)) { throw "$Label is absent: $Path" }
    try { return Get-Content $Path -Raw | ConvertFrom-Json }
    catch { throw "$Label is not valid JSON: $Path`n$($_.Exception.Message)" }
}

function Get-UnderdrainSha256([string]$Path) {
    if (-not (Test-Path $Path -PathType Leaf)) { throw "Evidence file is absent: $Path" }
    return (Get-FileHash $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Require-UnderdrainEqual([object]$Left, [object]$Right, [string]$Label) {
    if ([string]$Left -ne [string]$Right) { throw "$Label differs: '$Left' versus '$Right'." }
}

function Require-UnderdrainNonEmpty([string]$Value, [string]$Label) {
    if ([string]::IsNullOrWhiteSpace($Value)) { throw "$Label is empty." }
}

function Require-UnderdrainDigest([string]$Value, [string]$Prefix, [string]$Label) {
    if ($Value -notmatch ('^' + [regex]::Escape($Prefix) + '[0-9a-f]{64}$')) { throw "$Label is malformed: $Value" }
}

function Require-UnderdrainContext([string]$Value, [string]$Label) {
    Require-UnderdrainDigest $Value "ctx1_" $Label
}

function Require-UnderdrainLineage([string]$Value, [string]$Label) {
    Require-UnderdrainDigest $Value "lineage1_" $Label
}

function Require-UnderdrainSeatId([string]$Value, [string]$Label) {
    if ($Value -notmatch '^seat:[a-z0-9][a-z0-9._:-]{2,127}$') { throw "$Label is malformed: $Value" }
}

function Require-UnderdrainDistinct([string[]]$Values, [string]$Label) {
    $normalized = @($Values | ForEach-Object { [string]$_ })
    if ($normalized.Count -ne @($normalized | Select-Object -Unique).Count) { throw "$Label are not distinct." }
}

function Require-UnderdrainIdentity([object]$Evidence, [object]$Train, [string]$Label) {
    foreach ($field in @(
        "productId",
        "worldCommit",
        "arcCommit",
        "productProfileSha256",
        "windowsProductSha256",
        "actionSpecDigest",
        "arcDigest",
        "challengeId",
        "timingProfileId",
        "presentationManifestId",
        "sceneJobDigest"
    )) {
        Require-UnderdrainEqual $Evidence.$field $Train.$field "$Label $field"
    }
}

function Resolve-UnderdrainReference([object]$Reference, [string]$OwnerPath, [string]$Label) {
    if ($null -eq $Reference) { throw "$Label reference is absent." }
    $ownerRoot = [System.IO.Path]::GetDirectoryName([System.IO.Path]::GetFullPath($OwnerPath))
    $path = Resolve-UnderdrainPath ([string]$Reference.path) $ownerRoot
    if (-not (Test-Path $path -PathType Leaf)) { throw "$Label is absent: $path" }
    $sha = Get-UnderdrainSha256 $path
    if ([string]$Reference.sha256 -notmatch '^[0-9a-f]{64}$' -or $sha -ne [string]$Reference.sha256) {
        throw "$Label digest differs from its packet declaration."
    }
    return $path
}

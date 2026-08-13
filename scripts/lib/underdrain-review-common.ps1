Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-UnderdrainPath([string]$Value, [string]$Base) {
    if ([string]::IsNullOrWhiteSpace($Value)) { throw "Required path is empty." }
    if ([System.IO.Path]::IsPathRooted($Value)) { return [System.IO.Path]::GetFullPath($Value) }
    return [System.IO.Path]::GetFullPath((Join-Path $Base $Value))
}

function Require-UnderdrainFile([string]$Path, [string]$Label) {
    if (-not (Test-Path $Path -PathType Leaf)) { throw "$Label is absent: $Path" }
}

function Read-UnderdrainJson([string]$Path, [string]$Label) {
    Require-UnderdrainFile $Path $Label
    try { return Get-Content $Path -Raw | ConvertFrom-Json }
    catch { throw "$Label is not valid JSON: $Path`n$($_.Exception.Message)" }
}

function Get-UnderdrainSha256([string]$Path) {
    Require-UnderdrainFile $Path "Hashed file"
    return (Get-FileHash $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Require-UnderdrainEqual([object]$Left, [object]$Right, [string]$Label) {
    if ([string]$Left -ne [string]$Right) { throw "$Label differs: '$Left' versus '$Right'." }
}

function Require-UnderdrainNonEmpty([string]$Value, [string]$Label) {
    if ([string]::IsNullOrWhiteSpace($Value)) { throw "$Label is absent." }
}

function Require-UnderdrainHex([string]$Value, [string]$Label) {
    if ($Value -notmatch '^[0-9a-f]{64}$') { throw "$Label is not a lowercase SHA-256 digest." }
}

function Require-UnderdrainContext([string]$Value, [string]$Label) {
    if ($Value -notmatch '^sha256:[0-9a-f]{64}$') { throw "$Label is not a context digest." }
}

function Require-UnderdrainDistinct([string[]]$Values, [string]$Label) {
    foreach ($value in $Values) { Require-UnderdrainNonEmpty $value $Label }
    if (@($Values | Select-Object -Unique).Count -ne $Values.Count) {
        throw "$Label must be distinct across review functions."
    }
}

function Require-UnderdrainIdentity([object]$Evidence, [object]$Train, [string]$Label) {
    foreach ($field in @(
        "productId",
        "worldCommit",
        "arcCommit",
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

function Resolve-UnderdrainReference([object]$Reference, [string]$PacketPath, [string]$Label) {
    if ($null -eq $Reference) { throw "$Label reference is absent." }
    Require-UnderdrainHex ([string]$Reference.sha256) "$Label SHA-256"
    $path = Resolve-UnderdrainPath ([string]$Reference.path) ([System.IO.Path]::GetDirectoryName($PacketPath))
    Require-UnderdrainFile $path $Label
    $actual = Get-UnderdrainSha256 $path
    Require-UnderdrainEqual $actual ([string]$Reference.sha256) "$Label digest"
    return [ordered]@{ path = $path; sha256 = $actual }
}

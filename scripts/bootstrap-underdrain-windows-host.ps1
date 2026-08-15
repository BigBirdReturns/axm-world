[CmdletBinding()]
param(
    [string]$WorldRoot,
    [string]$ArcRoot,
    [string]$EmbodiedArLabRoot,
    [string]$UnityEditor,
    [string]$ShineStandalone,
    [string]$ResolvedSourceManifest,
    [string]$ResolvedSourceRoot,
    [string[]]$SearchRoots,
    [ValidateRange(1, 12)] [int]$MaxDepth = 6,
    [string]$JobId = "underdrain-unity6000-player-v1",
    [string]$ExpectedWorldCommit,
    [string]$ExpectedWorldTree,
    [string]$ExpectedArcCommit = "aaa5685903a348b3c1ba875622fbe99d90c1da35",
    [string]$ExpectedArcTree = "9b28737462ae0aecd8ab0ffab5537d12e8892364",
    [string]$ExpectedUnityVersion = "6000.0.66f2",
    [string]$ExpectedShineFileName = "UNDERDRAIN_The_Bloom_Below_Shine_v0.4.html",
    [long]$ExpectedShineBytes = 828259,
    [string]$ExpectedShineSha256 = "ab9e1a542f89d66733d0b9946fd9f2b724e5e09395a74611fa760d336c209311",
    [string]$OutputRoot,
    [switch]$DeepSearch,
    [switch]$NoStateInspect,
    [switch]$NoFail
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ExpectedProductId = "underdrain-bloom-below-unity6000-v1"
$ExpectedResolvedSourceFormat = "rodoh-underdrain-resolved-representation-source/1"
$ExpectedStateFormat = "rodoh-underdrain-windows-commissioning-state/1"
$ExpectedRoles = @(
    "player:rhea-venn",
    "enemy:skirmisher",
    "enemy:duelist",
    "enemy:swarm",
    "enemy:hexer",
    "enemy:breaker",
    "arena:pump-seven"
)

function Resolve-FullPath([string]$Value, [string]$Base) {
    if ([string]::IsNullOrWhiteSpace($Value)) { return $null }
    if ([System.IO.Path]::IsPathRooted($Value)) {
        return [System.IO.Path]::GetFullPath($Value)
    }
    return [System.IO.Path]::GetFullPath((Join-Path $Base $Value))
}

function Write-Json([string]$Path, [object]$Value) {
    $directory = [System.IO.Path]::GetDirectoryName($Path)
    if (-not [string]::IsNullOrWhiteSpace($directory)) {
        New-Item -ItemType Directory -Force $directory | Out-Null
    }
    $Value | ConvertTo-Json -Depth 60 | Set-Content -Encoding utf8 $Path
}

function Get-Sha256([string]$Path) {
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Require-Hex([string]$Value, [int]$Length, [string]$Label) {
    if ([string]::IsNullOrWhiteSpace($Value) -or $Value -notmatch "^[0-9a-f]{$Length}$") {
        throw "$Label is not $Length lowercase hexadecimal characters: $Value"
    }
}

function Quote-CommandValue([string]$Value) {
    if ($null -eq $Value) { return '""' }
    return '"' + $Value.Replace('"', '`"') + '"'
}

function New-Check(
    [string]$Id,
    [string]$Status,
    [string]$Message,
    [object]$Observed,
    [object]$Expected
) {
    return [ordered]@{
        id = $Id
        status = $Status
        message = $Message
        observed = $Observed
        expected = $Expected
    }
}

function Get-PathComparer {
    if ([System.IO.Path]::DirectorySeparatorChar -eq '\') {
        return [System.StringComparer]::OrdinalIgnoreCase
    }
    return [System.StringComparer]::Ordinal
}

function Add-UniquePath(
    [System.Collections.ArrayList]$Target,
    [System.Collections.Generic.HashSet[string]]$Seen,
    [string]$Path
) {
    if ([string]::IsNullOrWhiteSpace($Path)) { return }
    try {
        $full = [System.IO.Path]::GetFullPath($Path)
    } catch {
        return
    }
    if ($Seen.Add($full)) { [void]$Target.Add($full) }
}

function Get-SearchRootSet([string[]]$Requested) {
    $paths = [System.Collections.ArrayList]::new()
    $seen = [System.Collections.Generic.HashSet[string]]::new((Get-PathComparer))
    foreach ($candidate in @($Requested)) {
        if (-not [string]::IsNullOrWhiteSpace($candidate) -and (Test-Path -LiteralPath $candidate -PathType Container)) {
            Add-UniquePath $paths $seen $candidate
        }
    }
    foreach ($environmentName in @("AXM_ESTATE_ROOT", "AXM_PROJECTS_ROOT", "AXM_PROJECT_ROOT")) {
        $value = [Environment]::GetEnvironmentVariable($environmentName)
        if (-not [string]::IsNullOrWhiteSpace($value) -and (Test-Path -LiteralPath $value -PathType Container)) {
            Add-UniquePath $paths $seen $value
        }
    }
    foreach ($candidate in @(
        "D:\Projects",
        "C:\Projects",
        (Join-Path ([Environment]::GetFolderPath("UserProfile")) "Projects"),
        (Get-Location).Path
    )) {
        if (-not [string]::IsNullOrWhiteSpace($candidate) -and (Test-Path -LiteralPath $candidate -PathType Container)) {
            Add-UniquePath $paths $seen $candidate
        }
    }
    return @($paths)
}

function Get-CanonicalCandidates(
    [string[]]$Roots,
    [string[]]$RelativePaths
) {
    $paths = [System.Collections.ArrayList]::new()
    $seen = [System.Collections.Generic.HashSet[string]]::new((Get-PathComparer))
    foreach ($root in @($Roots)) {
        foreach ($relative in @($RelativePaths)) {
            $candidate = Join-Path $root $relative
            if (Test-Path -LiteralPath $candidate -PathType Container) {
                Add-UniquePath $paths $seen $candidate
            }
        }
    }
    return @($paths)
}

function Find-NamedDirectories(
    [string[]]$Roots,
    [string[]]$Names,
    [int]$Depth
) {
    $results = [System.Collections.ArrayList]::new()
    $seenResults = [System.Collections.Generic.HashSet[string]]::new((Get-PathComparer))
    $seenDirectories = [System.Collections.Generic.HashSet[string]]::new((Get-PathComparer))
    $queue = [System.Collections.Queue]::new()
    foreach ($root in @($Roots)) {
        if (Test-Path -LiteralPath $root -PathType Container) {
            $full = [System.IO.Path]::GetFullPath($root)
            if ($seenDirectories.Add($full)) {
                $queue.Enqueue([pscustomobject]@{ path = $full; depth = 0 })
            }
        }
    }
    $skip = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($name in @(
        ".git", "node_modules", "Library", "Temp", "Logs", "obj", "bin", "build",
        ".cache", ".venv", "venv", "`$RECYCLE.BIN", "System Volume Information"
    )) {
        [void]$skip.Add($name)
    }
    while ($queue.Count -gt 0) {
        $entry = $queue.Dequeue()
        if ($entry.depth -ge $Depth) { continue }
        $children = @(Get-ChildItem -LiteralPath $entry.path -Directory -Force -ErrorAction SilentlyContinue)
        foreach ($child in $children) {
            if ($skip.Contains($child.Name)) { continue }
            $childPath = [System.IO.Path]::GetFullPath($child.FullName)
            if ($Names -contains $child.Name) {
                Add-UniquePath $results $seenResults $childPath
            }
            if ($seenDirectories.Add($childPath)) {
                $queue.Enqueue([pscustomobject]@{ path = $childPath; depth = ([int]$entry.depth + 1) })
            }
        }
    }
    return @($results)
}

function Get-GitIdentity([string]$Path, [string]$Label) {
    $result = [ordered]@{
        label = $Label
        path = $Path
        present = $false
        head = $null
        tree = $null
        dirty = $null
        error = $null
    }
    if (-not (Test-Path -LiteralPath $Path -PathType Container)) {
        $result.error = "$Label root is absent."
        return [pscustomobject]$result
    }
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        $result.error = "git is not available on PATH."
        return [pscustomobject]$result
    }
    try {
        $inside = @(& git -C $Path rev-parse --is-inside-work-tree 2>$null)
        if ($LASTEXITCODE -ne 0 -or $inside.Count -ne 1 -or ([string]$inside[0]).Trim() -ne "true") {
            throw "$Label is not a Git worktree."
        }
        $head = @(& git -C $Path rev-parse HEAD 2>$null)
        if ($LASTEXITCODE -ne 0 -or $head.Count -ne 1) { throw "$Label HEAD could not be resolved." }
        $tree = @(& git -C $Path rev-parse "HEAD^{tree}" 2>$null)
        if ($LASTEXITCODE -ne 0 -or $tree.Count -ne 1) { throw "$Label tree could not be resolved." }
        $dirty = @(& git -C $Path status --porcelain 2>$null)
        if ($LASTEXITCODE -ne 0) { throw "$Label Git status failed." }
        $result.present = $true
        $result.head = ([string]$head[0]).Trim().ToLowerInvariant()
        $result.tree = ([string]$tree[0]).Trim().ToLowerInvariant()
        $result.dirty = $dirty.Count -gt 0
    } catch {
        $result.error = $_.Exception.Message
    }
    return [pscustomobject]$result
}

function Resolve-GitRoot(
    [string]$Label,
    [string]$Explicit,
    [string[]]$Candidates,
    [string]$ExpectedHead,
    [string]$ExpectedTree
) {
    $candidatePaths = [System.Collections.ArrayList]::new()
    $seen = [System.Collections.Generic.HashSet[string]]::new((Get-PathComparer))
    if (-not [string]::IsNullOrWhiteSpace($Explicit)) {
        Add-UniquePath $candidatePaths $seen (Resolve-FullPath $Explicit (Get-Location).Path)
    } else {
        foreach ($candidate in @($Candidates)) { Add-UniquePath $candidatePaths $seen $candidate }
    }
    $identities = @()
    foreach ($candidate in @($candidatePaths)) {
        $identities += Get-GitIdentity $candidate $Label
    }
    $exact = @($identities | Where-Object {
        $_.present -eq $true -and
        $_.head -eq $ExpectedHead -and
        ([string]::IsNullOrWhiteSpace($ExpectedTree) -or $_.tree -eq $ExpectedTree)
    })
    if (-not [string]::IsNullOrWhiteSpace($Explicit)) {
        if ($identities.Count -ne 1) {
            return [pscustomobject]@{ status = "held"; path = $null; identity = $null; candidates = $identities; message = "$Label explicit root could not be inspected." }
        }
        $identity = $identities[0]
        if (-not $identity.present) {
            return [pscustomobject]@{ status = "held"; path = $identity.path; identity = $identity; candidates = $identities; message = $identity.error }
        }
        if ($identity.head -ne $ExpectedHead) {
            return [pscustomobject]@{ status = "held"; path = $identity.path; identity = $identity; candidates = $identities; message = "$Label commit differs. Expected $ExpectedHead, observed $($identity.head)." }
        }
        if (-not [string]::IsNullOrWhiteSpace($ExpectedTree) -and $identity.tree -ne $ExpectedTree) {
            return [pscustomobject]@{ status = "held"; path = $identity.path; identity = $identity; candidates = $identities; message = "$Label tree differs. Expected $ExpectedTree, observed $($identity.tree)." }
        }
        if ($identity.dirty -eq $true) {
            return [pscustomobject]@{ status = "held"; path = $identity.path; identity = $identity; candidates = $identities; message = "$Label checkout is dirty." }
        }
        return [pscustomobject]@{ status = "pass"; path = $identity.path; identity = $identity; candidates = $identities; message = "$Label exact clean checkout admitted." }
    }
    if ($exact.Count -eq 0) {
        $message = if ($identities.Count -eq 0) { "$Label checkout was not found within the bounded search roots." } else { "$Label candidates were found, but none matched the exact expected commit and tree." }
        return [pscustomobject]@{ status = "open"; path = $null; identity = $null; candidates = $identities; message = $message }
    }
    if ($exact.Count -gt 1) {
        return [pscustomobject]@{ status = "held"; path = $null; identity = $null; candidates = $identities; message = "$Label discovery is ambiguous: $($exact.Count) exact matching checkouts were found." }
    }
    $selected = $exact[0]
    if ($selected.dirty -eq $true) {
        return [pscustomobject]@{ status = "held"; path = $selected.path; identity = $selected; candidates = $identities; message = "$Label checkout is dirty." }
    }
    return [pscustomobject]@{ status = "pass"; path = $selected.path; identity = $selected; candidates = $identities; message = "$Label exact clean checkout discovered." }
}

function Read-UnityProjectVersion([string]$ProjectRoot) {
    $path = Join-Path $ProjectRoot "ProjectSettings\ProjectVersion.txt"
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { return $null }
    $match = [regex]::Match((Get-Content -LiteralPath $path -Raw), '(?m)^m_EditorVersion:\s*(\S+)\s*$')
    if (-not $match.Success) { return $null }
    return $match.Groups[1].Value
}

function Test-UnityProject([string]$Path) {
    $result = [ordered]@{
        path = $Path
        present = $false
        version = $null
        error = $null
    }
    if (-not (Test-Path -LiteralPath $Path -PathType Container)) {
        $result.error = "Unity project root is absent."
        return [pscustomobject]$result
    }
    foreach ($directory in @("Assets", "Packages", "ProjectSettings")) {
        if (-not (Test-Path -LiteralPath (Join-Path $Path $directory) -PathType Container)) {
            $result.error = "Unity project $directory directory is absent."
            return [pscustomobject]$result
        }
    }
    $result.version = Read-UnityProjectVersion $Path
    if ([string]::IsNullOrWhiteSpace($result.version)) {
        $result.error = "Unity project version could not be read."
        return [pscustomobject]$result
    }
    $result.present = $true
    return [pscustomobject]$result
}

function Resolve-UnityProject(
    [string]$Explicit,
    [string[]]$Candidates,
    [string]$ExpectedVersion
) {
    $candidatePaths = [System.Collections.ArrayList]::new()
    $seen = [System.Collections.Generic.HashSet[string]]::new((Get-PathComparer))
    if (-not [string]::IsNullOrWhiteSpace($Explicit)) {
        Add-UniquePath $candidatePaths $seen (Resolve-FullPath $Explicit (Get-Location).Path)
    } else {
        foreach ($candidate in @($Candidates)) { Add-UniquePath $candidatePaths $seen $candidate }
    }
    $inspected = @()
    foreach ($candidate in @($candidatePaths)) { $inspected += Test-UnityProject $candidate }
    $exact = @($inspected | Where-Object { $_.present -eq $true -and $_.version -eq $ExpectedVersion })
    if (-not [string]::IsNullOrWhiteSpace($Explicit)) {
        if ($inspected.Count -ne 1 -or -not $inspected[0].present) {
            $message = if ($inspected.Count -eq 1) { $inspected[0].error } else { "Unity project explicit root could not be inspected." }
            return [pscustomobject]@{ status = "held"; path = if ($inspected.Count -eq 1) { $inspected[0].path } else { $null }; project = if ($inspected.Count -eq 1) { $inspected[0] } else { $null }; candidates = $inspected; message = $message }
        }
        if ($inspected[0].version -ne $ExpectedVersion) {
            return [pscustomobject]@{ status = "held"; path = $inspected[0].path; project = $inspected[0]; candidates = $inspected; message = "Unity project version differs. Expected $ExpectedVersion, observed $($inspected[0].version)." }
        }
        return [pscustomobject]@{ status = "pass"; path = $inspected[0].path; project = $inspected[0]; candidates = $inspected; message = "Exact Unity project admitted." }
    }
    if ($exact.Count -eq 0) {
        $message = if ($inspected.Count -eq 0) { "Embodied-AR-Lab was not found within the bounded search roots." } else { "Unity project candidates were found, but none use $ExpectedVersion." }
        return [pscustomobject]@{ status = "open"; path = $null; project = $null; candidates = $inspected; message = $message }
    }
    if ($exact.Count -gt 1) {
        return [pscustomobject]@{ status = "held"; path = $null; project = $null; candidates = $inspected; message = "Unity project discovery is ambiguous: $($exact.Count) exact projects were found." }
    }
    return [pscustomobject]@{ status = "pass"; path = $exact[0].path; project = $exact[0]; candidates = $inspected; message = "Exact Unity project discovered." }
}

function Get-UnityEditorVersionFromPath([string]$Path) {
    $current = [System.IO.Path]::GetDirectoryName([System.IO.Path]::GetFullPath($Path))
    while (-not [string]::IsNullOrWhiteSpace($current)) {
        $leaf = [System.IO.Path]::GetFileName($current)
        if ($leaf -match '^\d+\.\d+\.\d+[abfp]\d+$') { return $leaf }
        $parent = [System.IO.Path]::GetDirectoryName($current)
        if ($parent -eq $current) { break }
        $current = $parent
    }
    return $null
}

function Resolve-UnityEditor(
    [string]$Explicit,
    [string[]]$Roots,
    [string]$ExpectedVersion
) {
    $paths = [System.Collections.ArrayList]::new()
    $seen = [System.Collections.Generic.HashSet[string]]::new((Get-PathComparer))
    if (-not [string]::IsNullOrWhiteSpace($Explicit)) {
        Add-UniquePath $paths $seen (Resolve-FullPath $Explicit (Get-Location).Path)
    } else {
        foreach ($environmentName in @("UNITY_EDITOR", "UNITY_6000_0_66F2")) {
            $value = [Environment]::GetEnvironmentVariable($environmentName)
            if (-not [string]::IsNullOrWhiteSpace($value)) { Add-UniquePath $paths $seen $value }
        }
        $programFiles = [Environment]::GetEnvironmentVariable("ProgramFiles")
        $programFilesX86 = [Environment]::GetEnvironmentVariable("ProgramFiles(x86)")
        foreach ($base in @($programFiles, $programFilesX86, "D:\Program Files")) {
            if (-not [string]::IsNullOrWhiteSpace($base) -and (Test-Path -LiteralPath $base -PathType Container)) {
                Add-UniquePath $paths $seen (Join-Path $base "Unity\Hub\Editor\$ExpectedVersion\Editor\Unity.exe")
            }
        }
        foreach ($root in @($Roots)) {
            foreach ($relative in @(
                "Unity\Hub\Editor\$ExpectedVersion\Editor\Unity.exe",
                "Program Files\Unity\Hub\Editor\$ExpectedVersion\Editor\Unity.exe"
            )) {
                Add-UniquePath $paths $seen (Join-Path $root $relative)
            }
        }
    }
    $inspected = @()
    foreach ($path in @($paths)) {
        $present = Test-Path -LiteralPath $path -PathType Leaf
        $version = if ($present) { Get-UnityEditorVersionFromPath $path } else { $null }
        $inspected += [pscustomobject]@{ path = $path; present = $present; version = $version }
    }
    $exact = @($inspected | Where-Object { $_.present -eq $true -and $_.version -eq $ExpectedVersion })
    if (-not [string]::IsNullOrWhiteSpace($Explicit)) {
        if ($inspected.Count -ne 1 -or -not $inspected[0].present) {
            return [pscustomobject]@{ status = "held"; path = if ($inspected.Count -eq 1) { $inspected[0].path } else { $null }; candidates = $inspected; message = "Explicit Unity Editor is absent." }
        }
        if ($inspected[0].version -ne $ExpectedVersion) {
            return [pscustomobject]@{ status = "held"; path = $inspected[0].path; candidates = $inspected; message = "Unity Editor path is not bound to $ExpectedVersion." }
        }
        return [pscustomobject]@{ status = "pass"; path = $inspected[0].path; candidates = $inspected; message = "Exact Unity Editor admitted." }
    }
    if ($exact.Count -eq 0) {
        return [pscustomobject]@{ status = "open"; path = $null; candidates = $inspected; message = "Unity Editor $ExpectedVersion was not found." }
    }
    if ($exact.Count -gt 1) {
        return [pscustomobject]@{ status = "held"; path = $null; candidates = $inspected; message = "Unity Editor discovery is ambiguous: $($exact.Count) exact installations were found." }
    }
    return [pscustomobject]@{ status = "pass"; path = $exact[0].path; candidates = $inspected; message = "Exact Unity Editor discovered." }
}

function Test-UnderRoot([string]$Path, [string]$Root) {
    $full = [System.IO.Path]::GetFullPath($Path)
    $rootFull = [System.IO.Path]::GetFullPath($Root).TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
    $comparison = if ([System.IO.Path]::DirectorySeparatorChar -eq '\') { [System.StringComparison]::OrdinalIgnoreCase } else { [System.StringComparison]::Ordinal }
    return $full -eq $rootFull -or $full.StartsWith($rootFull + [System.IO.Path]::DirectorySeparatorChar, $comparison)
}

function Test-ResolvedSource(
    [string]$ManifestPath,
    [string]$SourceRootPath,
    [string]$ExpectedUnity,
    [string]$ExpectedShineSha
) {
    $result = [ordered]@{
        manifest = $ManifestPath
        sourceRoot = $SourceRootPath
        present = $false
        manifestSha256 = $null
        assetCount = 0
        error = $null
    }
    try {
        if (-not (Test-Path -LiteralPath $ManifestPath -PathType Leaf)) { throw "Resolved source manifest is absent." }
        if (-not (Test-Path -LiteralPath $SourceRootPath -PathType Container)) { throw "Resolved source root is absent." }
        if (-not (Test-UnderRoot $ManifestPath $SourceRootPath)) { throw "Resolved source manifest is outside its source root." }
        $value = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
        if ($value.format -ne $ExpectedResolvedSourceFormat) { throw "Resolved source format is unsupported: $($value.format)" }
        if ($value.productId -ne $ExpectedProductId) { throw "Resolved source product differs." }
        if ($value.unityVersion -ne $ExpectedUnity) { throw "Resolved source Unity version differs." }
        if ($value.sourceStandaloneSha256 -ne $ExpectedShineSha) { throw "Resolved source standalone digest differs." }
        if ($value.distinctPreparedProducts -ne $true -or $value.templateOnly -ne $false) { throw "Resolved source is not a concrete distinct seven-role pack." }
        if ($value.reviewRequired -ne $true -or $value.approvalIssued -ne $false -or $value.productAcceptance -ne "not-issued") {
            throw "Resolved source crossed review or acceptance authority."
        }
        $assets = @($value.assets)
        if ($assets.Count -ne 7) { throw "Resolved source asset count is $($assets.Count), expected 7." }
        $roles = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
        $digests = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
        foreach ($asset in $assets) {
            if ($ExpectedRoles -notcontains [string]$asset.role) { throw "Resolved source contains unknown role $($asset.role)." }
            if (-not $roles.Add([string]$asset.role)) { throw "Resolved source repeats role $($asset.role)." }
            Require-Hex ([string]$asset.sha256) 64 "Resolved source asset SHA-256"
            if (-not $digests.Add([string]$asset.sha256)) { throw "Resolved source repeats prepared bytes." }
            $assetPath = Resolve-FullPath ([string]$asset.fileName) $SourceRootPath
            if (-not (Test-UnderRoot $assetPath $SourceRootPath)) { throw "Resolved source asset escaped its root: $assetPath" }
            if (-not (Test-Path -LiteralPath $assetPath -PathType Leaf)) { throw "Resolved source asset is absent: $assetPath" }
            if ((Get-Sha256 $assetPath) -ne [string]$asset.sha256) { throw "Resolved source asset digest is stale: $assetPath" }
        }
        if ($roles.Count -ne $ExpectedRoles.Count) { throw "Resolved source role coverage is incomplete." }
        $result.present = $true
        $result.manifestSha256 = Get-Sha256 $ManifestPath
        $result.assetCount = $assets.Count
    } catch {
        $result.error = $_.Exception.Message
    }
    return [pscustomobject]$result
}

function Resolve-ResolvedSource(
    [string]$ExplicitManifest,
    [string]$ExplicitRoot,
    [string[]]$Roots,
    [string]$ExpectedUnity,
    [string]$ExpectedShineSha
) {
    if ([string]::IsNullOrWhiteSpace($ExplicitManifest) -xor [string]::IsNullOrWhiteSpace($ExplicitRoot)) {
        return [pscustomobject]@{ status = "held"; manifest = $null; sourceRoot = $null; source = $null; candidates = @(); message = "ResolvedSourceManifest and ResolvedSourceRoot must be supplied together." }
    }
    $pairs = @()
    if (-not [string]::IsNullOrWhiteSpace($ExplicitManifest)) {
        $manifest = Resolve-FullPath $ExplicitManifest (Get-Location).Path
        $root = Resolve-FullPath $ExplicitRoot (Get-Location).Path
        $pairs += [pscustomobject]@{ manifest = $manifest; root = $root }
    } else {
        foreach ($searchRoot in @($Roots)) {
            foreach ($relative in @(
                "Evidence\underdrain\resolved-role-assets",
                "underdrain\resolved-role-assets",
                "resolved-role-assets"
            )) {
                $root = Join-Path $searchRoot $relative
                $manifest = Join-Path $root "resolved-representation-source.json"
                if (Test-Path -LiteralPath $manifest -PathType Leaf) {
                    $pairs += [pscustomobject]@{ manifest = $manifest; root = $root }
                }
            }
        }
    }
    $inspected = @()
    foreach ($pair in $pairs) {
        $inspected += Test-ResolvedSource $pair.manifest $pair.root $ExpectedUnity $ExpectedShineSha
    }
    $passing = @($inspected | Where-Object { $_.present -eq $true })
    if (-not [string]::IsNullOrWhiteSpace($ExplicitManifest)) {
        if ($inspected.Count -ne 1 -or -not $inspected[0].present) {
            $message = if ($inspected.Count -eq 1) { $inspected[0].error } else { "Resolved source could not be inspected." }
            return [pscustomobject]@{ status = "held"; manifest = $ExplicitManifest; sourceRoot = $ExplicitRoot; source = if ($inspected.Count -eq 1) { $inspected[0] } else { $null }; candidates = $inspected; message = $message }
        }
        return [pscustomobject]@{ status = "pass"; manifest = $inspected[0].manifest; sourceRoot = $inspected[0].sourceRoot; source = $inspected[0]; candidates = $inspected; message = "Exact resolved seven-role source admitted." }
    }
    if ($passing.Count -eq 0) {
        return [pscustomobject]@{ status = "open"; manifest = $null; sourceRoot = $null; source = $null; candidates = $inspected; message = "No exact resolved seven-role source pack was found." }
    }
    if ($passing.Count -gt 1) {
        return [pscustomobject]@{ status = "held"; manifest = $null; sourceRoot = $null; source = $null; candidates = $inspected; message = "Resolved source discovery is ambiguous: $($passing.Count) exact packs were found." }
    }
    return [pscustomobject]@{ status = "pass"; manifest = $passing[0].manifest; sourceRoot = $passing[0].sourceRoot; source = $passing[0]; candidates = $inspected; message = "Exact resolved seven-role source discovered." }
}

function Resolve-ShineStandalone(
    [string]$Explicit,
    [string[]]$Roots,
    [string]$FileName,
    [long]$ExpectedBytes,
    [string]$ExpectedSha
) {
    $paths = [System.Collections.ArrayList]::new()
    $seen = [System.Collections.Generic.HashSet[string]]::new((Get-PathComparer))
    if (-not [string]::IsNullOrWhiteSpace($Explicit)) {
        Add-UniquePath $paths $seen (Resolve-FullPath $Explicit (Get-Location).Path)
    } else {
        foreach ($root in @($Roots)) {
            foreach ($relative in @($FileName, "Sources\$FileName", "Evidence\underdrain\$FileName")) {
                Add-UniquePath $paths $seen (Join-Path $root $relative)
            }
        }
        $downloads = Join-Path ([Environment]::GetFolderPath("UserProfile")) "Downloads\$FileName"
        Add-UniquePath $paths $seen $downloads
    }
    $inspected = @()
    foreach ($path in @($paths)) {
        $present = Test-Path -LiteralPath $path -PathType Leaf
        $bytes = if ($present) { (Get-Item -LiteralPath $path).Length } else { $null }
        $sha = if ($present) { Get-Sha256 $path } else { $null }
        $inspected += [pscustomobject]@{ path = $path; present = $present; bytes = $bytes; sha256 = $sha }
    }
    $exact = @($inspected | Where-Object { $_.present -eq $true -and $_.bytes -eq $ExpectedBytes -and $_.sha256 -eq $ExpectedSha })
    if (-not [string]::IsNullOrWhiteSpace($Explicit)) {
        if ($inspected.Count -ne 1 -or -not $inspected[0].present) {
            return [pscustomobject]@{ status = "held"; path = if ($inspected.Count -eq 1) { $inspected[0].path } else { $null }; candidates = $inspected; message = "Explicit Shine standalone is absent." }
        }
        if ($inspected[0].bytes -ne $ExpectedBytes -or $inspected[0].sha256 -ne $ExpectedSha) {
            return [pscustomobject]@{ status = "held"; path = $inspected[0].path; candidates = $inspected; message = "Explicit Shine standalone bytes or SHA-256 differ." }
        }
        return [pscustomobject]@{ status = "pass"; path = $inspected[0].path; candidates = $inspected; message = "Exact Shine standalone admitted." }
    }
    $wrongNamed = @($inspected | Where-Object { $_.present -eq $true -and ($_.bytes -ne $ExpectedBytes -or $_.sha256 -ne $ExpectedSha) })
    if ($wrongNamed.Count -gt 0) {
        return [pscustomobject]@{ status = "held"; path = $null; candidates = $inspected; message = "A file with the expected Shine name was found, but its bytes or SHA-256 differ." }
    }
    if ($exact.Count -eq 0) {
        return [pscustomobject]@{ status = "open"; path = $null; candidates = $inspected; message = "Exact Shine standalone was not found." }
    }
    if ($exact.Count -gt 1) {
        return [pscustomobject]@{ status = "held"; path = $null; candidates = $inspected; message = "Shine standalone discovery is ambiguous: $($exact.Count) exact copies were found." }
    }
    return [pscustomobject]@{ status = "pass"; path = $exact[0].path; candidates = $inspected; message = "Exact Shine standalone discovered." }
}

function Invoke-StateInspection(
    [string]$Script,
    [string]$World,
    [string]$Arc,
    [string]$Project,
    [string]$Job,
    [string]$WorldCommit,
    [string]$ArcCommit
) {
    $stateRoot = Join-Path $Project "local\scene-jobs\$Job\output\commissioning-state"
    $arguments = @(
        "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
        "-File", $Script,
        "-WorldRoot", $World,
        "-ArcRoot", $Arc,
        "-EmbodiedArLabRoot", $Project,
        "-JobId", $Job,
        "-ExpectedWorldCommit", $WorldCommit,
        "-ExpectedArcCommit", $ArcCommit,
        "-OutputRoot", $stateRoot,
        "-NoFail"
    )
    $hostPowerShell = (Get-Process -Id $PID).Path
    $output = @(& $hostPowerShell @arguments 2>&1)
    $exitCode = $LASTEXITCODE
    foreach ($line in $output) { Write-Host "[state] $line" }
    if ($exitCode -ne 0) { throw "Commissioning-state inspection failed with exit $exitCode." }
    $path = Join-Path $stateRoot "underdrain-commissioning-state.json"
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Commissioning-state receipt is absent: $path" }
    $value = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
    if ($value.format -ne $ExpectedStateFormat) { throw "Commissioning-state format is unsupported." }
    return [pscustomobject]@{
        path = $path
        sha256 = Get-Sha256 $path
        value = $value
    }
}

function Get-MaterializationCommand(
    [string]$World,
    [string]$Arc,
    [string]$Project,
    [string]$Manifest,
    [string]$SourceRootPath,
    [string]$UnityPath,
    [string]$WorldCommit,
    [string]$ArcCommit
) {
    $scriptPath = Join-Path $World "scripts\materialize-underdrain-production-representation.ps1"
    return "powershell.exe -NoProfile -ExecutionPolicy Bypass -File $(Quote-CommandValue $scriptPath) -WorldRoot $(Quote-CommandValue $World) -ArcRoot $(Quote-CommandValue $Arc) -EmbodiedArLabRoot $(Quote-CommandValue $Project) -ExpectedWorldCommit $WorldCommit -ExpectedArcCommit $ArcCommit -SourceManifest $(Quote-CommandValue $Manifest) -SourceRoot $(Quote-CommandValue $SourceRootPath) -UnityEditor $(Quote-CommandValue $UnityPath)"
}

Require-Hex $ExpectedArcCommit 40 "Expected Arc commit"
Require-Hex $ExpectedArcTree 40 "Expected Arc tree"
Require-Hex $ExpectedShineSha256 64 "Expected Shine SHA-256"
if (-not [string]::IsNullOrWhiteSpace($ExpectedWorldCommit)) { Require-Hex $ExpectedWorldCommit 40 "Expected World commit" }
if (-not [string]::IsNullOrWhiteSpace($ExpectedWorldTree)) { Require-Hex $ExpectedWorldTree 40 "Expected World tree" }

$lockPath = Join-Path (Split-Path $PSScriptRoot -Parent) "HOST_BOOTSTRAP_LOCK.json"
if (Test-Path -LiteralPath $lockPath -PathType Leaf) {
    $lock = Get-Content -LiteralPath $lockPath -Raw | ConvertFrom-Json
    if ($lock.format -ne "rodoh-underdrain-windows-host-bootstrap-lock/1") { throw "Host bootstrap lock format is unsupported." }
    if ([string]::IsNullOrWhiteSpace($ExpectedWorldCommit)) { $ExpectedWorldCommit = [string]$lock.world.commit }
    if ([string]::IsNullOrWhiteSpace($ExpectedWorldTree)) { $ExpectedWorldTree = [string]$lock.world.tree }
    if ($ExpectedArcCommit -ne [string]$lock.arc.commit -or $ExpectedArcTree -ne [string]$lock.arc.tree) {
        throw "Host bootstrap ARC authority differs from its lock."
    }
    if ($ExpectedUnityVersion -ne [string]$lock.unityVersion) { throw "Host bootstrap Unity version differs from its lock." }
    if ($ExpectedShineFileName -ne [string]$lock.shine.fileName -or $ExpectedShineBytes -ne [long]$lock.shine.bytes -or $ExpectedShineSha256 -ne [string]$lock.shine.sha256) {
        throw "Host bootstrap Shine authority differs from its lock."
    }
}
if ([string]::IsNullOrWhiteSpace($ExpectedWorldCommit) -or [string]::IsNullOrWhiteSpace($ExpectedWorldTree)) {
    throw "ExpectedWorldCommit and ExpectedWorldTree are required when HOST_BOOTSTRAP_LOCK.json is absent."
}
Require-Hex $ExpectedWorldCommit 40 "Expected World commit"
Require-Hex $ExpectedWorldTree 40 "Expected World tree"

$roots = Get-SearchRootSet $SearchRoots
$worldCandidates = Get-CanonicalCandidates $roots @(
    ".",
    "Organs\AXM\axm-world\main",
    "Organs\AXM\axm-world",
    "axm-world\main",
    "axm-world"
)
$arcCandidates = Get-CanonicalCandidates $roots @(
    ".",
    "Organs\AXM\axm-arc\main",
    "Organs\AXM\axm-arc",
    "axm-arc\main",
    "axm-arc"
)
$projectCandidates = Get-CanonicalCandidates $roots @(
    ".",
    "Embodied-AR-Lab",
    "Projects\Embodied-AR-Lab",
    "Organs\Embodied-AR-Lab"
)
if ($DeepSearch) {
    foreach ($candidate in Find-NamedDirectories $roots @("axm-world") $MaxDepth) {
        $worldCandidates += $candidate
        $main = Join-Path $candidate "main"
        if (Test-Path -LiteralPath $main -PathType Container) { $worldCandidates += $main }
    }
    foreach ($candidate in Find-NamedDirectories $roots @("axm-arc") $MaxDepth) {
        $arcCandidates += $candidate
        $main = Join-Path $candidate "main"
        if (Test-Path -LiteralPath $main -PathType Container) { $arcCandidates += $main }
    }
    $projectCandidates += Find-NamedDirectories $roots @("Embodied-AR-Lab") $MaxDepth
}

$worldResult = Resolve-GitRoot "World" $WorldRoot $worldCandidates $ExpectedWorldCommit $ExpectedWorldTree
$arcResult = Resolve-GitRoot "ARC" $ArcRoot $arcCandidates $ExpectedArcCommit $ExpectedArcTree
$projectResult = Resolve-UnityProject $EmbodiedArLabRoot $projectCandidates $ExpectedUnityVersion
$unityResult = Resolve-UnityEditor $UnityEditor $roots $ExpectedUnityVersion
$resolvedResult = Resolve-ResolvedSource $ResolvedSourceManifest $ResolvedSourceRoot $roots $ExpectedUnityVersion $ExpectedShineSha256
$shineResult = Resolve-ShineStandalone $ShineStandalone $roots $ExpectedShineFileName $ExpectedShineBytes $ExpectedShineSha256

$checks = [System.Collections.ArrayList]::new()
[void]$checks.Add((New-Check "world-custody" $worldResult.status $worldResult.message $worldResult.identity ([ordered]@{ commit = $ExpectedWorldCommit; tree = $ExpectedWorldTree })))
[void]$checks.Add((New-Check "arc-custody" $arcResult.status $arcResult.message $arcResult.identity ([ordered]@{ commit = $ExpectedArcCommit; tree = $ExpectedArcTree })))
[void]$checks.Add((New-Check "unity-project" $projectResult.status $projectResult.message $projectResult.project $ExpectedUnityVersion))
[void]$checks.Add((New-Check "unity-editor" $unityResult.status $unityResult.message $unityResult.path $ExpectedUnityVersion))
[void]$checks.Add((New-Check "resolved-seven-role-source" $resolvedResult.status $resolvedResult.message $resolvedResult.source $ExpectedResolvedSourceFormat))
[void]$checks.Add((New-Check "shine-standalone" $shineResult.status $shineResult.message $shineResult.path ([ordered]@{ fileName = $ExpectedShineFileName; bytes = $ExpectedShineBytes; sha256 = $ExpectedShineSha256 })))

$commissioning = $null
$stateScript = Join-Path $PSScriptRoot "get-underdrain-commissioning-state.ps1"
$rootsReady = $worldResult.status -eq "pass" -and $arcResult.status -eq "pass" -and $projectResult.status -eq "pass"
if (-not $NoStateInspect -and $rootsReady) {
    try {
        if (-not (Test-Path -LiteralPath $stateScript -PathType Leaf)) { throw "Commissioning-state inspector is absent: $stateScript" }
        $commissioning = Invoke-StateInspection $stateScript $worldResult.path $arcResult.path $projectResult.path $JobId $ExpectedWorldCommit $ExpectedArcCommit
        $stateCheckStatus = if ($commissioning.value.status -eq "held") { "held" } else { "pass" }
        $stateCheckMessage = if ($commissioning.value.status -eq "held") {
            "Commissioning state is held at $($commissioning.value.firstDivergence.id): $($commissioning.value.firstDivergence.message)"
        } else {
            "Exact commissioning state inspected."
        }
        [void]$checks.Add((New-Check "commissioning-state" $stateCheckStatus $stateCheckMessage ([ordered]@{
            path = $commissioning.path
            sha256 = $commissioning.sha256
            status = $commissioning.value.status
            firstDivergence = if ($commissioning.value.firstDivergence) { $commissioning.value.firstDivergence.id } else { $null }
        }) $ExpectedStateFormat))
    } catch {
        [void]$checks.Add((New-Check "commissioning-state" "held" $_.Exception.Message $null $ExpectedStateFormat))
    }
} elseif ($NoStateInspect) {
    [void]$checks.Add((New-Check "commissioning-state" "open" "Commissioning-state inspection was explicitly skipped." $null $ExpectedStateFormat))
} else {
    [void]$checks.Add((New-Check "commissioning-state" "open" "Commissioning-state inspection awaits exact World, ARC, and Unity project roots." $null $ExpectedStateFormat))
}

$firstGate = if ($null -ne $commissioning -and $commissioning.value.firstDivergence) { [string]$commissioning.value.firstDivergence.id } else { $null }
if ($resolvedResult.status -eq "pass") {
    foreach ($check in @($checks)) {
        if ($check.id -eq "shine-standalone" -and $check.status -eq "open") { $check.status = "optional" }
    }
}
if ($firstGate -ne "representation-materialization") {
    foreach ($check in @($checks)) {
        if ($check.id -eq "resolved-seven-role-source" -and $check.status -eq "open") { $check.status = "optional" }
        if ($check.id -eq "shine-standalone" -and $check.status -eq "open") { $check.status = "optional" }
        if ($check.id -eq "unity-editor" -and $check.status -eq "open" -and $firstGate -notin @("machine-preflight-v2", "player-product-train")) { $check.status = "optional" }
    }
}

$overall = "pass"
if (@($checks | Where-Object { $_.status -eq "held" }).Count -gt 0) {
    $overall = "held"
} elseif (@($checks | Where-Object { $_.status -eq "open" }).Count -gt 0) {
    $overall = "open"
}

$nextCommand = $null
$nextReason = $null
if ($overall -eq "held") {
    $firstHeld = @($checks | Where-Object { $_.status -eq "held" })[0]
    $nextReason = $firstHeld.message
    $nextCommand = "Correct the held target-host custody condition and rerun this bootstrap without deleting its receipt."
} elseif (-not $rootsReady) {
    $nextReason = "Exact target roots are incomplete."
    $nextCommand = "Rerun with explicit -WorldRoot, -ArcRoot, and -EmbodiedArLabRoot values or add their parent to -SearchRoots -DeepSearch."
} elseif ($null -eq $commissioning) {
    $nextReason = "Commissioning state has not been inspected."
    $nextCommand = "Rerun without -NoStateInspect."
} elseif ($commissioning.value.status -eq "pass") {
    $nextReason = "The bounded Windows software commissioning state is complete."
    $nextCommand = "Seal and preserve the local diagnostic evidence bundle; human, household, Quest, and physical acceptance remain separate."
} elseif ($firstGate -eq "representation-materialization") {
    if ($resolvedResult.status -eq "pass" -and $unityResult.status -eq "pass") {
        $nextReason = "The exact seven-role source and Unity Editor are available for representation materialization."
        $nextCommand = Get-MaterializationCommand $worldResult.path $arcResult.path $projectResult.path $resolvedResult.manifest $resolvedResult.sourceRoot $unityResult.path $ExpectedWorldCommit $ExpectedArcCommit
    } elseif ($resolvedResult.status -ne "pass" -and $shineResult.status -eq "pass") {
        $nextReason = "The exact Shine standalone is available, but the seven-role source pack has not been resolved."
        $nextCommand = "Use the exact machine kit to extract $(Quote-CommandValue $shineResult.path), complete the seven-role map, resolve resolved-representation-source.json, then rerun this bootstrap with -ResolvedSourceManifest and -ResolvedSourceRoot."
    } else {
        $nextReason = "Representation materialization lacks an exact resolved seven-role source pack."
        $nextCommand = "Recover the exact $ExpectedShineFileName or provide an already resolved seven-role source pack, then rerun with -ResolvedSourceManifest and -ResolvedSourceRoot."
    }
} else {
    $nextReason = "The target host is admitted to the current commissioning divergence."
    $nextCommand = [string]$commissioning.value.nextCommand
}

if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    if ($projectResult.status -eq "pass") {
        $OutputRoot = Join-Path $projectResult.path "local\scene-jobs\$JobId\output\host-bootstrap"
    } else {
        $OutputRoot = Join-Path (Get-Location).Path "underdrain-host-bootstrap"
    }
}
$output = Resolve-FullPath $OutputRoot (Get-Location).Path
New-Item -ItemType Directory -Force $output | Out-Null
$receiptPath = Join-Path $output "underdrain-windows-host-bootstrap.json"
$textPath = Join-Path $output "underdrain-windows-host-bootstrap.txt"

$receipt = [ordered]@{
    format = "rodoh-underdrain-windows-host-bootstrap/1"
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = $overall
    productId = $ExpectedProductId
    jobId = $JobId
    machine = [ordered]@{
        computerName = [Environment]::MachineName
        operatingSystem = [Environment]::OSVersion.VersionString
        powershell = $PSVersionTable.PSVersion.ToString()
        platform = if ([System.IO.Path]::DirectorySeparatorChar -eq '\') { "windows" } else { "non-windows-fixture-or-diagnostic" }
    }
    authority = [ordered]@{
        world = [ordered]@{ commit = $ExpectedWorldCommit; tree = $ExpectedWorldTree }
        arc = [ordered]@{ commit = $ExpectedArcCommit; tree = $ExpectedArcTree }
        unityVersion = $ExpectedUnityVersion
        shine = [ordered]@{ fileName = $ExpectedShineFileName; bytes = $ExpectedShineBytes; sha256 = $ExpectedShineSha256 }
    }
    search = [ordered]@{
        roots = @($roots)
        deepSearch = [bool]$DeepSearch
        maxDepth = $MaxDepth
    }
    roots = [ordered]@{
        world = $worldResult.path
        arc = $arcResult.path
        embodiedArLab = $projectResult.path
        unityEditor = $unityResult.path
        shineStandalone = $shineResult.path
        resolvedSourceManifest = $resolvedResult.manifest
        resolvedSourceRoot = $resolvedResult.sourceRoot
    }
    checks = @($checks)
    commissioning = if ($null -ne $commissioning) {
        [ordered]@{
            format = $commissioning.value.format
            status = $commissioning.value.status
            receipt = $commissioning.path
            receiptSha256 = $commissioning.sha256
            firstDivergence = $commissioning.value.firstDivergence
            nextCommand = $commissioning.value.nextCommand
            outOfOrderEvidence = @($commissioning.value.outOfOrderEvidence)
        }
    } else {
        [ordered]@{
            format = $ExpectedStateFormat
            status = "not-inspected"
            receipt = $null
            receiptSha256 = $null
            firstDivergence = $null
            nextCommand = $null
            outOfOrderEvidence = @()
        }
    }
    next = [ordered]@{
        reason = $nextReason
        command = $nextCommand
    }
    mutation = [ordered]@{
        repositoriesChanged = $false
        unityInvoked = $false
        representationMaterialized = $false
        approvalIssued = $false
        reviewIssued = $false
        productAcceptanceIssued = $false
        questInvoked = $false
        physicalAcceptanceIssued = $false
    }
    nonClaims = @(
        "software installation",
        "repository clone, pull, checkout, reset, or repair",
        "representation materialization",
        "Unity import or Windows build",
        "named representation approval",
        "device session",
        "role-separated review",
        "Windows software-product acceptance",
        "human, household, accessibility, Quest, or physical acceptance"
    )
}
Write-Json $receiptPath $receipt
"$(Get-Sha256 $receiptPath)  underdrain-windows-host-bootstrap.json" | Set-Content -Encoding ascii ($receiptPath + ".sha256")

$lines = @(
    "UNDERDRAIN Windows host bootstrap: $overall",
    "World: $($worldResult.path)",
    "ARC: $($arcResult.path)",
    "Embodied-AR-Lab: $($projectResult.path)",
    "Unity Editor: $($unityResult.path)",
    "Resolved source: $($resolvedResult.manifest)",
    "Commissioning: $($receipt.commissioning.status)"
)
foreach ($check in @($checks)) {
    $lines += ("[{0}] {1}: {2}" -f ([string]$check.status).ToUpperInvariant(), $check.id, $check.message)
}
$lines += ""
$lines += "NEXT"
$lines += $nextReason
$lines += $nextCommand
$lines | Set-Content -Encoding utf8 $textPath

Write-Host "UNDERDRAIN Windows host bootstrap: $overall"
Write-Host $receiptPath
if ($overall -eq "held" -and -not $NoFail) { exit 2 }
exit 0

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('doctor', 'sync', 'hydrate', 'verify', 'build', 'test', 'play', 'stop', 'snapshot', 'accept', 'full', 'status')]
    [string]$Action = 'status',

    [string]$EstateRoot,
    [string]$ArcPath,
    [string]$WorldPath,

    [ValidateSet('All', 'Arc', 'World')]
    [string]$Scope = 'All',

    [switch]$InstallMissing,
    [switch]$Offline,
    [switch]$FullBrowser,
    [switch]$NoOpen,
    [switch]$Source,
    [switch]$Force,
    [switch]$Json,
    [string]$PublicationBundle
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

function Join-Parts {
    param([Parameter(Mandatory = $true)][string]$Base, [Parameter(ValueFromRemainingArguments = $true)][string[]]$Parts)
    $result = $Base
    foreach ($part in $Parts) { $result = Join-Path $result $part }
    return $result
}

function Get-FullPath {
    param([Parameter(Mandatory = $true)][string]$Path)
    return [System.IO.Path]::GetFullPath($Path)
}

$Script:BootstrapRoot = Get-FullPath (Join-Path $PSScriptRoot '..\..')
$bootstrapIsWorld = Test-Path (Join-Path $Script:BootstrapRoot '.git')

if (-not $EstateRoot) {
    if ($bootstrapIsWorld) { $EstateRoot = Split-Path $Script:BootstrapRoot -Parent }
    else { $EstateRoot = $Script:BootstrapRoot }
}
$Script:EstateRoot = Get-FullPath $EstateRoot

$bootstrapLock = Join-Parts $Script:BootstrapRoot 'estate' 'estate.lock.json'
$worldDefault = Join-Path $Script:EstateRoot 'axm-world'
if ($WorldPath) { $Script:WorldRoot = Get-FullPath $WorldPath }
elseif ($bootstrapIsWorld) { $Script:WorldRoot = $Script:BootstrapRoot }
else { $Script:WorldRoot = Get-FullPath $worldDefault }

$worldLock = Join-Parts $Script:WorldRoot 'estate' 'estate.lock.json'
if (Test-Path $bootstrapLock) { $Script:LockPath = $bootstrapLock }
elseif (Test-Path $worldLock) { $Script:LockPath = $worldLock }
else { throw "Cannot find estate/estate.lock.json in $($Script:BootstrapRoot) or $($Script:WorldRoot)." }

$Script:Lock = Get-Content -Raw $Script:LockPath | ConvertFrom-Json
if ($Script:Lock.format -ne 'rodoh-local-estate-lock/1') {
    throw "Unsupported estate lock format: $($Script:Lock.format)"
}

if ($ArcPath) { $Script:ArcRoot = Get-FullPath $ArcPath }
else { $Script:ArcRoot = Get-FullPath (Join-Path $Script:EstateRoot $Script:Lock.repositories.arc.directory) }

$Script:StateRoot = Join-Path $Script:EstateRoot $Script:Lock.localPaths.stateDirectory
$Script:CacheRoot = Join-Path $Script:StateRoot 'cache'
$Script:NpmCache = Join-Path $Script:EstateRoot $Script:Lock.localPaths.npmCache
$Script:PlaywrightCache = Join-Path $Script:EstateRoot $Script:Lock.localPaths.playwrightCache
$Script:ReceiptRoot = Join-Path $Script:EstateRoot $Script:Lock.localPaths.receipts
$Script:BuildRoot = Join-Path $Script:EstateRoot $Script:Lock.localPaths.builds
$Script:SnapshotRoot = Join-Path $Script:EstateRoot $Script:Lock.localPaths.snapshots
$Script:PublicationRoot = Join-Path $Script:EstateRoot $Script:Lock.localPaths.publication
$Script:LogRoot = Join-Path $Script:EstateRoot $Script:Lock.localPaths.logs
$Script:ServerStatePath = Join-Path $Script:StateRoot 'servers.json'
$Script:ToolScript = Join-Parts $Script:BootstrapRoot 'scripts' 'local-estate' 'estate-tools.mjs'
$Script:StaticServerScript = Join-Parts $Script:BootstrapRoot 'scripts' 'local-estate' 'static-server.mjs'
if (-not (Test-Path $Script:ToolScript)) {
    $Script:ToolScript = Join-Parts $Script:WorldRoot 'scripts' 'local-estate' 'estate-tools.mjs'
    $Script:StaticServerScript = Join-Parts $Script:WorldRoot 'scripts' 'local-estate' 'static-server.mjs'
}

function Initialize-EstateDirectories {
    foreach ($path in @(
        $Script:EstateRoot,
        $Script:StateRoot,
        $Script:CacheRoot,
        $Script:NpmCache,
        $Script:PlaywrightCache,
        $Script:ReceiptRoot,
        $Script:BuildRoot,
        $Script:SnapshotRoot,
        $Script:PublicationRoot,
        $Script:LogRoot
    )) {
        if (-not (Test-Path $path)) { New-Item -ItemType Directory -Path $path -Force | Out-Null }
    }
}
Initialize-EstateDirectories

function Write-Stage {
    param([string]$Message)
    Write-Host "`n== $Message ==" -ForegroundColor Cyan
}

function Write-Info {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Gray
}

function Write-Pass {
    param([string]$Message)
    Write-Host "PASS  $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "WARN  $Message" -ForegroundColor Yellow
}

function Write-JsonFile {
    param([Parameter(Mandatory = $true)][string]$Path, [Parameter(Mandatory = $true)]$Value)
    $directory = Split-Path $Path -Parent
    if ($directory -and -not (Test-Path $directory)) { New-Item -ItemType Directory -Path $directory -Force | Out-Null }
    $json = $Value | ConvertTo-Json -Depth 40
    $encoding = New-Object System.Text.UTF8Encoding -ArgumentList $false
    [System.IO.File]::WriteAllText($Path, $json + [Environment]::NewLine, $encoding)
}

function Get-Sha256 {
    param([Parameter(Mandatory = $true)][string]$Path)
    return (Get-FileHash -Algorithm SHA256 -Path $Path).Hash.ToLowerInvariant()
}

function Get-StringSha256 {
    param([Parameter(Mandatory = $true)][string]$Value)
    $algorithm = [System.Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($Value)
        return ([System.BitConverter]::ToString($algorithm.ComputeHash($bytes))).Replace('-', '').ToLowerInvariant()
    } finally {
        $algorithm.Dispose()
    }
}

function Refresh-ProcessPath {
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = "$machine;$user"
}

function Find-CommandPath {
    param([Parameter(Mandatory = $true)][string[]]$Names)
    foreach ($name in $Names) {
        $command = Get-Command $name -ErrorAction SilentlyContinue
        if ($command) { return $command.Source }
    }
    return $null
}

function Get-GitCommand { return Find-CommandPath @('git.exe', 'git') }
function Get-NodeCommand { return Find-CommandPath @('node.exe', 'node') }
function Get-NpmCommand { return Find-CommandPath @('npm.cmd', 'npm.exe', 'npm') }
function Get-NpxCommand { return Find-CommandPath @('npx.cmd', 'npx.exe', 'npx') }

function Format-Arguments {
    param([string[]]$Arguments)
    return ($Arguments | ForEach-Object {
        if ($_ -match '[\s"]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ }
    }) -join ' '
}

function Invoke-External {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [string]$WorkingDirectory,
        [switch]$Capture,
        [switch]$AllowFailure
    )
    if (-not $FilePath) { throw 'External command path is empty.' }
    $locationPushed = $false
    try {
        if ($WorkingDirectory) {
            Push-Location $WorkingDirectory
            $locationPushed = $true
        }
        Write-Info ("> {0} {1}" -f $FilePath, (Format-Arguments $Arguments))
        if ($Capture) {
            $output = & $FilePath @Arguments 2>&1
            $code = $LASTEXITCODE
            $text = ($output | Out-String).Trim()
            if ($code -ne 0 -and -not $AllowFailure) {
                throw "Command failed with exit code $code.`n$text"
            }
            return [pscustomobject]@{ Code = $code; Output = $text }
        }
        & $FilePath @Arguments
        $code = $LASTEXITCODE
        if ($code -ne 0 -and -not $AllowFailure) { throw "Command failed with exit code $code." }
        return [pscustomobject]@{ Code = $code; Output = '' }
    } finally {
        if ($locationPushed) { Pop-Location }
    }
}

function Invoke-Git {
    param([string]$Root, [string[]]$Arguments, [switch]$Capture, [switch]$AllowFailure)
    $git = Get-GitCommand
    if (-not $git) { throw 'Git is not installed or not on PATH.' }
    return Invoke-External -FilePath $git -Arguments (@('-C', $Root) + $Arguments) -Capture:$Capture -AllowFailure:$AllowFailure
}

function Invoke-Npm {
    param([string]$Root, [string[]]$Arguments)
    $npm = Get-NpmCommand
    if (-not $npm) { throw 'npm is not installed or not on PATH.' }
    Invoke-External -FilePath $npm -Arguments $Arguments -WorkingDirectory $Root | Out-Null
}

function Invoke-Npx {
    param([string]$Root, [string[]]$Arguments)
    $npx = Get-NpxCommand
    if (-not $npx) { throw 'npx is not installed or not on PATH.' }
    Invoke-External -FilePath $npx -Arguments $Arguments -WorkingDirectory $Root | Out-Null
}

function Invoke-EstateTool {
    param([string[]]$Arguments, [switch]$Capture)
    $node = Get-NodeCommand
    if (-not $node) { throw 'Node.js is not installed or not on PATH.' }
    if (-not (Test-Path $Script:ToolScript)) { throw "Missing estate tool: $($Script:ToolScript)" }
    return Invoke-External -FilePath $node -Arguments (@($Script:ToolScript) + $Arguments) -Capture:$Capture
}

function Get-GitHead {
    param([string]$Root)
    return (Invoke-Git -Root $Root -Arguments @('rev-parse', 'HEAD') -Capture).Output.Trim()
}

function Get-GitBranch {
    param([string]$Root)
    return (Invoke-Git -Root $Root -Arguments @('rev-parse', '--abbrev-ref', 'HEAD') -Capture).Output.Trim()
}

function Test-GitAncestor {
    param([string]$Root, [string]$Ancestor, [string]$Head)
    $result = Invoke-Git -Root $Root -Arguments @('merge-base', '--is-ancestor', $Ancestor, $Head) -Capture -AllowFailure
    return $result.Code -eq 0
}

function Assert-CleanRepository {
    param([string]$Root, [string]$Label)
    if (-not (Test-Path (Join-Path $Root '.git'))) { throw "$Label is not a Git checkout: $Root" }
    $status = (Invoke-Git -Root $Root -Arguments @('status', '--porcelain') -Capture).Output
    if ($status) {
        throw "$Label has local changes. The estate tools never reset human work.`n$status"
    }
}

function Normalize-RepositoryCheckout {
    param([string]$Root, [string]$Label)
    Assert-CleanRepository $Root $Label
    Invoke-Git -Root $Root -Arguments @('config', '--local', 'core.autocrlf', 'false') | Out-Null
    Invoke-Git -Root $Root -Arguments @('config', '--local', 'core.eol', 'lf') | Out-Null
    # The checkout is proven clean before this bounded rewrite. Re-materialize
    # tracked bytes from HEAD under the repository's .gitattributes so Windows
    # hashes the same LF source that Linux and Git object storage hash.
    Invoke-Git -Root $Root -Arguments @('restore', '--source=HEAD', '--staged', '--worktree', '--', '.') | Out-Null
    Assert-CleanRepository $Root $Label
}

function Get-VersionMajor {
    param([string]$Value)
    $match = [regex]::Match($Value, '(\d+)')
    if (-not $match.Success) { return -1 }
    return [int]$match.Groups[1].Value
}

function Install-WingetPackage {
    param([string]$Id)
    $winget = Find-CommandPath @('winget.exe', 'winget')
    if (-not $winget) { throw "winget is unavailable. Install $Id manually, then rerun doctor." }
    Invoke-External -FilePath $winget -Arguments @(
        'install', '--id', $Id, '-e',
        '--accept-package-agreements', '--accept-source-agreements',
        '--silent'
    ) | Out-Null
    Refresh-ProcessPath
}

function Test-PortListening {
    param([int]$Port)
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $async = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
        $connected = $async.AsyncWaitHandle.WaitOne(150)
        if ($connected) { $client.EndConnect($async) }
        $client.Close()
        return $connected
    } catch { return $false }
}

function Invoke-Doctor {
    Write-Stage 'Toolchain doctor'
    $tools = [ordered]@{}

    $git = Get-GitCommand
    if (-not $git -and $InstallMissing) { Install-WingetPackage 'Git.Git'; $git = Get-GitCommand }
    if (-not $git) { throw 'Git is required. Rerun with -InstallMissing or install Git 2.40+.' }
    $gitVersion = (Invoke-External -FilePath $git -Arguments @('--version') -Capture).Output
    $tools.git = [ordered]@{ path = $git; version = $gitVersion }

    $node = Get-NodeCommand
    if (-not $node -and $InstallMissing) { Install-WingetPackage 'OpenJS.NodeJS.LTS'; $node = Get-NodeCommand }
    if (-not $node) { throw 'Node.js is required. Rerun with -InstallMissing or install Node 22 LTS.' }
    $nodeVersion = (Invoke-External -FilePath $node -Arguments @('--version') -Capture).Output
    $nodeMajor = Get-VersionMajor $nodeVersion
    if ($nodeMajor -lt [int]$Script:Lock.toolchain.node.minimumMajor -or $nodeMajor -ge [int]$Script:Lock.toolchain.node.maximumExclusiveMajor) {
        throw "Node $nodeVersion is outside the supported range >=$($Script:Lock.toolchain.node.minimumMajor) and <$($Script:Lock.toolchain.node.maximumExclusiveMajor)."
    }
    $tools.node = [ordered]@{ path = $node; version = $nodeVersion }

    $npm = Get-NpmCommand
    if (-not $npm) { throw 'npm is required and should be installed with Node.js.' }
    $npmVersion = (Invoke-External -FilePath $npm -Arguments @('--version') -Capture).Output
    if ((Get-VersionMajor $npmVersion) -lt [int]$Script:Lock.toolchain.npm.minimumMajor) {
        throw "npm $npmVersion is older than required major $($Script:Lock.toolchain.npm.minimumMajor)."
    }
    $tools.npm = [ordered]@{ path = $npm; version = $npmVersion }

    $powerShellVersion = $PSVersionTable.PSVersion.ToString()
    $tools.powerShell = [ordered]@{ path = $PSHOME; version = $powerShellVersion; edition = $PSVersionTable.PSEdition }

    $drive = Get-Item $Script:EstateRoot
    $driveRoot = [System.IO.Path]::GetPathRoot($drive.FullName)
    $driveInfo = New-Object System.IO.DriveInfo $driveRoot
    $freeGiB = [math]::Round($driveInfo.AvailableFreeSpace / 1GB, 2)
    if ($freeGiB -lt 8) { Write-Warn "Only $freeGiB GiB free on $driveRoot. A hydrated offline estate may need more." }

    $ports = [ordered]@{}
    foreach ($serverName in @('world', 'arc')) {
        $port = [int]$Script:Lock.servers.$serverName.port
        $ports[$serverName] = [ordered]@{ port = $port; listening = (Test-PortListening $port) }
    }

    $receipt = [ordered]@{
        format = 'rodoh-local-doctor-receipt/1'
        generatedAt = (Get-Date).ToUniversalTime().ToString('o')
        status = 'pass'
        estateRoot = $Script:EstateRoot
        tools = $tools
        disk = [ordered]@{ root = $driveRoot; freeGiB = $freeGiB }
        ports = $ports
    }
    Write-JsonFile (Join-Path $Script:ReceiptRoot 'doctor.json') $receipt
    Write-Pass "Toolchain accepted. Node $nodeVersion, npm $npmVersion, $gitVersion."
    return $receipt
}

function Test-LocalBranchExists {
    param([string]$Root, [string]$Branch)
    return (Invoke-Git -Root $Root -Arguments @('show-ref', '--verify', '--quiet', "refs/heads/$Branch") -Capture -AllowFailure).Code -eq 0
}

function Sync-Repository {
    param($Record, [string]$Root, [string]$Label)
    $git = Get-GitCommand
    if (-not $git) { throw 'Run doctor before sync.' }

    if (-not (Test-Path (Join-Path $Root '.git'))) {
        Write-Info "Cloning $Label into $Root"
        $parent = Split-Path $Root -Parent
        if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
        Invoke-External -FilePath $git -Arguments @('clone', '--branch', [string]$Record.branch, '--single-branch', [string]$Record.url, $Root) | Out-Null
    } else {
        Assert-CleanRepository $Root $Label
        Invoke-Git -Root $Root -Arguments @('fetch', '--prune', 'origin') | Out-Null
        if (-not (Test-LocalBranchExists $Root ([string]$Record.branch))) {
            Invoke-Git -Root $Root -Arguments @('checkout', '-b', [string]$Record.branch, "origin/$($Record.branch)") | Out-Null
        } else {
            Invoke-Git -Root $Root -Arguments @('checkout', [string]$Record.branch) | Out-Null
            Invoke-Git -Root $Root -Arguments @('merge', '--ff-only', "origin/$($Record.branch)") | Out-Null
        }
    }

    Assert-CleanRepository $Root $Label
    $head = Get-GitHead $Root
    $branch = Get-GitBranch $Root
    if ($branch -ne [string]$Record.branch) { throw "$Label is on $branch, expected $($Record.branch)." }
    if (-not (Test-GitAncestor $Root ([string]$Record.requiredAncestor) $head)) {
        throw "$Label head $head does not contain required ancestor $($Record.requiredAncestor)."
    }
    if ($Record.PSObject.Properties.Name -contains 'requiredCommit') {
        if ($head -ne [string]$Record.requiredCommit) {
            throw "$Label head $head differs from locked commit $($Record.requiredCommit). Update the lock deliberately before accepting newer bytes."
        }
    }
    return [ordered]@{ path = $Root; branch = $branch; head = $head; requiredAncestor = [string]$Record.requiredAncestor }
}

function Invoke-Sync {
    Write-Stage 'Exact repository sync'
    $world = Sync-Repository $Script:Lock.repositories.world $Script:WorldRoot 'AXM World'
    $arc = Sync-Repository $Script:Lock.repositories.arc $Script:ArcRoot 'AXM Arc'
    $receipt = [ordered]@{
        format = 'rodoh-local-repository-receipt/1'
        generatedAt = (Get-Date).ToUniversalTime().ToString('o')
        status = 'pass'
        world = $world
        arc = $arc
    }
    Write-JsonFile (Join-Path $Script:ReceiptRoot 'repositories.json') $receipt
    Write-Pass "World $($world.head) and Arc $($arc.head) are clean and locked."
    return $receipt
}

function Invoke-HydrateRepository {
    param([string]$Root, [string]$Label)
    Assert-CleanRepository $Root $Label
    $arguments = @('ci', '--cache', $Script:NpmCache, '--no-audit', '--no-fund')
    if ($Offline) { $arguments += '--offline' }
    else { $arguments += '--prefer-offline' }
    Invoke-Npm $Root $arguments
    return [ordered]@{
        path = $Root
        packageLockSha256 = Get-Sha256 (Join-Path $Root 'package-lock.json')
        nodeModulesPresent = Test-Path (Join-Path $Root 'node_modules')
    }
}

function Invoke-Hydrate {
    Write-Stage 'Dependency hydration'
    if (-not (Test-Path (Join-Path $Script:WorldRoot '.git')) -or -not (Test-Path (Join-Path $Script:ArcRoot '.git'))) {
        throw 'Run sync before hydrate.'
    }
    $previousBrowserPath = $env:PLAYWRIGHT_BROWSERS_PATH
    $env:PLAYWRIGHT_BROWSERS_PATH = $Script:PlaywrightCache
    try {
        $arc = Invoke-HydrateRepository $Script:ArcRoot 'AXM Arc'
        $world = Invoke-HydrateRepository $Script:WorldRoot 'AXM World'
        if (-not $Offline) {
            Invoke-Npx $Script:WorldRoot @('playwright', 'install', 'chromium')
        } elseif (-not (Test-Path $Script:PlaywrightCache)) {
            throw "Offline Chromium cache is missing at $($Script:PlaywrightCache). Hydrate once online first."
        }
        $receipt = [ordered]@{
            format = 'rodoh-local-dependency-receipt/1'
            generatedAt = (Get-Date).ToUniversalTime().ToString('o')
            status = 'pass'
            offlineMode = [bool]$Offline
            npmCache = $Script:NpmCache
            playwrightCache = $Script:PlaywrightCache
            arc = $arc
            world = $world
        }
        Write-JsonFile (Join-Path $Script:ReceiptRoot 'dependencies.json') $receipt
        Write-Pass 'Both lockfiles and local Chromium are hydrated.'
        return $receipt
    } finally {
        $env:PLAYWRIGHT_BROWSERS_PATH = $previousBrowserPath
    }
}

function Invoke-Verify {
    Write-Stage 'Machine contract verification'
    Normalize-RepositoryCheckout $Script:WorldRoot 'AXM World'
    Normalize-RepositoryCheckout $Script:ArcRoot 'AXM Arc'

    Invoke-EstateTool @('validate-lock', '--lock', $Script:LockPath) | Out-Null
    $worldReceiptPath = Join-Path $Script:ReceiptRoot 'world-repository.json'
    $arcReceiptPath = Join-Path $Script:ReceiptRoot 'arc-repository.json'
    Invoke-EstateTool @('repo-receipt', '--root', $Script:WorldRoot, '--required-ancestor', [string]$Script:Lock.repositories.world.requiredAncestor, '--output', $worldReceiptPath) | Out-Null
    Invoke-EstateTool @('repo-receipt', '--root', $Script:ArcRoot, '--required-ancestor', [string]$Script:Lock.repositories.arc.requiredAncestor, '--output', $arcReceiptPath) | Out-Null

    $arcHead = Get-GitHead $Script:ArcRoot
    if ($arcHead -ne [string]$Script:Lock.repositories.arc.requiredCommit) {
        throw "Arc is $arcHead, expected exact local-estate commit $($Script:Lock.repositories.arc.requiredCommit)."
    }

    $vendoredPath = Join-Path $Script:ReceiptRoot 'vendored-plane.json'
    Invoke-EstateTool @('compare-vendored', '--world', $Script:WorldRoot, '--arc', $Script:ArcRoot, '--output', $vendoredPath) | Out-Null

    $publicationManifest = Join-Parts $Script:WorldRoot 'estate' 'publication' 'PUBLICATION_MANIFEST.json'
    if (-not (Test-Path $publicationManifest)) { $publicationManifest = Join-Parts $Script:BootstrapRoot 'estate' 'publication' 'PUBLICATION_MANIFEST.json' }
    if (-not (Test-Path $publicationManifest)) { throw 'Publication manifest is missing.' }

    $receipt = [ordered]@{
        format = 'rodoh-local-verification-receipt/1'
        generatedAt = (Get-Date).ToUniversalTime().ToString('o')
        status = 'pass'
        lockSha256 = Get-Sha256 $Script:LockPath
        publicationManifestSha256 = Get-Sha256 $publicationManifest
        worldHead = Get-GitHead $Script:WorldRoot
        arcHead = $arcHead
        vendoredPlaneReceipt = $vendoredPath
    }
    Write-JsonFile (Join-Path $Script:ReceiptRoot 'verification.json') $receipt
    Write-Pass 'Lock, Git ancestry, exact Arc pin, and the complete vendored source plane agree.'
    return $receipt
}

function Restore-GeneratedBuild {
    param([string]$Root)
    $status = (Invoke-Git -Root $Root -Arguments @('status', '--porcelain', '--untracked-files=all', '--', 'docs/game') -Capture).Output
    if ($status) {
        Invoke-Git -Root $Root -Arguments @('restore', '--source=HEAD', '--staged', '--worktree', '--', 'docs/game') | Out-Null
        # docs/game was proven clean before the build. Remove only generated,
        # untracked or ignored output left by hashed filenames, never user work
        # elsewhere in the repository.
        Invoke-Git -Root $Root -Arguments @('clean', '-fdx', '--', 'docs/game') | Out-Null
    }
}

function Copy-DirectoryContents {
    param([string]$Source, [string]$Destination)
    if (Test-Path $Destination) { Remove-Item -Recurse -Force $Destination }
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    if (Test-Path $Source) {
        Get-ChildItem -Force $Source | ForEach-Object { Copy-Item -Path $_.FullName -Destination $Destination -Recurse -Force }
    }
}

function Get-TreeHash {
    param([string]$Root)
    return (Invoke-EstateTool @('tree-hash', '--root', $Root) -Capture).Output.Trim()
}

function Invoke-ReproducibleBuild {
    param([string]$Root, [string]$Label, [string]$OutputName)
    Normalize-RepositoryCheckout $Root $Label
    $preexisting = (Invoke-Git -Root $Root -Arguments @('status', '--porcelain', '--', 'docs/game') -Capture).Output
    if ($preexisting) { throw "$Label has pre-existing docs/game changes; refusing to overwrite them." }

    $scratch = Join-Path $Script:StateRoot ("build-scratch-" + $OutputName)
    $first = Join-Path $scratch 'first'
    $second = Join-Path $scratch 'second'
    if (Test-Path $scratch) { Remove-Item -Recurse -Force $scratch }
    New-Item -ItemType Directory -Path $scratch -Force | Out-Null

    $previousEpoch = $env:SOURCE_DATE_EPOCH
    $env:SOURCE_DATE_EPOCH = '0'
    try {
        Invoke-Npm $Root @('run', 'build')
        Copy-DirectoryContents (Join-Parts $Root 'docs' 'game') $first
        Restore-GeneratedBuild $Root
        Assert-CleanRepository $Root $Label

        Invoke-Npm $Root @('run', 'build')
        Copy-DirectoryContents (Join-Parts $Root 'docs' 'game') $second
        Restore-GeneratedBuild $Root
        Assert-CleanRepository $Root $Label
    } finally {
        $env:SOURCE_DATE_EPOCH = $previousEpoch
    }

    $firstHash = Get-TreeHash $first
    $secondHash = Get-TreeHash $second
    if ($firstHash -ne $secondHash) {
        throw "$Label is not reproducible: first $firstHash, second $secondHash."
    }
    $final = Join-Path $Script:BuildRoot $OutputName
    Copy-DirectoryContents $second $final
    Remove-Item -Recurse -Force $scratch
    return [ordered]@{ path = $final; treeSha256 = $secondHash; sourceHead = Get-GitHead $Root; sourceDateEpoch = 0 }
}

function Invoke-Build {
    Write-Stage 'Reproducible production builds'
    $arc = Invoke-ReproducibleBuild $Script:ArcRoot 'AXM Arc' 'axm-arc-game'
    $world = Invoke-ReproducibleBuild $Script:WorldRoot 'AXM World' 'rodoh-world-game'
    $receipt = [ordered]@{
        format = 'rodoh-local-build-receipt/1'
        generatedAt = (Get-Date).ToUniversalTime().ToString('o')
        status = 'pass'
        arc = $arc
        world = $world
    }
    Write-JsonFile (Join-Path $Script:ReceiptRoot 'builds.json') $receipt
    Write-Pass "Arc and World each produced the same file-tree digest twice."
    return $receipt
}

function Invoke-ReferenceBuilds {
    param([string]$Root)
    foreach ($script in @(
        'build:godscar-reference',
        'build:dark-tomb-reference',
        'build:common-ship-reference',
        'build:relief-connected-fixture',
        'build:clean-room-reference'
    )) {
        Invoke-Npm $Root @('run', $script)
    }
    $diff = Invoke-Git -Root $Root -Arguments @('diff', '--exit-code', '--', 'cartridges') -Capture -AllowFailure
    if ($diff.Code -ne 0) { throw "Arc reference generation changed committed artifacts.`n$($diff.Output)" }
}

function Invoke-BuildOnceAndRestore {
    param([string]$Root, [string]$Label)
    $preexisting = (Invoke-Git -Root $Root -Arguments @('status', '--porcelain', '--', 'docs/game') -Capture).Output
    if ($preexisting) { throw "$Label has pre-existing docs/game changes." }
    try { Invoke-Npm $Root @('run', 'build') }
    finally { Restore-GeneratedBuild $Root }
    Assert-CleanRepository $Root $Label
}

function Invoke-TestArc {
    Write-Stage 'AXM Arc complete local qualification'
    Normalize-RepositoryCheckout $Script:ArcRoot 'AXM Arc'
    $started = Get-Date
    Invoke-Npm $Script:ArcRoot @('run', 'typecheck')
    Invoke-Npm $Script:ArcRoot @('test')
    Invoke-ReferenceBuilds $Script:ArcRoot
    Invoke-BuildOnceAndRestore $Script:ArcRoot 'AXM Arc'
    $receipt = [ordered]@{
        format = 'rodoh-local-test-receipt/1'
        repository = 'axm-arc'
        generatedAt = (Get-Date).ToUniversalTime().ToString('o')
        durationSeconds = [math]::Round(((Get-Date) - $started).TotalSeconds, 3)
        head = Get-GitHead $Script:ArcRoot
        status = 'pass'
        checks = @('typecheck', 'complete-vitest', 'deterministic-reference-rebuild', 'production-build')
    }
    Write-JsonFile (Join-Path $Script:ReceiptRoot 'tests-arc.json') $receipt
    Write-Pass 'AXM Arc local qualification passed.'
    return $receipt
}

function Invoke-TestWorld {
    Write-Stage 'RODOH World complete local qualification'
    Normalize-RepositoryCheckout $Script:WorldRoot 'AXM World'
    Stop-EstateServers -Quiet
    $started = Get-Date
    $previousBrowserPath = $env:PLAYWRIGHT_BROWSERS_PATH
    $previousCi = $env:CI
    $env:PLAYWRIGHT_BROWSERS_PATH = $Script:PlaywrightCache
    $env:CI = 'true'
    try {
        Invoke-Npm $Script:WorldRoot @('run', 'engine:check')
        Invoke-Npm $Script:WorldRoot @('run', 'typecheck')
        Invoke-Npm $Script:WorldRoot @('test')
        Invoke-BuildOnceAndRestore $Script:WorldRoot 'AXM World'
        Invoke-Npm $Script:WorldRoot @('run', 'test:gate6')
        Invoke-Npx $Script:WorldRoot @('playwright', 'test', 'e2e/gate7-clean-room.spec.ts', '--workers=1')
        $checks = @('strict-engine-drift', 'typecheck', 'complete-vitest', 'production-build', 'gate6-desktop-mobile', 'gate7-desktop-mobile')
        if ($FullBrowser) {
            Invoke-Npx $Script:WorldRoot @('playwright', 'test', '--workers=1')
            $checks += 'complete-desktop-mobile-playwright'
            Write-JsonFile (Join-Path $Script:ReceiptRoot 'tests-browser.json') ([ordered]@{
                format = 'rodoh-local-browser-receipt/1'
                generatedAt = (Get-Date).ToUniversalTime().ToString('o')
                head = Get-GitHead $Script:WorldRoot
                status = 'pass'
                mode = 'complete-desktop-mobile'
            })
        }
        $receipt = [ordered]@{
            format = 'rodoh-local-test-receipt/1'
            repository = 'axm-world'
            generatedAt = (Get-Date).ToUniversalTime().ToString('o')
            durationSeconds = [math]::Round(((Get-Date) - $started).TotalSeconds, 3)
            head = Get-GitHead $Script:WorldRoot
            status = 'pass'
            checks = $checks
        }
        Write-JsonFile (Join-Path $Script:ReceiptRoot 'tests-world.json') $receipt
        Write-Pass 'RODOH World local qualification passed.'
        return $receipt
    } finally {
        $env:PLAYWRIGHT_BROWSERS_PATH = $previousBrowserPath
        $env:CI = $previousCi
        Restore-GeneratedBuild $Script:WorldRoot
    }
}

function Invoke-Test {
    if ($Scope -eq 'All' -or $Scope -eq 'Arc') { Invoke-TestArc | Out-Null }
    if ($Scope -eq 'All' -or $Scope -eq 'World') { Invoke-TestWorld | Out-Null }
}

function Wait-HttpReady {
    param([string]$Url, [int]$Seconds = 60)
    $deadline = (Get-Date).AddSeconds($Seconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 3
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) { return }
        } catch { Start-Sleep -Milliseconds 300 }
    }
    throw "Server did not become ready: $Url"
}


function Quote-ProcessArgument {
    param([Parameter(Mandatory = $true)][string]$Value)
    if ($Value -notmatch '[\s"]') { return $Value }
    return '"' + ($Value -replace '(\\*)"', '$1$1\\"' -replace '(\\+)$', '$1$1') + '"'
}

function Join-ProcessArguments {
    param([Parameter(Mandatory = $true)][string[]]$Values)
    return ($Values | ForEach-Object { Quote-ProcessArgument $_ }) -join ' '
}

function Quote-PowerShellLiteral {
    param([Parameter(Mandatory = $true)][string]$Value)
    return "'" + ($Value -replace "'", "''") + "'"
}

function Start-DetachedLoggedProcess {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [Parameter(Mandatory = $true)][string]$WorkingDirectory,
        [Parameter(Mandatory = $true)][string]$Root,
        [Parameter(Mandatory = $true)][int]$Port,
        [Parameter(Mandatory = $true)][string]$Base
    )
    $stdout = Join-Path $Script:LogRoot "$Name-server.stdout.log"
    $stderr = Join-Path $Script:LogRoot "$Name-server.stderr.log"
    Remove-Item $stdout, $stderr -Force -ErrorAction SilentlyContinue

    $hostExecutable = (Get-Process -Id $PID).Path
    if (-not $hostExecutable) {
        $hostExecutable = Find-CommandPath @('pwsh.exe', 'powershell.exe', 'pwsh', 'powershell')
    }
    if (-not $hostExecutable) { throw 'A PowerShell host is required to detach the local server process tree.' }

    $quotedArguments = @($Arguments | ForEach-Object { Quote-PowerShellLiteral $_ })
    $invocation = "Set-Location -LiteralPath $(Quote-PowerShellLiteral $WorkingDirectory); & $(Quote-PowerShellLiteral $FilePath) $($quotedArguments -join ' ') 1>> $(Quote-PowerShellLiteral $stdout) 2>> $(Quote-PowerShellLiteral $stderr); exit `$LASTEXITCODE"
    $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($invocation))
    # The helper process owns the log handles. Redirecting the long-lived server
    # directly from this parent causes PowerShell to retain those handles and keeps
    # RODOH.cmd play alive until the server tree is killed.
    $process = Start-Process -FilePath $hostExecutable -ArgumentList @('-NoLogo', '-NoProfile', '-EncodedCommand', $encoded) -WorkingDirectory $WorkingDirectory -PassThru -WindowStyle Hidden
    return [ordered]@{ name = $Name; pid = $process.Id; root = $Root; port = $Port; base = $Base; stdout = $stdout; stderr = $stderr }
}

function Start-StaticServer {
    param([string]$Name, [string]$Root, [int]$Port, [string]$Base)
    if (-not (Test-Path (Join-Path $Root 'index.html'))) { throw "Missing static build for $Name at $Root. Run build first." }
    $node = Get-NodeCommand
    return Start-DetachedLoggedProcess -Name $Name -FilePath $node -Arguments @(
        $Script:StaticServerScript,
        '--root', $Root,
        '--port', [string]$Port,
        '--base', $Base,
        '--host', '127.0.0.1'
    ) -WorkingDirectory $Script:WorldRoot -Root $Root -Port $Port -Base $Base
}

function Start-SourceServer {
    param([string]$Name, [string]$Root, [int]$Port, [string]$Base)
    $npm = Get-NpmCommand
    return Start-DetachedLoggedProcess -Name $Name -FilePath $npm -Arguments @(
        'run', 'dev', '--', '--host', '127.0.0.1', '--port', [string]$Port, '--strictPort'
    ) -WorkingDirectory $Root -Root $Root -Port $Port -Base $Base
}

function Stop-ProcessTree {
    param([int]$Id)
    if ($env:OS -eq 'Windows_NT') {
        $taskkill = Find-CommandPath @('taskkill.exe', 'taskkill')
        if ($taskkill) { Invoke-External -FilePath $taskkill -Arguments @('/PID', [string]$Id, '/T', '/F') -AllowFailure | Out-Null; return }
    }
    Stop-Process -Id $Id -Force -ErrorAction SilentlyContinue
}

function Stop-EstateServers {
    param([switch]$Quiet)
    if (-not (Test-Path $Script:ServerStatePath)) { return }
    try {
        $state = Get-Content -Raw $Script:ServerStatePath | ConvertFrom-Json
        foreach ($server in @($state.servers)) {
            if ($server.pid) { Stop-ProcessTree ([int]$server.pid) }
        }
    } finally {
        Remove-Item $Script:ServerStatePath -Force -ErrorAction SilentlyContinue
    }
    if (-not $Quiet) { Write-Pass 'Local Arc and Rodoh servers stopped.' }
}

function Invoke-Play {
    Write-Stage 'Local estate play servers'
    Stop-EstateServers -Quiet
    $worldPort = [int]$Script:Lock.servers.world.port
    $arcPort = [int]$Script:Lock.servers.arc.port
    if (Test-PortListening $worldPort) { throw "Port $worldPort is already in use." }
    if (Test-PortListening $arcPort) { throw "Port $arcPort is already in use." }

    if (-not $Source) {
        if (-not (Test-Path (Join-Parts $Script:BuildRoot 'rodoh-world-game' 'index.html')) -or -not (Test-Path (Join-Parts $Script:BuildRoot 'axm-arc-game' 'index.html'))) {
            Invoke-Build | Out-Null
        }
    }

    if ($Source) {
        $worldServer = Start-SourceServer 'world' $Script:WorldRoot $worldPort '/axm-world/game/'
        $arcServer = Start-SourceServer 'arc' $Script:ArcRoot $arcPort '/axm-arc/game/'
    } else {
        $worldServer = Start-StaticServer 'world' (Join-Path $Script:BuildRoot 'rodoh-world-game') $worldPort '/axm-world/game/'
        $arcServer = Start-StaticServer 'arc' (Join-Path $Script:BuildRoot 'axm-arc-game') $arcPort '/axm-arc/game/'
    }

    $state = [ordered]@{
        format = 'rodoh-local-server-state/1'
        startedAt = (Get-Date).ToUniversalTime().ToString('o')
        mode = $(if ($Source) { 'source' } else { 'static-build' })
        servers = @($worldServer, $arcServer)
    }
    Write-JsonFile $Script:ServerStatePath $state

    try {
        Wait-HttpReady $Script:Lock.servers.world.url
        Wait-HttpReady $Script:Lock.servers.arc.url
    } catch {
        Stop-EstateServers -Quiet
        throw
    }

    Write-Pass "Rodoh: $($Script:Lock.servers.world.url)"
    Write-Pass "AXM Arc: $($Script:Lock.servers.arc.url)"
    if (-not $NoOpen) {
        Start-Process $Script:Lock.servers.world.url
        Start-Process $Script:Lock.servers.arc.url
    }
    return $state
}

function Find-PublicationBundle {
    $filename = [string]$Script:Lock.publication.bundle
    $candidates = @()
    if ($PublicationBundle) { $candidates += (Get-FullPath $PublicationBundle) }
    $candidates += @(
        (Join-Path $Script:PublicationRoot $filename),
        (Join-Parts $Script:BootstrapRoot 'publication' $filename),
        (Join-Path $Script:BootstrapRoot $filename),
        (Join-Parts $Script:EstateRoot 'Godscar Codex' $filename)
    )
    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path $candidate -PathType Leaf)) { return $candidate }
    }
    return $null
}

function Copy-ImportantDocs {
    param([string]$RepoRoot, [string]$Destination, [string]$Label)
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    foreach ($name in @('README.md', 'VISION.md', 'DESIGN.md', 'STATUS.md', 'RECONCILIATION.md', 'package.json', 'package-lock.json')) {
        $source = Join-Path $RepoRoot $name
        if (Test-Path $source) { Copy-Item $source (Join-Path $Destination $name) -Force }
    }
    $docs = Join-Path $RepoRoot 'docs'
    if (Test-Path $docs) { Copy-DirectoryContents $docs (Join-Path $Destination 'docs') }
    $cartridges = Join-Path $RepoRoot 'cartridges'
    if (Test-Path $cartridges) { Copy-DirectoryContents $cartridges (Join-Path $Destination 'cartridges') }
    Write-Info "$Label human-readable documentation copied."
}

function Invoke-Snapshot {
    Write-Stage 'Durable local estate snapshot'
    Assert-CleanRepository $Script:WorldRoot 'AXM World'
    Assert-CleanRepository $Script:ArcRoot 'AXM Arc'
    if (-not (Test-Path (Join-Parts $Script:BuildRoot 'rodoh-world-game' 'index.html')) -or -not (Test-Path (Join-Parts $Script:BuildRoot 'axm-arc-game' 'index.html'))) {
        Invoke-Build | Out-Null
    }

    $publication = Find-PublicationBundle
    if (-not $publication) {
        throw "Publication bundle $($Script:Lock.publication.bundle) is required. Place it in $($Script:PublicationRoot) or pass -PublicationBundle."
    }
    $publicationHash = Get-Sha256 $publication
    if ($publicationHash -ne [string]$Script:Lock.publication.sha256) {
        throw "Publication bundle hash mismatch. Expected $($Script:Lock.publication.sha256), got $publicationHash."
    }
    Copy-Item $publication (Join-Path $Script:PublicationRoot $Script:Lock.publication.bundle) -Force

    $stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss')
    $snapshot = Join-Path $Script:SnapshotRoot "rodoh-estate-$stamp"
    New-Item -ItemType Directory -Path $snapshot -Force | Out-Null

    $git = Get-GitCommand
    Invoke-External -FilePath $git -Arguments @('-C', $Script:WorldRoot, 'bundle', 'create', (Join-Path $snapshot 'axm-world.bundle'), '--all') | Out-Null
    Invoke-External -FilePath $git -Arguments @('-C', $Script:ArcRoot, 'bundle', 'create', (Join-Path $snapshot 'axm-arc.bundle'), '--all') | Out-Null
    Invoke-External -FilePath $git -Arguments @('-C', $Script:WorldRoot, 'archive', '--format=zip', '--output', (Join-Path $snapshot 'axm-world-source.zip'), 'HEAD') | Out-Null
    Invoke-External -FilePath $git -Arguments @('-C', $Script:ArcRoot, 'archive', '--format=zip', '--output', (Join-Path $snapshot 'axm-arc-source.zip'), 'HEAD') | Out-Null

    Copy-DirectoryContents (Join-Path $Script:BuildRoot 'rodoh-world-game') (Join-Parts $snapshot 'builds' 'rodoh-world-game')
    Copy-DirectoryContents (Join-Path $Script:BuildRoot 'axm-arc-game') (Join-Parts $snapshot 'builds' 'axm-arc-game')
    Copy-DirectoryContents (Join-Path $Script:WorldRoot 'estate') (Join-Path $snapshot 'estate')
    if (Test-Path $Script:ReceiptRoot) { Copy-DirectoryContents $Script:ReceiptRoot (Join-Path $snapshot 'receipts') }
    Copy-ImportantDocs $Script:WorldRoot (Join-Parts $snapshot 'human-library' 'axm-world') 'World'
    Copy-ImportantDocs $Script:ArcRoot (Join-Parts $snapshot 'human-library' 'axm-arc') 'Arc'
    New-Item -ItemType Directory -Path (Join-Path $snapshot 'publication') -Force | Out-Null
    Copy-Item $publication (Join-Parts $snapshot 'publication' $Script:Lock.publication.bundle) -Force
    Copy-Item (Join-Parts $Script:WorldRoot 'estate' 'publication' 'PUBLICATION_MANIFEST.json') (Join-Path $snapshot 'publication') -Force
    Copy-Item (Join-Parts $Script:WorldRoot 'estate' 'publication' 'SHA256SUMS') (Join-Path $snapshot 'publication') -Force

    $readme = @"
RODOH LOCAL ESTATE SNAPSHOT

Created: $((Get-Date).ToUniversalTime().ToString('o'))
World: $(Get-GitHead $Script:WorldRoot)
Arc:   $(Get-GitHead $Script:ArcRoot)

Recovery:
  git clone axm-world.bundle axm-world
  git clone axm-arc.bundle axm-arc

Human documentation is under human-library/ and publication/.
Machine authority is under estate/, receipts/, estate.manifest.json, and SHA256SUMS.
Static browser products are under builds/.
"@
    $encoding = New-Object System.Text.UTF8Encoding -ArgumentList $false
    [System.IO.File]::WriteAllText((Join-Path $snapshot 'READ_ME_FIRST.txt'), $readme, $encoding)

    Invoke-EstateTool @('build-manifest', '--root', $snapshot, '--output', (Join-Path $snapshot 'estate.manifest.json'), '--sums', (Join-Path $snapshot 'SHA256SUMS')) | Out-Null
    Invoke-EstateTool @('verify-manifest', '--root', $snapshot, '--manifest', (Join-Path $snapshot 'estate.manifest.json')) | Out-Null

    $zip = "$snapshot.zip"
    if (Test-Path $zip) { Remove-Item $zip -Force }
    Compress-Archive -Path (Join-Path $snapshot '*') -DestinationPath $zip -CompressionLevel Optimal
    $receipt = [ordered]@{
        format = 'rodoh-local-snapshot-receipt/1'
        generatedAt = (Get-Date).ToUniversalTime().ToString('o')
        status = 'pass'
        directory = $snapshot
        archive = $zip
        archiveSha256 = Get-Sha256 $zip
        manifestSha256 = Get-Sha256 (Join-Path $snapshot 'estate.manifest.json')
        worldHead = Get-GitHead $Script:WorldRoot
        arcHead = Get-GitHead $Script:ArcRoot
        publicationSha256 = $publicationHash
    }
    Write-JsonFile (Join-Path $Script:ReceiptRoot 'snapshot.json') $receipt
    Write-Pass "Snapshot verified: $zip"
    return $receipt
}

function Get-MachineFingerprint {
    $parts = @($env:COMPUTERNAME, [Environment]::OSVersion.VersionString, $PSVersionTable.PSVersion.ToString())
    try {
        $os = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
        $cpu = Get-CimInstance Win32_Processor -ErrorAction Stop | Select-Object -First 1
        $parts += @($os.Caption, $os.Version, [string]$os.TotalVisibleMemorySize, $cpu.Name)
    } catch { $parts += 'cim-unavailable' }
    return Get-StringSha256 ($parts -join '|')
}

function Require-PassReceipt {
    param([string]$Name)
    $path = Join-Path $Script:ReceiptRoot $Name
    if (-not (Test-Path $path)) { throw "Required receipt is missing: $path" }
    $receipt = Get-Content -Raw $path | ConvertFrom-Json
    if ($receipt.status -ne 'pass') { throw "Receipt is not a pass: $path" }
    return $receipt
}

function Ask-Yes {
    param([string]$Prompt)
    $answer = Read-Host "$Prompt [type YES]"
    if ($answer -cne 'YES') { throw "Operator acceptance stopped at: $Prompt" }
    return $true
}

function Get-PackageVersion {
    param([string]$Root, [string]$Label)
    $path = Join-Path $Root 'package.json'
    if (-not (Test-Path -LiteralPath $path)) { throw "$Label package.json is missing: $path" }
    $package = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
    if (-not $package.version) { throw "$Label package.json does not name a version." }
    return [string]$package.version
}

function Assert-ReceiptValue {
    param([string]$Label, $Actual, [string]$Expected)
    $actualText = if ($null -eq $Actual) { '' } else { [string]$Actual }
    if ($actualText -ne $Expected) {
        throw "$Label is '$actualText', expected '$Expected'. Rerun the automated estate on the current repository pair."
    }
}

function Assert-CurrentAcceptanceEstate {
    Assert-CleanRepository $Script:WorldRoot 'AXM World'
    Assert-CleanRepository $Script:ArcRoot 'AXM Arc'

    $worldHead = Get-GitHead $Script:WorldRoot
    $arcHead = Get-GitHead $Script:ArcRoot
    $worldBranch = Get-GitBranch $Script:WorldRoot
    $arcBranch = Get-GitBranch $Script:ArcRoot
    $worldVersion = Get-PackageVersion $Script:WorldRoot 'AXM World'
    $arcVersion = Get-PackageVersion $Script:ArcRoot 'AXM Arc'

    Assert-ReceiptValue 'World branch' $worldBranch ([string]$Script:Lock.repositories.world.branch)
    Assert-ReceiptValue 'Arc branch' $arcBranch ([string]$Script:Lock.repositories.arc.branch)
    Assert-ReceiptValue 'Arc head' $arcHead ([string]$Script:Lock.repositories.arc.requiredCommit)
    Assert-ReceiptValue 'World package version' $worldVersion ([string]$Script:Lock.repositories.world.packageVersion)
    Assert-ReceiptValue 'Arc package version' $arcVersion ([string]$Script:Lock.repositories.arc.packageVersion)
    if (-not (Test-GitAncestor $Script:WorldRoot ([string]$Script:Lock.repositories.world.requiredAncestor) $worldHead)) {
        throw "World head $worldHead does not contain required ancestor $($Script:Lock.repositories.world.requiredAncestor)."
    }

    return [pscustomobject][ordered]@{
        worldHead = $worldHead
        arcHead = $arcHead
        worldBranch = $worldBranch
        arcBranch = $arcBranch
        worldPackageVersion = $worldVersion
        arcPackageVersion = $arcVersion
    }
}

function Invoke-Accept {
    Write-Stage 'Human local operator acceptance'
    $estate = Assert-CurrentAcceptanceEstate
    $receipts = @{}
    foreach ($name in @('doctor.json', 'repositories.json', 'dependencies.json', 'verification.json', 'builds.json', 'tests-arc.json', 'tests-world.json', 'tests-browser.json', 'snapshot.json')) {
        $receipts[$name] = Require-PassReceipt $name
    }

    $repositories = $receipts['repositories.json']
    Assert-ReceiptValue 'Automated repository receipt World head' $repositories.world.head $estate.worldHead
    Assert-ReceiptValue 'Automated repository receipt Arc head' $repositories.arc.head $estate.arcHead
    Assert-ReceiptValue 'Automated repository receipt World branch' $repositories.world.branch $estate.worldBranch
    Assert-ReceiptValue 'Automated repository receipt Arc branch' $repositories.arc.branch $estate.arcBranch

    $verification = $receipts['verification.json']
    Assert-ReceiptValue 'Verification receipt World head' $verification.worldHead $estate.worldHead
    Assert-ReceiptValue 'Verification receipt Arc head' $verification.arcHead $estate.arcHead

    $builds = $receipts['builds.json']
    Assert-ReceiptValue 'Build receipt World head' $builds.world.sourceHead $estate.worldHead
    Assert-ReceiptValue 'Build receipt Arc head' $builds.arc.sourceHead $estate.arcHead
    Assert-ReceiptValue 'Arc test receipt head' $receipts['tests-arc.json'].head $estate.arcHead
    Assert-ReceiptValue 'World test receipt head' $receipts['tests-world.json'].head $estate.worldHead
    Assert-ReceiptValue 'Browser test receipt head' $receipts['tests-browser.json'].head $estate.worldHead

    $snapshot = $receipts['snapshot.json']
    Assert-ReceiptValue 'Snapshot receipt World head' $snapshot.worldHead $estate.worldHead
    Assert-ReceiptValue 'Snapshot receipt Arc head' $snapshot.arcHead $estate.arcHead
    if (-not (Test-Path -LiteralPath $snapshot.archive -PathType Leaf)) {
        throw "Snapshot archive is missing: $($snapshot.archive)"
    }
    Assert-ReceiptValue 'Snapshot archive SHA-256' (Get-Sha256 $snapshot.archive) ([string]$snapshot.archiveSha256)

    Wait-HttpReady $Script:Lock.servers.world.url 5
    Wait-HttpReady $Script:Lock.servers.arc.url 5

    $publication = Find-PublicationBundle
    if (-not $publication) { throw 'The reviewed publication bundle is missing.' }
    if ((Get-Sha256 $publication) -ne [string]$Script:Lock.publication.sha256) { throw 'The reviewed publication bundle failed SHA-256 verification.' }

    $checks = [ordered]@{}
    $checks.arcOpens = Ask-Yes 'Did AXM Arc open locally and show a playable authored cartridge?'
    $checks.worldOpens = Ask-Yes 'Did Rodoh open locally and show all five first-party cartridge entries?'
    $checks.bundledPlay = Ask-Yes 'Did you enter a bundled cartridge, make a decision, resolve a contract, and see the recorded result?'
    $checks.cleanRoomImport = Ask-Yes 'Did The Orchard at Low Tide import as holder-owned and display its unfamiliar vocabulary?'
    $checks.portableRunRoundtrip = Ask-Yes 'Did you export a run, clear the holder context, import it, and resume the same state?'
    $checks.publicationLibrary = Ask-Yes 'Did the reviewed four-book Codex and Addenda bundle open locally?'
    $checks.snapshotRecovery = Ask-Yes 'Did the snapshot visibly contain both Git bundles, source archives, static builds, cartridges, publication, receipts, and checksums?'
    $operatorLabel = Read-Host 'Optional operator label for this receipt (leave blank for local-operator)'
    if (-not $operatorLabel) { $operatorLabel = 'local-operator' }

    $receipt = [ordered]@{
        format = 'rodoh-local-operator-acceptance/1'
        acceptedAt = (Get-Date).ToUniversalTime().ToString('o')
        status = 'pass'
        releaseTarget = [string]$Script:Lock.releaseTarget
        operatorLabel = $operatorLabel
        machineFingerprintSha256 = Get-MachineFingerprint
        worldCommit = $estate.worldHead
        arcCommit = $estate.arcHead
        worldPackageVersion = $estate.worldPackageVersion
        arcPackageVersion = $estate.arcPackageVersion
        world = [ordered]@{ head = $estate.worldHead; branch = $estate.worldBranch }
        arc = [ordered]@{ head = $estate.arcHead; branch = $estate.arcBranch }
        snapshot = [ordered]@{ archive = $snapshot.archive; archiveSha256 = $snapshot.archiveSha256; manifestSha256 = $snapshot.manifestSha256 }
        publicationSha256 = Get-Sha256 $publication
        checks = $checks
        statement = 'The exact local estate was installed, built, played, transported, resumed, and inspected by the operator on this machine. This receipt is required before v1.0.0.'
    }
    $path = Join-Path $Script:ReceiptRoot 'local-operator-acceptance.json'
    Write-JsonFile $path $receipt
    Write-Pass "Local operator acceptance written to $path"
    Write-Warn 'Run RODOH.cmd snapshot once more so the final durable archive includes this acceptance receipt.'
    return $receipt
}

function Invoke-Status {
    $status = [ordered]@{
        format = 'rodoh-local-estate-status/1'
        estateRoot = $Script:EstateRoot
        world = [ordered]@{ path = $Script:WorldRoot; exists = Test-Path (Join-Path $Script:WorldRoot '.git') }
        arc = [ordered]@{ path = $Script:ArcRoot; exists = Test-Path (Join-Path $Script:ArcRoot '.git') }
        receipts = [ordered]@{}
        servers = $null
    }
    foreach ($name in @('doctor', 'repositories', 'dependencies', 'verification', 'builds', 'tests-arc', 'tests-world', 'tests-browser', 'snapshot', 'local-operator-acceptance')) {
        $path = Join-Path $Script:ReceiptRoot "$name.json"
        $status.receipts[$name] = Test-Path $path
    }
    if ($status.world.exists) {
        $status.world.head = Get-GitHead $Script:WorldRoot
        $status.world.branch = Get-GitBranch $Script:WorldRoot
        $status.world.clean = -not [bool](Invoke-Git -Root $Script:WorldRoot -Arguments @('status', '--porcelain') -Capture).Output
    }
    if ($status.arc.exists) {
        $status.arc.head = Get-GitHead $Script:ArcRoot
        $status.arc.branch = Get-GitBranch $Script:ArcRoot
        $status.arc.clean = -not [bool](Invoke-Git -Root $Script:ArcRoot -Arguments @('status', '--porcelain') -Capture).Output
    }
    if (Test-Path $Script:ServerStatePath) { $status.servers = Get-Content -Raw $Script:ServerStatePath | ConvertFrom-Json }
    if ($Json) { $status | ConvertTo-Json -Depth 20 }
    else {
        Write-Stage 'Local estate status'
        Write-Host ($status | ConvertTo-Json -Depth 20)
    }
    return $status
}

function Invoke-Full {
    Invoke-Doctor | Out-Null
    Invoke-Sync | Out-Null
    Invoke-Hydrate | Out-Null
    Invoke-Verify | Out-Null
    Invoke-Build | Out-Null
    $originalScope = $Scope
    $originalFull = $FullBrowser
    try {
        $script:Scope = 'All'
        $script:FullBrowser = $true
        Invoke-Test
    } finally {
        $script:Scope = $originalScope
        $script:FullBrowser = $originalFull
    }
    Invoke-Snapshot | Out-Null
    Invoke-Play | Out-Null
    Write-Stage 'Automation complete'
    Write-Host 'Use both open browser products, perform the operator checks, then run:' -ForegroundColor White
    Write-Host '  RODOH.cmd accept' -ForegroundColor Green
    Write-Host '  RODOH.cmd snapshot' -ForegroundColor Green
}

try {
    switch ($Action) {
        'doctor' { Invoke-Doctor | Out-Null }
        'sync' { Invoke-Sync | Out-Null }
        'hydrate' { Invoke-Hydrate | Out-Null }
        'verify' { Invoke-Verify | Out-Null }
        'build' { Invoke-Build | Out-Null }
        'test' { Invoke-Test }
        'play' { Invoke-Play | Out-Null }
        'stop' { Stop-EstateServers }
        'snapshot' { Invoke-Snapshot | Out-Null }
        'accept' { Invoke-Accept | Out-Null }
        'full' { Invoke-Full }
        'status' { Invoke-Status | Out-Null }
        default { throw "Unsupported action: $Action" }
    }
} catch {
    Write-Host "`nFAIL  $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

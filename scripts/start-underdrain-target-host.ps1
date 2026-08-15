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
    [ValidateSet("inspect", "advance", "auto")] [string]$Mode = "inspect",
    [switch]$ConfirmMutation,
    [string]$SourceManifest,
    [string]$SourceRoot,
    [string]$ApprovalId,
    [string]$ApprovalAuthorityId,
    [string]$ApprovalName,
    [string]$ApprovalAttestation,
    [switch]$ConfirmAllAssets,
    [ValidateSet("keyboard-mouse", "gamepad")] [string]$ReviewSession = "keyboard-mouse",
    [string]$PlayerPacket,
    [string]$ObserverPacket,
    [string]$AdjudicatorPacket,
    [string]$AcceptanceSeatId,
    [string]$AcceptanceLineageId,
    [string]$AcceptanceContextDigest,
    [string]$AcceptanceName,
    [string]$AcceptanceAttestation,
    [string]$PreflightRoot,
    [string]$ReviewRoot,
    [switch]$ForceCloseUnity,
    [switch]$SkipNpmInstall,
    [switch]$SkipUnityTests,
    [switch]$SkipWindowsSmoke,
    [switch]$DevelopmentBuild,
    [switch]$InstallArcDependencies,
    [switch]$ForceCloseExistingPlayer,
    [switch]$SealEvidence,
    [string]$OutputRoot,
    [switch]$DeepSearch,
    [switch]$NoFail
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

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
    $Value | ConvertTo-Json -Depth 80 | Set-Content -Encoding utf8 $Path
}

function Get-Sha256([string]$Path) {
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Require-Hex([string]$Value, [int]$Length, [string]$Label) {
    if ([string]::IsNullOrWhiteSpace($Value) -or $Value -notmatch "^[0-9a-f]{$Length}$") {
        throw "$Label is not $Length lowercase hexadecimal characters: $Value"
    }
}

function Add-Argument(
    [System.Collections.ArrayList]$Arguments,
    [string]$Name,
    [object]$Value
) {
    if ($Value -is [System.Management.Automation.SwitchParameter] -or $Value -is [bool]) {
        if ([bool]$Value) { [void]$Arguments.Add("-$Name") }
        return
    }
    if ($Value -is [System.Array]) {
        if (@($Value).Count -gt 0) {
            [void]$Arguments.Add("-$Name")
            foreach ($item in @($Value)) { [void]$Arguments.Add([string]$item) }
        }
        return
    }
    if ($null -ne $Value -and -not [string]::IsNullOrWhiteSpace([string]$Value)) {
        [void]$Arguments.Add("-$Name")
        [void]$Arguments.Add([string]$Value)
    }
}

function Invoke-Child(
    [string]$Script,
    [System.Collections.IDictionary]$Parameters,
    [string]$LogPath
) {
    if (-not (Test-Path -LiteralPath $Script -PathType Leaf)) {
        throw "Required target-host child script is absent: $Script"
    }

    $arguments = [System.Collections.ArrayList]::new()
    foreach ($value in @(
        "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
        "-File", $Script
    )) {
        [void]$arguments.Add($value)
    }
    foreach ($key in ($Parameters.Keys | Sort-Object)) {
        Add-Argument $arguments $key $Parameters[$key]
    }

    New-Item -ItemType Directory -Force ([System.IO.Path]::GetDirectoryName($LogPath)) | Out-Null
    $hostPowerShell = (Get-Process -Id $PID).Path
    $childOutput = @(& $hostPowerShell @arguments 2>&1)
    $exitCode = $LASTEXITCODE
    foreach ($line in $childOutput) {
        Add-Content -LiteralPath $LogPath -Value ([string]$line) -Encoding utf8
        Write-Host $line
    }
    return [pscustomobject]@{
        exitCode = $exitCode
        output = @($childOutput)
    }
}

function Resolve-SourceAuthority {
    $lockPath = Join-Path (Split-Path $PSScriptRoot -Parent) "TARGET_HOST_STARTER_LOCK.json"
    if (Test-Path -LiteralPath $lockPath -PathType Leaf) {
        $lock = Get-Content -LiteralPath $lockPath -Raw | ConvertFrom-Json
        if ($lock.format -ne "rodoh-underdrain-target-host-starter-lock/1") {
            throw "Target-host starter lock format is unsupported."
        }
        if ([string]::IsNullOrWhiteSpace($script:ExpectedWorldCommit)) {
            $script:ExpectedWorldCommit = [string]$lock.world.commit
        }
        if ([string]::IsNullOrWhiteSpace($script:ExpectedWorldTree)) {
            $script:ExpectedWorldTree = [string]$lock.world.tree
        }
        if ($script:ExpectedArcCommit -ne [string]$lock.arc.commit -or
            $script:ExpectedArcTree -ne [string]$lock.arc.tree) {
            throw "Target-host starter ARC authority differs from its lock."
        }
        return
    }

    $candidateWorld = if (-not [string]::IsNullOrWhiteSpace($script:WorldRoot)) {
        Resolve-FullPath $script:WorldRoot (Get-Location).Path
    } else {
        [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
    }

    if ([string]::IsNullOrWhiteSpace($script:ExpectedWorldCommit)) {
        $head = @(& git -C $candidateWorld rev-parse HEAD 2>$null)
        if ($LASTEXITCODE -ne 0 -or $head.Count -ne 1) {
            throw "ExpectedWorldCommit is required when the starter is outside a resolvable World checkout."
        }
        $script:ExpectedWorldCommit = ([string]$head[0]).Trim().ToLowerInvariant()
    }
    if ([string]::IsNullOrWhiteSpace($script:ExpectedWorldTree)) {
        $tree = @(& git -C $candidateWorld rev-parse "HEAD^{tree}" 2>$null)
        if ($LASTEXITCODE -ne 0 -or $tree.Count -ne 1) {
            throw "ExpectedWorldTree is required when the starter is outside a resolvable World checkout."
        }
        $script:ExpectedWorldTree = ([string]$tree[0]).Trim().ToLowerInvariant()
    }
}

Resolve-SourceAuthority
Require-Hex $ExpectedWorldCommit 40 "Expected World commit"
Require-Hex $ExpectedWorldTree 40 "Expected World tree"
Require-Hex $ExpectedArcCommit 40 "Expected ARC commit"
Require-Hex $ExpectedArcTree 40 "Expected ARC tree"

$mutationConfirmationMissing = $Mode -ne "inspect" -and -not $ConfirmMutation

if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    if (-not [string]::IsNullOrWhiteSpace($EmbodiedArLabRoot)) {
        $project = Resolve-FullPath $EmbodiedArLabRoot (Get-Location).Path
        $OutputRoot = Join-Path $project "local\scene-jobs\$JobId\output\target-host-start"
    } else {
        $OutputRoot = Join-Path (Get-Location).Path "underdrain-target-host-start"
    }
}
$output = Resolve-FullPath $OutputRoot (Get-Location).Path
New-Item -ItemType Directory -Force $output | Out-Null
$runId = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssfffZ")
$runRoot = Join-Path $output "runs\$runId"
New-Item -ItemType Directory -Force $runRoot | Out-Null
$logPath = Join-Path $runRoot "target-host-start.lo²È="25‰©•ÑuìÁ…Ñ €ô€‘É•Í½±Ù•‘]½É±ì±…‰•°€ô€‰]½É±ˆô°(€€€€€€€mÁÍÕÍÑ½µ½‰©•ÑuìÁ…Ñ €ô€‘É•Í½±Ù•‘ÉŒì±…‰•°€ô€‰Iˆô°(€€€€€€€mÁÍÕÍÑ½µ½‰©•ÑuìÁ…Ñ €ô€‘É•Í½±Ù•‘AÉ½©•Ðì±…‰•°€ô€‰µ‰½‘¥•µHµ1…ˆˆô(€€€€¤¤ì(€€€€€€€¥˜€¡mÍÑÉ¥¹tèé%Í9Õ±±=É]¡¥Ñ•MÁ…”¡mÍÑÉ¥¹t‘É½½Ñ¹ÑÉä¹Á…Ñ ¤¤ì(€€€€€€€€€€€Ñ¡É½Ü€ˆ ‘É½½Ñ¹ÑÉä¹±…‰•°¤É½½ÐÝ…Ì¹½ÐÉ•Ñ…¥¹•‰äÑ¡”Ñ…É•Ðµ¡½ÍÐ‰½½ÑÍÑÉ…À¸ˆ(€€€€€€€ô(€€€ô((€€€¥˜€¡mÍÑÉ¥¹tèé%Í9Õ±±=É]¡¥Ñ•MÁ…” ‘M½ÕÉ•5…¹¥™•ÍÐ¤€µ…¹(€€€€€€€€µ¹½ÐmÍÑÉ¥¹tèé%Í9Õ±±=É]¡¥Ñ•MÁ…”¡mÍÑÉ¥¹t‘‰½½ÑÍÑÉ…À¹É½½ÑÌ¹É•Í½±Ù•‘M½ÕÉ•5…¹¥™•ÍÐ¤¤ì(€€€€€€€€‘M½ÕÉ•5…¹¥™•ÍÐ€ômÍÑÉ¥¹t‘‰½½ÑÍÑÉ…À¹É½½ÑÌ¹É•Í½±Ù•‘M½ÕÉ•5…¹¥™•ÍÐ(€€€ô(€€€¥˜€¡mÍÑÉ¥¹tèé%Í9Õ±±=É]¡¥Ñ•MÁ…” ‘M½ÕÉ•I½½Ð¤€µ…¹(€€€€€€€€µ¹½ÐmÍÑÉ¥¹tèé%Í9Õ±±=É]¡¥Ñ•MÁ…”¡mÍÑÉ¥¹t‘‰½½ÑÍÑÉ…À¹É½½ÑÌ¹É•Í½±Ù•‘M½ÕÉ•I½½Ð¤¤ì(€€€€€€€€‘M½ÕÉ•I½½Ð€ômÍÑÉ¥¹t‘‰½½ÑÍÑÉ…À¹É½½ÑÌ¹É•Í½±Ù•‘M½ÕÉ•I½½Ð(€€€ô(€€€¥˜€¡mÍÑÉ¥¹tèé%Í9Õ±±=É]¡¥Ñ•MÁ…” ‘U¹¥Ñå‘¥Ñ½È¤€µ…¹(€€€€€€€€µ¹½ÐmÍÑÉ¥¹tèé%Í9Õ±±=É]¡¥Ñ•MÁ…”¡mÍÑÉ¥¹t‘‰½½ÑÍÑÉ…À¹É½½ÑÌ¹Õ¹¥Ñå‘¥Ñ½È¤¤ì(€€€€€€€€‘U¹¥Ñå‘¥Ñ½È€ômÍÑÉ¥¹t‘‰½½ÑÍÑÉ…À¹É½½ÑÌ¹Õ¹¥Ñå‘¥Ñ½È(€€€ô((€€€€‘½µµ¥ÍÍ¥½¹¥¹MÉ¥ÁÐ€ô)½¥¸µA…Ñ €‘AMMÉ¥ÁÑI½½Ð€‰¥¹Ù½­”µÕ¹‘•É‘É…¥¸µ½µµ¥ÍÍ¥½¹¥¹œ¹ÁÌÄˆ(€€€€‘½µµ¥ÍÍ¥½¹¥¹A…É…µ•Ñ•ÉÌ€ôm½É‘•É•‘uì(€€€€€€€]½É±‘I½½Ð€ô€‘É•Í½±Ù•‘]½É±(€€€€€€€ÉI½½Ð€ô€‘É•Í½±Ù•‘ÉŒ(€€€€€€€µ‰½‘¥•‘É1…‰I½½Ð€ô€‘É•Í½±Ù•‘AÉ½©•Ð(€€€€€€€)½‰%€ô€‘)½‰%(€€€€€€€áÁ•Ñ•‘]½É±‘½µµ¥Ð€ô€‘áÁ•Ñ•‘]½É±‘½µµ¥Ð(€€€€€€€áÁ•Ñ•‘É½µµ¥Ð€ô€‘áÁ•Ñ•‘É½µµ¥Ð(€€€€€€€5½‘”€ô€‘5½‘”(€€€€€€€M½ÕÉ•5…¹¥™•ÍÐ€ô€‘M½ÕÉ•5…¹¥™•ÍÐ(€€€€€€€M½ÕÉ•I½½Ð€ô€‘M½ÕÉ•I½½Ð(€€€€€€€ÁÁÉ½Ù…±%€ô€‘ÁÁÉ½Ù…±%(€€€€€€€ÁÁÉ½Ù…±ÕÑ¡½É¥Ñå%€ô€‘ÁÁÉ½Ù…±ÕÑ¡½É¥Ñå%(€€€€€€€ÁÁÉ½Ù…±9…µ”€ô€‘ÁÁÉ½Ù…±9…µ”(€€€€€€€ÁÁÉ½Ù…±ÑÑ•ÍÑ…Ñ¥½¸€ô€‘ÁÁÉ½Ù…±ÑÑ•ÍÑ…Ñ¥½¸(€€€€€€€½¹™¥Éµ±±ÍÍ•ÑÌ€ôm‰½½±t‘½¹™¥Éµ±±ÍÍ•ÑÌ(€€€€€€€I•Ù¥•ÝM•ÍÍ¥½¸€ô€‘I•Ù¥•ÝM•ÍÍ¥½¸(€€€€€€€A±…å•ÉA…­•Ð€ô€‘A±…å•ÉA…­•Ð(€€€€€€€=‰Í•ÉÙ•ÉA…­•Ð€ô€‘=‰Í•ÉÙ•ÉA…­•Ð(€€€€€€€‘©Õ‘¥…Ñ½ÉA…­•Ð€ô€‘‘©Õ‘¥…Ñ½ÉA…­•Ð(€€€€€€€•ÁÑ…¹•M•…Ñ%€ô€‘•ÁÑ…¹•M•…Ñ%(€€€€€€€•ÁÑ…¹•1¥¹•…•%€ô€‘•ÁÑ…¹•1¥¹•…•%(€€€€€€€•ÁÑ…¹•½¹Ñ•áÑ¥•ÍÐ€ô€‘•ÁÑ…¹•½¹Ñ•áÑ¥•ÍÐ(€€€€€€€•ÁÑ…¹•9…µ”€ô€‘•ÁÑ…¹•9…µ”(€€€€€€€•ÁÑ…¹•ÑÑ•ÍÑ…Ñ¥½¸€ô€‘•ÁÑ…¹•ÑÑ•ÍÑ…Ñ¥½¸(€€€€€€€AÉ•™±¥¡ÑI½½Ð€ô€‘AÉ•™±¥¡ÑI½½Ð(€€€€€€€I•Ù¥•ÝI½½Ð€ô€‘I•Ù¥•ÝI½½Ð(€€€€€€€U¹¥Ñå‘¥Ñ½È€ô€‘U¹¥Ñå‘¥Ñ½È(€€€€€€€½É•±½Í•U¹¥Ñä€ôm‰½½±t‘½É•±½Í•U¹¥Ñä(€€€€€€€M­¥Á9Áµ%¹ÍÑ…±°€ôm‰½½±t‘M­¥Á9Áµ%¹ÍÑ…±°(€€€€€€€M­¥ÁU¹¥ÑåQ•ÍÑÌ€ôm‰½½±t‘M­¥ÁU¹¥ÑåQ•ÍÑÌ(€€€€€€€M­¥Á]¥¹‘½ÝÍMµ½­”€ôm‰½½±t‘M­¥Á]¥¹‘½ÝÍMµ½­”(€€€€€€€•Ù•±½Áµ•¹Ñ	Õ¥±€ôm‰½½±t‘•Ù•±½Áµ•¹Ñ	Õ¥±(€€€€€€€%¹ÍÑ…±±É•Á•¹‘•¹¥•Ì€ôm‰½½±t‘%¹ÍÑ…±±É•Á•¹‘•¹¥•Ì(€€€€€€€½É•±½Í•á¥ÍÑ¥¹A±…å•È€ôm‰½½±t‘½É•±½Í•á¥ÍÑ¥¹A±…å•È(€€€€€€€M•…±Ù¥‘•¹”€ôm‰½½±t‘M•…±Ù¥‘•¹”(€€€ô((€€€€‘ÍÑ…Ñ•I½½Ð€ô)½¥¸µA…Ñ €‘É•Í½±Ù•‘AÉ½©•Ð€‰±½…±qÍ•¹”µ©½‰Íp‘)½‰%‘q½ÕÑÁÕÑq½µµ¥ÍÍ¥½¹¥¹œµÍÑ…Ñ”ˆ(€€€€‘ÉÕ¹I••¥ÁÑÌ€ô)½¥¸µA…Ñ €‘ÍÑ…Ñ•I½½Ð€‰ÉÕ¹Ìˆ(€€€€‘‰•™½É”€ô  ¤(€€€¥˜€¡Q•ÍÐµA…Ñ €µ1¥Ñ•É…±A…Ñ €‘ÉÕ¹I••¥ÁÑÌ€µA…Ñ¡QåÁ”½¹Ñ…¥¹•È¤ì(€€€€€€€€‘‰•™½É”€ô  (€€€€€€€€€€€•Ðµ¡¥±‘%Ñ•´€µ1¥Ñ•É…±A…Ñ €‘ÉÕ¹I••¥ÁÑÌ€µ¥±”€µ¥±Ñ•È€ˆ¨¹©Í½¸ˆð(€€€€€€€€€€€€€€€½É… µ=‰©•Ðì€‘|¹Õ±±9…µ”ô(€€€€€€€€¤(€€€ô((€€€€‘‘•±•…Ñ•€ô€‘ÑÉÕ”(€€€€‘½µµ¥ÍÍ¥½¹¥¹%¹Ù½…Ñ¥½¸€ô%¹Ù½­”µ¡¥±€‘½µµ¥ÍÍ¥½¹¥¹MÉ¥ÁÐ€‘½µµ¥ÍÍ¥½¹¥¹A…É…µ•Ñ•ÉÌ€‘±½A…Ñ (€€€€‘½µµ¥ÍÍ¥½¹¥¹á¥Ð€ô€‘½µµ¥ÍÍ¥½¹¥¹%¹Ù½…Ñ¥½¸¹•á¥Ñ½‘”((€€€€‘…™Ñ•È€ô  ¤(€€€¥˜€¡Q•ÍÐµA…Ñ €µ1¥Ñ•É…±A…Ñ €‘ÉÕ¹I••¥ÁÑÌ€µA…Ñ¡QåÁ”½¹Ñ…¥¹•È¤ì(€€€€€€€€‘…™Ñ•È€ô  (€€€€€€€€€€€•Ðµ¡¥±‘%Ñ•´€µ1¥Ñ•É…±A…Ñ €‘ÉÕ¹I••¥ÁÑÌ€µ¥±”€µ¥±Ñ•È€ˆ¨¹©Í½¸ˆð(€€€€€€€€€€€€€€€½É… µ=‰©•Ðì€‘|¹Õ±±9…µ”ô(€€€€€€€€¤(€€€ô(€€€€‘¹•ÝIÕ¹Ì€ô  ‘…™Ñ•Èð]¡•É”µ=‰©•Ðì€‘|€µ¹½Ñ¥¸€‘‰•™½É”ô¤(€€€¥˜€ ‘¹•ÝIÕ¹Ì¹½Õ¹Ð€µ¹”€Ä¤ì(€€€€€€€Ñ¡É½Ü€‰½µµ¥ÍÍ¥½¹¥¹œ‘•±•…Ñ¥½¸ÁÉ½‘Õ•€ ‘¹•ÝIÕ¹Ì¹½Õ¹Ð¤¹•ÜÉÕ¸É••¥ÁÑÌì•á…Ñ±ä½¹”¥ÌÉ•ÅÕ¥É•¸ˆ(€€€ô((€€€€‘½µµ¥ÍÍ¥½¹¥¹I••¥ÁÑA…Ñ €ômMåÍÑ•´¹%<¹A…Ñ¡tèé•ÑÕ±±A…Ñ  ‘¹•ÝIÕ¹ÍlÁt¤(€€€€‘½µµ¥ÍÍ¥½¹¥¹I••¥ÁÐ€ô•Ðµ½¹Ñ•¹Ð€µ1¥Ñ•É…±A…Ñ €‘½µµ¥ÍÍ¥½¹¥¹I••¥ÁÑA…Ñ €µI…Üð½¹Ù•ÉÑÉ½´µ)Í½¸(€€€¥˜€ ‘½µµ¥ÍÍ¥½¹¥¹I••¥ÁÐ¹™½Éµ…Ð€µ¹”€‰É½‘½ µÕ¹‘•É‘É…¥¸µÝ¥¹‘½ÝÌµ½µµ¥ÍÍ¥½¹¥¹œµÉÕ¸¼Äˆ¤ì(€€€€€€€Ñ¡É½Ü€‰½µµ¥ÍÍ¥½¹¥¹œÉÕ¸™½Éµ…Ð¥ÌÕ¹ÍÕÁÁ½ÉÑ•¸ˆ(€€€ô(€€€¥˜€ ‘½µµ¥ÍÍ¥½¹¥¹I••¥ÁÐ¹µ½‘”€µ¹”€‘5½‘”¤ì(€€€€€€€Ñ¡É½Ü€‰½µµ¥ÍÍ¥½¹¥¹œÉÕ¸µ½‘”‘¥™™•ÉÌ¸áÁ•Ñ•€œ‘5½‘”œ°½‰Í•ÉÙ•€œ ‘½µµ¥ÍÍ¥½¹¥¹I••¥ÁÐ¹µ½‘”¤œ¸ˆ(€€€ô(€€€¥˜€ ‘½µµ¥ÍÍ¥½¹¥¹I••¥ÁÐ¹Ý½É±‘½µµ¥Ð€µ¹”€‘áÁ•Ñ•‘]½É±‘½µµ¥Ð€µ½È(€€€€€€€€‘½µµ¥ÍÍ¥½¹¥¹I••¥ÁÐ¹…É½µµ¥Ð€µ¹”€‘áÁ•Ñ•‘É½µµ¥Ð¤ì(€€€€€€€Ñ¡É½Ü€‰½µµ¥ÍÍ¥½¹¥¹œÉÕ¸±½ÍÐ•á…Ð]½É±½ÈIÕÍÑ½‘ä¸ˆ(€€€ô(€€€¥˜€ ‘½µµ¥ÍÍ¥½¹¥¹I••¥ÁÐ¹Á¡åÍ¥…±!Õµ…¹Ù¥‘•¹”€µ¹”€‰Í•Á…É…Ñ”ˆ€µ½È(€€€€€€€€‘½µµ¥ÍÍ¥½¹¥¹I••¥ÁÐ¹ÅÕ•ÍÑ•ÁÑ…¹”€µ¹”€‰½Á•¸ˆ€µ½È(€€€€€€€€‘½µµ¥ÍÍ¥½¹¥¹I••¥ÁÐ¹Á¡åÍ¥…±•ÁÑ…¹”€µ¹”€‰¹½Ðµ¥ÍÍÕ•ˆ¤ì(€€€€€€€Ñ¡É½Ü€‰½µµ¥ÍÍ¥½¹¥¹œÉÕ¸É½ÍÍ•¡Õµ…¸°EÕ•ÍÐ°½ÈÁ¡åÍ¥…°…ÕÑ¡½É¥Ñä¸ˆ(€€€ô(€€€¥˜€ ‘½µµ¥ÍÍ¥½¹¥¹á¥Ð€µ¹½Ñ¥¸  À°€È¤¤ì(€€€€€€€Ñ¡É½Ü€‰½µµ¥ÍÍ¥½¹¥¹œ‘•±•…Ñ¥½¸™…¥±•Ý¥Ñ •á¥Ð€‘½µµ¥ÍÍ¥½¹¥¹á¥Ð¸ˆ(€€€ô((€€€€‘½µµ¥ÍÍ¥½¹¥¹MÑ…ÑÕÌ€ômÍÑÉ¥¹t‘½µµ¥ÍÍ¥½¹¥¹I••¥ÁÐ¹ÍÑ…ÑÕÌ(€€€€‘½µµ¥ÍÍ¥½¹¥¹I••¥ÁÑM¡„ÈÔØ€ô•ÐµM¡„ÈÔØ€‘½µµ¥ÍÍ¥½¹¥¹I••¥ÁÑA…Ñ )ô((‘ÍÑ…ÑÕÌ€ô¥˜€ ‘‰½½ÑÍÑÉ…À¹ÍÑ…ÑÕÌ€µ•Ä€‰¡•±ˆ¤ì(€€€€‰¡•±ˆ)ô•±Í•¥˜€ ‘5½‘”€µ•Ä€‰¥¹ÍÁ•Ðˆ¤ì(€€€mÍÑÉ¥¹t‘‰½½ÑÍÑÉ…À¹ÍÑ…ÑÕÌ)ô•±Í•¥˜€ µ¹½Ð€‘‘•±•…Ñ•¤ì(€€€€‰‰±½­•ˆ)ô•±Í•¥˜€ ‘½µµ¥ÍÍ¥½¹¥¹MÑ…ÑÕÌ€µ•Ä€‰¡•±ˆ¤ì(€€€€‰¡•±ˆ)ô•±Í”ì(€€€€‘½µ¥ÍÍ¥½¹¥¹MÑ…ÑÕÌ)ô((‘É••¥ÁÐ€ôm½É‘•É•‘uì(€€€™½Éµ…Ð€ô€‰É½‘½ µÕ¹‘•É‘É…¥¸µÑ…É•Ðµ¡½ÍÐµÍÑ…ÉÐ¼Äˆ(€€€•¹•É…Ñ•‘Ð€ô€¡•Ðµ…Ñ”¤¹Q½U¹¥Ù•ÉÍ…±Q¥µ” ¤¹Q½MÑÉ¥¹œ ‰¼ˆ¤(€€€ÉÕ¹%€ô€‘ÉÕ¹%(€€€ÍÑ…ÑÕÌ€ô€‘ÍÑ…ÑÕÌ(€€€µ½‘”€ô€‘5½‘”(€€€µÕÑ…Ñ¥½¹½¹™¥Éµ•€ôm‰½½±t‘½¹™¥Éµ5ÕÑ…Ñ¥½¸(€€€ÁÉ½‘ÕÑ%€ô€‰Õ¹‘•É‘É…¥¸µ‰±½½´µ‰•±½ÜµÕ¹¥ÑäØÀÀÀµØÄˆ(€€€Ý½É±‘½µµ¥Ð€ô€‘áÁ•Ñ•‘]½É±‘½µµ¥Ð(€€€Ý½É±‘QÉ•”€ô€‘áÁ•Ñ•‘]½É±‘QÉ•”(€€€…É½µµ¥Ð€ô€‘áÁ•Ñ•‘É½µµ¥Ð(€€€…ÉQÉ•”€ô€‘áÁ•Ñ•‘ÉQÉ•”(€€€©½‰%€ô€‘)½‰%(€€€‰½½ÑÍÑÉ…À€ôm½É‘•É•‘uì(€€€€€€€ÍÑ…ÑÕÌ€ômÍÑÉ¥¹t‘‰½½ÑÍÑÉ…À¹ÍÑ…ÑÕÌ(€€€€€€€É••¥ÁÐ€ô€‘‰½½ÑÍÑÉ…ÁI••¥ÁÑA…Ñ (€€€€€€€É••¥ÁÑM¡„ÈÔØ€ô•ÐµM¡„ÈÔØ€‘‰½½ÑÍÑÉ…ÁI••¥ÁÑA…Ñ (€€€€€€€•á¥Ñ½‘”€ô€‘‰½½ÑÍÑÉ…Á%¹Ù½…Ñ¥½¸¹•á¥Ñ½‘”(€€€€€€€™¥ÉÍÑ¥Ù•É•¹”€ô¥˜€ ‘‰½½ÑÍÑÉ…À¹½µµ¥ÍÍ¥½¹¥¹œ¹™¥ÉÍÑ¥Ù•É•¹”¤ì(€€€€€€€€€€€mÍÑÉ¥¹t‘‰½½ÑÍÑÉ…À¹½µµ¥ÍÍ¥½¹¥¹œ¹™¥ÉÍÑ¥Ù•É•¹”¹¥(€€€€€€€ô•±Í”ì(€€€€€€€€€€€€‘¹Õ±°(€€€€€€€ô(€€€€€€€¹•áÑ½µµ…¹€ômÍÑÉ¥¹t‘‰½½ÑÍÑÉ…À¹¹•áÐ¹½µµ…¹(€€€ô(€€€½µµ¥ÍÍ¥½¹¥¹œ€ôm½É‘•É•‘uì(€€€€€€€‘•±•…Ñ•€ô€‘‘•±•…Ñ•(€€€€€€€ÍÑ…ÑÕÌ€ô€‘½µµ¥ÍÍ¥½¹¥¹MÑ…ÑÕÌ(€€€€€€€É••¥ÁÐ€ô€‘½µµ¥ÍÍ¥½¹¥¹I••¥ÁÑA…Ñ (€€€€€€€É••¥ÁÑM¡„ÈÔØ€ô€‘½µµ¥ÍÍ¥½¹¥¹I••¥ÁÑM¡„ÈÔØ(€€€€€€€•á¥Ñ½‘”€ô€‘½µµ¥ÍÍ¥½¹¥¹á¥Ð(€€€ô(€€€‰±½­•€ô€‘‰±½­•(€€€…ÕÑ¡½É¥Ñä€ôm½É‘•É•‘uì(€€€€€€€‘¥Í½Ù•Éå¹‘%¹ÍÁ•Ñ¥½¹•™…Õ±Ð€ô€‘ÑÉÕ”(€€€€€€€½µµ¥ÍÍ¥½¹¥¹•±•…Ñ¥½¹I•ÅÕ¥É•ÍáÁ±¥¥Ñ½¹™¥Éµ…Ñ¥½¸€ô€‘ÑÉÕ”(€€€€€€€‘¥É•ÑU¹¥ÑåÕÑ¡½É¥Ñä€ô€‘™…±Í”(€€€€€€€É•Ù¥•ÝÕÑ¡½É¥Ñä€ô€‘™…±Í”(€€€€€€€ÁÉ½‘ÕÑ•ÁÑ…¹•ÕÑ¡½É¥Ñä€ô€‘™…±Í”(€€€€€€€¡Õµ…¹=É!½ÕÍ•¡½±‘•ÁÑ…¹•ÕÑ¡½É¥Ñä€ô€‘™…±Í”(€€€€€€€ÅÕ•ÍÑÕÑ¡½É¥Ñä€ô€‘™…±Í”(€€€€€€€Á¡åÍ¥…±•ÁÑ…¹•ÕÑ¡½É¥Ñä€ô€‘™…±Í”(€€€ô(€€€Á¡åÍ¥…±!Õµ…¹Ù¥‘•¹”€ô€‰Í•Á…É…Ñ”ˆ(€€€ÅÕ•ÍÑ•ÁÑ…¹”€ô€‰½Á•¸ˆ(€€€Á¡åÍ¥…±•ÁÑ…¹”€ô€‰¹½Ðµ¥ÍÍÕ•ˆ)ô((‘É••¥ÁÑA…Ñ €ô)½¥¸µA…Ñ €‘ÉÕ¹I½½Ð€‰Õ¹‘•É‘É…¥¸µÑ…É•Ðµ¡½ÍÐµÍÑ…ÉÐ¹©Í½¸ˆ)]É¥Ñ”µ)Í½¸€‘É••¥ÁÑA…Ñ €‘É••¥ÁÐ(ˆ¡•ÐµM¡„ÈÔØ€‘É••¥ÁÑA…Ñ ¤€Õ¹‘•É‘É…¥¸µÑ…É•Ðµ¡½ÍÐµÍÑ…ÉÐ¹©Í½¸ˆð(€€€M•Ðµ½¹Ñ•¹Ð€µ¹½‘¥¹œ…Í¥¤€ ‘É••¥ÁÑA…Ñ €¬€ˆ¹Í¡„ÈÔØˆ¤)½Áäµ%Ñ•´€µ1¥Ñ•É…±A…Ñ €‘É••¥ÁÑA…Ñ €µ•ÍÑ¥¹…Ñ¥½¸€¡)½¥¸µA…Ñ €‘½ÕÑÁÕÐ€‰Õ¹‘•É‘É…¥¸µÑ…É•Ðµ¡½ÍÐµÍÑ…ÉÐ¹©Í½¸ˆ¤€µ½É”)½Áäµ%Ñ•´€µ1¥Ñ•É…±A…Ñ € ‘É••¥ÁÑA…Ñ €¬€ˆ¹Í¡„ÈÔØˆ¤€µ•ÍÑ¥¹…Ñ¥½¸€¡)½¥¸µA…Ñ €‘½ÕÑÁÕÐ€‰Õ¹‘•É‘É…¥¸µÑ…É•Ðµ¡½ÍÐµÍÑ…ÉÐ¹©Í½¸¹Í¡„ÈÔØˆ¤€µ½É”()]É¥Ñ”µ!½ÍÐ€‰U9II%8Ñ…É•Ðµ¡½ÍÐÍÑ…ÉÐè€‘ÍÑ…ÑÕÌˆ)]É¥Ñ”µ!½ÍÐ€‘É••¥ÁÑA…Ñ )¥˜€ ‘ÍÑ…ÑÕÌ€µ•Ä€‰¡•±ˆ€µ…¹€µ¹½Ð€‘9½…¥°¤ì•á¥Ð€Èô)•á¥Ð€À(
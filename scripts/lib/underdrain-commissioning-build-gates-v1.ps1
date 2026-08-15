Set-StrictMode -Version Latest

function Invoke-UnderdrainBuildGate(
    [string]$Gate,
    [pscustomobject]$Context,
    [System.Collections.IDictionary]$Options,
    [string]$RunLog
) {
    switch ($Gate) {
    "source-custody" {
        return New-CommissioningGateResult "blocked" $null "Correct exact World, ARC, Unity-version, and project custody before continuing."
    }
    "representation-materialization" {
        if ([string]::IsNullOrWhiteSpace($Options.SourceManifest) -or [string]::IsNullOrWhiteSpace($Options.SourceRoot)) {
            return New-CommissioningGateResult "blocked" $null "SourceManifest and SourceRoot are required. Preserve any prior attempt and supply the resolved seven-role source pack."
        }
        $script = Join-Path $Context.WorldPath "scripts\materialize-underdrain-production-representation.ps1"
        Invoke-CommissioningChild $Context $script @{
            WorldRoot = $Context.WorldPath
            ArcRoot = $Context.ArcPath
            EmbodiedArLabRoot = $Context.ProjectRoot
            ExpectedWorldCommit = $Options.ExpectedWorldCommit
            ExpectedArcCommit = $Options.ExpectedArcCommit
            SourceManifest = Resolve-CommissioningPath $Options.SourceManifest (Get-Location).Path
            SourceRoot = Resolve-CommissioningPath $Options.SourceRoot (Get-Location).Path
            UnityEditor = $Options.UnityEditor
            ForceCloseUnity = $Options.ForceCloseUnity
        } "Materializing the exact seven-role UNDERDRAIN representation..." $RunLog
        return New-CommissioningGateResult "completed" $script $null
    }
    "machine-preflight-v2" {
        $script = Join-Path $Context.WorldPath "scripts\preflight-underdrain-unity6000-player-product-v2.ps1"
        Invoke-CommissioningChild $Context $script @{
            WorldRoot = $Context.WorldPath
            ExpectedWorldCommit = $Options.ExpectedWorldCommit
            ArcRoot = $Context.ArcPath
            EmbodiedArLabRoot = $Context.ProjectRoot
            OutputRoot = $Context.PreflightOutput
            UnityEditor = $Options.UnityEditor
        } "Running read-only machine preflight v2..." $RunLog
        return New-CommissioningGateResult "completed" $script $null
    }
    "presentation-asset-approval" {
        $missing = @(
            [string]::IsNullOrWhiteSpace($Options.ApprovalId),
            [string]::IsNullOrWhiteSpace($Options.ApprovalAuthorityId),
            [string]::IsNullOrWhiteSpace($Options.ApprovalName),
            [string]::IsNullOrWhiteSpace($Options.ApprovalAttestation),
            (-not [bool]$Options.ConfirmAllAssets)
        ) -contains $true
        if ($missing) {
            return New-CommissioningGateResult "blocked" $null "Visual review is required. Supply ApprovalId, ApprovalAuthorityId, ApprovalName, ApprovalAttestation, and -ConfirmAllAssets only after inspecting all seven exact prefabs in Unity."
        }
        $script = Join-Path $Context.WorldPath "scripts\approve-underdrain-production-assets.ps1"
        Invoke-CommissioningChild $Context $script @{
            EmbodiedArLabRoot = $Context.ProjectRoot
            PresentationManifest = Join-Path $Context.WorldPath "unity\Fixtures\underdrain.authored-presentation.template.json"
            ProductProfile = Join-Path $Context.WorldPath "unity\Fixtures\underdrain.player-product.json"
            OutputRoot = [System.IO.Path]::GetDirectoryName($Context.ApprovalPath)
            ApprovalId = $Options.ApprovalId
            ApprovalAuthorityId = $Options.ApprovalAuthorityId
            ApprovalName = $Options.ApprovalName
            ApprovalAttestation = $Options.ApprovalAttestation
            ConfirmAllAssets = $true
            UnityEditor = $Options.UnityEditor
            ForceCloseUnity = $Options.ForceCloseUnity
        } "Recording named presentation-asset approval..." $RunLog
        return New-CommissioningGateResult "completed" $script $null
    }
    "player-product-train" {
        $script = Join-Path $Context.WorldPath "scripts\run-underdrain-unity6000-player-product.ps1"
        Invoke-CommissioningChild $Context $script @{
            EmbodiedArLabRoot = $Context.ProjectRoot
            ArcRoot = $Context.ArcPath
            AssetApprovalReceipt = $Context.ApprovalPath
            JobId = $Options.JobId
            UnityEditor = $Options.UnityEditor
            ForceCloseUnity = $Options.ForceCloseUnity
            SkipNpmInstall = $Options.SkipNpmInstall
            SkipUnityTests = $Options.SkipUnityTests
            SkipWindowsSmoke = $Options.SkipWindowsSmoke
            DevelopmentBuild = $Options.DevelopmentBuild
        } "Building and qualifying the exact UNDERDRAIN Windows product..." $RunLog
        return New-CommissioningGateResult "completed" $script $null
    }
    "keyboard-mouse-session" { return Invoke-UnderdrainDeviceGate "keyboard-mouse" $Context $Options $RunLog }
    "gamepad-session" { return Invoke-UnderdrainDeviceGate "gamepad" $Context $Options $RunLog }
    default { return $null }
    }
}

function Invoke-UnderdrainDeviceGate(
    [string]$Device,
    [pscustomobject]$Context,
    [System.Collections.IDictionary]$Options,
    [string]$RunLog
) {
    $receipt = if ($Device -eq "gamepad") { $Context.GamepadPath } else { $Context.KeyboardPath }
    $sessionRoot = [System.IO.Path]::GetDirectoryName($receipt)
    if (Test-CommissioningDirectoryHasFiles $sessionRoot) {
        return New-CommissioningGateResult "blocked" $null "The $Device session directory contains evidence without an accepted session receipt. Preserve it and use a new JobId for another attempt."
    }
    $script = Join-Path $Context.WorldPath "scripts\run-underdrain-player-session.ps1"
    Invoke-CommissioningChild $Context $script @{
        EmbodiedArLabRoot = $Context.ProjectRoot
        ArcRoot = $Context.ArcPath
        JobId = $Options.JobId
        Device = $Device
        InstallArcDependencies = $Options.InstallArcDependencies
        ForceCloseExistingPlayer = $Options.ForceCloseExistingPlayer
    } "Launching the $Device session..." $RunLog
    return New-CommissioningGateResult "completed" $script $null
}

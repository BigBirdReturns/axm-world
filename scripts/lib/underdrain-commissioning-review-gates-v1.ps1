Set-StrictMode -Version Latest

function Invoke-UnderdrainReviewGate(
    [string]$Gate,
    [pscustomobject]$Context,
    [System.Collections.IDictionary]$Options,
    [string]$RunLog
) {
    switch ($Gate) {
    "role-review-kit" {
        if (Test-CommissioningDirectoryHasFiles $Context.ReviewOutput) {
            return New-CommissioningGateResult "blocked" $null "The review directory is not empty and lacks an accepted kit receipt. Preserve it and use a new ReviewRoot or JobId."
        }
        $sessionPath = if ($Options.ReviewSession -eq "gamepad") { $Context.GamepadPath } else { $Context.KeyboardPath }
        $script = Join-Path $Context.WorldPath "scripts\new-underdrain-role-separated-review-kit.ps1"
        Invoke-CommissioningChild $Context $script @{
            PlayerProductTrainReceipt = $Context.TrainPath
            PlayerSessionReceipt = $sessionPath
            OutputRoot = $Context.ReviewOutput
        } "Creating the role-separated review kit..." $RunLog
        return New-CommissioningGateResult "completed" $script $null
    }
    "role-separated-software-review" {
        $player = if ([string]::IsNullOrWhiteSpace($Options.PlayerPacket)) { Join-Path $Context.ReviewOutput "player-packet.json" } else { $Options.PlayerPacket }
        $observer = if ([string]::IsNullOrWhiteSpace($Options.ObserverPacket)) { Join-Path $Context.ReviewOutput "observer-packet.json" } else { $Options.ObserverPacket }
        $adjudicator = if ([string]::IsNullOrWhiteSpace($Options.AdjudicatorPacket)) { Join-Path $Context.ReviewOutput "adjudicator-packet.json" } else { $Options.AdjudicatorPacket }
        $missing = @(@($player, $observer, $adjudicator) | Where-Object { -not (Test-Path -LiteralPath $_ -PathType Leaf) })
        if ($missing.Count -gt 0) {
            return New-CommissioningGateResult "blocked" $null "Complete the three isolated packet functions. Missing: $($missing -join ', ')"
        }
        $kit = Get-Content -LiteralPath $Context.ReviewKitPath -Raw | ConvertFrom-Json
        $script = Join-Path $Context.WorldPath "scripts\record-underdrain-role-separated-software-review.ps1"
        Invoke-CommissioningChild $Context $script @{
            PlayerProductTrainReceipt = $Context.TrainPath
            PlayerSessionReceipt = [string]$kit.playerSessionReceipt
            PlayerPacket = Resolve-CommissioningPath $player (Get-Location).Path
            ObserverPacket = Resolve-CommissioningPath $observer (Get-Location).Path
            AdjudicatorPacket = Resolve-CommissioningPath $adjudicator (Get-Location).Path
            OutputPath = $Context.ReviewPath
        } "Recording the three-seat role-separated software review..." $RunLog
        return New-CommissioningGateResult "completed" $script $null
    }
    "windows-software-product-acceptance" {
        $named = [ordered]@{
            AcceptanceSeatId = $Options.AcceptanceSeatId
            AcceptanceLineageId = $Options.AcceptanceLineageId
            AcceptanceContextDigest = $Options.AcceptanceContextDigest
            AcceptanceName = $Options.AcceptanceName
            AcceptanceAttestation = $Options.AcceptanceAttestation
        }
        $missing = @($named.Keys | Where-Object { [string]::IsNullOrWhiteSpace([string]$named[$_]) })
        if ($missing.Count -gt 0) {
            return New-CommissioningGateResult "blocked" $null "Fourth-seat acceptance inputs are missing: $($missing -join ', ')"
        }
        $script = Join-Path $Context.WorldPath "scripts\accept-underdrain-player-product.ps1"
        Invoke-CommissioningChild $Context $script @{
            PlayerProductTrainReceipt = $Context.TrainPath
            KeyboardMouseSessionReceipt = $Context.KeyboardPath
            GamepadSessionReceipt = $Context.GamepadPath
            RoleSeparatedReviewReceipt = $Context.ReviewPath
            AcceptanceSeatId = $Options.AcceptanceSeatId
            AcceptanceLineageId = $Options.AcceptanceLineageId
            AcceptanceContextDigest = $Options.AcceptanceContextDigest
            AcceptanceName = $Options.AcceptanceName
            AcceptanceAttestation = $Options.AcceptanceAttestation
            OutputPath = $Context.AcceptancePath
        } "Issuing bounded fourth-seat Windows software-product acceptance..." $RunLog
        return New-CommissioningGateResult "completed" $script $null
    }
    default { return $null }
    }
}

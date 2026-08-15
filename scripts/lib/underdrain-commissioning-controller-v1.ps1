Set-StrictMode -Version Latest

$libraryRoot = $PSScriptRoot
foreach ($library in @(
    "underdrain-commissioning-common-v1.ps1",
    "underdrain-commissioning-build-gates-v1.ps1",
    "underdrain-commissioning-review-gates-v1.ps1"
)) {
    $path = Join-Path $libraryRoot $library
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Commissioning library is absent: $path" }
    . $path
}

function New-UnderdrainCommissioningContext([System.Collections.IDictionary]$Options) {
    $world = Resolve-CommissioningPath $Options.WorldRoot (Get-Location).Path
    $arc = Resolve-CommissioningPath $Options.ArcRoot (Get-Location).Path
    $project = Resolve-CommissioningPath $Options.EmbodiedArLabRoot (Get-Location).Path
    $job = Join-Path $project "local\scene-jobs\$($Options.JobId)"
    $stateRoot = if ([string]::IsNullOrWhiteSpace($Options.StateOutputRoot)) { Join-Path $job "output\commissioning-state" } else { $Options.StateOutputRoot }
    $preflightRoot = if ([string]::IsNullOrWhiteSpace($Options.PreflightRoot)) { Join-Path $job "preflight" } else { $Options.PreflightRoot }
    $reviewRoot = if ([string]::IsNullOrWhiteSpace($Options.ReviewRoot)) { Join-Path $job "output\player-train\role-separated-review" } else { $Options.ReviewRoot }
    $state = Resolve-CommissioningPath $stateRoot $project
    $preflight = Resolve-CommissioningPath $preflightRoot $project
    $review = Resolve-CommissioningPath $reviewRoot $project
    New-Item -ItemType Directory -Force $state | Out-Null
    return [pscustomobject]@{
        WorldPath = $world
        ArcPath = $arc
        ProjectRoot = $project
        JobRoot = $job
        StateOutput = $state
        PreflightOutput = $preflight
        ReviewOutput = $review
        HostPowerShell = (Get-Process -Id $PID).Path
        StateScript = Join-Path $Options.ScriptsRoot "get-underdrain-commissioning-state.ps1"
        TrainPath = Join-Path $job "output\player-train\underdrain-unity6000-player-product-train.json"
        ApprovalPath = Join-Path $job "output\player-train\production-asset-approval\production-asset-approval.json"
        KeyboardPath = Join-Path $job "build\receipts\player-session-keyboard-mouse\session-run.json"
        GamepadPath = Join-Path $job "build\receipts\player-session-gamepad\session-run.json"
        ReviewKitPath = Join-Path $review "review-kit-receipt.json"
        ReviewPath = Join-Path $review "role-separated-review.json"
        AcceptancePath = Join-Path $job "output\player-train\underdrain-player-product-acceptance.json"
    }
}

function Invoke-UnderdrainGate(
    [string]$Gate,
    [pscustomobject]$Context,
    [System.Collections.IDictionary]$Options,
    [string]$RunLog
) {
    $result = Invoke-UnderdrainBuildGate $Gate $Context $Options $RunLog
    if ($null -eq $result) { $result = Invoke-UnderdrainReviewGate $Gate $Context $Options $RunLog }
    if ($null -eq $result) { throw "Unsupported commissioning gate: $Gate" }
    return $result
}

function Invoke-UnderdrainCommissioning([System.Collections.IDictionary]$Options) {
    $context = New-UnderdrainCommissioningContext $Options
    if (-not (Test-Path -LiteralPath $context.StateScript -PathType Leaf)) {
        throw "Commissioning-state inspector is absent: $($context.StateScript)"
    }
    $runRoot = Join-Path $context.StateOutput "runs"
    New-Item -ItemType Directory -Force $runRoot | Out-Null
    $runId = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssfffZ")
    $runLog = Join-Path $runRoot "$runId.log"
    $actions = [System.Collections.ArrayList]::new()
    $blocked = $null
    $before = Invoke-CommissioningState $context $Options
    if ([string]::IsNullOrWhiteSpace($Options.ExpectedWorldCommit)) { $Options.ExpectedWorldCommit = [string]$before.value.worldCommit }
    if ([string]::IsNullOrWhiteSpace($Options.ExpectedArcCommit)) { $Options.ExpectedArcCommit = [string]$before.value.arcCommit }
    $current = $before

    if ($Options.Mode -ne "inspect") {
        $maximum = if ($Options.Mode -eq "auto") { 10 } else { 1 }
        for ($step = 0; $step -lt $maximum; $step++) {
            $state = $current.value
            if ($state.status -eq "pass") { break }
            if ($state.status -eq "held") {
                $blocked = [ordered]@{
                    gate = if ($state.firstDivergence) { $state.firstDivergence.id } else { "unknown" }
                    reason = if ($state.firstDivergence) { $state.firstDivergence.message } else { "Commissioning state is held." }
                }
                break
            }
            if ($null -eq $state.firstDivergence) { throw "Open commissioning state lacks a first divergence." }
            $gate = [string]$state.firstDivergence.id
            $action = [ordered]@{ gate = $gate; startedAt = (Get-Date).ToUniversalTime().ToString("o"); script = $null; status = "started" }
            try {
                $result = Invoke-UnderdrainGate $gate $context $Options $runLog
                $action.script = $result.script
                if ($result.status -eq "blocked") {
                    $blocked = [ordered]@{ gate = $gate; reason = $result.reason }
                    $action.status = "blocked"
                    $action.reason = $result.reason
                } else {
                    $action.status = "completed"
                }
            } catch {
                $action.status = "failed"
                $action.error = $_.Exception.Message
                $blocked = [ordered]@{ gate = $gate; reason = $_.Exception.Message }
            }
            $action.completedAt = (Get-Date).ToUniversalTime().ToString("o")
            [void]$actions.Add($action)
            if ($null -ne $blocked) { break }
            $current = Invoke-CommissioningState $context $Options
            if ($Options.Mode -eq "advance") { break }
        }
    }

    $final = if ($Options.Mode -eq "inspect") { $before } else { Invoke-CommissioningState $context $Options }
    $runStatus = if ($null -ne $blocked) { "blocked" } else { [string]$final.value.status }
    $runReceipt = [ordered]@{
        format = "rodoh-underdrain-windows-commissioning-run/1"
        generatedAt = (Get-Date).ToUniversalTime().ToString("o")
        runId = $runId
        status = $runStatus
        mode = $Options.Mode
        productId = "underdrain-bloom-below-unity6000-v1"
        worldCommit = $Options.ExpectedWorldCommit
        arcCommit = $Options.ExpectedArcCommit
        jobId = $Options.JobId
        beforeState = $before.path
        beforeStateSha256 = $before.sha256
        afterState = $final.path
        afterStateSha256 = $final.sha256
        actions = @($actions)
        blocked = $blocked
        nextCommand = $final.value.nextCommand
        windowsSoftwareProductAcceptance = $final.value.windowsSoftwareProductAcceptance
        physicalHumanEvidence = "separate"
        questAcceptance = "open"
        physicalAcceptance = "not-issued"
        authority = "Windows software commissioning orchestration only; no human, household, Quest, or physical acceptance"
        log = if (Test-Path -LiteralPath $runLog -PathType Leaf) { $runLog } else { $null }
    }
    $runPath = Join-Path $runRoot "$runId.json"
    Write-CommissioningJson $runPath $runReceipt
    "$(Get-CommissioningSha256 $runPath)  $([System.IO.Path]::GetFileName($runPath))" | Set-Content -Encoding ascii ($runPath + ".sha256")

    if ($Options.SealEvidence) {
        $export = Join-Path $Options.ScriptsRoot "export-underdrain-commissioning-evidence.ps1"
        Invoke-CommissioningChild $context $export @{
            EmbodiedArLabRoot = $context.ProjectRoot
            JobId = $Options.JobId
            OutputRoot = Join-Path $context.StateOutput "bundles"
        } "Sealing the current commissioning diagnostic bundle..." $runLog
    }

    Write-Host "UNDERDRAIN commissioning run status: $runStatus"
    if ($null -ne $blocked) { Write-Host "Blocked at $($blocked.gate): $($blocked.reason)" }
    Write-Host $runPath
    if ($runStatus -eq "held") { return 2 }
    return 0
}

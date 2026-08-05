[CmdletBinding()]
param(
    [string]$OperatorScript = (Join-Path $PSScriptRoot '..\..\scripts\local-estate\Invoke-RodohEstate.ps1')
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

function Assert-Contains {
    param([string]$Value, [string]$Expected, [string]$Message)
    if (-not $Value.Contains($Expected)) {
        throw "$Message`nExpected fragment: $Expected`nActual:`n$Value"
    }
}

# Invoke-External calls this host function, but command-echo behavior is not the
# object under test. Suppress it so assertions see only native child output.
function Write-Info {
    param([string]$Message)
}

$resolvedScript = [System.IO.Path]::GetFullPath($OperatorScript)
if (-not (Test-Path -LiteralPath $resolvedScript -PathType Leaf)) {
    throw "Operator script is missing: $resolvedScript"
}

$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile(
    $resolvedScript,
    [ref]$tokens,
    [ref]$parseErrors
)
if ($parseErrors.Count -gt 0) {
    throw "Operator script failed PowerShell parsing:`n$($parseErrors | Out-String)"
}

foreach ($name in @('Format-Arguments', 'Invoke-External')) {
    $definition = $ast.Find({
        param($node)
        $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and
            $node.Name -eq $name
    }, $true)
    if ($null -eq $definition) {
        throw "Required function is missing from the operator script: $name"
    }
    Invoke-Expression $definition.Extent.Text
}

$nodeCommand = Get-Command node -ErrorAction Stop
$node = $nodeCommand.Source
if (-not $node) { $node = $nodeCommand.Path }
if (-not $node) { throw 'Node.js command path could not be resolved.' }

$streamed = @(& {
    Invoke-External -FilePath $node -Arguments @(
        '-e',
        'process.stdout.write("stream-stdout\n"); process.stderr.write("stream-stderr\n");'
    ) | Out-Null
} 6>&1)
$streamedText = ($streamed | Out-String)
Assert-Contains $streamedText 'stream-stdout' 'Non-capture stdout was lost behind the caller pipeline.'
Assert-Contains $streamedText 'stream-stderr' 'Non-capture stderr was lost behind the caller pipeline.'

$captured = Invoke-External -FilePath $node -Arguments @(
    '-e',
    'process.stdout.write("capture-stdout\n"); process.stderr.write("capture-stderr\n");'
) -Capture
Assert-True ($captured.Code -eq 0) 'Capture mode changed the successful exit code.'
Assert-Contains $captured.Output 'capture-stdout' 'Capture mode lost stdout.'
Assert-Contains $captured.Output 'capture-stderr' 'Capture mode lost stderr.'

$failed = @(& {
    try {
        Invoke-External -FilePath $node -Arguments @(
            '-e',
            'process.stdout.write("failure-stdout\n"); process.stderr.write("failure-stderr\n"); process.exit(7);'
        ) | Out-Null
        Write-Output '__NO_EXCEPTION__'
    } catch {
        Write-Output "__EXCEPTION__:$($_.Exception.Message)"
    }
} 6>&1)
$failedText = ($failed | Out-String)
Assert-Contains $failedText 'failure-stdout' 'Failing non-capture stdout was not preserved.'
Assert-Contains $failedText 'failure-stderr' 'Failing non-capture stderr was not preserved.'
Assert-Contains $failedText '__EXCEPTION__:Command failed with exit code 7.' 'Failing non-capture exit semantics changed.'
Assert-True (-not $failedText.Contains('__NO_EXCEPTION__')) 'Failing non-capture command did not throw.'

$script:allowedResult = $null
$allowedOutput = @(& {
    $script:allowedResult = Invoke-External -FilePath $node -Arguments @(
        '-e',
        'process.stdout.write("allowed-stdout\n"); process.stderr.write("allowed-stderr\n"); process.exit(9);'
    ) -AllowFailure
} 6>&1)
$allowedText = ($allowedOutput | Out-String)
Assert-Contains $allowedText 'allowed-stdout' 'AllowFailure lost stdout.'
Assert-Contains $allowedText 'allowed-stderr' 'AllowFailure lost stderr.'
Assert-True ($script:allowedResult.Code -eq 9) 'AllowFailure changed the native exit code.'
Assert-True ($script:allowedResult.Output -eq '') 'Non-capture AllowFailure changed the result shape.'

$captureFailureMessage = ''
try {
    Invoke-External -FilePath $node -Arguments @(
        '-e',
        'process.stdout.write("captured-failure-stdout\n"); process.stderr.write("captured-failure-stderr\n"); process.exit(11);'
    ) -Capture | Out-Null
} catch {
    $captureFailureMessage = $_.Exception.Message
}
Assert-Contains $captureFailureMessage 'Command failed with exit code 11.' 'Capture failure lost its exit code.'
Assert-Contains $captureFailureMessage 'captured-failure-stdout' 'Capture failure lost stdout in the exception.'
Assert-Contains $captureFailureMessage 'captured-failure-stderr' 'Capture failure lost stderr in the exception.'

$workingDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ('rodoh-native-output-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $workingDirectory -Force | Out-Null
$before = (Get-Location).Path
try {
    $working = Invoke-External -FilePath $node -Arguments @(
        '-e',
        'process.stdout.write(process.cwd());'
    ) -WorkingDirectory $workingDirectory -Capture
    Assert-True (
        [System.IO.Path]::GetFullPath($working.Output) -eq
        [System.IO.Path]::GetFullPath($workingDirectory)
    ) 'Capture mode did not execute in the requested working directory.'
    Assert-True ((Get-Location).Path -eq $before) 'Invoke-External did not restore the caller location.'
} finally {
    Remove-Item -LiteralPath $workingDirectory -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host 'PASS  Native stdout, stderr, capture, failure, and working-directory semantics are preserved.'

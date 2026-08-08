[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms

$displays = @(
    [System.Windows.Forms.Screen]::AllScreens | ForEach-Object {
        [ordered]@{
            id = $_.DeviceName
            primary = $_.Primary
            x = $_.Bounds.X
            y = $_.Bounds.Y
            width = $_.Bounds.Width
            height = $_.Bounds.Height
            workingX = $_.WorkingArea.X
            workingY = $_.WorkingArea.Y
            workingWidth = $_.WorkingArea.Width
            workingHeight = $_.WorkingArea.Height
        }
    }
)

[ordered]@{
    format = 'motiondeck-windows-display-probe/1'
    status = 'passed'
    observedAt = [DateTimeOffset]::UtcNow.ToString('O')
    displays = $displays
} | ConvertTo-Json -Depth 8 -Compress

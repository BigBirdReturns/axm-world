[CmdletBinding()]
param(
    [string]$OutputPath = $env:MOTIONDECK_OUTPUT_PATH,
    [string]$DisplayId = $env:MOTIONDECK_DISPLAY_ID
)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($OutputPath)) { throw 'OutputPath is required.' }

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$screens = @([System.Windows.Forms.Screen]::AllScreens)
$screen = if ([string]::IsNullOrWhiteSpace($DisplayId)) {
    $screens | Where-Object Primary | Select-Object -First 1
} else {
    $screens | Where-Object DeviceName -eq $DisplayId | Select-Object -First 1
}
if ($null -eq $screen) { throw "Display not found: $DisplayId" }

$directory = [IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($OutputPath))
[IO.Directory]::CreateDirectory($directory) | Out-Null
$bitmap = New-Object Drawing.Bitmap $screen.Bounds.Width, $screen.Bounds.Height, ([Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [Drawing.Graphics]::FromImage($bitmap)
try {
    $graphics.CopyFromScreen($screen.Bounds.Location, [Drawing.Point]::Empty, $screen.Bounds.Size)
    $bitmap.Save($OutputPath, [Drawing.Imaging.ImageFormat]::Png)
} finally {
    $graphics.Dispose()
    $bitmap.Dispose()
}

[ordered]@{
    format = 'motiondeck-display-capture/1'
    status = 'passed'
    outputPath = [IO.Path]::GetFullPath($OutputPath)
    displayId = $screen.DeviceName
    width = $screen.Bounds.Width
    height = $screen.Bounds.Height
    observedAt = [DateTimeOffset]::UtcNow.ToString('O')
} | ConvertTo-Json -Depth 5 -Compress

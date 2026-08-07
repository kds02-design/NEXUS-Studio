param(
  [string]$BodyPath = 'C:\work\00_claude\season4_assets\title-body.png',
  [string]$OutPath = 'C:\work\00_claude\season4_assets\title-combined.png'
)

Add-Type -AssemblyName System.Drawing
$body = [System.Drawing.Bitmap]::FromFile($BodyPath)
$pixelFormat = [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
$canvas = New-Object System.Drawing.Bitmap -ArgumentList 2083,900,$pixelFormat
$g = [System.Drawing.Graphics]::FromImage($canvas)
$g.Clear([System.Drawing.Color]::Transparent)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Keep the existing exact season title artwork and shift it down to make one lockup.
$g.DrawImage($body, 0, 145, 2083, 755)

$font = New-Object System.Drawing.Font('Malgun Gothic', 118, ([System.Drawing.FontStyle]::Bold), [System.Drawing.GraphicsUnit]::Pixel)
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center
$textRect = New-Object System.Drawing.RectangleF 180,35,1723,155

# Compact cinematic shadow and gold/ivory face, matching the previous-season hierarchy.
$shadowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(175,12,35,31))
$shadowRect = New-Object System.Drawing.RectangleF 185,43,1723,155
$label = [string]::Concat([char]0xBD09,[char]0xB9C8,' ',[char]0xC18C,[char]0xC6B8,[char]0xD328,[char]0xC2A4)
$g.DrawString($label, $font, $shadowBrush, $shadowRect, $format)
$outlinePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(235,82,75,42)), 9
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddString($label, $font.FontFamily, [int]$font.Style, 118, $textRect, $format)
$g.DrawPath($outlinePen, $path)
$goldBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($textRect, [System.Drawing.Color]::FromArgb(255,255,250,215), [System.Drawing.Color]::FromArgb(255,209,178,91), 90)
$g.FillPath($goldBrush, $path)
$shinePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(175,255,255,238)), 2
$g.DrawPath($shinePen, $path)

# A restrained divider visually binds the eyebrow to the season title.
$linePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(190,174,231,210)), 4
$g.DrawLine($linePen, 570, 196, 1513, 196)

$canvas.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
$linePen.Dispose(); $shinePen.Dispose(); $goldBrush.Dispose(); $path.Dispose(); $outlinePen.Dispose()
$shadowBrush.Dispose(); $format.Dispose(); $font.Dispose(); $g.Dispose(); $canvas.Dispose(); $body.Dispose()
Write-Output $OutPath

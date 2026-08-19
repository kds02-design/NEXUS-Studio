param(
  [Parameter(Mandatory=$true)][string]$InputPath,
  [Parameter(Mandatory=$true)][string]$OutputPath,
  [int]$MaxDimension = 1500
)

Add-Type -AssemblyName System.Drawing
$source = [System.Drawing.Image]::FromFile($InputPath)
try {
  $scale = [Math]::Min(1.0, $MaxDimension / [double][Math]::Max($source.Width, $source.Height))
  $width = [Math]::Max(1, [int][Math]::Round($source.Width * $scale))
  $height = [Math]::Max(1, [int][Math]::Round($source.Height * $scale))
  $bitmap = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  try {
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
      $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
      $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.DrawImage($source, 0, 0, $width, $height)
    } finally { $graphics.Dispose() }
    $directory = [System.IO.Path]::GetDirectoryName($OutputPath)
    if ($directory) { [System.IO.Directory]::CreateDirectory($directory) | Out-Null }
    $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
  } finally { $bitmap.Dispose() }
  Write-Output "$width x $height -> $OutputPath"
} finally { $source.Dispose() }

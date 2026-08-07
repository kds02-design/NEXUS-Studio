param([Parameter(Mandatory=$true)][string]$OutputPath)

Add-Type -AssemblyName System.Drawing
$width = 2760
$height = 1000
$bitmap = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
try {
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    try {
      $fontFamily = 'HY' + [char]0xACAC + [char]0xACE0 + [char]0xB515
      $fontTop = New-Object System.Drawing.Font($fontFamily, 235, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
      $fontMain = New-Object System.Drawing.Font($fontFamily, 430, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
      try {
        $format = New-Object System.Drawing.StringFormat
        $format.Alignment = [System.Drawing.StringAlignment]::Center
        $format.LineAlignment = [System.Drawing.StringAlignment]::Center
        $topText = [string]([char]0xBD09) + [char]0xB9C8 + ' ' + [char]0xC18C + [char]0xC6B8 + [char]0xD328 + [char]0xC2A4
        $mainText = [string]([char]0xC9C4) + [char]0xBB34 + ' ' + [char]0xC2DC + [char]0xC98C + '5'
        $graphics.DrawString($topText, $fontTop, $brush, (New-Object System.Drawing.RectangleF(120, 55, 2520, 300)), $format)
        $graphics.DrawString($mainText, $fontMain, $brush, (New-Object System.Drawing.RectangleF(55, 325, 2650, 600)), $format)
      } finally {
        $fontTop.Dispose()
        $fontMain.Dispose()
      }
    } finally {
      $brush.Dispose()
    }
  } finally {
    $graphics.Dispose()
  }
  $destination = [IO.Path]::GetFullPath($OutputPath)
  [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destination)) | Out-Null
  $bitmap.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
  $bitmap.Dispose()
}

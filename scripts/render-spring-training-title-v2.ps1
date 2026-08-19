param(
  [string]$OutputPath = 'C:\work\00_claude\spring-training-assets\title-spring-breeze-v2.png'
)

Add-Type -AssemblyName System.Drawing
$width = 1280; $height = 560
$bitmap = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
try {
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $family = New-Object System.Drawing.FontFamily('Noto Serif KR Black')
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center

  function New-TitlePath([string]$text, [float]$size, [float]$centerY) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $emSize = $graphics.DpiY * $size / 72
    $rect = New-Object System.Drawing.RectangleF(40, ($centerY - $size), ($width - 80), ($size * 2.1))
    $path.AddString($text, $family, [int][System.Drawing.FontStyle]::Regular, $emSize, $rect, $format)
    return $path
  }

  $topText = -join @([char]0xB3C5,[char]0xCD08,[char]0xAC70,[char]0xC0AC,[char]0xC758)
  $mainText = (-join @([char]0xBD04,[char]0xB9DE,[char]0xC774)) + ' ' + (-join @([char]0xD2B9,[char]0xD6C8)) + '!'
  $top = New-TitlePath $topText 88 145
  $main = New-TitlePath $mainText 154 345

  $shadowPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(145, 20, 49, 25), 32)
  $shadowPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $matrix = New-Object System.Drawing.Drawing2D.Matrix
  $matrix.Translate(6, 12)
  $shadowTop = $top.Clone(); $shadowTop.Transform($matrix)
  $shadowMain = $main.Clone(); $shadowMain.Transform($matrix)
  $graphics.DrawPath($shadowPen, $shadowTop); $graphics.DrawPath($shadowPen, $shadowMain)

  $outerPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 25, 76, 39), 24)
  $outerPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $graphics.DrawPath($outerPen, $top); $graphics.DrawPath($outerPen, $main)

  $keyPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 184, 218, 80), 11)
  $keyPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $graphics.DrawPath($keyPen, $top); $graphics.DrawPath($keyPen, $main)

  $fillRect = New-Object System.Drawing.RectangleF(0, 40, $width, 440)
  $fill = New-Object System.Drawing.Drawing2D.LinearGradientBrush($fillRect,
    [System.Drawing.Color]::FromArgb(255, 255, 249, 190),
    [System.Drawing.Color]::FromArgb(255, 173, 216, 80),
    [System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
  $graphics.FillPath($fill, $top); $graphics.FillPath($fill, $main)

  $highlight = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(180, 255, 255, 226), 3)
  $highlight.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $hiMatrix = New-Object System.Drawing.Drawing2D.Matrix; $hiMatrix.Translate(-2, -3)
  $hiTop=$top.Clone();$hiTop.Transform($hiMatrix);$hiMain=$main.Clone();$hiMain.Transform($hiMatrix)
  $graphics.DrawPath($highlight,$hiTop);$graphics.DrawPath($highlight,$hiMain)

  $leafBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(245, 199, 230, 93))
  $leafPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 31, 91, 42), 6)
  $graphics.FillEllipse($leafBrush, 1080, 76, 42, 20); $graphics.DrawEllipse($leafPen, 1080, 76, 42, 20)
  $graphics.FillEllipse($leafBrush, 1112, 58, 34, 16); $graphics.DrawEllipse($leafPen, 1112, 58, 34, 16)
  $graphics.DrawLine($leafPen, 1070, 104, 1145, 62)

  $bounds = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
  $data = $bitmap.LockBits($bounds, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  try {
    $bytes = New-Object byte[] ([Math]::Abs($data.Stride) * $height)
    [Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
    $minX=$width;$minY=$height;$maxX=-1;$maxY=-1
    for($y=0;$y -lt $height;$y++){for($x=0;$x -lt $width;$x++){if($bytes[$y*$data.Stride+$x*4+3] -gt 2){if($x -lt $minX){$minX=$x};if($x -gt $maxX){$maxX=$x};if($y -lt $minY){$minY=$y};if($y -gt $maxY){$maxY=$y}}}}
  } finally { $bitmap.UnlockBits($data) }

  $pad=18
  $cropX=[int][Math]::Max(0,([int]$minX-$pad)); $cropY=[int][Math]::Max(0,([int]$minY-$pad))
  $cropRight=[int][Math]::Min($width,([int]$maxX+$pad)); $cropBottom=[int][Math]::Min($height,([int]$maxY+$pad))
  $cropW=[int]($cropRight-$cropX+1); $cropH=[int]($cropBottom-$cropY+1)
  $crop=New-Object System.Drawing.Rectangle($cropX,$cropY,$cropW,$cropH)
  $trimmed=$bitmap.Clone($crop,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  try { [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($OutputPath))|Out-Null; $trimmed.Save($OutputPath,[System.Drawing.Imaging.ImageFormat]::Png) } finally { $trimmed.Dispose() }
  Write-Output "$($crop.Width)x$($crop.Height) -> $OutputPath"
} finally { $graphics.Dispose(); $bitmap.Dispose() }

param(
  [Parameter(Mandatory=$true)][string]$InputPath,
  [Parameter(Mandatory=$true)][string]$OutputPath,
  [int]$Cutoff = 12
)

Add-Type -AssemblyName System.Drawing
$source = [System.Drawing.Bitmap]::FromFile($InputPath)
try {
  $mask = New-Object System.Drawing.Bitmap($source.Width, $source.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  try {
    for ($y = 0; $y -lt $source.Height; $y++) {
      for ($x = 0; $x -lt $source.Width; $x++) {
        $pixel = $source.GetPixel($x, $y)
        $max = [Math]::Max($pixel.R, [Math]::Max($pixel.G, $pixel.B))
        $alpha = if ($max -le $Cutoff) { 0 } else { [int][Math]::Round((($max - $Cutoff) / [double](255 - $Cutoff)) * 255) }
        $mask.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, 255, 255, 255))
      }
    }
    $directory = [System.IO.Path]::GetDirectoryName($OutputPath)
    if ($directory) { [System.IO.Directory]::CreateDirectory($directory) | Out-Null }
    $mask.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally { $mask.Dispose() }
} finally { $source.Dispose() }

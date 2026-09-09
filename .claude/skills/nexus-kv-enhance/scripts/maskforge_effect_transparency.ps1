param(
    [Parameter(Mandatory = $true)][string]$InputPath,
    [Parameter(Mandatory = $true)][string]$OutputPath,
    [int]$Cutoff = 6,
    [double]$Gamma = 0.85,
    [int]$Opacity = 100,
    [bool]$RecoverColor = $true
)

$ErrorActionPreference = 'Stop'
$inputFull = [System.IO.Path]::GetFullPath($InputPath)
$outputFull = [System.IO.Path]::GetFullPath($OutputPath)
if (-not [System.IO.File]::Exists($inputFull)) { throw "Input not found: $inputFull" }
if ($Cutoff -lt 0 -or $Cutoff -gt 254) { throw 'Cutoff must be 0..254' }
if ($Gamma -le 0) { throw 'Gamma must be greater than zero' }
if ($Opacity -lt 0 -or $Opacity -gt 100) { throw 'Opacity must be 0..100' }

$parent = [System.IO.Path]::GetDirectoryName($outputFull)
if (-not [System.IO.Directory]::Exists($parent)) { [System.IO.Directory]::CreateDirectory($parent) | Out-Null }

Add-Type -AssemblyName System.Drawing
if (-not ('MaskForgeEffectConverter' -as [type])) {
    Add-Type -ReferencedAssemblies 'System.Drawing.dll' -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
public static class MaskForgeEffectConverter {
  public static void Convert(string input, string output, int cutoff, double gamma, int opacity, bool recover) {
    using (var src = new Bitmap(input))
    using (var dst = new Bitmap(src.Width, src.Height, PixelFormat.Format32bppArgb)) {
      double opacityScale = opacity / 100.0;
      for (int y = 0; y < src.Height; y++) for (int x = 0; x < src.Width; x++) {
        Color c = src.GetPixel(x, y);
        double distance = Math.Max(c.R, Math.Max(c.G, c.B));
        double normalized = Math.Max(0.0, (distance - cutoff) / (255.0 - cutoff));
        int alpha = (int)Math.Round(255.0 * Math.Pow(normalized, gamma) * opacityScale);
        if (alpha <= 0) { dst.SetPixel(x, y, Color.Transparent); continue; }
        int r = c.R, g = c.G, b = c.B;
        if (recover) {
          double a = alpha / 255.0;
          r = (int)Math.Min(255, Math.Round(c.R / a));
          g = (int)Math.Min(255, Math.Round(c.G / a));
          b = (int)Math.Min(255, Math.Round(c.B / a));
        }
        dst.SetPixel(x, y, Color.FromArgb(alpha, r, g, b));
      }
      dst.Save(output, ImageFormat.Png);
    }
  }
}
'@
}

[MaskForgeEffectConverter]::Convert($inputFull, $outputFull, $Cutoff, $Gamma, $Opacity, $RecoverColor)
$result = [System.Drawing.Bitmap]::FromFile($outputFull)
try {
    [pscustomobject]@{
        output = $outputFull
        width = $result.Width
        height = $result.Height
        cutoff = $Cutoff
        gamma = $Gamma
        opacity = $Opacity
        recoverColor = $RecoverColor
    } | ConvertTo-Json -Compress
} finally {
    $result.Dispose()
}

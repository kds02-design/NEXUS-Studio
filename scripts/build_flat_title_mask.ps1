param(
  [Parameter(Mandatory=$true)][string]$InputPath,
  [Parameter(Mandatory=$true)][string]$OutputPath,
  [int]$Cutoff = 10
)

Add-Type -ReferencedAssemblies 'System.Drawing.dll' -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class FlatTitleMask {
  public static void Convert(string input, string output, int cutoff) {
    using (var source0 = new Bitmap(input))
    using (var source = new Bitmap(source0.Width, source0.Height, PixelFormat.Format32bppArgb)) {
      using (var g = Graphics.FromImage(source)) g.DrawImageUnscaled(source0, 0, 0);
      var rect = new Rectangle(0, 0, source.Width, source.Height);
      var data = source.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
      var bytes = new byte[Math.Abs(data.Stride) * source.Height];
      Marshal.Copy(data.Scan0, bytes, 0, bytes.Length);
      source.UnlockBits(data);

      using (var outputImage = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppArgb)) {
        var outputData = outputImage.LockBits(rect, ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
        var result = new byte[Math.Abs(outputData.Stride) * outputImage.Height];
        for (int y = 0; y < source.Height; y++) {
          for (int x = 0; x < source.Width; x++) {
            int i = y * data.Stride + x * 4;
            int j = y * outputData.Stride + x * 4;
            int max = Math.Max(bytes[i], Math.Max(bytes[i + 1], bytes[i + 2]));
            int alpha = max <= cutoff ? 0 : (int)Math.Round(Math.Min(1.0, (max - cutoff) / (255.0 - cutoff)) * bytes[i + 3]);
            result[j] = result[j + 1] = result[j + 2] = 255;
            result[j + 3] = (byte)alpha;
          }
        }
        Marshal.Copy(result, 0, outputData.Scan0, result.Length);
        outputImage.UnlockBits(outputData);
        outputImage.Save(output, ImageFormat.Png);
      }
    }
  }
}
'@

$source = (Resolve-Path -LiteralPath $InputPath).Path
$destination = [IO.Path]::GetFullPath($OutputPath)
[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destination)) | Out-Null
[FlatTitleMask]::Convert($source, $destination, $Cutoff)

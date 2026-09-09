param(
  [Parameter(Mandatory=$true)][string]$InputPath,
  [Parameter(Mandatory=$true)][string]$OutputPath,
  [int]$Padding = 16,
  [int]$AlphaThreshold = 2
)

Add-Type -ReferencedAssemblies 'System.Drawing.dll' -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
public static class RobustAlphaTrim {
  public static void Run(string input, string output, int padding, int threshold) {
    using (var source = new Bitmap(input)) {
      int minX = source.Width, minY = source.Height, maxX = -1, maxY = -1;
      for (int y = 0; y < source.Height; y++) {
        for (int x = 0; x < source.Width; x++) {
          if (source.GetPixel(x, y).A <= threshold) continue;
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
      if (maxX < minX) throw new Exception("No visible alpha pixels");
      minX = Math.Max(0, minX - padding); minY = Math.Max(0, minY - padding);
      maxX = Math.Min(source.Width - 1, maxX + padding); maxY = Math.Min(source.Height - 1, maxY + padding);
      int width = maxX - minX + 1, height = maxY - minY + 1;
      using (var result = new Bitmap(width, height, PixelFormat.Format32bppArgb)) {
        using (var graphics = Graphics.FromImage(result)) {
          graphics.Clear(Color.Transparent);
          graphics.DrawImage(source, new Rectangle(0, 0, width, height), new Rectangle(minX, minY, width, height), GraphicsUnit.Pixel);
        }
        result.Save(output, ImageFormat.Png);
      }
      Console.WriteLine(width + " x " + height);
    }
  }
}
'@

$source = (Resolve-Path -LiteralPath $InputPath).Path
$destination = [IO.Path]::GetFullPath($OutputPath)
[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destination)) | Out-Null
[RobustAlphaTrim]::Run($source, $destination, $Padding, $AlphaThreshold)

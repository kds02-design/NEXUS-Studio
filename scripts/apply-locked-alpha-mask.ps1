param(
  [Parameter(Mandatory=$true)][string]$RenderedPath,
  [Parameter(Mandatory=$true)][string]$MaskPath,
  [Parameter(Mandatory=$true)][string]$OutputPath
)

Add-Type -ReferencedAssemblies 'System.Drawing.dll' -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class LockedAlphaMask {
  public static void Apply(string renderedPath, string maskPath, string outputPath) {
    using (var rendered0 = new Bitmap(renderedPath))
    using (var rendered = new Bitmap(rendered0.Width, rendered0.Height, PixelFormat.Format32bppArgb))
    using (var mask0 = new Bitmap(maskPath))
    using (var mask = new Bitmap(rendered0.Width, rendered0.Height, PixelFormat.Format32bppArgb)) {
      using (var g = Graphics.FromImage(rendered)) g.DrawImageUnscaled(rendered0, 0, 0);
      using (var g = Graphics.FromImage(mask)) {
        g.Clear(Color.Transparent);
        g.CompositingMode = CompositingMode.SourceCopy;
        g.InterpolationMode = InterpolationMode.HighQualityBicubic;
        g.DrawImage(mask0, 0, 0, mask.Width, mask.Height);
      }
      var rect = new Rectangle(0, 0, rendered.Width, rendered.Height);
      var rd = rendered.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
      var md = mask.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
      int rn = Math.Abs(rd.Stride) * rendered.Height;
      int mn = Math.Abs(md.Stride) * mask.Height;
      var rp = new byte[rn]; var mp = new byte[mn];
      Marshal.Copy(rd.Scan0, rp, 0, rn); Marshal.Copy(md.Scan0, mp, 0, mn);
      rendered.UnlockBits(rd); mask.UnlockBits(md);
      using (var output = new Bitmap(rendered.Width, rendered.Height, PixelFormat.Format32bppArgb)) {
        var od = output.LockBits(rect, ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
        var op = new byte[Math.Abs(od.Stride) * output.Height];
        for (int y = 0; y < output.Height; y++) for (int x = 0; x < output.Width; x++) {
          int ri = y * rd.Stride + x * 4, mi = y * md.Stride + x * 4, oi = y * od.Stride + x * 4;
          op[oi] = rp[ri]; op[oi + 1] = rp[ri + 1]; op[oi + 2] = rp[ri + 2]; op[oi + 3] = mp[mi + 3];
        }
        Marshal.Copy(op, 0, od.Scan0, op.Length); output.UnlockBits(od);
        output.Save(outputPath, ImageFormat.Png);
      }
    }
  }
}
'@

$rendered = (Resolve-Path -LiteralPath $RenderedPath).Path
$mask = (Resolve-Path -LiteralPath $MaskPath).Path
$output = [IO.Path]::GetFullPath($OutputPath)
[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($output)) | Out-Null
[LockedAlphaMask]::Apply($rendered, $mask, $output)

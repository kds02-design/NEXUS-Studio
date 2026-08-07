param(
  [Parameter(Mandatory=$true)][string]$InputPath,
  [Parameter(Mandatory=$true)][string]$OutputPath,
  [int]$Threshold = 6,
  [int]$FeatherRange = 42
)

Add-Type -ReferencedAssemblies 'System.Drawing.dll' -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public static class BlackLumaKey {
  public static void Convert(string input, string output, int threshold, int feather) {
    using (var src = new Bitmap(input))
    using (var bmp = new Bitmap(src.Width, src.Height, PixelFormat.Format32bppArgb)) {
      using (var g = Graphics.FromImage(bmp)) g.DrawImageUnscaled(src, 0, 0);
      var rect = new Rectangle(0,0,bmp.Width,bmp.Height);
      var data = bmp.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
      int bytes=Math.Abs(data.Stride)*bmp.Height; var px=new byte[bytes]; Marshal.Copy(data.Scan0,px,0,bytes);
      for(int y=0;y<bmp.Height;y++){int row=y*data.Stride;for(int x=0;x<bmp.Width;x++){int i=row+x*4;
        int lum=Math.Max(px[i],Math.Max(px[i+1],px[i+2])); int a;
        if(lum<=threshold)a=0; else if(lum<threshold+feather)a=(int)Math.Round((lum-threshold)/(double)feather*255.0); else a=255;
        px[i+3]=(byte)Math.Max(0,Math.Min(255,a));
      }}
      Marshal.Copy(px,0,data.Scan0,bytes); bmp.UnlockBits(data); bmp.Save(output,ImageFormat.Png);
    }
  }
}
'@
$src=(Resolve-Path -LiteralPath $InputPath).Path
$dst=[System.IO.Path]::GetFullPath($OutputPath)
[System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($dst))|Out-Null
[BlackLumaKey]::Convert($src,$dst,$Threshold,$FeatherRange)

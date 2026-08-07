param(
  [Parameter(Mandatory=$true)][string]$InputPath,
  [Parameter(Mandatory=$true)][string]$CharacterOutput,
  [Parameter(Mandatory=$true)][string]$EffectOutput,
  [int]$CanvasHeight = 1500,
  [double]$CanvasRatio = 1.7777777778,
  [double]$CharacterHeightRatio = 1.0
)

Add-Type -ReferencedAssemblies 'System.Drawing.dll' -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class CharacterFxCanvas {
  static byte[] Blur(byte[] src, int w, int h, int radius) {
    var tmp = new byte[src.Length]; var dst = new byte[src.Length];
    for (int y=0;y<h;y++) { int sum=0; for(int x=-radius;x<=radius;x++) sum += src[y*w+Math.Max(0,Math.Min(w-1,x))];
      for(int x=0;x<w;x++){ tmp[y*w+x]=(byte)(sum/(radius*2+1)); int a=Math.Max(0,x-radius),b=Math.Min(w-1,x+radius+1); sum += src[y*w+b]-src[y*w+a]; } }
    for (int x=0;x<w;x++) { int sum=0; for(int y=-radius;y<=radius;y++) sum += tmp[Math.Max(0,Math.Min(h-1,y))*w+x];
      for(int y=0;y<h;y++){ dst[y*w+x]=(byte)(sum/(radius*2+1)); int a=Math.Max(0,y-radius),b=Math.Min(h-1,y+radius+1); sum += tmp[b*w+x]-tmp[a*w+x]; } }
    return dst;
  }
  public static void Run(string input, string characterOutput, string effectOutput, int ch, double ratio, double charRatio) {
    int cw=(int)Math.Round(ch*ratio);
    using(var src0=new Bitmap(input)) using(var src=new Bitmap(src0.Width,src0.Height,PixelFormat.Format32bppArgb)) {
      using(var g=Graphics.FromImage(src)) g.DrawImageUnscaled(src0,0,0);
      int dh=(int)Math.Round(ch*charRatio), dw=(int)Math.Round(src.Width*(dh/(double)src.Height));
      int dx=(cw-dw)/2, dy=(ch-dh)/2;
      using(var character=new Bitmap(cw,ch,PixelFormat.Format32bppArgb)) {
        using(var g=Graphics.FromImage(character)){ g.Clear(Color.Transparent); g.CompositingMode=CompositingMode.SourceCopy; g.InterpolationMode=InterpolationMode.HighQualityBicubic; g.PixelOffsetMode=PixelOffsetMode.HighQuality; g.DrawImage(src,new Rectangle(dx,dy,dw,dh)); }
        character.Save(characterOutput,ImageFormat.Png);
        var rect=new Rectangle(0,0,cw,ch); var d=character.LockBits(rect,ImageLockMode.ReadOnly,PixelFormat.Format32bppArgb); var p=new byte[Math.Abs(d.Stride)*ch]; Marshal.Copy(d.Scan0,p,0,p.Length); character.UnlockBits(d);
        var alpha=new byte[cw*ch]; for(int y=0;y<ch;y++)for(int x=0;x<cw;x++)alpha[y*cw+x]=p[y*d.Stride+x*4+3];
        var outer=new byte[alpha.Length];
        int r=1; for(int y=0;y<ch;y++)for(int x=0;x<cw;x++){ int mx=0; for(int yy=Math.Max(0,y-r);yy<=Math.Min(ch-1,y+r);yy++)for(int xx=Math.Max(0,x-r);xx<=Math.Min(cw-1,x+r);xx++)mx=Math.Max(mx,alpha[yy*cw+xx]); outer[y*cw+x]=(byte)Math.Max(0,mx-alpha[y*cw+x]); }
        var soft=Blur(outer,cw,ch,3); var wide=Blur(outer,cw,ch,18);
        using(var fx=new Bitmap(cw,ch,PixelFormat.Format32bppArgb)){ var fd=fx.LockBits(rect,ImageLockMode.WriteOnly,PixelFormat.Format32bppArgb); var q=new byte[Math.Abs(fd.Stride)*ch];
          for(int y=0;y<ch;y++)for(int x=0;x<cw;x++){ int i=y*cw+x,j=y*fd.Stride+x*4; double side=x/(double)cw; byte a=(byte)Math.Min(165,soft[i]*1.35+wide[i]*2.2); if(a<2)continue; bool warm=side>0.5; q[j]=(byte)(warm?80:185); q[j+1]=(byte)(warm?185:225); q[j+2]=(byte)(warm?255:190); q[j+3]=a; }
          Marshal.Copy(q,0,fd.Scan0,q.Length); fx.UnlockBits(fd); fx.Save(effectOutput,ImageFormat.Png); }
      }
    }
  }
}
'@

$src=(Resolve-Path -LiteralPath $InputPath).Path
$char=[IO.Path]::GetFullPath($CharacterOutput)
$fx=[IO.Path]::GetFullPath($EffectOutput)
[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($char))|Out-Null
[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($fx))|Out-Null
[CharacterFxCanvas]::Run($src,$char,$fx,$CanvasHeight,$CanvasRatio,$CharacterHeightRatio)

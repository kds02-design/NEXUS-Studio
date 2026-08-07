param(
  [Parameter(Mandatory=$true)][string]$InputPath,
  [Parameter(Mandatory=$true)][string]$OutputPath,
  [int]$Padding=8,
  [int]$AlphaThreshold=2
)
Add-Type -ReferencedAssemblies 'System.Drawing.dll' -TypeDefinition @'
using System;using System.Drawing;using System.Drawing.Imaging;using System.Runtime.InteropServices;
public static class TrimTransparent{
 public static void Run(string input,string output,int pad,int threshold){using(var s0=new Bitmap(input))using(var s=new Bitmap(s0.Width,s0.Height,PixelFormat.Format32bppArgb)){using(var g=Graphics.FromImage(s))g.DrawImageUnscaled(s0,0,0);var r=new Rectangle(0,0,s.Width,s.Height);var d=s.LockBits(r,ImageLockMode.ReadOnly,PixelFormat.Format32bppArgb);var p=new byte[Math.Abs(d.Stride)*s.Height];Marshal.Copy(d.Scan0,p,0,p.Length);s.UnlockBits(d);int minX=s.Width,minY=s.Height,maxX=-1,maxY=-1;for(int y=0;y<s.Height;y++)for(int x=0;x<s.Width;x++){if(p[y*d.Stride+x*4+3]<=threshold)continue;if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}if(maxX<minX)throw new Exception("No visible alpha pixels");minX=Math.Max(0,minX-pad);minY=Math.Max(0,minY-pad);maxX=Math.Min(s.Width-1,maxX+pad);maxY=Math.Min(s.Height-1,maxY+pad);int w=maxX-minX+1,h=maxY-minY+1;using(var o=new Bitmap(w,h,PixelFormat.Format32bppArgb)){using(var g=Graphics.FromImage(o)){g.Clear(Color.Transparent);g.DrawImage(s,new Rectangle(0,0,w,h),new Rectangle(minX,minY,w,h),GraphicsUnit.Pixel);}o.Save(output,ImageFormat.Png);}}
 }
}
'@
$src=(Resolve-Path -LiteralPath $InputPath).Path;$dst=[IO.Path]::GetFullPath($OutputPath);[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($dst))|Out-Null;[TrimTransparent]::Run($src,$dst,$Padding,$AlphaThreshold)

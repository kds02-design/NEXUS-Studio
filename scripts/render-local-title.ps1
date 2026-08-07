param(
  [Parameter(Mandatory=$true)][string]$InputPath,
  [Parameter(Mandatory=$true)][string]$OutputPath,
  [int]$Width=2048,
  [int]$Height=1143
)
Add-Type -ReferencedAssemblies 'System.Drawing.dll' -TypeDefinition @'
using System;using System.Drawing;using System.Drawing.Drawing2D;using System.Drawing.Imaging;using System.Runtime.InteropServices;
public static class LocalTitleRenderer{
 public static void Run(string input,string output,int w,int h){using(var s0=new Bitmap(input))using(var s=new Bitmap(w,h,PixelFormat.Format32bppArgb)){using(var g=Graphics.FromImage(s)){g.Clear(Color.Black);g.InterpolationMode=InterpolationMode.HighQualityBicubic;g.DrawImage(s0,0,0,w,h);}var r=new Rectangle(0,0,w,h);var d=s.LockBits(r,ImageLockMode.ReadOnly,PixelFormat.Format32bppArgb);var p=new byte[Math.Abs(d.Stride)*h];Marshal.Copy(d.Scan0,p,0,p.Length);s.UnlockBits(d);var a=new byte[w*h];for(int y=0;y<h;y++)for(int x=0;x<w;x++){int i=y*d.Stride+x*4;int lum=(p[i]+p[i+1]+p[i+2])/3;a[y*w+x]=(byte)(lum<18?0:Math.Min(255,(lum-18)*5));}var dil=new byte[a.Length];for(int y=0;y<h;y++)for(int x=0;x<w;x++){int mx=0;for(int yy=Math.Max(0,y-4);yy<=Math.Min(h-1,y+4);yy++)for(int xx=Math.Max(0,x-4);xx<=Math.Min(w-1,x+4);xx++)mx=Math.Max(mx,(int)a[yy*w+xx]);dil[y*w+x]=(byte)mx;}using(var o=new Bitmap(w,h,PixelFormat.Format32bppArgb)){var od=o.LockBits(r,ImageLockMode.WriteOnly,PixelFormat.Format32bppArgb);var q=new byte[Math.Abs(od.Stride)*h];for(int y=0;y<h;y++)for(int x=0;x<w;x++){int k=y*w+x,j=y*od.Stride+x*4;bool upper=y<h*.46;byte aa=a[k];if(aa>0){double t=upper?Math.Max(0,Math.Min(1,(y-h*.18)/(h*.27))):Math.Max(0,Math.Min(1,(y-h*.48)/(h*.35)));int rr=upper?(int)(246-45*t):(int)(239-38*t);int gg=upper?(int)(211-56*t):(int)(241-32*t);int bb=upper?(int)(132-55*t):(int)(222-38*t);q[j]=(byte)bb;q[j+1]=(byte)gg;q[j+2]=(byte)rr;q[j+3]=aa;}else if(dil[k]>0){q[j]=42;q[j+1]=39;q[j+2]=52;q[j+3]=(byte)Math.Min(220,(int)dil[k]);}}Marshal.Copy(q,0,od.Scan0,q.Length);o.UnlockBits(od);o.Save(output,ImageFormat.Png);}}}
}
'@
$src=(Resolve-Path -LiteralPath $InputPath).Path;$dst=[IO.Path]::GetFullPath($OutputPath);[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($dst))|Out-Null;[LocalTitleRenderer]::Run($src,$dst,$Width,$Height)

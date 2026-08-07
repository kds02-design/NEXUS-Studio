param([Parameter(Mandatory=$true)][string]$InputPath,[Parameter(Mandatory=$true)][string]$OutputPath,[int]$Radius=22)
Add-Type -ReferencedAssemblies 'System.Drawing.dll' -TypeDefinition @'
using System; using System.Drawing; using System.Drawing.Imaging; using System.Runtime.InteropServices;
public static class ExactAlphaGlow {
 static byte[] Blur(byte[] a,int w,int h,int r){
  var tmp=new int[w*h]; var outp=new byte[w*h];
  for(int y=0;y<h;y++){int sum=0; for(int x=-r;x<=r;x++) if(x>=0&&x<w) sum+=a[y*w+x];
   for(int x=0;x<w;x++){tmp[y*w+x]=sum; int rem=x-r,add=x+r+1; if(rem>=0)sum-=a[y*w+rem];if(add<w)sum+=a[y*w+add];}}
  for(int x=0;x<w;x++){long sum=0; for(int y=-r;y<=r;y++)if(y>=0&&y<h)sum+=tmp[y*w+x];
   for(int y=0;y<h;y++){int countX=Math.Min(w-1,x+r)-Math.Max(0,x-r)+1;int countY=Math.Min(h-1,y+r)-Math.Max(0,y-r)+1;
    outp[y*w+x]=(byte)Math.Min(255,sum/(countX*countY));int rem=y-r,add=y+r+1;if(rem>=0)sum-=tmp[rem*w+x];if(add<h)sum+=tmp[add*w+x];}}
  return outp;
 }
 public static void Convert(string input,string output,int radius){
  using(var src0=new Bitmap(input)) using(var src=new Bitmap(src0.Width,src0.Height,PixelFormat.Format32bppArgb)){
   using(var g=Graphics.FromImage(src))g.DrawImageUnscaled(src0,0,0); int w=src.Width,h=src.Height;
   var rect=new Rectangle(0,0,w,h);var sd=src.LockBits(rect,ImageLockMode.ReadOnly,PixelFormat.Format32bppArgb);int bytes=Math.Abs(sd.Stride)*h;var px=new byte[bytes];Marshal.Copy(sd.Scan0,px,0,bytes);src.UnlockBits(sd);
   var alpha=new byte[w*h];for(int y=0;y<h;y++)for(int x=0;x<w;x++)alpha[y*w+x]=px[y*sd.Stride+x*4+3];
   var wide=Blur(alpha,w,h,radius);var tight=Blur(alpha,w,h,Math.Max(3,radius/3));
   using(var dst=new Bitmap(w,h,PixelFormat.Format32bppArgb)){var dd=dst.LockBits(rect,ImageLockMode.WriteOnly,PixelFormat.Format32bppArgb);var o=new byte[Math.Abs(dd.Stride)*h];
    for(int y=0;y<h;y++)for(int x=0;x<w;x++){int q=y*w+x,i=y*dd.Stride+x*4;int outer=Math.Max(0,wide[q]-alpha[q]);int rim=Math.Max(0,tight[q]-alpha[q]);int A=alpha[q]>4?0:Math.Min(190,outer+rim);double t=y/(double)Math.Max(1,h-1);
     o[i]=(byte)(t<0.58?220:120);o[i+1]=(byte)(t<0.58?245:220);o[i+2]=(byte)(t<0.58?145:245);o[i+3]=(byte)A;}
    Marshal.Copy(o,0,dd.Scan0,o.Length);dst.UnlockBits(dd);dst.Save(output,ImageFormat.Png);}
  }
 }
}
'@
$src=(Resolve-Path -LiteralPath $InputPath).Path;$dst=[IO.Path]::GetFullPath($OutputPath)
[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($dst))|Out-Null
[ExactAlphaGlow]::Convert($src,$dst,$Radius)

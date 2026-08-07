param([Parameter(Mandatory=$true)][string]$InputPath,[Parameter(Mandatory=$true)][string]$OutputPath)
Add-Type -ReferencedAssemblies 'System.Drawing.dll' -TypeDefinition @'
using System; using System.Drawing; using System.Drawing.Imaging; using System.Runtime.InteropServices;
public static class MagentaKey {
 public static void Convert(string input,string output){
  using(var src=new Bitmap(input)) using(var bmp=new Bitmap(src.Width,src.Height,PixelFormat.Format32bppArgb)){
   using(var g=Graphics.FromImage(bmp)) g.DrawImageUnscaled(src,0,0);
   var rect=new Rectangle(0,0,bmp.Width,bmp.Height); var d=bmp.LockBits(rect,ImageLockMode.ReadWrite,PixelFormat.Format32bppArgb);
   int bytes=Math.Abs(d.Stride)*bmp.Height; var p=new byte[bytes]; Marshal.Copy(d.Scan0,p,0,bytes);
   for(int y=0;y<bmp.Height;y++){int row=y*d.Stride; for(int x=0;x<bmp.Width;x++){int i=row+x*4; int b=p[i],g=p[i+1],r=p[i+2];
    double dist=Math.Sqrt((255-r)*(255-r)+g*g+(255-b)*(255-b)); int a=dist<=12?0:(dist>=120?255:(int)Math.Round((dist-12)/108.0*255));
    int dom=Math.Min(r,b)-g, rb=Math.Abs(r-b);
    if(r>75&&b>75&&rb<90&&dom>22){double keep=Math.Max(0,Math.Min(1,(dom-22)/70.0));a=(int)Math.Round(a*(1-keep));}
    if(a<255){int spill=Math.Max(0,Math.Min(r,b)-g); r=Math.Max(0,r-spill); b=Math.Max(0,b-spill); p[i]=(byte)b;p[i+2]=(byte)r;} p[i+3]=(byte)Math.Max(0,Math.Min(255,a));
   }}
   Marshal.Copy(p,0,d.Scan0,bytes);bmp.UnlockBits(d);bmp.Save(output,ImageFormat.Png);
  }
 }
}
'@
$src=(Resolve-Path -LiteralPath $InputPath).Path; $dst=[IO.Path]::GetFullPath($OutputPath)
[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($dst))|Out-Null
[MagentaKey]::Convert($src,$dst)

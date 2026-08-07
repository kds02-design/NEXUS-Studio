param(
  [Parameter(Mandatory=$true)][string]$OutputPath,
  [int]$Width=1180,
  [int]$Height=750
)
Add-Type -ReferencedAssemblies 'System.Drawing.dll' -TypeDefinition @'
using System;using System.Drawing;using System.Drawing.Imaging;using System.Runtime.InteropServices;
public static class GlobalDramaticFx{
 static void Over(ref double r,ref double g,ref double b,ref double a,double sr,double sg,double sb,double sa){double oa=sa+a*(1-sa);if(oa<=0)return;r=(sr*sa+r*a*(1-sa))/oa;g=(sg*sa+g*a*(1-sa))/oa;b=(sb*sa+b*a*(1-sa))/oa;a=oa;}
 static double Clamp(double v){return Math.Max(0,Math.Min(1,v));}
 public static void Run(string output,int w,int h){using(var o=new Bitmap(w,h,PixelFormat.Format32bppArgb)){var rect=new Rectangle(0,0,w,h);var d=o.LockBits(rect,ImageLockMode.WriteOnly,PixelFormat.Format32bppArgb);var p=new byte[Math.Abs(d.Stride)*h];for(int y=0;y<h;y++)for(int x=0;x<w;x++){double r=0,g=0,b=0,a=0;
   double dx=(x-w*.89)/(w*.34),dy=(y-h*.05)/(h*.52),rad=Math.Sqrt(dx*dx+dy*dy);double warm=Clamp(1-rad)*.19;Over(ref r,ref g,ref b,ref a,1,.58,.22,warm);
   double line1=Math.Abs((x-w*.91)-(.30*(y+h*.08)));double ray1=Clamp(1-line1/(w*.055))*Clamp(1-y/(h*.95))*.045;Over(ref r,ref g,ref b,ref a,1,.72,.38,ray1);
   double line2=Math.Abs((x-w*.78)-(.18*(y+h*.05)));double ray2=Clamp(1-line2/(w*.035))*Clamp(1-y/(h*.8))*.025;Over(ref r,ref g,ref b,ref a,1,.82,.54,ray2);
   double cx=(x-w*.50)/(w*.42),cy=(y-h*.56)/(h*.52),mist=Clamp(1-Math.Sqrt(cx*cx+cy*cy))*.025;Over(ref r,ref g,ref b,ref a,.48,.78,.68,mist);
   double edge=Math.Max(Math.Abs(x-w*.5)/(w*.5),Math.Abs(y-h*.5)/(h*.5));double vig=Clamp((edge-.72)/.28)*.12;Over(ref r,ref g,ref b,ref a,.015,.02,.02,vig);
   int i=y*d.Stride+x*4;p[i]=(byte)Math.Round(b*255);p[i+1]=(byte)Math.Round(g*255);p[i+2]=(byte)Math.Round(r*255);p[i+3]=(byte)Math.Round(a*255);
  }
  var rng=new Random(52026);for(int n=0;n<44;n++){int x=rng.Next(40,w-40),y=rng.Next(40,h-55);bool protectedZone=(x<720&&y>150&&y<610)||(x>700&&y<430);if(protectedZone){n--;continue;}int rr=rng.Next(1,3);double alpha=.18+rng.NextDouble()*.28;for(int yy=Math.Max(0,y-rr);yy<=Math.Min(h-1,y+rr);yy++)for(int xx=Math.Max(0,x-rr);xx<=Math.Min(w-1,x+rr);xx++){double dist=Math.Sqrt((xx-x)*(xx-x)+(yy-y)*(yy-y));if(dist>rr)continue;int i=yy*d.Stride+xx*4;double sa=alpha*(1-dist/(rr+0.2));p[i]=150;p[i+1]=210;p[i+2]=255;p[i+3]=(byte)Math.Max(p[i+3],Math.Round(sa*255));}}
  Marshal.Copy(p,0,d.Scan0,p.Length);o.UnlockBits(d);o.Save(output,ImageFormat.Png);}}
}
'@
$dst=[IO.Path]::GetFullPath($OutputPath);[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($dst))|Out-Null;[GlobalDramaticFx]::Run($dst,$Width,$Height)

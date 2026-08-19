param([string]$OutputPath='C:\work\00_claude\spring-training-assets\title-spring-breeze-v3.png')
Add-Type -AssemblyName System.Drawing
$w=1280;$h=500;$bmp=New-Object System.Drawing.Bitmap($w,$h,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb);$g=[System.Drawing.Graphics]::FromImage($bmp)
try{
 $g.Clear([System.Drawing.Color]::Transparent);$g.SmoothingMode='AntiAlias';$g.TextRenderingHint='AntiAliasGridFit'
 $serif=New-Object System.Drawing.FontFamily('Noto Serif KR Black');$sans=New-Object System.Drawing.FontFamily('Noto Sans KR Black')
 $fmt=New-Object System.Drawing.StringFormat;$fmt.Alignment='Center';$fmt.LineAlignment='Center'
 function Path([string]$t,$fam,[float]$size,[float]$x,[float]$y,[float]$rw,[float]$rh){$p=New-Object System.Drawing.Drawing2D.GraphicsPath;$em=$g.DpiY*$size/72;$r=New-Object System.Drawing.RectangleF($x,$y,$rw,$rh);$p.AddString($t,$fam,0,$em,$r,$fmt);return $p}
 $t1=-join @([char]0xB3C5,[char]0xCD08,[char]0xAC70,[char]0xC0AC,[char]0xC758)
 $a=-join @([char]0xBD04,[char]0xB9DE,[char]0xC774);$b=(-join @([char]0xD2B9,[char]0xD6C8))+'!'
 $p1=Path $t1 $serif 76 250 18 780 130
 $pa=Path $a $sans 150 40 128 710 270
 $pb=Path $b $sans 150 650 128 585 270
 $paths=@($p1,$pa,$pb)
 $shadow=New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(155,10,38,28),30);$shadow.LineJoin='Round'
 $sm=New-Object System.Drawing.Drawing2D.Matrix;$sm.Translate(7,13)
 foreach($p in $paths){$q=$p.Clone();$q.Transform($sm);$g.DrawPath($shadow,$q);$q.Dispose()}
 $outer=New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255,20,70,48),22);$outer.LineJoin='Round'
 $gold=New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255,222,188,77),9);$gold.LineJoin='Round'
 foreach($p in $paths){$g.DrawPath($outer,$p);$g.DrawPath($gold,$p)}
 $rect=New-Object System.Drawing.RectangleF(0,20,$w,420)
 $body=New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect,[System.Drawing.Color]::FromArgb(255,255,249,211),[System.Drawing.Color]::FromArgb(255,147,195,75),[System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
 foreach($p in $paths){$g.FillPath($body,$p)}
 $hi=New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(185,255,255,239),3);$hi.LineJoin='Round'
 $hm=New-Object System.Drawing.Drawing2D.Matrix;$hm.Translate(-2,-3)
 foreach($p in $paths){$q=$p.Clone();$q.Transform($hm);$g.DrawPath($hi,$q);$q.Dispose()}
 $swash=New-Object System.Drawing.Drawing2D.GraphicsPath
 $swash.AddBezier(205,424,470,467,880,456,1110,407);$swash.AddBezier(1110,407,930,474,520,485,205,424)
 $swashBrush=New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(230,35,92,53));$g.FillPath($swashBrush,$swash)
 $swashPen=New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(220,220,187,75),4);$g.DrawPath($swashPen,$swash)
 $bmp.Save($OutputPath,[System.Drawing.Imaging.ImageFormat]::Png);Write-Output "$w x $h -> $OutputPath"
}finally{$g.Dispose();$bmp.Dispose()}

Add-Type -AssemblyName System.Drawing
$W=1536;$H=512
$bmp=New-Object System.Drawing.Bitmap($W,$H)
$g=[System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode='AntiAlias'
$g.Clear([System.Drawing.Color]::FromArgb(255,0,255))   # magenta bg
$x0=180;$y0=150;$x1=1356;$y1=362;$c=60
$pts=@(
 [System.Drawing.Point]::new($x0+$c,$y0),
 [System.Drawing.Point]::new($x1-$c,$y0),
 [System.Drawing.Point]::new($x1,$y0+$c),
 [System.Drawing.Point]::new($x1,$y1-$c),
 [System.Drawing.Point]::new($x1-$c,$y1),
 [System.Drawing.Point]::new($x0+$c,$y1),
 [System.Drawing.Point]::new($x0,$y1-$c),
 [System.Drawing.Point]::new($x0,$y0+$c)
)
$fill=New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(128,128,136))
$pen=New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(48,48,56)),12
$g.FillPolygon($fill,$pts)
$g.DrawPolygon($pen,$pts)
$g.Dispose()
$bmp.Save("$PWD\.tmp\frameforge\form.png",[System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output "form.png saved"

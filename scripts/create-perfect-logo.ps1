Add-Type -AssemblyName System.Drawing

# Create 512x512 High-Res transparent Bitmap
$size = 512
$bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# Clear with transparent
$g.Clear([System.Drawing.Color]::Transparent)

# 1. Emerald Green Squircle with rounded corners (radius 115px at 512x512)
$rect = New-Object System.Drawing.Rectangle(16, 16, 480, 480)
$radius = 110
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddArc($rect.X, $rect.Y, $radius * 2, $radius * 2, 180, 90)
$path.AddArc($rect.Right - ($radius * 2), $rect.Y, $radius * 2, $radius * 2, 270, 90)
$path.AddArc($rect.Right - ($radius * 2), $rect.Bottom - ($radius * 2), $radius * 2, $radius * 2, 0, 90)
$path.AddArc($rect.X, $rect.Bottom - ($radius * 2), $radius * 2, $radius * 2, 90, 90)
$path.CloseFigure()

# Vibrant Emerald Green Gradient Brush
$green1 = [System.Drawing.Color]::FromArgb(255, 5, 158, 94) # #059e5e
$green2 = [System.Drawing.Color]::FromArgb(255, 3, 122, 68) # #037a44
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $green1, $green2, 90.0)
$g.FillPath($brush, $path)

# Subtle Glass Border
$borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(70, 255, 255, 255), 6)
$g.DrawPath($borderPen, $path)

# 2. Draw Crisp White Monoline Car Silhouette
$scale = 512.0 / 128.0
$carPen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, (5.8 * $scale))
$carPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$carPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$carPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

# Car body path at 512 resolution
$carPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$pts = @(
    New-Object System.Drawing.PointF((32 * $scale), (75 * $scale)),
    New-Object System.Drawing.PointF((28 * $scale), (62 * $scale)),
    New-Object System.Drawing.PointF((33 * $scale), (47 * $scale)),
    New-Object System.Drawing.PointF((68 * $scale), (47 * $scale)),
    New-Object System.Drawing.PointF((78 * $scale), (53 * $scale)),
    New-Object System.Drawing.PointF((86 * $scale), (63 * $scale)),
    New-Object System.Drawing.PointF((96 * $scale), (63 * $scale)),
    New-Object System.Drawing.PointF((101 * $scale), (68 * $scale)),
    New-Object System.Drawing.PointF((101 * $scale), (72 * $scale)),
    New-Object System.Drawing.PointF((96 * $scale), (75 * $scale)),
    New-Object System.Drawing.PointF((93 * $scale), (75 * $scale))
)
$carPath.AddCurve($pts, 0.3)

# Between wheels
$carPath.AddLine((69 * $scale), (75 * $scale), (49 * $scale), (75 * $scale))

# Behind rear wheel
$carPath.AddLine((25 * $scale), (75 * $scale), (32 * $scale), (75 * $scale))

$g.DrawPath($carPen, $carPath)

# Wheels (Pure White Rings)
$wheelPen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, (5.0 * $scale))
$wheelBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 5, 148, 87))

# Front Wheel at (81, 75)
$fwRect = New-Object System.Drawing.RectangleF(((81 - 5) * $scale), ((75 - 5) * $scale), (10 * $scale), (10 * $scale))
$g.FillEllipse($wheelBrush, $fwRect)
$g.DrawEllipse($wheelPen, $fwRect)

# Rear Wheel at (37, 75)
$rwRect = New-Object System.Drawing.RectangleF(((37 - 5) * $scale), ((75 - 5) * $scale), (10 * $scale), (10 * $scale))
$g.FillEllipse($wheelBrush, $rwRect)
$g.DrawEllipse($wheelPen, $rwRect)

$g.Dispose()

# Save perfect high-res PNG
$destDir = "c:\Users\himan\onewaycabs\img"
if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }

$bmp.Save("c:\Users\himan\onewaycabs\img\logo-reframed.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save("c:\Users\himan\onewaycabs\img\logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "Created perfect 1:1 transparent Emerald Green logo at img/logo-reframed.png!"

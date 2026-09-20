param()

$srcPath = "C:\Users\himan\.gemini\antigravity-ide\brain\a5a0b178-b683-46a7-ab1c-7de86dc156b1\.user_uploaded\media_1788591673801.png"
if (-not (Test-Path $srcPath)) {
    $srcPath = "C:\Users\himan\.gemini\antigravity-ide\brain\a5a0b178-b683-46a7-ab1c-7de86dc156b1\.user_uploaded\media_1788590879981.png"
}

Add-Type -AssemblyName System.Drawing

$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $bmp.Width
$h = $bmp.Height

# Find bounding box of the blue squircle (pixels where Blue > 80 and Red < 50)
$minX = $w
$minY = $h
$maxX = 0
$maxY = 0

for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        $pixel = $bmp.GetPixel($x, $y)
        # Check if pixel is part of the blue squircle or white icon inside it
        if (($pixel.B -gt 80 -and $pixel.R -lt 70) -or ($pixel.R -gt 180 -and $pixel.G -gt 180 -and $pixel.B -gt 180)) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

Write-Host "Detected Bounding Box: minX=$minX, minY=$minY, maxX=$maxX, maxY=$maxY (Original: ${w}x${h})"

$cropW = ($maxX - $minX) + 1
$cropH = ($maxY - $minY) + 1

if ($cropW -gt 10 -and $cropH -gt 10) {
    # Create square crop with slight margin
    $size = [Math]::Max($cropW, $cropH)
    $cropped = New-Object System.Drawing.Bitmap($cropW, $cropH)
    $g = [System.Drawing.Graphics]::FromImage($cropped)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $srcRect = New-Object System.Drawing.Rectangle($minX, $minY, $cropW, $cropH)
    $destRect = New-Object System.Drawing.Rectangle(0, 0, $cropW, $cropH)
    $g.DrawImage($bmp, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()

    # Save reframed PNG
    if (-not (Test-Path "c:\Users\himan\onewaycabs\img")) {
        New-Item -ItemType Directory -Path "c:\Users\himan\onewaycabs\img" -Force | Out-Null
    }
    $cropped.Save("c:\Users\himan\onewaycabs\img\logo-reframed.png", [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Saved reframed logo to c:\Users\himan\onewaycabs\img\logo-reframed.png"

    # Convert to Base64 to embed in favicon.svg so it renders at 100% quality anywhere
    $ms = New-Object System.IO.MemoryStream
    $cropped.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $base64 = [System.Convert]::ToBase64String($ms.ToArray())
    $ms.Dispose()
    $cropped.Dispose()

    # Update favicon.svg with reframed exact image embedded as crisp SVG
    $svgContent = @"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <defs>
    <clipPath id="squircleClip">
      <rect x="0" y="0" width="128" height="128" rx="28" />
    </clipPath>
  </defs>
  <g id="owtCarBody" clip-path="url(#squircleClip)">
    <image href="data:image/png;base64,$base64" x="0" y="0" width="128" height="128" preserveAspectRatio="none" />
  </g>
</svg>
"@
    [System.IO.File]::WriteAllText("c:\Users\himan\onewaycabs\favicon.svg", $svgContent, [System.Text.Encoding]::UTF8)
    Write-Host "Updated c:\Users\himan\onewaycabs\favicon.svg with reframed exact logo image!"
} else {
    Write-Host "Bounding box detection yielded unexpected values."
}

$bmp.Dispose()

Add-Type -AssemblyName System.Drawing
$imgPath = "C:\Users\himan\.gemini\antigravity-ide\brain\a5a0b178-b683-46a7-ab1c-7de86dc156b1\.user_uploaded\media_1788596315763.png"
$bmp = [System.Drawing.Bitmap]::FromFile($imgPath)
Write-Host "Width: $($bmp.Width), Height: $($bmp.Height)"

$minX = $bmp.Width
$minY = $bmp.Height
$maxX = 0
$maxY = 0

for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
        $p = $bmp.GetPixel($x, $y)
        # Find vibrant green pixels (G > 100 and G > R*1.2 and G > B*1.2) or white pixels
        if (($p.G -gt 90 -and $p.G -gt ($p.R * 1.1) -and $p.G -gt ($p.B * 1.1)) -or ($p.R -gt 200 -and $p.G -gt 200 -and $p.B -gt 200)) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

Write-Host "Green Squircle Bounding Box: minX=$minX, minY=$minY, maxX=$maxX, maxY=$maxY"
$pCenter = $bmp.GetPixel(30, 30)
Write-Host "Green Sample Color: R=$($pCenter.R), G=$($pCenter.G), B=$($pCenter.B)"
$bmp.Dispose()

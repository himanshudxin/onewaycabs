Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile('C:\Users\himan\.gemini\antigravity-ide\brain\a5a0b178-b683-46a7-ab1c-7de86dc156b1\.user_uploaded\media_1788596315763.png')

$minX = $b.Width
$maxX = 0
$minY = $b.Height
$maxY = 0

for ($y = 0; $y -lt $b.Height; $y++) {
    for ($x = 0; $x -lt $b.Width; $x++) {
        $p = $b.GetPixel($x, $y)
        # Identify dark emerald green pixels (R < 50 and G > 100 and B < 120)
        if ($p.R -lt 50 -and $p.G -gt 100 -and $p.B -lt 120) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

Write-Host "Green Squircle Bounds: minX=$minX, maxX=$maxX, minY=$minY, maxY=$maxY"
$width = ($maxX - $minX) + 1
$height = ($maxY - $minY) + 1
Write-Host "Width=$width, Height=$height"

$b.Dispose()

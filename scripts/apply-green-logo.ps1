Add-Type -AssemblyName System.Drawing

$src = "C:\Users\himan\.gemini\antigravity-ide\brain\a5a0b178-b683-46a7-ab1c-7de86dc156b1\.user_uploaded\media_1788596315763.png"
$bmp = [System.Drawing.Bitmap]::FromFile($src)
$destDir = "c:\Users\himan\onewaycabs\img"
if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }

$bmp.Save("c:\Users\himan\onewaycabs\img\logo-reframed.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save("c:\Users\himan\onewaycabs\img\logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "Saved raster PNG assets to img/logo-reframed.png and img/logo.png"

# Now write ultra-crisp vector SVG matching this exact emerald green squircle
$svg = @'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <defs>
    <!-- Vibrant Emerald / Forest Green Gradient matching uploaded image -->
    <linearGradient id="owtGreenBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#059e5e" />
      <stop offset="45%" stop-color="#059457" />
      <stop offset="100%" stop-color="#037a44" />
    </linearGradient>

    <!-- Subtle White Glass Highlight -->
    <linearGradient id="owtBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.5" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.1" />
    </linearGradient>
  </defs>

  <!-- 1. Emerald Green Squircle App Icon Badge -->
  <rect width="128" height="128" rx="28" fill="url(#owtGreenBg)" />
  <rect x="1.5" y="1.5" width="125" height="125" rx="26.5" fill="none" stroke="url(#owtBorder)" stroke-width="1.8" />

  <!-- 2. Minimalist Monoline Car Silhouette (Pure Crisp White, Smooth Rounded Stroke) -->
  <path id="owtCarBody"
        d="M 32 75 
           C 29 72, 28 66, 28 58 
           C 28 51, 31 47, 37 47 
           L 68 47 
           C 72 47, 75 49, 78 53 
           L 86 63 
           L 96 63 
           C 99 63, 101 65, 101 68 
           L 101 72 
           C 101 74, 99 75, 96 75 
           L 93 75 
           C 92 68, 87 64, 81 64 
           C 75 64, 70 68, 69 75 
           L 49 75 
           C 48 68, 43 64, 37 64 
           C 31 64, 26 68, 25 75 
           Z" 
        fill="none" 
        stroke="#ffffff" 
        stroke-width="5.8" 
        stroke-linecap="round" 
        stroke-linejoin="round" />

  <!-- 3. Front Wheel (Pure White Ring matching monoline icon) -->
  <circle cx="81" cy="75" r="5" fill="#059457" stroke="#ffffff" stroke-width="4.8" />

  <!-- 4. Rear Wheel (Pure White Ring matching monoline icon) -->
  <circle cx="37" cy="75" r="5" fill="#059457" stroke="#ffffff" stroke-width="4.8" />
</svg>
'@

[System.IO.File]::WriteAllText("c:\Users\himan\onewaycabs\favicon.svg", $svg, [System.Text.Encoding]::UTF8)
Write-Host "Updated c:\Users\himan\onewaycabs\favicon.svg with crisp Emerald Green emblem!"

Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile('C:\Users\himan\.gemini\antigravity-ide\brain\a5a0b178-b683-46a7-ab1c-7de86dc156b1\.user_uploaded\media_1788596315763.png')
Write-Host "Top-Left (0,0):" ($b.GetPixel(0,0))
Write-Host "Top-Right (79,0):" ($b.GetPixel(79,0))
Write-Host "Bottom-Left (0,76):" ($b.GetPixel(0,76))
Write-Host "Bottom-Right (79,76):" ($b.GetPixel(79,76))
$b.Dispose()

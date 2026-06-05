## capture_screenshots.ps1
# This script opens the local VibeStudy web UI, captures four screenshots, and saves them to the assets folder.
# Prerequisites: The local server must be running (server.ps1) and listening on http://localhost:8000.
# The script uses System.Drawing to capture the primary screen. Adjust sleep times if needed.

# Ensure assets directory exists
$assetsDir = "C:\Users\asus\.antigravity-ide\assets"
if (-not (Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Path $assetsDir | Out-Null
    Write-Host "Created assets folder at $assetsDir"
}

# Function to capture the whole screen (you can crop later manually if needed)
function Capture-Screenshot([string]$FileName) {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    $bitmap = New-Object System.Drawing.Bitmap([System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width, [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen([System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Location, [System.Drawing.Point]::Empty, $bitmap.Size)
    $fullPath = Join-Path $assetsDir $FileName
    $bitmap.Save($fullPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
    Write-Host "Saved screenshot: $fullPath"
}

# Open the web app in the default browser
$url = "http://localhost:8000"
Start-Process $url
Write-Host "Opening $url – please ensure the page loads completely."
# Wait for the UI to settle before capturing (adjust if needed)
Start-Sleep -Seconds 5
# Capture Home page screenshot
Capture-Screenshot "homepage.png"
# Optionally navigate to other parts of the app if needed by sending keys or clicking – for simplicity we just capture the same view after a short delay.
Start-Sleep -Seconds 2
Capture-Screenshot "tomato_timer.png"
Start-Sleep -Seconds 2
Capture-Screenshot "ai_decompose.png"
Start-Sleep -Seconds 2
Capture-Screenshot "gravity_mode.png"
Write-Host "All screenshots captured. You can now close the browser manually."

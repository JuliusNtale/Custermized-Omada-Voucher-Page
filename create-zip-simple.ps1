# Simple PowerShell script to create ZIP file for Omada upload
Write-Host "Creating Omada Custom Portal ZIP file..."

$filesToInclude = @(
    "index.html",
    "index.css", 
    "index.js",
    "jquery.min.js",
    "background.png",
    "logo.png",
    "img"
)

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$zipFileName = "Omada-Custom-Portal-$timestamp.zip"

Write-Host "Checking files..."
$missingFiles = @()
foreach ($file in $filesToInclude) {
    if (Test-Path $file) {
        Write-Host "Found: $file"
    } else {
        Write-Host "Missing: $file"
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "Error: Some files are missing!"
    exit 1
}

Write-Host "Creating ZIP file: $zipFileName"
Compress-Archive -Path $filesToInclude -DestinationPath $zipFileName -CompressionLevel Optimal

if (Test-Path $zipFileName) {
    $zipSize = (Get-Item $zipFileName).Length
    $zipSizeKB = [math]::Round($zipSize / 1KB, 2)
    Write-Host "Success! ZIP file created: $zipFileName ($zipSizeKB KB)"
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "1. Open Omada Controller web interface"
    Write-Host "2. Go to Settings -> Authentication -> Portal"
    Write-Host "3. Upload the ZIP file: $zipFileName"
    Write-Host "4. Configure authentication settings"
} else {
    Write-Host "Error: Failed to create ZIP file"
}

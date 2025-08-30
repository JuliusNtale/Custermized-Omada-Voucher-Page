# PowerShell script to create ZIP file for Omada upload
# Run this script in the demo folder to create the portal zip file

Write-Host "Creating Omada Custom Portal ZIP file..." -ForegroundColor Green

# Define the files to include in the ZIP
$filesToInclude = @(
    "index.html",
    "index.css", 
    "index.js",
    "jquery.min.js",
    "background.png",
    "logo.png"
)

# Check if img folder exists and include it
$imgFolder = "img"
$includeImgFolder = Test-Path $imgFolder

# Create the ZIP file name with timestamp
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$zipFileName = "Omada-Custom-Portal-$timestamp.zip"

Write-Host "Files to include:" -ForegroundColor Yellow
foreach ($file in $filesToInclude) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file (missing)" -ForegroundColor Red
    }
}

if ($includeImgFolder) {
    Write-Host "  ✓ img/ folder" -ForegroundColor Green
} else {
    Write-Host "  ✗ img/ folder (missing)" -ForegroundColor Red
}

# Check if all required files exist
$missingFiles = @()
foreach ($file in $filesToInclude) {
    if (!(Test-Path $file)) {
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "" 
    Write-Host "Error: Missing required files:" -ForegroundColor Red
    foreach ($file in $missingFiles) {
        Write-Host "  - $file" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Please ensure all files are present before creating the ZIP." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Remove old ZIP files if they exist
$oldZips = Get-ChildItem -Filter "Omada-Custom-Portal-*.zip"
if ($oldZips.Count -gt 0) {
    Write-Host ""
    Write-Host "Removing old ZIP files..." -ForegroundColor Yellow
    $oldZips | Remove-Item -Force
}

try {
    # Create the ZIP file
    $compress = @{
        Path = $filesToInclude
        CompressionLevel = "Optimal"
        DestinationPath = $zipFileName
    }
    
    # Add img folder if it exists
    if ($includeImgFolder) {
        $compress.Path += $imgFolder
    }
    
    Compress-Archive @compress
    
    Write-Host ""
    Write-Host "✓ ZIP file created successfully: $zipFileName" -ForegroundColor Green
    
    # Show file size
    $zipSize = (Get-Item $zipFileName).Length
    $zipSizeKB = [math]::Round($zipSize / 1KB, 2)
    Write-Host "File size: $zipSizeKB KB" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Open your Omada Controller web interface"
    Write-Host "2. Go to Settings > Authentication > Portal"
    Write-Host "3. Click Upload and select the file: $zipFileName"
    Write-Host "4. Configure your authentication settings"
    Write-Host "5. Test the portal with your devices"
    
    Write-Host ""
    Write-Host "Important reminders:" -ForegroundColor Red
    Write-Host "- Remember to set up WhatsApp integration (see whatsapp-integration-examples.js)"
    Write-Host "- Configure voucher settings for your internet packages"
    Write-Host "- Test thoroughly before going live"
    
} catch {
    Write-Host ""
    Write-Host "Error creating ZIP file: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "ZIP file ready for upload to Omada Controller!" -ForegroundColor Green
Read-Host "Press Enter to exit"

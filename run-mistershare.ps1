# Check paths first
$adb = "J:\Android\Sdk\platform-tools\adb.exe"
if (-not (Test-Path $adb)) {
    Write-Host "Error: ADB not found at $adb"
    exit 1
}

# Set Environment variables for this session
$env:ANDROID_HOME = "J:\Android\Sdk"
$env:JAVA_HOME = "C:\Java\jdk-17.0.10+7"
$env:GRADLE_USER_HOME = "K:\.gradle"
$env:PATH = "$env:ANDROID_HOME\platform-tools;$env:JAVA_HOME\bin;$env:PATH"

Write-Host "Environment set. Running npm run android..."
npm run android

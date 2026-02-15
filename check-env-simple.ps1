Write-Host "=== MisterShare Complete Environment Check ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Shell Environment Variables (for CLI):" -ForegroundColor Yellow
if ($env:ANDROID_HOME) { Write-Host "   ANDROID_HOME: $env:ANDROID_HOME" -ForegroundColor Green } else { Write-Host "   ANDROID_HOME: Not Set (Expected if using local.properties)" -ForegroundColor Gray }
if ($env:JAVA_HOME) { Write-Host "   JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Green } else { Write-Host "   JAVA_HOME: Not Set (Expected if using gradle.properties)" -ForegroundColor Gray }
Write-Host ""

Write-Host "2. Project Configuration (Required for Build):" -ForegroundColor Yellow
# Check local.properties
$localProp = "android\local.properties"
if (Test-Path $localProp) {
    $content = Get-Content $localProp
    if ($content -match "sdk.dir=J.*Android.*Sdk") {
        Write-Host "   [OK] local.properties: Points to Android SDK (J:\Android\Sdk)" -ForegroundColor Green
    } else {
        Write-Host "   [FAIL] local.properties: Incorrect SDK path!" -ForegroundColor Red
        Write-Host "   Content: $content" -ForegroundColor Gray
    }
} else {
    Write-Host "   [FAIL] local.properties: File Missing!" -ForegroundColor Red
}

# Check gradle.properties
$gradleProp = "android\gradle.properties"
if (Test-Path $gradleProp) {
    $content = Get-Content $gradleProp | Out-String
    if ($content -match "org.gradle.java.home=C.*Java.*17") {
        Write-Host "   [OK] gradle.properties: Points to JDK 17 (C:\Java\jdk-17.0.10+7)" -ForegroundColor Green
    } else {
        Write-Host "   [FAIL] gradle.properties: Incorrect Java Home path!" -ForegroundColor Red
    }
} else {
    Write-Host "   [FAIL] gradle.properties: File Missing!" -ForegroundColor Red
}

Write-Host ""
Write-Host "3. Physical Paths:" -ForegroundColor Yellow
$adbPath = "J:\Android\Sdk\platform-tools\adb.exe"
if (Test-Path $adbPath) { Write-Host "   [OK] ADB Executable: Found" -ForegroundColor Green } else { Write-Host "   [FAIL] ADB Executable: Not Found" -ForegroundColor Red }

$javaPath = "C:\Java\jdk-17.0.10+7\bin\java.exe"
if (Test-Path $javaPath) { Write-Host "   [OK] Java Executable: Found" -ForegroundColor Green } else { Write-Host "   [FAIL] Java Executable: Not Found" -ForegroundColor Red }

$gradlePath = "K:\.gradle"
if (Test-Path $gradlePath) { Write-Host "   [OK] Gradle User Home (K:\): Found" -ForegroundColor Green } else { Write-Host "   [FAIL] Gradle User Home (K:\): Not Found" -ForegroundColor Red }

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
if ((Test-Path $adbPath) -and (Test-Path $javaPath) -and (Test-Path $gradlePath) -and (Test-Path $localProp)) {
    Write-Host "The environment is correctly configured for building!" -ForegroundColor Green
    Write-Host "You can now run: npm run android" -ForegroundColor Green
} else {
    Write-Host "Some checks failed. Please review the errors above." -ForegroundColor Red
}

Write-Host "=== فحص بيئة MisterShare ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. متغيرات البيئة:" -ForegroundColor Yellow
Write-Host "   ANDROID_HOME: $env:ANDROID_HOME"
Write-Host "   JAVA_HOME: $env:JAVA_HOME"
Write-Host "   GRADLE_USER_HOME: $env:GRADLE_USER_HOME"
Write-Host ""
Write-Host "2. المسارات الحقيقية:" -ForegroundColor Yellow
$adbPath = "J:\Android\Sdk\platform-tools\adb.exe"
if (Test-Path $adbPath) { Write-Host "   ✓ ADB موجود" -ForegroundColor Green } else { Write-Host "   ✗ ADB غير موجود" -ForegroundColor Red }

$javaPath = "C:\Java\jdk-17.0.10+7\bin\java.exe"
if (Test-Path $javaPath) { Write-Host "   ✓ Java موجود" -ForegroundColor Green } else { Write-Host "   ✗ Java غير موجود" -ForegroundColor Red }

$gradlePath = "K:\.gradle"
if (Test-Path $gradlePath) { Write-Host "   ✓ Gradle User Home موجود" -ForegroundColor Green } else { Write-Host "   ✗ Gradle User Home غير موجود" -ForegroundColor Red }

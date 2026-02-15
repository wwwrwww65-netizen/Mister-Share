Write-Host "=== إصلاح الكاش وتشغيل البناء (Offline Mode) ===" -ForegroundColor Cyan

# 1. إعداد المتغيرات
Write-Host "1. إعداد المتغيرات..." -ForegroundColor Yellow
$env:ANDROID_HOME = "J:\Android\Sdk"
$env:ANDROID_SDK_ROOT = "J:\Android\Sdk"
$env:JAVA_HOME = "C:\Java\jdk-17.0.10+7"
$env:GRADLE_USER_HOME = "K:\.gradle"
$env:PATH = "J:\Android\Sdk\platform-tools;J:\Android\Sdk\emulator;C:\Java\jdk-17.0.10+7\bin;$env:PATH"

# 2. حذف كاش المشروع فقط (لإصلاح المسار I: الى J:)
Write-Host "2. تنظيف كاش المشروع لإصلاح المسارات..." -ForegroundColor Yellow
if (Test-Path "android\.gradle") { 
    Remove-Item "android\.gradle" -Recurse -Force 
    Write-Host "   ✓ تم حذف .gradle القديم" -ForegroundColor Green
}

# 3. تشغيل البناء بوضع Offline
Write-Host "3. تشغيل البناء (وضع Offline - بدون إنترنت)..." -ForegroundColor Yellow
cd android
.\gradlew.bat installDebug --offline

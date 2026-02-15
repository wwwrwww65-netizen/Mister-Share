# سكريبت بناء APK - MisterShare
# يقوم بتعيين المتغيرات الصحيحة ثم بناء APK

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('debug', 'release')]
    [string]$BuildType = 'debug'
)

Write-Host "=== بناء MisterShare APK ===" -ForegroundColor Cyan
Write-Host "نوع البناء: $BuildType" -ForegroundColor Yellow
Write-Host ""

# تعيين متغيرات البيئة
Write-Host "1. تعيين متغيرات البيئة..." -ForegroundColor Yellow
$env:ANDROID_HOME = "J:\Android\Sdk"
$env:ANDROID_SDK_ROOT = "J:\Android\Sdk"
$env:JAVA_HOME = "C:\Java\jdk-17.0.10+7"
$env:GRADLE_USER_HOME = "K:\.gradle"

Write-Host "   ✓ تم تعيين المتغيرات" -ForegroundColor Green

# الانتقال لمجلد Android
Write-Host "`n2. الانتقال لمجلد Android..." -ForegroundColor Yellow
cd J:\MisterShare\android

# بناء APK
Write-Host "`n3. بناء APK..." -ForegroundColor Yellow
if ($BuildType -eq 'debug') {
    Write-Host "   ℹ جاري بناء Debug APK..." -ForegroundColor Cyan
    .\gradlew.bat assembleDebug
    $outputPath = "J:\MisterShare\android\app\build\outputs\apk\debug\app-debug.apk"
} else {
    Write-Host "   ℹ جاري بناء Release APK..." -ForegroundColor Cyan
    .\gradlew.bat assembleRelease
    $outputPath = "J:\MisterShare\android\app\build\outputs\apk\release\app-release.apk"
}

# التحقق من النتيجة
if (Test-Path $outputPath) {
    Write-Host "`n✓ تم البناء بنجاح!" -ForegroundColor Green
    Write-Host "الملف: $outputPath" -ForegroundColor Cyan
    
    $fileSize = (Get-Item $outputPath).Length / 1MB
    Write-Host "الحجم: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Cyan
} else {
    Write-Host "`n✗ فشل البناء!" -ForegroundColor Red
}

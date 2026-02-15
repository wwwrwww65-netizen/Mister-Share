# سكريبت تشغيل المشروع على المحاكي - MisterShare
# يقوم بتعيين المتغيرات الصحيحة ثم تشغيل المشروع

Write-Host "=== تشغيل MisterShare على المحاكي ===" -ForegroundColor Cyan
Write-Host ""

# تعيين متغيرات البيئة
Write-Host "1. تعيين متغيرات البيئة..." -ForegroundColor Yellow
$env:ANDROID_HOME = "J:\Android\Sdk"
$env:ANDROID_SDK_ROOT = "J:\Android\Sdk"
$env:JAVA_HOME = "C:\Java\jdk-17.0.10+7"
$env:GRADLE_USER_HOME = "K:\.gradle"

Write-Host "   ✓ ANDROID_HOME = $env:ANDROID_HOME" -ForegroundColor Green
Write-Host "   ✓ JAVA_HOME = $env:JAVA_HOME" -ForegroundColor Green
Write-Host "   ✓ GRADLE_USER_HOME = $env:GRADLE_USER_HOME" -ForegroundColor Green

# التحقق من المحاكي
Write-Host "`n2. التحقق من المحاكي..." -ForegroundColor Yellow
$devices = & "$env:ANDROID_HOME\platform-tools\adb.exe" devices 2>&1 | Select-String "device$"
if ($devices) {
    Write-Host "   ✓ المحاكي متصل" -ForegroundColor Green
} else {
    Write-Host "   ✗ لا يوجد محاكي متصل!" -ForegroundColor Red
    Write-Host "   ℹ يرجى تشغيل المحاكي أولاً" -ForegroundColor Yellow
    exit 1
}

# الانتقال لمجلد المشروع
Write-Host "`n3. تشغيل المشروع..." -ForegroundColor Yellow
cd J:\MisterShare

# تشغيل على المحاكي
Write-Host "   ℹ جاري تشغيل npm run android..." -ForegroundColor Cyan
npm run android

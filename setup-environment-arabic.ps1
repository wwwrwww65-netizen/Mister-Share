# ============================================================
# سكريبت إعداد البيئة للجهاز العربي - MisterShare
# ============================================================
# هذا السكريبت يقوم بتعيين متغيرات البيئة الصحيحة للجهاز العربي
# يجب تشغيله في كل مرة تفتح فيها PowerShell جديد للعمل على المشروع
# ============================================================

Write-Host "=== إعداد بيئة MisterShare للجهاز العربي ===" -ForegroundColor Cyan
Write-Host ""

# تعيين متغيرات البيئة
Write-Host "1. تعيين ANDROID_HOME..." -ForegroundColor Yellow
$env:ANDROID_HOME = "J:\Android\Sdk"
$env:ANDROID_SDK_ROOT = "J:\Android\Sdk"
Write-Host "   ✓ ANDROID_HOME = $env:ANDROID_HOME" -ForegroundColor Green

Write-Host "`n2. تعيين JAVA_HOME..." -ForegroundColor Yellow
$env:JAVA_HOME = "C:\Java\jdk-17.0.10+7"
Write-Host "   ✓ JAVA_HOME = $env:JAVA_HOME" -ForegroundColor Green

Write-Host "`n3. تعيين GRADLE_USER_HOME..." -ForegroundColor Yellow
$env:GRADLE_USER_HOME = "K:\.gradle"
Write-Host "   ✓ GRADLE_USER_HOME = $env:GRADLE_USER_HOME" -ForegroundColor Green

# إضافة المسارات إلى PATH
Write-Host "`n4. إضافة المسارات إلى PATH..." -ForegroundColor Yellow
$paths = @(
    "J:\Android\Sdk\platform-tools",
    "J:\Android\Sdk\emulator",
    "J:\Android\Sdk\cmdline-tools\latest\bin",
    "J:\Android\Sdk\build-tools\35.0.0",
    "C:\Java\jdk-17.0.10+7\bin"
)

foreach ($path in $paths) {
    if ($env:PATH -notlike "*$path*") {
        $env:PATH = "$path;$env:PATH"
        Write-Host "   ✓ تمت إضافة: $path" -ForegroundColor Green
    } else {
        Write-Host "   ○ موجود بالفعل: $path" -ForegroundColor Gray
    }
}

# التحقق من المسارات
Write-Host "`n=== التحقق من البيئة ===" -ForegroundColor Cyan

# فحص ANDROID_HOME
Write-Host "`n1. Android SDK:" -ForegroundColor Yellow
if (Test-Path "$env:ANDROID_HOME\platform-tools\adb.exe") {
    Write-Host "   ✓ Android SDK موجود" -ForegroundColor Green
    $adbVersion = & "$env:ANDROID_HOME\platform-tools\adb.exe" --version 2>&1 | Select-Object -First 1
    Write-Host "   ✓ ADB: $adbVersion" -ForegroundColor Green
} else {
    Write-Host "   ✗ Android SDK غير موجود في المسار المحدد!" -ForegroundColor Red
}

# فحص JAVA_HOME
Write-Host "`n2. Java JDK:" -ForegroundColor Yellow
if (Test-Path "$env:JAVA_HOME\bin\java.exe") {
    Write-Host "   ✓ Java JDK موجود" -ForegroundColor Green
    $javaVersion = & "$env:JAVA_HOME\bin\java.exe" -version 2>&1 | Select-Object -First 1
    Write-Host "   ✓ $javaVersion" -ForegroundColor Green
} else {
    Write-Host "   ✗ Java JDK غير موجود في المسار المحدد!" -ForegroundColor Red
    Write-Host "   ℹ المسار الحالي: $env:JAVA_HOME" -ForegroundColor Yellow
    Write-Host "   ℹ يبدو أن Java مثبت في: C:\Program Files\Eclipse Adoptium\jdk-17.0.17.10-hotspot" -ForegroundColor Yellow
    Write-Host "   ℹ يرجى تثبيت Java في المسار الصحيح أو تحديث المتغير" -ForegroundColor Yellow
}

# فحص Gradle User Home
Write-Host "`n3. Gradle User Home:" -ForegroundColor Yellow
if (Test-Path "K:\") {
    Write-Host "   ✓ القرص K: موجود" -ForegroundColor Green
    if (-not (Test-Path "$env:GRADLE_USER_HOME")) {
        Write-Host "   ℹ إنشاء مجلد .gradle..." -ForegroundColor Yellow
        New-Item -ItemType Directory -Path "$env:GRADLE_USER_HOME" -Force | Out-Null
        Write-Host "   ✓ تم إنشاء: $env:GRADLE_USER_HOME" -ForegroundColor Green
    } else {
        Write-Host "   ✓ GRADLE_USER_HOME موجود" -ForegroundColor Green
    }
} else {
    Write-Host "   ✗ القرص K: غير موجود!" -ForegroundColor Red
    Write-Host "   ℹ سيتم استخدام المسار الافتراضي" -ForegroundColor Yellow
}

# فحص المشروع
Write-Host "`n4. المشروع:" -ForegroundColor Yellow
if (Test-Path "J:\MisterShare\android\gradlew.bat") {
    Write-Host "   ✓ المشروع موجود في J:\MisterShare" -ForegroundColor Green
} else {
    Write-Host "   ✗ المشروع غير موجود!" -ForegroundColor Red
}

Write-Host "`n=== تم الإعداد بنجاح! ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "ملاحظات هامة:" -ForegroundColor Yellow
Write-Host "• هذه المتغيرات مؤقتة وتعمل فقط في هذه النافذة" -ForegroundColor White
Write-Host "• لجعلها دائمة، يجب تعيينها في إعدادات النظام (System Environment Variables)" -ForegroundColor White
Write-Host "• أو قم بتشغيل هذا السكريبت في كل مرة تفتح فيها PowerShell جديد" -ForegroundColor White
Write-Host ""
Write-Host "الأوامر المتاحة الآن:" -ForegroundColor Cyan
Write-Host "  npm run android          # تشغيل على المحاكي" -ForegroundColor White
Write-Host "  cd android; .\gradlew.bat assembleDebug   # بناء Debug APK" -ForegroundColor White
Write-Host ""

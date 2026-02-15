Write-Host "=== تجهيز Gradle المحلّي (بدون إنترنت) ===" -ForegroundColor Cyan

# 1. البحث عن ملف Gradle المضغوط الموجود فعلياً
Write-Host "1. البحث عن نسخة Gradle محلية..." -ForegroundColor Yellow
$gradleZip = Get-ChildItem -Path "K:\.gradle\wrapper\dists" -Filter "gradle-8.11.1-bin.zip" -Recurse | Select-Object -First 1

if ($gradleZip) {
    Write-Host "   ✓ تم العثور على: $($gradleZip.FullName)" -ForegroundColor Green
    
    # 2. نسخة للجذر K:\ ليسهل استخدامه
    Write-Host "2. تجهيز الملف للاستخدام..." -ForegroundColor Yellow
    Copy-Item -Path $gradleZip.FullName -Destination "K:\" -Force
    Write-Host "   ✓ تم نسخ الملف إلى K:\gradle-8.11.1-bin.zip" -ForegroundColor Green
    
    # 3. تشغيل البناء
    Write-Host "3. تشغيل البناء باستخدام النسخة المحلية..." -ForegroundColor Yellow
    
    # إعداد المتغيرات
    $env:ANDROID_HOME = "J:\Android\Sdk"
    $env:JAVA_HOME = "C:\Java\jdk-17.0.10+7"
    $env:GRADLE_USER_HOME = "K:\.gradle"
    $env:PATH = "J:\Android\Sdk\platform-tools;C:\Java\jdk-17.0.10+7\bin;$env:PATH"
    
    cd android
    # استخدام --offline للتأكيد
    .\gradlew.bat installDebug --offline
    
} else {
    Write-Host "   ✗ لم يتم العثور على ملف zip!" -ForegroundColor Red
    Write-Host "   جاري البحث عن أي نسخة أخرى..." -ForegroundColor Yellow
    # البحث عن أي نسخة
    $anyGradle = Get-ChildItem -Path "K:\.gradle\wrapper\dists" -Filter "gradle-*-bin.zip" -Recurse | Select-Object -First 1
    if ($anyGradle) {
        Write-Host "   ✓ وجدنا نسخة بديلة: $($anyGradle.Name)" -ForegroundColor Green
        # يمكننا استخدامها بتعديل gradle-wrapper.properties
    }
}

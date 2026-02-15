# الحل الكامل لمشكلة "No variants exist"

# الخطوة 1: حذف مجلدات build و .gradle
Write-Host "الخطوة 1: تنظيف المشروع..." -ForegroundColor Yellow
Remove-Item "J:\MisterShare\android\.gradle" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "J:\MisterShare\android\app\build" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "J:\MisterShare\android\build" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "تم التنظيف!" -ForegroundColor Green

# الخطوة 2: تعيين المتغيرات
Write-Host "`nالخطوة 2: تعيين متغيرات البيئة..." -ForegroundColor Yellow
$env:ANDROID_HOME = "J:\Android\Sdk"
$env:ANDROID_SDK_ROOT = "J:\Android\Sdk"
$env:JAVA_HOME = "C:\Java\jdk-17.0.10+7"
$env:GRADLE_USER_HOME = "K:\.gradle"
$env:PATH = "J:\Android\Sdk\platform-tools;J:\Android\Sdk\emulator;C:\Java\jdk-17.0.10+7\bin;$env:PATH"
Write-Host "تم تعيين المتغيرات!" -ForegroundColor Green

# الخطوة 3: إعادة تثبيت node_modules (مهم جداً!)
Write-Host "`nالخطوة 3: إعادة تثبيت node_modules..." -ForegroundColor Yellow
cd J:\MisterShare
Remove-Item "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
npm install
Write-Host "تم تثبيت المكتبات!" -ForegroundColor Green

# الخطوة 4: البناء
Write-Host "`nالخطوة 4: بناء المشروع..." -ForegroundColor Yellow
cd android
.\gradlew.bat clean
.\gradlew.bat installDebug

Write-Host "`nانتهى!" -ForegroundColor Cyan

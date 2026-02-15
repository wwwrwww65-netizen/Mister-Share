Write-Host "=== إيقاف العمليات القديمة وتنظيف البناء ===" -ForegroundColor Cyan

# 1. إعداد المتغيرات (لضمان صحة المسارات)
$env:ANDROID_HOME = "J:\Android\Sdk"
$env:ANDROID_SDK_ROOT = "J:\Android\Sdk"
$env:JAVA_HOME = "C:\Java\jdk-17.0.10+7"
$env:GRADLE_USER_HOME = "K:\.gradle"
$env:PATH = "J:\Android\Sdk\platform-tools;C:\Java\jdk-17.0.10+7\bin;$env:PATH"

# 2. الانتقال لمجلد android
cd android

# 3. إيقاف Gradle Daemon (مهم جداً لقتل الذاكرة القديمة)
Write-Host "جاري إيقاف عمليات Gradle القديمة..." -ForegroundColor Yellow
.\gradlew.bat --stop

# 4. تنظيف
Write-Host "جاري التنظيف..." -ForegroundColor Yellow
.\gradlew.bat clean

# 5. البناء بدون Daemon (لضمان بداية نظيفة)
Write-Host "جاري البناء (قد يستغرق وقتاً لكنه لا يحتاج تحميل)..." -ForegroundColor Green
.\gradlew.bat installDebug --no-daemon

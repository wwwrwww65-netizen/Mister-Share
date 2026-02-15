@echo off
echo ========================================
echo    تشغيل MisterShare على المحاكي
echo ========================================
echo.

REM تعيين متغيرات البيئة
set ANDROID_HOME=J:\Android\Sdk
set ANDROID_SDK_ROOT=J:\Android\Sdk
set JAVA_HOME=C:\Java\jdk-17.0.10+7
set GRADLE_USER_HOME=K:\.gradle

echo [1/4] تعيين متغيرات البيئة...
echo   ANDROID_HOME = %ANDROID_HOME%
echo   JAVA_HOME = %JAVA_HOME%
echo   GRADLE_USER_HOME = %GRADLE_USER_HOME%
echo.

echo [2/4] التحقق من المحاكي...
"%ANDROID_HOME%\platform-tools\adb.exe" devices
echo.

echo [3/4] تهيئة الاتصال بالمحاكي (Reverse Port)...
"%ANDROID_HOME%\platform-tools\adb.exe" reverse tcp:8081 tcp:8081

echo [4/4] تشغيل خادوم Metro (في نافذة جديدة)...
start "MisterShare Metro" cmd /k "npm start"
timeout /t 5 >nul
echo.

echo [5/5] بناء وتثبيت التطبيق...
npx react-native run-android

echo.
echo ========================================
echo              انتهى!
echo ========================================
pause

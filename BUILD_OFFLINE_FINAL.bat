@echo off
echo ===========================================
echo   MisterShare Offline Build (FINAL FIX)
echo ===========================================

REM 1. Set Environment Variables
set ANDROID_HOME=J:\Android\Sdk
set ANDROID_SDK_ROOT=J:\Android\Sdk
set JAVA_HOME=C:\Java\jdk-17.0.10+7
set GRADLE_USER_HOME=K:\.gradle
set PATH=%ANDROID_HOME%\platform-tools;%JAVA_HOME%\bin;%PATH%

echo Environment Variables Set:
echo ANDROID_HOME=%ANDROID_HOME%
echo JAVA_HOME=%JAVA_HOME%
echo GRADLE_USER_HOME=%GRADLE_USER_HOME%

REM 2. Verify Gradle Zip
if exist "K:\gradle-8.11.1-bin.zip" (
    echo [OK] Local Gradle Zip found at K:\gradle-8.11.1-bin.zip
) else (
    echo [WARNING] Local Gradle Zip NOT found at K:\. Build might fail if not cached.
)

REM 3. Go to android folder
cd /d "%~dp0android"

REM 4. Clean and Build (Offline, No Daemon)
echo.
echo Cleaning...
call gradlew.bat clean

echo.
echo Building Debug APK (Offline)...
call gradlew.bat installDebug --offline --no-daemon

echo.
echo ===========================================
echo Done.
pause

@echo off
set ANDROID_HOME=J:\Android\Sdk
set ANDROID_SDK_ROOT=J:\Android\Sdk
set JAVA_HOME=C:\Java\jdk-17.0.10+7
set GRADLE_USER_HOME=K:\.gradle

echo Setting up environment...
echo ANDROID_HOME=%ANDROID_HOME%
echo JAVA_HOME=%JAVA_HOME%

cd android
echo Building Release APK...
call gradlew.bat assembleRelease

if exist app\build\outputs\apk\release\app-release.apk (
    echo Build Successful!
    echo APK Location: j:\MisterShare\android\app\build\outputs\apk\release\app-release.apk
    explorer app\build\outputs\apk\release
) else (
    echo Build Failed!
)
pause

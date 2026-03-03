@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

echo.
echo ========================================================
echo   MisterShare - Device Integration Test Suite
echo ========================================================
echo.

REM Try to find ADB
where adb >nul 2>&1
if %errorlevel%==0 (
    set ADB=adb
    echo [OK] ADB found in PATH
    goto :adb_found
)

if exist "C:\scrcpy-win64-v2.0\adb.exe" (
    set ADB=C:\scrcpy-win64-v2.0\adb.exe
    echo [OK] ADB found in scrcpy folder
    goto :adb_found
)

if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" (
    set ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe
    echo [OK] ADB found in Android SDK
    goto :adb_found
)

echo [FAIL] ADB not found
echo Please install Android SDK Platform Tools
pause
exit /b 1

:adb_found

echo [OK] ADB found

REM Get connected devices
echo.
echo === Device Detection ===
echo.

"%ADB%" devices

for /f "skip=1 tokens=1,2" %%a in ('"%ADB%" devices') do (
    if "%%b"=="device" (
        set DEVICE=%%a
        echo [OK] Device found: %%a
    )
)

if "%DEVICE%"=="" (
    echo [FAIL] No devices connected. Please connect an Android device with USB debugging enabled.
    pause
    exit /b 1
)

REM Get device info
echo.
echo === Device Info ===
echo.

for /f "delims=" %%i in ('"%ADB%" -s %DEVICE% shell getprop ro.build.version.release') do set ANDROID_VER=%%i
for /f "delims=" %%i in ('"%ADB%" -s %DEVICE% shell getprop ro.build.version.sdk') do set SDK_VER=%%i
for /f "delims=" %%i in ('"%ADB%" -s %DEVICE% shell getprop ro.product.model') do set MODEL=%%i

echo Device: %MODEL%
echo Android: %ANDROID_VER% (API %SDK_VER%)

if %SDK_VER% GEQ 30 (
    echo Storage Mode: SAF (Android 11+)
) else (
    echo Storage Mode: LEGACY (Android 10-)
)

REM Check MisterShare app
echo.
echo === App Check ===
echo.

"%ADB%" -s %DEVICE% shell pm list packages | findstr "com.mistershare" > nul
if %errorlevel%==0 (
    echo [OK] MisterShare app is installed
) else (
    echo [FAIL] MisterShare app is NOT installed
    echo Run: npx react-native run-android
)

REM Check for PUBG as test game
echo.
echo === Test Game (PUBG Mobile) ===
echo.

"%ADB%" -s %DEVICE% shell pm list packages | findstr "com.tencent.ig" > nul
if %errorlevel%==0 (
    echo [OK] PUBG Mobile is installed
    
    echo Checking OBB folder...
    "%ADB%" -s %DEVICE% shell "ls /storage/emulated/0/Android/obb/com.tencent.ig 2>/dev/null"
    
    echo Checking DATA folder...
    "%ADB%" -s %DEVICE% shell "ls /storage/emulated/0/Android/data/com.tencent.ig 2>/dev/null"
) else (
    echo [WARN] PUBG Mobile not installed - try with another game
)

REM Start the app
echo.
echo === Starting MisterShare ===
echo.

"%ADB%" -s %DEVICE% shell am start -n com.mistershare/.MainActivity
echo [OK] App started

echo.
echo ========================================================
echo   MANUAL TESTING INSTRUCTIONS
echo ========================================================
echo.
echo 1. Open MisterShare app on device
echo 2. Go to "Apps" tab  
echo 3. Select a big game (PUBG, Free Fire, etc.)
echo 4. When asked "Include OBB + DATA?", tap "Yes"
echo 5. Select the game's OBB folder when file browser opens
echo 6. Verify files are added to selection
echo.
echo To monitor logs, run in another terminal:
echo   "%ADB%" logcat -s SAFModule:* TransferService:*
echo.
echo ========================================================
echo.
pause

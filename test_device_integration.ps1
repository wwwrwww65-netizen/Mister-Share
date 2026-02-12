# MisterShare - Device Integration Test Script
# اختبار تكامل فعلي على الجهاز المتصل
#
# Prerequisites:
# - Android device connected via USB
# - USB Debugging enabled
# - App installed (run: npx react-native run-android)
#
# Usage: .\test_device_integration.ps1

param(
    [string]$PackageName = "com.mistershare",
    [string]$TestGamePackage = "com.tencent.ig"
)

function Write-Header($text) {
    Write-Host ""
    Write-Host "=== $text ===" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Success($text) {
    Write-Host "[OK] $text" -ForegroundColor Green
}

function Write-Fail($text) {
    Write-Host "[FAIL] $text" -ForegroundColor Red
}

function Write-Warn($text) {
    Write-Host "[WARN] $text" -ForegroundColor Yellow
}

function Write-Info2($text) {
    Write-Host "[INFO] $text" -ForegroundColor Blue
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  MisterShare - Device Integration Test Suite" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Write-Header "Device Detection"

$adbVersion = adb version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Fail "ADB not found. Please install Android SDK Platform Tools."
    exit 1
}
Write-Success "ADB found"

$devices = adb devices | Select-Object -Skip 1 | Where-Object { $_ -match '\t' }
$deviceCount = ($devices | Measure-Object).Count

if ($deviceCount -eq 0) {
    Write-Fail "No devices connected. Please connect an Android device with USB debugging enabled."
    exit 1
}

Write-Success "$deviceCount device(s) connected"

$deviceSerial = ($devices | Select-Object -First 1).Split("`t")[0]
$androidVersion = adb -s $deviceSerial shell getprop ro.build.version.release
$sdkVersion = adb -s $deviceSerial shell getprop ro.build.version.sdk
$deviceModel = adb -s $deviceSerial shell getprop ro.product.model

Write-Info2 "Device: $deviceModel"
Write-Info2 "Android Version: $androidVersion (API $sdkVersion)"

$sdkInt = [int]$sdkVersion
$mode = if ($sdkInt -ge 30) { "SAF" } else { "LEGACY" }
Write-Info2 "Storage Mode: $mode"

Write-Header "App Installation Check"

$appInstalled = adb -s $deviceSerial shell pm list packages | Select-String $PackageName
if ($appInstalled) {
    Write-Success "MisterShare app is installed"
}
else {
    Write-Fail "MisterShare app is NOT installed. Run: npx react-native run-android"
    exit 1
}

$appInfo = adb -s $deviceSerial shell dumpsys package $PackageName | Select-String "versionName"
if ($appInfo) {
    Write-Info2 "App Info: $appInfo"
}

Write-Header "Test Game Detection ($TestGamePackage)"

$gameInstalled = adb -s $deviceSerial shell pm list packages | Select-String $TestGamePackage
$obbExists = "not_found"
$dataExists = "not_found"

if ($gameInstalled) {
    Write-Success "Test game is installed: $TestGamePackage"
    
    $obbPath = "/storage/emulated/0/Android/obb/$TestGamePackage"
    $obbExists = adb -s $deviceSerial shell "if [ -d $obbPath ]; then echo exists; else echo not_found; fi"
    
    if ($obbExists -match "exists") {
        Write-Success "OBB folder exists: $obbPath"
        $obbFiles = adb -s $deviceSerial shell "ls -la $obbPath 2>/dev/null"
        if ($obbFiles) {
            Write-Info2 "OBB Files found:"
            $obbFiles | ForEach-Object { Write-Host "   $_" }
        }
    }
    else {
        Write-Warn "OBB folder not found. Game may need to be launched once."
    }
    
    $dataPath = "/storage/emulated/0/Android/data/$TestGamePackage"
    $dataExists = adb -s $deviceSerial shell "if [ -d $dataPath ]; then echo exists; else echo not_found; fi"
    
    if ($dataExists -match "exists") {
        Write-Success "DATA folder exists: $dataPath"
    }
    else {
        Write-Warn "DATA folder not found. Game may need to be launched once."
    }
    
}
else {
    Write-Warn "Test game ($TestGamePackage) is not installed."
    Write-Info2 "You can still test with other installed games."
}

Write-Header "Storage Permissions Check"

$grantedPerms = adb -s $deviceSerial shell dumpsys package $PackageName | Select-String "android.permission"

if ($grantedPerms) {
    Write-Info2 "Granted permissions:"
    $grantedPerms | ForEach-Object { 
        $perm = $_.ToString().Trim()
        if ($perm -match "READ_EXTERNAL|WRITE_EXTERNAL|READ_MEDIA") {
            Write-Host "   $perm" -ForegroundColor Green
        }
    }
}

if ($sdkInt -ge 30) {
    Write-Info2 "Checking persisted URI permissions (SAF)..."
    Write-Info2 "SAF permissions require runtime check in app"
}

Write-Header "MisterShare Download Folder Check"

$misterSharePath = "/storage/emulated/0/Download/MisterShare"
$folderExists = adb -s $deviceSerial shell "if [ -d $misterSharePath ]; then echo exists; else echo not_found; fi"

if ($folderExists -match "exists") {
    Write-Success "MisterShare folder exists: $misterSharePath"
    $subfolders = adb -s $deviceSerial shell "ls -la $misterSharePath 2>/dev/null"
    if ($subfolders) {
        Write-Info2 "Contents:"
        $subfolders | ForEach-Object { Write-Host "   $_" }
    }
}
else {
    Write-Info2 "MisterShare folder will be created on first file receive"
}

Write-Header "Network Check"

$wifiInfo = adb -s $deviceSerial shell "dumpsys wifi | grep mWifiInfo" 2>&1
if ($wifiInfo -match "SSID") {
    Write-Success "WiFi connected"
    Write-Info2 $wifiInfo
}
else {
    Write-Warn "WiFi may not be connected"
}

$p2pInfo = adb -s $deviceSerial shell "dumpsys wifip2p" 2>&1 | Select-Object -First 5
if ($p2pInfo) {
    Write-Success "WiFi Direct/P2P available"
}

Write-Header "Native Module Logcat Test"

Write-Info2 "Clearing logcat..."
adb -s $deviceSerial logcat -c

Write-Info2 "Starting app..."
adb -s $deviceSerial shell am start -n "$PackageName/.MainActivity"
Start-Sleep -Seconds 3

Write-Info2 "Capturing SAFModule logs..."
$logcatOutput = adb -s $deviceSerial logcat -d -s "SAFModule:*" --format=brief 2>&1

if ($logcatOutput -and $logcatOutput.Length -gt 0) {
    Write-Success "SAFModule logs captured:"
    $logcatOutput | Select-Object -First 20 | ForEach-Object { 
        Write-Host "   $_" -ForegroundColor Gray 
    }
}
else {
    Write-Info2 "No SAFModule logs yet. Interact with the app to generate logs."
}

Write-Header "Interactive Test Instructions"

Write-Host ""
Write-Host "Now test the app manually on the device:" -ForegroundColor White
Write-Host ""
Write-Host "1. Open the app"
Write-Host "2. Go to 'Apps' tab"
Write-Host "3. Select a big game (PUBG, Free Fire, etc.)"
Write-Host "4. When prompted 'Include OBB + DATA?', tap 'Yes'"
Write-Host "5. Follow instructions to select OBB folder"
Write-Host "6. Verify files are added"
Write-Host ""
Write-Host "Monitor logs with: adb logcat -s SAFModule:* TransferService:*" -ForegroundColor Yellow
Write-Host ""

Write-Header "Test Environment Summary"

Write-Host "Device: $deviceModel"
Write-Host "Android: $androidVersion (API $sdkVersion)"
Write-Host "Storage Mode: $mode"

$appStatus = if ($appInstalled) { "[OK]" } else { "[FAIL]" }
$gameStatus = if ($gameInstalled) { "[OK] Installed" } else { "[WARN] Not Found" }
$obbStatus = if ($obbExists -match 'exists') { "[OK] Exists" } else { "[WARN] Not Found" }
$dataStatus = if ($dataExists -match 'exists') { "[OK] Exists" } else { "[WARN] Not Found" }
$wifiStatus = if ($wifiInfo -match 'SSID') { "[OK] Connected" } else { "[WARN] Check Needed" }

Write-Host "App Installed: $appStatus"
Write-Host "Test Game: $gameStatus"
Write-Host "OBB Folder: $obbStatus"
Write-Host "DATA Folder: $dataStatus"
Write-Host "WiFi: $wifiStatus"

Write-Host ""
Write-Host "Environment check complete! Now do manual testing above." -ForegroundColor Green
Write-Host ""

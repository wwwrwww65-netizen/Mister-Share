# Fix ViewManagerWithGeneratedInterface issue for React Native 0.77
$ErrorActionPreference = "Stop"

Write-Host "Fixing ViewManagerWithGeneratedInterface issue for RN 0.77..." -ForegroundColor Cyan

function Fix-JavaFile {
    param([string]$FilePath)
    
    if (Test-Path $FilePath) {
        $content = Get-Content $FilePath -Raw
        $content = $content -replace 'import com\.facebook\.react\.uimanager\.ViewManagerWithGeneratedInterface;\r?\n', ''
        $content = $content -replace ' extends ViewManagerWithGeneratedInterface', ''
        Set-Content -Path $FilePath -Value $content -NoNewline
        Write-Host "  Fixed: $FilePath" -ForegroundColor Green
    }
}

Write-Host "Fixing react-native-gesture-handler..." -ForegroundColor Yellow
$gestureFiles = @(
    "node_modules\react-native-gesture-handler\android\paper\src\main\java\com\facebook\react\viewmanagers\RNGestureHandlerButtonManagerInterface.java",
    "node_modules\react-native-gesture-handler\android\paper\src\main\java\com\facebook\react\viewmanagers\RNGestureHandlerRootViewManagerInterface.java"
)

foreach ($file in $gestureFiles) {
    Fix-JavaFile -FilePath $file
}

Write-Host "Fixing react-native-screens..." -ForegroundColor Yellow
$screensFiles = @(
    "node_modules\react-native-screens\android\src\paper\java\com\facebook\react\viewmanagers\RNSBottomTabsManagerInterface.java",
    "node_modules\react-native-screens\android\src\paper\java\com\facebook\react\viewmanagers\RNSBottomTabsScreenManagerInterface.java",
    "node_modules\react-native-screens\android\src\paper\java\com\facebook\react\viewmanagers\RNSSafeAreaViewManagerInterface.java",
    "node_modules\react-native-screens\android\src\paper\java\com\facebook\react\viewmanagers\RNSScreenContainerManagerInterface.java",
    "node_modules\react-native-screens\android\src\paper\java\com\facebook\react\viewmanagers\RNSScreenContentWrapperManagerInterface.java",
    "node_modules\react-native-screens\android\src\paper\java\com\facebook\react\viewmanagers\RNSScreenFooterManagerInterface.java",
    "node_modules\react-native-screens\android\src\paper\java\com\facebook\react\viewmanagers\RNSScreenManagerInterface.java",
    "node_modules\react-native-screens\android\src\paper\java\com\facebook\react\viewmanagers\RNSScreenStackHeaderConfigManagerInterface.java",
    "node_modules\react-native-screens\android\src\paper\java\com\facebook\react\viewmanagers\RNSScreenStackHeaderSubviewManagerInterface.java",
    "node_modules\react-native-screens\android\src\paper\java\com\facebook\react\viewmanagers\RNSScreenStackManagerInterface.java",
    "node_modules\react-native-screens\android\src\paper\java\com\facebook\react\viewmanagers\RNSSearchBarManagerInterface.java",
    "node_modules\react-native-screens\android\src\paper\java\com\facebook\react\viewmanagers\RNSStackHostManagerInterface.java",
    "node_modules\react-native-screens\android\src\paper\java\com\facebook\react\viewmanagers\RNSStackScreenManagerInterface.java"
)

foreach ($file in $screensFiles) {
    Fix-JavaFile -FilePath $file
}

Write-Host "All files fixed successfully!" -ForegroundColor Green

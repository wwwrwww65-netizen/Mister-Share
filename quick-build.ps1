# ============================================================================
# سكريبت بناء سريع لتطبيق MisterShare
# Quick Build Script for MisterShare App
# ============================================================================

param(
    [Parameter(Mandatory = $false)]
    [ValidateSet('debug-apk', 'release-apk', 'aab', 'install-debug', 'install-release', 'clean')]
    [string]$BuildType = 'debug-apk',
    
    [Parameter(Mandatory = $false)]
    [switch]$Clean = $false,
    
    [Parameter(Mandatory = $false)]
    [switch]$Verbose = $false
)

# ============================================================================
# إعدادات
# ============================================================================
$ProjectRoot = "I:\MisterShare"
$AndroidRoot = "$ProjectRoot\android"

# ألوان
$ColorHeader = "Cyan"
$ColorSuccess = "Green"
$ColorError = "Red"
$ColorWarning = "Yellow"
$ColorInfo = "White"

# ============================================================================
# دوال مساعدة
# ============================================================================
function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor $ColorHeader
    Write-Host "║  $Message" -ForegroundColor $ColorHeader
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor $ColorHeader
    Write-Host ""
}

function Write-Step {
    param([string]$Message)
    Write-Host "→ $Message" -ForegroundColor $ColorInfo
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor $ColorSuccess
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor $ColorError
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor $ColorWarning
}

function Get-FileSize {
    param([string]$Path)
    if (Test-Path $Path) {
        $size = (Get-Item $Path).Length / 1MB
        return "$([math]::Round($size, 2)) MB"
    }
    return "N/A"
}

# ============================================================================
# البداية
# ============================================================================
Write-Header "بناء تطبيق MisterShare - Build Type: $BuildType"

# التحقق من وجود المشروع
if (-not (Test-Path $AndroidRoot)) {
    Write-Error "مجلد المشروع غير موجود: $AndroidRoot"
    exit 1
}

# الانتقال إلى مجلد Android
Push-Location $AndroidRoot

# ============================================================================
# التنظيف (إذا طُلب)
# ============================================================================
if ($Clean) {
    Write-Step "تنظيف المشروع..."
    
    try {
        if ($Verbose) {
            .\gradlew.bat clean --info
        }
        else {
            .\gradlew.bat clean
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "تم التنظيف بنجاح"
        }
        else {
            Write-Error "فشل التنظيف"
            Pop-Location
            exit 1
        }
    }
    catch {
        Write-Error "خطأ أثناء التنظيف: $_"
        Pop-Location
        exit 1
    }
}

# ============================================================================
# البناء حسب النوع
# ============================================================================
$buildSuccess = $false
$outputPath = ""
$gradleCommand = ""

switch ($BuildType) {
    'debug-apk' {
        Write-Step "بناء Debug APK..."
        $gradleCommand = "assembleDebug"
        $outputPath = "$AndroidRoot\app\build\outputs\apk\debug\app-debug.apk"
    }
    
    'release-apk' {
        Write-Step "بناء Release APK (موقّع)..."
        $gradleCommand = "assembleRelease"
        $outputPath = "$AndroidRoot\app\build\outputs\apk\release\app-release.apk"
    }
    
    'aab' {
        Write-Step "بناء Android App Bundle (AAB)..."
        $gradleCommand = "bundleRelease"
        $outputPath = "$AndroidRoot\app\build\outputs\bundle\release\app-release.aab"
    }
    
    'install-debug' {
        Write-Step "بناء وتثبيت Debug APK..."
        $gradleCommand = "installDebug"
        $outputPath = "$AndroidRoot\app\build\outputs\apk\debug\app-debug.apk"
    }
    
    'install-release' {
        Write-Step "بناء وتثبيت Release APK..."
        $gradleCommand = "installRelease"
        $outputPath = "$AndroidRoot\app\build\outputs\apk\release\app-release.apk"
    }
    
    'clean' {
        Write-Step "تنظيف فقط..."
        $gradleCommand = "clean"
    }
}

# تنفيذ أمر Gradle
try {
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "تنفيذ: gradlew.bat $gradleCommand" -ForegroundColor $ColorInfo
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host ""
    
    $startTime = Get-Date
    
    if ($Verbose) {
        .\gradlew.bat $gradleCommand --info
    }
    else {
        .\gradlew.bat $gradleCommand
    }
    
    $endTime = Get-Date
    $duration = $endTime - $startTime
    
    if ($LASTEXITCODE -eq 0) {
        $buildSuccess = $true
        Write-Host ""
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
        Write-Success "تم البناء بنجاح!"
        Write-Host "الوقت المستغرق: $($duration.Minutes) دقيقة و $($duration.Seconds) ثانية" -ForegroundColor $ColorInfo
    }
    else {
        Write-Host ""
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
        Write-Error "فشل البناء!"
        Pop-Location
        exit 1
    }
}
catch {
    Write-Error "خطأ أثناء البناء: $_"
    Pop-Location
    exit 1
}

# ============================================================================
# عرض معلومات الملف الناتج
# ============================================================================
if ($buildSuccess -and $outputPath -and $BuildType -ne 'clean') {
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "معلومات الملف الناتج:" -ForegroundColor $ColorHeader
    Write-Host ""
    
    if (Test-Path $outputPath) {
        Write-Success "الملف موجود"
        Write-Host "  المسار: $outputPath" -ForegroundColor $ColorInfo
        Write-Host "  الحجم: $(Get-FileSize $outputPath)" -ForegroundColor $ColorInfo
        
        # عرض معلومات إضافية للـ APK
        if ($outputPath -like "*.apk") {
            Write-Host ""
            Write-Host "معلومات APK:" -ForegroundColor $ColorHeader
            
            # التحقق من التوقيع
            $jarsignerPath = "$env:JAVA_HOME\bin\jarsigner.exe"
            if (Test-Path $jarsignerPath) {
                try {
                    $verifyOutput = & $jarsignerPath -verify $outputPath 2>&1
                    if ($verifyOutput -like "*jar verified*") {
                        Write-Success "APK موقّع بشكل صحيح"
                    }
                    else {
                        Write-Warning "APK غير موقّع أو التوقيع غير صالح"
                    }
                }
                catch {
                    Write-Warning "لا يمكن التحقق من التوقيع"
                }
            }
            
            # عرض معلومات الحزمة
            $aaptPath = "$env:ANDROID_HOME\build-tools\35.0.0\aapt.exe"
            if (Test-Path $aaptPath) {
                try {
                    $packageInfo = & $aaptPath dump badging $outputPath 2>&1 | Select-String "package: name"
                    if ($packageInfo) {
                        Write-Host "  $packageInfo" -ForegroundColor $ColorInfo
                    }
                }
                catch {
                    # تجاهل الأخطاء
                }
            }
        }
        
        # عرض معلومات إضافية للـ AAB
        if ($outputPath -like "*.aab") {
            Write-Host ""
            Write-Host "ملاحظة: AAB جاهز للرفع إلى Google Play Console" -ForegroundColor $ColorInfo
        }
        
    }
    else {
        Write-Error "الملف غير موجود في المسار المتوقع!"
        Write-Host "  المسار المتوقع: $outputPath" -ForegroundColor $ColorWarning
    }
}

# ============================================================================
# الخطوات التالية
# ============================================================================
if ($buildSuccess) {
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "الخطوات التالية:" -ForegroundColor $ColorHeader
    Write-Host ""
    
    switch ($BuildType) {
        'debug-apk' {
            Write-Host "  • تثبيت على جهاز متصل:" -ForegroundColor $ColorInfo
            Write-Host "    adb install -r `"$outputPath`"" -ForegroundColor Gray
            Write-Host ""
            Write-Host "  • أو استخدام:" -ForegroundColor $ColorInfo
            Write-Host "    .\quick-build.ps1 -BuildType install-debug" -ForegroundColor Gray
        }
        
        'release-apk' {
            Write-Host "  • تثبيت على جهاز متصل:" -ForegroundColor $ColorInfo
            Write-Host "    adb install -r `"$outputPath`"" -ForegroundColor Gray
            Write-Host ""
            Write-Host "  • أو مشاركة الملف للتوزيع" -ForegroundColor $ColorInfo
        }
        
        'aab' {
            Write-Host "  • رفع إلى Google Play Console" -ForegroundColor $ColorInfo
            Write-Host ""
            Write-Host "  • أو اختبار محلياً باستخدام bundletool:" -ForegroundColor $ColorInfo
            Write-Host "    java -jar bundletool.jar build-apks --bundle=`"$outputPath`" ..." -ForegroundColor Gray
        }
        
        'install-debug' {
            Write-Host "  • تشغيل التطبيق على الجهاز" -ForegroundColor $ColorInfo
            Write-Host ""
            Write-Host "  • أو تشغيل Metro Bundler:" -ForegroundColor $ColorInfo
            Write-Host "    npm start" -ForegroundColor Gray
        }
        
        'install-release' {
            Write-Host "  • التطبيق مثبت ويعمل على الجهاز" -ForegroundColor $ColorInfo
        }
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

Pop-Location

# ============================================================================
# الخروج
# ============================================================================
if ($buildSuccess) {
    exit 0
}
else {
    exit 1
}

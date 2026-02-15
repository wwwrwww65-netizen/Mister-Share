# مسارات البيئة الكاملة لتطبيق MisterShare
**تاريخ الإنشاء:** 2026-02-13  
**المشروع:** MisterShare - File Transfer Application  
**الحزمة:** com.mistershare.filetransfer

---

## 📋 جدول المحتويات
1. [معلومات المشروع الأساسية](#معلومات-المشروع-الأساسية)
2. [متغيرات البيئة (Environment Variables)](#متغيرات-البيئة-environment-variables)
3. [مسارات Android SDK](#مسارات-android-sdk)
4. [مسارات Java JDK](#مسارات-java-jdk)
5. [مسارات Node.js و NPM](#مسارات-nodejs-و-npm)
6. [مسارات Gradle](#مسارات-gradle)
7. [مسارات المشروع](#مسارات-المشروع)
8. [أوامر التشغيل على المحاكي](#أوامر-التشغيل-على-المحاكي)
9. [أوامر بناء APK](#أوامر-بناء-apk)
10. [أوامر بناء AAB](#أوامر-بناء-aab)
11. [المسارات الكاملة للأدوات](#المسارات-الكاملة-للأدوات)

---

## 📱 معلومات المشروع الأساسية

### معلومات التطبيق
- **اسم التطبيق:** Mister Share
- **اسم الحزمة:** `com.mistershare.filetransfer`
- **إصدار الكود:** 11
- **إصدار الاسم:** 1.0
- **مسار المشروع:** `I:\MisterShare`

### التقنيات المستخدمة
- **React Native:** 0.77.1
- **React:** 18.3.1
- **TypeScript:** 5.0.4
- **Kotlin:** 1.9.25
- **Gradle:** 8.11.1
- **Android Gradle Plugin:** 8.8.0

### إعدادات Android
- **Min SDK:** 24 (Android 7.0)
- **Target SDK:** 35 (Android 15)
- **Compile SDK:** 35
- **Build Tools:** 35.0.0
- **NDK Version:** 26.1.10909125

---

## 🌍 متغيرات البيئة (Environment Variables)

### المتغيرات المطلوبة في النظام

```powershell
# متغيرات البيئة الأساسية
ANDROID_HOME=I:\Android\Sdk
ANDROID_SDK_ROOT=I:\Android\Sdk
JAVA_HOME=C:\Java\jdk-17.0.10+7
GRADLE_USER_HOME=J:\.gradle

# إضافة المسارات إلى PATH
PATH=%PATH%;I:\Android\Sdk\platform-tools
PATH=%PATH%;I:\Android\Sdk\emulator
PATH=%PATH%;I:\Android\Sdk\cmdline-tools\latest\bin
PATH=%PATH%;I:\Android\Sdk\build-tools\35.0.0
PATH=%PATH%;C:\Java\jdk-17.0.10+7\bin
```

### التحقق من المتغيرات (PowerShell)

```powershell
# عرض ANDROID_HOME
$env:ANDROID_HOME
# النتيجة المتوقعة: I:\Android\Sdk

# عرض JAVA_HOME
$env:JAVA_HOME
# النتيجة المتوقعة: C:\Java\jdk-17.0.10+7

# عرض ANDROID_SDK_ROOT
$env:ANDROID_SDK_ROOT
# النتيجة المتوقعة: I:\Android\Sdk
```

---

## 📦 مسارات Android SDK

### المسار الرئيسي
```
I:\Android\Sdk
```

### المسارات الفرعية الهامة

#### 1. Platform Tools (ADB, Fastboot)
```
I:\Android\Sdk\platform-tools\
I:\Android\Sdk\platform-tools\adb.exe
I:\Android\Sdk\platform-tools\fastboot.exe
```

#### 2. Build Tools
```
I:\Android\Sdk\build-tools\
I:\Android\Sdk\build-tools\33.0.1\
I:\Android\Sdk\build-tools\34.0.0\
I:\Android\Sdk\build-tools\35.0.0\      ← المستخدم حالياً
I:\Android\Sdk\build-tools\36.0.0\
```

**الأدوات المهمة في Build Tools:**
```
I:\Android\Sdk\build-tools\35.0.0\aapt2.exe
I:\Android\Sdk\build-tools\35.0.0\apksigner.bat
I:\Android\Sdk\build-tools\35.0.0\zipalign.exe
I:\Android\Sdk\build-tools\35.0.0\d8.bat
```

#### 3. Platforms (Android API Levels)
```
I:\Android\Sdk\platforms\
I:\Android\Sdk\platforms\android-28\    (API 28 - Android 9)
I:\Android\Sdk\platforms\android-30\    (API 30 - Android 11)
I:\Android\Sdk\platforms\android-31\    (API 31 - Android 12)
I:\Android\Sdk\platforms\android-34\    (API 34 - Android 14)
I:\Android\Sdk\platforms\android-35\    (API 35 - Android 15) ← المستخدم حالياً
I:\Android\Sdk\platforms\android-36\    (API 36 - Android 16)
```

#### 4. NDK (Native Development Kit)
```
I:\Android\Sdk\ndk\
I:\Android\Sdk\ndk\25.1.8937393\
I:\Android\Sdk\ndk\26.1.10909125\       ← المستخدم حالياً
I:\Android\Sdk\ndk\27.0.12077973\
I:\Android\Sdk\ndk\27.1.12297006\
I:\Android\Sdk\ndk\27.2.12479018\
I:\Android\Sdk\ndk\28.2.13676358\
```

#### 5. Emulator
```
I:\Android\Sdk\emulator\
I:\Android\Sdk\emulator\emulator.exe
I:\Android\Sdk\emulator\emulator-check.exe
```

#### 6. Command Line Tools
```
I:\Android\Sdk\cmdline-tools\latest\
I:\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat
I:\Android\Sdk\cmdline-tools\latest\bin\avdmanager.bat
```

---

## ☕ مسارات Java JDK

### المسار الرئيسي
```
C:\Java\jdk-17.0.10+7
```

### المسارات الفرعية

#### 1. Java Binaries
```
C:\Java\jdk-17.0.10+7\bin\
C:\Java\jdk-17.0.10+7\bin\java.exe
C:\Java\jdk-17.0.10+7\bin\javac.exe
C:\Java\jdk-17.0.10+7\bin\jar.exe
C:\Java\jdk-17.0.10+7\bin\jarsigner.exe
```

#### 2. Java Libraries
```
C:\Java\jdk-17.0.10+7\lib\
C:\Java\jdk-17.0.10+7\jmods\
```

### معلومات الإصدار
- **الإصدار:** OpenJDK 17.0.10
- **التوزيعة:** Eclipse Temurin (Adoptium)
- **Build:** 17.0.10+7
- **VM:** OpenJDK 64-Bit Server VM

---

## 🟢 مسارات Node.js و NPM

### معلومات الإصدارات
- **Node.js:** v20.16.0
- **NPM:** 10.8.1

### المسارات (تعتمد على التثبيت)
```
# عادة في:
C:\Program Files\nodejs\
C:\Program Files\nodejs\node.exe
C:\Program Files\nodejs\npm.cmd

# أو في:
%USERPROFILE%\AppData\Roaming\npm\
```

### التحقق من المسارات
```powershell
# عرض مسار Node
where.exe node
# عرض مسار NPM
where.exe npm
```

---

## 🐘 مسارات Gradle

### Gradle Wrapper (المفضل للمشروع)
```
I:\MisterShare\android\gradlew.bat
I:\MisterShare\android\gradle\wrapper\gradle-wrapper.jar
I:\MisterShare\android\gradle\wrapper\gradle-wrapper.properties
```

### معلومات Gradle
- **الإصدار:** 8.11.1
- **Kotlin:** 2.0.20
- **Groovy:** 3.0.22
- **Ant:** 1.10.14

### Gradle User Home (Cache)
```
J:\.gradle\
J:\.gradle\caches\
J:\.gradle\wrapper\dists\
```
**ملاحظة:** يتم استخدام هذا المسار بدلاً من المسار الافتراضي لتخزين جميع ملفات Gradle والمكتبات.

---

## 📂 مسارات المشروع

### المسار الرئيسي
```
I:\MisterShare\
```

### الهيكل الأساسي

#### 1. ملفات الجذر
```
I:\MisterShare\package.json
I:\MisterShare\tsconfig.json
I:\MisterShare\babel.config.js
I:\MisterShare\metro.config.js
I:\MisterShare\App_Brief.md
I:\MisterShare\README.md
```

#### 2. مجلد Android
```
I:\MisterShare\android\
I:\MisterShare\android\build.gradle                     (إعدادات المشروع)
I:\MisterShare\android\gradle.properties                (خصائص Gradle)
I:\MisterShare\android\local.properties                 (مسارات SDK و JDK)
I:\MisterShare\android\settings.gradle                  (إعدادات المشروع)
I:\MisterShare\android\gradlew.bat                      (Gradle Wrapper)
```

#### 3. مجلد التطبيق
```
I:\MisterShare\android\app\
I:\MisterShare\android\app\build.gradle                 (إعدادات التطبيق)
I:\MisterShare\android\app\proguard-rules.pro           (قواعد ProGuard)
```

#### 4. ملفات Manifest و Resources
```
I:\MisterShare\android\app\src\main\AndroidManifest.xml
I:\MisterShare\android\app\src\main\res\
I:\MisterShare\android\app\src\main\res\values\strings.xml
I:\MisterShare\android\app\src\main\res\mipmap-*/ic_launcher.png
```

#### 5. الكود الأصلي (Kotlin/Java)
```
I:\MisterShare\android\app\src\main\java\com\mistershare\filetransfer\
I:\MisterShare\android\app\src\main\java\com\mistershare\filetransfer\MainActivity.kt
I:\MisterShare\android\app\src\main\java\com\mistershare\filetransfer\MainApplication.kt
```

#### 6. الكود المصدري (TypeScript/React Native)
```
I:\MisterShare\src\
I:\MisterShare\src\screens\
I:\MisterShare\src\components\
I:\MisterShare\src\services\
I:\MisterShare\src\store\
I:\MisterShare\src\theme\
I:\MisterShare\src\translations\
```

#### 7. ملفات التوقيع (Keystore)
```
I:\MisterShare\android\app\debug.keystore
I:\MisterShare\android\app\mister-share-release-key.keystore
```

**معلومات Keystore للإصدار:**
- **اسم الملف:** mister-share-release-key.keystore
- **كلمة المرور:** MisterShare@2026
- **Alias:** mistershare_key
- **كلمة مرور المفتاح:** MisterShare@2026

#### 8. مجلدات Build (يتم إنشاؤها عند البناء)
```
I:\MisterShare\android\app\build\
I:\MisterShare\android\app\build\outputs\apk\debug\
I:\MisterShare\android\app\build\outputs\apk\release\
I:\MisterShare\android\app\build\outputs\bundle\release\
```

---

## 🚀 أوامر التشغيل على المحاكي

### الطريقة 1: باستخدام React Native CLI (الأسهل)

```powershell
# الانتقال إلى مجلد المشروع
cd I:\MisterShare

# تشغيل Metro Bundler في نافذة منفصلة
npm start

# في نافذة PowerShell أخرى: تشغيل على المحاكي
npm run android
# أو
npx react-native run-android
```

### الطريقة 2: باستخدام Gradle مباشرة

```powershell
# الانتقال إلى مجلد المشروع
cd I:\MisterShare

# تشغيل Metro Bundler
Start-Process powershell -ArgumentList "cd I:\MisterShare; npm start"

# بناء وتثبيت Debug APK
cd android
.\gradlew.bat installDebug

# تشغيل التطبيق
& "I:\Android\Sdk\platform-tools\adb.exe" shell am start -n com.mistershare.filetransfer/.MainActivity
```

### الطريقة 3: تشغيل المحاكي يدوياً ثم التثبيت

```powershell
# 1. عرض قائمة المحاكيات المتاحة
& "I:\Android\Sdk\emulator\emulator.exe" -list-avds

# 2. تشغيل محاكي معين (استبدل AVD_NAME باسم المحاكي)
& "I:\Android\Sdk\emulator\emulator.exe" -avd AVD_NAME

# 3. في نافذة أخرى: التحقق من اتصال الجهاز
& "I:\Android\Sdk\platform-tools\adb.exe" devices

# 4. بناء وتثبيت
cd I:\MisterShare\android
.\gradlew.bat installDebug

# 5. تشغيل Metro Bundler
cd I:\MisterShare
npm start
```

### أوامر مساعدة للمحاكي

```powershell
# عرض الأجهزة المتصلة
& "I:\Android\Sdk\platform-tools\adb.exe" devices

# إعادة تشغيل ADB Server
& "I:\Android\Sdk\platform-tools\adb.exe" kill-server
& "I:\Android\Sdk\platform-tools\adb.exe" start-server

# عرض Logs من الجهاز
& "I:\Android\Sdk\platform-tools\adb.exe" logcat

# تصفية Logs للتطبيق فقط
& "I:\Android\Sdk\platform-tools\adb.exe" logcat | Select-String "MisterShare"

# إلغاء تثبيت التطبيق
& "I:\Android\Sdk\platform-tools\adb.exe" uninstall com.mistershare.filetransfer

# مسح بيانات التطبيق
& "I:\Android\Sdk\platform-tools\adb.exe" shell pm clear com.mistershare.filetransfer
```

---

## 📦 أوامر بناء APK

### Debug APK (للتطوير والاختبار)

```powershell
# الانتقال إلى مجلد المشروع
cd I:\MisterShare

# الطريقة 1: باستخدام Gradle Wrapper
cd android
.\gradlew.bat assembleDebug

# الطريقة 2: تنظيف ثم بناء
.\gradlew.bat clean assembleDebug

# موقع الملف الناتج:
# I:\MisterShare\android\app\build\outputs\apk\debug\app-debug.apk
```

### Release APK (للنشر)

```powershell
# الانتقال إلى مجلد المشروع
cd I:\MisterShare\android

# بناء Release APK (موقّع)
.\gradlew.bat assembleRelease

# موقع الملف الناتج:
# I:\MisterShare\android\app\build\outputs\apk\release\app-release.apk
```

### أوامر متقدمة لـ APK

```powershell
# تنظيف كامل ثم بناء Release
cd I:\MisterShare\android
.\gradlew.bat clean
.\gradlew.bat assembleRelease

# بناء مع تفعيل ProGuard و Resource Shrinking
.\gradlew.bat assembleRelease -Pandroid.enableR8.fullMode=true

# بناء لمعمارية معينة فقط (تقليل حجم الملف)
.\gradlew.bat assembleRelease -PabiFilters=arm64-v8a

# عرض معلومات البناء
.\gradlew.bat assembleRelease --info

# عرض معلومات مفصلة جداً
.\gradlew.bat assembleRelease --debug
```

### التحقق من APK بعد البناء

```powershell
# التحقق من التوقيع
& "C:\Java\jdk-17.0.10+7\bin\jarsigner.exe" -verify -verbose -certs "I:\MisterShare\android\app\build\outputs\apk\release\app-release.apk"

# عرض معلومات APK
& "I:\Android\Sdk\build-tools\35.0.0\aapt.exe" dump badging "I:\MisterShare\android\app\build\outputs\apk\release\app-release.apk"

# تثبيت APK على جهاز متصل
& "I:\Android\Sdk\platform-tools\adb.exe" install -r "I:\MisterShare\android\app\build\outputs\apk\release\app-release.apk"
```

---

## 📱 أوامر بناء AAB (Android App Bundle)

### Release AAB (للنشر على Google Play)

```powershell
# الانتقال إلى مجلد Android
cd I:\MisterShare\android

# بناء Release AAB (موقّع)
.\gradlew.bat bundleRelease

# موقع الملف الناتج:
# I:\MisterShare\android\app\build\outputs\bundle\release\app-release.aab
```

### أوامر متقدمة لـ AAB

```powershell
# تنظيف كامل ثم بناء AAB
cd I:\MisterShare\android
.\gradlew.bat clean
.\gradlew.bat bundleRelease

# بناء مع معلومات مفصلة
.\gradlew.bat bundleRelease --info

# بناء مع تفعيل كل التحسينات
.\gradlew.bat bundleRelease -Pandroid.enableR8.fullMode=true
```

### اختبار AAB محلياً باستخدام bundletool

```powershell
# تحميل bundletool (إذا لم يكن موجوداً)
# من: https://github.com/google/bundletool/releases

# إنشاء APKs من AAB
java -jar bundletool.jar build-apks `
  --bundle="I:\MisterShare\android\app\build\outputs\bundle\release\app-release.aab" `
  --output="I:\MisterShare\android\app\build\outputs\bundle\release\app-release.apks" `
  --ks="I:\MisterShare\android\app\mister-share-release-key.keystore" `
  --ks-pass=pass:MisterShare@2026 `
  --ks-key-alias=mistershare_key `
  --key-pass=pass:MisterShare@2026

# تثبيت APKs على جهاز متصل
java -jar bundletool.jar install-apks `
  --apks="I:\MisterShare\android\app\build\outputs\bundle\release\app-release.apks"

# عرض محتويات AAB
java -jar bundletool.jar dump manifest `
  --bundle="I:\MisterShare\android\app\build\outputs\bundle\release\app-release.aab"

# تقدير حجم التنزيل
java -jar bundletool.jar get-size total `
  --bundle="I:\MisterShare\android\app\build\outputs\bundle\release\app-release.aab"
```

---

## 🛠️ المسارات الكاملة للأدوات

### أدوات Android SDK

```powershell
# ADB (Android Debug Bridge)
I:\Android\Sdk\platform-tools\adb.exe

# Fastboot
I:\Android\Sdk\platform-tools\fastboot.exe

# Emulator
I:\Android\Sdk\emulator\emulator.exe

# AAPT2 (Android Asset Packaging Tool)
I:\Android\Sdk\build-tools\35.0.0\aapt2.exe

# APK Signer
I:\Android\Sdk\build-tools\35.0.0\apksigner.bat

# Zipalign
I:\Android\Sdk\build-tools\35.0.0\zipalign.exe

# D8 (DEX Compiler)
I:\Android\Sdk\build-tools\35.0.0\d8.bat

# SDK Manager
I:\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat

# AVD Manager
I:\Android\Sdk\cmdline-tools\latest\bin\avdmanager.bat
```

### أدوات Java

```powershell
# Java Runtime
C:\Java\jdk-17.0.10+7\bin\java.exe

# Java Compiler
C:\Java\jdk-17.0.10+7\bin\javac.exe

# JAR Tool
C:\Java\jdk-17.0.10+7\bin\jar.exe

# JAR Signer
C:\Java\jdk-17.0.10+7\bin\jarsigner.exe

# Keytool
C:\Java\jdk-17.0.10+7\bin\keytool.exe
```

### أدوات Gradle

```powershell
# Gradle Wrapper (المفضل)
I:\MisterShare\android\gradlew.bat

# Gradle Properties
I:\MisterShare\android\gradle.properties

# Gradle Wrapper Properties
I:\MisterShare\android\gradle\wrapper\gradle-wrapper.properties
```

---

## 🔧 إعدادات ملف local.properties

**الموقع:** `I:\MisterShare\android\local.properties`

```properties
# مسار Android SDK
sdk.dir=I:\\Android\\Sdk

# مسار Java JDK
java.home=C:\\Java\\jdk-17.0.10+7
```

**ملاحظة:** يجب استخدام `\\` بدلاً من `\` في ملف properties.

---

## 🔧 إعدادات ملف gradle.properties

**الموقع:** `I:\MisterShare\android\gradle.properties`

```properties
# VisionCamera Configuration
VisionCamera_enableFrameProcessors=false

# React Native Architecture
newArchEnabled=false

# JavaScript Engine
hermesEnabled=true

# Gradle JVM Memory
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1G

# Android X Support
android.useAndroidX=true
android.enableJetifier=true
```

---

## 📝 سكريبتات مساعدة

### سكريبت PowerShell للتحقق من البيئة

```powershell
# حفظ هذا في: check-environment.ps1

Write-Host "=== فحص بيئة تطوير MisterShare ===" -ForegroundColor Cyan

# فحص ANDROID_HOME
Write-Host "`n1. ANDROID_HOME:" -ForegroundColor Yellow
if ($env:ANDROID_HOME) {
    Write-Host "   ✓ $env:ANDROID_HOME" -ForegroundColor Green
} else {
    Write-Host "   ✗ غير معرّف" -ForegroundColor Red
}

# فحص JAVA_HOME
Write-Host "`n2. JAVA_HOME:" -ForegroundColor Yellow
if ($env:JAVA_HOME) {
    Write-Host "   ✓ $env:JAVA_HOME" -ForegroundColor Green
} else {
    Write-Host "   ✗ غير معرّف" -ForegroundColor Red
}

# فحص Node.js
Write-Host "`n3. Node.js:" -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "   ✓ $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "   ✗ غير مثبت" -ForegroundColor Red
}

# فحص NPM
Write-Host "`n4. NPM:" -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "   ✓ v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "   ✗ غير مثبت" -ForegroundColor Red
}

# فحص Java
Write-Host "`n5. Java:" -ForegroundColor Yellow
try {
    $javaPath = "$env:JAVA_HOME\bin\java.exe"
    if (Test-Path $javaPath) {
        $javaVersion = & $javaPath -version 2>&1 | Select-Object -First 1
        Write-Host "   ✓ $javaVersion" -ForegroundColor Green
    } else {
        Write-Host "   ✗ غير موجود في المسار المحدد" -ForegroundColor Red
    }
} catch {
    Write-Host "   ✗ خطأ في التحقق" -ForegroundColor Red
}

# فحص ADB
Write-Host "`n6. ADB:" -ForegroundColor Yellow
try {
    $adbPath = "$env:ANDROID_HOME\platform-tools\adb.exe"
    if (Test-Path $adbPath) {
        $adbVersion = & $adbPath --version | Select-Object -First 1
        Write-Host "   ✓ $adbVersion" -ForegroundColor Green
    } else {
        Write-Host "   ✗ غير موجود" -ForegroundColor Red
    }
} catch {
    Write-Host "   ✗ خطأ في التحقق" -ForegroundColor Red
}

# فحص Gradle
Write-Host "`n7. Gradle:" -ForegroundColor Yellow
try {
    $gradlePath = "I:\MisterShare\android\gradlew.bat"
    if (Test-Path $gradlePath) {
        Write-Host "   ✓ Gradle Wrapper موجود" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Gradle Wrapper غير موجود" -ForegroundColor Red
    }
} catch {
    Write-Host "   ✗ خطأ في التحقق" -ForegroundColor Red
}

Write-Host "`n=== انتهى الفحص ===" -ForegroundColor Cyan
```

### سكريبت بناء سريع

```powershell
# حفظ هذا في: quick-build.ps1

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('debug', 'release', 'aab')]
    [string]$BuildType = 'debug'
)

Write-Host "=== بناء MisterShare ===" -ForegroundColor Cyan
Write-Host "نوع البناء: $BuildType`n" -ForegroundColor Yellow

cd I:\MisterShare\android

switch ($BuildType) {
    'debug' {
        Write-Host "بناء Debug APK..." -ForegroundColor Green
        .\gradlew.bat assembleDebug
        $outputPath = "I:\MisterShare\android\app\build\outputs\apk\debug\app-debug.apk"
    }
    'release' {
        Write-Host "بناء Release APK..." -ForegroundColor Green
        .\gradlew.bat assembleRelease
        $outputPath = "I:\MisterShare\android\app\build\outputs\apk\release\app-release.apk"
    }
    'aab' {
        Write-Host "بناء Release AAB..." -ForegroundColor Green
        .\gradlew.bat bundleRelease
        $outputPath = "I:\MisterShare\android\app\build\outputs\bundle\release\app-release.aab"
    }
}

if (Test-Path $outputPath) {
    Write-Host "`n✓ تم البناء بنجاح!" -ForegroundColor Green
    Write-Host "الملف: $outputPath" -ForegroundColor Cyan
    
    $fileSize = (Get-Item $outputPath).Length / 1MB
    Write-Host "الحجم: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Cyan
} else {
    Write-Host "`n✗ فشل البناء!" -ForegroundColor Red
}
```

---

## 🎯 الأوامر الأكثر استخداماً (ملخص سريع)

### تشغيل على المحاكي
```powershell
cd I:\MisterShare
npm start                    # في نافذة منفصلة
npm run android             # في نافذة أخرى
```

### بناء Debug APK
```powershell
cd I:\MisterShare\android
.\gradlew.bat assembleDebug
```

### بناء Release APK
```powershell
cd I:\MisterShare\android
.\gradlew.bat assembleRelease
```

### بناء AAB للنشر
```powershell
cd I:\MisterShare\android
.\gradlew.bat bundleRelease
```

### تنظيف المشروع
```powershell
cd I:\MisterShare\android
.\gradlew.bat clean
```

### عرض الأجهزة المتصلة
```powershell
& "I:\Android\Sdk\platform-tools\adb.exe" devices
```

---

## 📌 ملاحظات هامة

### 1. متطلبات النظام
- **نظام التشغيل:** Windows 10/11
- **الذاكرة:** 8 GB RAM كحد أدنى (16 GB موصى به)
- **المساحة:** 20 GB مساحة حرة على الأقل
- **المعالج:** يدعم Virtualization (لتشغيل المحاكي)

### 2. تفعيل Virtualization
لتشغيل محاكي Android بسرعة، يجب تفعيل:
- **Intel:** Intel VT-x
- **AMD:** AMD-V

### 3. مشاكل شائعة وحلولها

#### المشكلة: "ANDROID_HOME is not set"
```powershell
# الحل: إضافة المتغير
[System.Environment]::SetEnvironmentVariable('ANDROID_HOME', 'I:\Android\Sdk', 'User')
```

#### المشكلة: "java: command not found"
```powershell
# الحل: إضافة Java إلى PATH
$env:PATH += ";C:\Java\jdk-17.0.10+7\bin"
```

#### المشكلة: "Gradle build failed"
```powershell
# الحل: تنظيف وإعادة البناء
cd I:\MisterShare\android
.\gradlew.bat clean
.\gradlew.bat assembleDebug --refresh-dependencies
```

### 4. نصائح للأداء

#### تسريع Gradle Build
```properties
# إضافة إلى gradle.properties
org.gradle.daemon=true
org.gradle.parallel=true
org.gradle.configureondemand=true
org.gradle.caching=true
```

#### تقليل حجم APK
- استخدام ProGuard/R8 (مفعّل في Release)
- بناء لمعمارية واحدة عند الاختبار
- استخدام AAB للنشر (Google Play يقوم بالتحسين)

---

## 📞 معلومات إضافية

### روابط مفيدة
- **React Native Docs:** https://reactnative.dev/
- **Android Developer:** https://developer.android.com/
- **Gradle Docs:** https://docs.gradle.org/

### ملفات التوثيق في المشروع
- `I:\MisterShare\App_Brief.md` - معلومات المشروع الأساسية
- `I:\MisterShare\README.md` - دليل المشروع
- `I:\MisterShare\PROJECT_ANALYSIS_REPORT.md` - تحليل المشروع

---

**تم إنشاء هذا الملف بواسطة:** Antigravity AI Assistant  
**التاريخ:** 2026-02-13  
**الإصدار:** 1.0

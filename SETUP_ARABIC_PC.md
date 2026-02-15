# ملخص التغييرات للجهاز العربي - MisterShare

## التغييرات المطلوبة من الجهاز الإنجليزي إلى العربي

### 1. المسارات الأساسية
| المكون | الجهاز الإنجليزي | الجهاز العربي |
|--------|------------------|---------------|
| المشروع | `I:\MisterShare` | `J:\MisterShare` |
| Android SDK | `I:\Android\Sdk` | `J:\Android\Sdk` |
| Gradle Cache | `J:\.gradle` | `K:\.gradle` |
| Java JDK | `C:\Java\jdk-17.0.10+7` | `C:\Java\jdk-17.0.10+7` ✓ |

### 2. الملفات المحدثة

#### ✅ `android/local.properties`
```properties
sdk.dir=J\\:\\\\Android\\\\Sdk
java.home=C\\:\\\\Java\\\\jdk-17.0.10+7
```

### 3. متغيرات البيئة المطلوبة

قبل تشغيل المشروع، قم بتعيين هذه المتغيرات في PowerShell:

```powershell
$env:ANDROID_HOME = "J:\Android\Sdk"
$env:ANDROID_SDK_ROOT = "J:\Android\Sdk"
$env:JAVA_HOME = "C:\Java\jdk-17.0.10+7"
$env:GRADLE_USER_HOME = "K:\.gradle"
```

### 4. خطوات التشغيل على المحاكي

#### ⭐ الطريقة الأسهل: استخدام السكريبتات الجاهزة

```powershell
# تشغيل على المحاكي
.\run-on-emulator.ps1

# بناء Debug APK
.\build-apk.ps1

# بناء Release APK
.\build-apk.ps1 -BuildType release
```

**ملاحظة مهمة:** السكريبتات تقوم تلقائياً بتعيين جميع المتغيرات المطلوبة!

#### الطريقة اليدوية:
```powershell
# 1. الانتقال للمشروع
cd J:\MisterShare

# 2. تعيين متغيرات البيئة (مهم جداً!)
$env:ANDROID_HOME = "J:\Android\Sdk"
$env:JAVA_HOME = "C:\Java\jdk-17.0.10+7"
$env:GRADLE_USER_HOME = "K:\.gradle"

# 3. تشغيل Metro Bundler (في نافذة منفصلة)
npm start

# 4. في نافذة PowerShell أخرى: تشغيل على المحاكي
npm run android
```

#### أو باستخدام Gradle مباشرة:
```powershell
# تعيين المتغيرات أولاً
$env:ANDROID_HOME = "J:\Android\Sdk"
$env:JAVA_HOME = "C:\Java\jdk-17.0.10+7"
$env:GRADLE_USER_HOME = "K:\.gradle"

# ثم البناء
cd J:\MisterShare\android
.\gradlew.bat installDebug
```

### 5. التحقق من البيئة

```powershell
# التحقق من Android SDK
Test-Path "J:\Android\Sdk\platform-tools\adb.exe"

# التحقق من Java
Test-Path "C:\Java\jdk-17.0.10+7\bin\java.exe"

# عرض الأجهزة المتصلة
& "J:\Android\Sdk\platform-tools\adb.exe" devices
```

### 6. ملاحظات هامة

- ✅ ملف `local.properties` محدّث بالمسارات الصحيحة
- ⚠️ **مهم جداً:** يجب تعيين `GRADLE_USER_HOME` قبل تشغيل أي أمر Gradle
- ⚠️ متغيرات البيئة يجب تعيينها في كل نافذة PowerShell جديدة
- 💡 لجعل المتغيرات دائمة: System Properties → Environment Variables
- 📱 تأكد من تشغيل المحاكي قبل `npm run android`

#### ⚠️ لماذا يجب تعيين GRADLE_USER_HOME؟

إذا لم تقم بتعيين `GRADLE_USER_HOME = K:\.gradle` قبل تشغيل Gradle، سيقوم Gradle بـ:
1. استخدام المسار الافتراضي `C:\Users\[username]\.gradle`
2. **تحميل جميع الملفات من الإنترنت من جديد** (حوالي 200+ MB)
3. هدر الوقت والإنترنت

**الحل:** استخدم السكريبتات الجاهزة (`run-on-emulator.ps1` أو `build-apk.ps1`) التي تقوم بتعيين المتغيرات تلقائياً!

### 7. حل المشاكل الشائعة

#### المشكلة: `ANDROID_HOME not found`
```powershell
$env:ANDROID_HOME = "J:\Android\Sdk"
$env:ANDROID_SDK_ROOT = "J:\Android\Sdk"
```

#### المشكلة: `Java not found`
```powershell
$env:JAVA_HOME = "C:\Java\jdk-17.0.10+7"
```

#### المشكلة: `No devices found`
```powershell
# تشغيل المحاكي
& "J:\Android\Sdk\emulator\emulator.exe" -list-avds
& "J:\Android\Sdk\emulator\emulator.exe" -avd [AVD_NAME]
```

---

**آخر تحديث:** 2026-02-13

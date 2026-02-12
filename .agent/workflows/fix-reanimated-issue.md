---
description: Fix Reanimated Build Error - Downgrade to 3.x
---

# حل مشكلة React Native Reanimated

## المشكلة
`react-native-reanimated` 4.2.1 يتطلب `react-native-worklets` و New Architecture، مما يسبب فشل البناء.

## الحل الموصى به: الرجوع إلى Reanimated 3.x

### الخطوات:

#### 1. إزالة Reanimated 4.x وتثبيت 3.x
```bash
npm uninstall react-native-reanimated
npm install react-native-reanimated@3.15.5 --save
```

#### 2. تحديث babel.config.js
تأكد من أن `react-native-reanimated/plugin` هو آخر plugin في القائمة:
```javascript
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    'react-native-worklets-core/plugin',
    'react-native-reanimated/plugin', // يجب أن يكون الأخير
  ],
};
```

#### 3. تنظيف المشروع
```bash
# تنظيف cache
npx react-native start --reset-cache

# تنظيف Android build
cd android
./gradlew clean
cd ..

# حذف node_modules وإعادة التثبيت
rm -rf node_modules
npm install
```

#### 4. إعادة البناء
```bash
npx react-native run-android
```

### لماذا هذا الحل؟
- ✅ Reanimated 3.x متوافق مع Legacy Architecture
- ✅ لا يحتاج `react-native-worklets`
- ✅ متوافق مع `react-native-vision-camera` و `react-native-worklets-core`
- ✅ مستقر ومجرب في مشاريع كثيرة
- ✅ يعمل مع React Native 0.77.1

---

## الحل البديل 2: تثبيت react-native-worklets

إذا كنت تريد البقاء على Reanimated 4.x:

#### 1. تثبيت react-native-worklets
```bash
npm install react-native-worklets@latest --save
```

#### 2. تحديث babel.config.js
```javascript
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    'react-native-worklets-core/plugin',
    'react-native-worklets/plugin',
    'react-native-reanimated/plugin', // يجب أن يكون الأخير
  ],
};
```

#### 3. تفعيل New Architecture
في `android/gradle.properties`:
```properties
newArchEnabled=true
```

#### 4. تنظيف وإعادة البناء
```bash
npx react-native start --reset-cache
cd android && ./gradlew clean && cd ..
rm -rf node_modules && npm install
npx react-native run-android
```

### تحذير:
- ⚠️ New Architecture قد يسبب مشاكل مع بعض المكتبات القديمة
- ⚠️ يحتاج اختبار شامل للتطبيق

---

## الحل البديل 3: إزالة Reanimated تمامًا

إذا كنت لا تستخدم Reanimated في التطبيق:

#### 1. إزالة Reanimated
```bash
npm uninstall react-native-reanimated
```

#### 2. تحديث babel.config.js
```javascript
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    'react-native-worklets-core/plugin',
  ],
};
```

#### 3. تنظيف وإعادة البناء
```bash
npx react-native start --reset-cache
cd android && ./gradlew clean && cd ..
rm -rf node_modules && npm install
npx react-native run-android
```

### ملاحظة:
تحقق أولاً من أنك لا تستخدم Reanimated في الكود (ابحث عن `useAnimatedStyle`, `useSharedValue`, إلخ)

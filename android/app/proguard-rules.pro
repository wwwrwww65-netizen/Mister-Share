# Add project specific ProGuard rules here.
# Google Mobile Ads
-keep class com.google.android.gms.ads.** { *; }
-dontwarn com.google.android.gms.ads.**
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# CameraX Extensions (Fixes ClassNotFoundException crash)
-keep class androidx.camera.** { *; }
-keep interface androidx.camera.** { *; }
-dontwarn androidx.camera.**

# Add any project specific keep options here:

# Keep all native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep SoLoader
-keep class com.facebook.soloader.** { *; }

# Keep React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Keep native library loading methods
-keepclassmembers class * {
    native <methods>;
}

# Don't obfuscate native library names
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions
-keepattributes InnerClasses

# ═══════════════ MisterShare Custom Modules ═══════════════
-keep class com.mistershare.** { *; }
-keep class com.mistershare.MediaStoreModule { *; }
-keep class com.mistershare.MediaStorePackage { *; }
-keep class com.mistershare.WiFiDirectAdvancedModule { *; }
-keep class com.mistershare.WiFiDirectAdvancedPackage { *; }
-keep class com.mistershare.BLEGattServerModule { *; }
-keep class com.mistershare.BLEGattServerPackage { *; }
-keep class com.mistershare.TransferService { *; }
-keep class com.mistershare.TransferSocketModule { *; }
-keep class com.mistershare.TransferPackage { *; }

# ═══════════════ Android WiFi & Network ═══════════════
-keep class android.net.wifi.** { *; }
-keep class android.net.wifi.p2p.** { *; }
-keep class android.net.ConnectivityManager { *; }
-keep class android.net.NetworkRequest { *; }
-keep class android.net.NetworkCapabilities { *; }
-keep class android.net.wifi.WifiNetworkSpecifier { *; }
-keep class android.net.wifi.SoftApConfiguration { *; }

# Bluetooth
-keep class android.bluetooth.** { *; }

# ═══════════════ Third-party Libraries ═══════════════
# react-native-tcp-socket
-keep class com.asterinet.react.tcpsocket.** { *; }

# react-native-blob-util
-keep class com.ReactNativeBlobUtil.** { *; }

# react-native-camera-kit
-keep class com.rncamerakit.** { *; }
-keep class com.wix.RNCameraKit.** { *; }

# react-native-qrcode-svg (if used)
-keep class com.horcrux.svg.** { *; }


# ═══════════════ React Native Launcher Kit ═══════════════
-keep class com.mrousavy.launcher.** { *; }
-keep class com.reactnativelauncherkit.** { *; }
-dontwarn com.reactnativelauncherkit.**

# Keep callbacks and listeners
-keepclassmembers class * {
    public void on*(...);
}

# Keep enums
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# ═══════════════ SAF (Storage Access Framework) ═══════════════
-keep class androidx.documentfile.** { *; }
-keep class android.provider.DocumentsContract { *; }
-keep class android.content.ContentResolver { *; }

# ═══════════════ MisterShare FileTransfer Package ═══════════════
-keep class com.mistershare.filetransfer.** { *; }
-keep class com.mistershare.filetransfer.SAFModule { *; }
-keep class com.mistershare.filetransfer.SAFPackage { *; }
-keep class com.mistershare.filetransfer.HotspotForegroundService { *; }
-keep class com.mistershare.filetransfer.TcpHandshakeModule { *; }
-keep class com.mistershare.filetransfer.TransferService { *; }
-keep class com.mistershare.filetransfer.TransferSocketModule { *; }
-keep class com.mistershare.filetransfer.NetworkHolder { *; }
-keep class com.mistershare.filetransfer.WiFiDirectAdvancedModule { *; }
-keep class com.mistershare.filetransfer.WiFiDirectAdvancedPackage { *; }

# ═══════════════ AGGRESSIVE NETWORK KEEP RULES ═══════════════
-keep class android.net.** { *; }
-keep class android.net.wifi.** { *; }
-keep class android.net.wifi.p2p.** { *; }
-keep class android.net.ConnectivityManager { *; }
-keep class android.net.NetworkRequest { *; }
-keep class android.net.NetworkCapabilities { *; }
-keep class android.net.LinkProperties { *; }
-keep class android.net.DhcpInfo { *; }
-keep class java.net.** { *; }
-keep class java.io.** { *; }
-dontwarn android.net.**
# ═════════════════════════════════════════════════════════════

# ═══════════════ Kotlin Coroutines (Used by TcpHandshakeModule) ═══════════════
-keep class kotlinx.coroutines.** { *; }
-dontwarn kotlinx.coroutines.**

# ═══════════════ React Native Async Storage ═══════════════
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# ═══════════════ React Native Vector Icons ═══════════════
-keep class com.oblador.vectoricons.** { *; }

# ═══════════════ React Native i18next ═══════════════
-keep class com.reactnativecommunity.** { *; }

# ═══════════════ React Native Localize ═══════════════
-keep class com.zoontek.rnlocalize.** { *; }
-dontwarn com.zoontek.rnlocalize.**

# ═══════════════ Hermes Engine (Critical) ═══════════════
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# ═══════════════ Serialization ═══════════════
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# ═══════════════ React Native Reanimated (CRITICAL) ═══════════════
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.react.bridge.** { *; }
-dontwarn com.swmansion.reanimated.**

# ═══════════════ React Native Gesture Handler ═══════════════
-keep class com.swmansion.gesturehandler.** { *; }
-dontwarn com.swmansion.gesturehandler.**

# ═══════════════ React Native Screens ═══════════════
-keep class com.swmansion.rnscreens.** { *; }
-dontwarn com.swmansion.rnscreens.**

# ═══════════════ React Native Safe Area Context ═══════════════
-keep class com.th3rdwave.safeareacontext.** { *; }
-dontwarn com.th3rdwave.safeareacontext.**

# ═══════════════ React Native Vision Camera & CameraX (AGGRESSIVE) ═══════════════
-keep class com.mrousavy.camera.** { *; }
-keep class androidx.camera.** { *; }
-keep class androidx.camera.core.** { *; }
-keep class androidx.camera.camera2.** { *; }
-keep class androidx.camera.lifecycle.** { *; }
-keep class androidx.camera.view.** { *; }
-keep class androidx.camera.extensions.** { *; }
-dontwarn androidx.camera.**
-dontwarn com.mrousavy.camera.**

# ═══════════════ React Native BLE PLX & RxAndroid (AGGRESSIVE) ═══════════════
-keep class com.polidea.reactnativeble.** { *; }
-keep class com.polidea.multiplatformbleadapter.** { *; }
# Keep RxJava/RxAndroid (Required by BLE PLX)
-keep class io.reactivex.** { *; }
-keep class rx.** { *; }
-dontwarn com.polidea.**
-dontwarn io.reactivex.**
-dontwarn rx.**

# ═══════════════ React Native Device Info ═══════════════
-keep class com.learnium.RNDeviceInfo.** { *; }
-dontwarn com.learnium.RNDeviceInfo.**

# ═══════════════ React Native Linear Gradient ═══════════════
-keep class com.BV.LinearGradient.** { *; }
-dontwarn com.BV.LinearGradient.**

# ═══════════════ React Native AES Crypto ═══════════════
-keep class com.tectiv3.aes.** { *; }
-dontwarn com.tectiv3.aes.**

# ═══════════════ Spongy Castle (Crypto) ═══════════════
-keep class org.spongycastle.** { *; }
-dontwarn org.spongycastle.**

# ═══════════════ Keep Source File Names for Stack Traces ═══════════════
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ═══════════════ Multidex Support ═══════════════
-keep class androidx.multidex.** { *; }

# ═══════════════ React Native FS ═══════════════
-keep class com.rnfs.** { *; }
-dontwarn com.rnfs.**

# ═══════════════ React Native WiFi P2P ═══════════════
-keep class io.wifi.p2p.** { *; }
-dontwarn io.wifi.p2p.**

# ═══════════════ React Native Restart ═══════════════
-keep class com.reactnativerestart.** { *; }
-dontwarn com.reactnativerestart.**

# ═══════════════ React Native Randombytes ═══════════════
-keep class com.bitgo.randombytes.** { *; }
-dontwarn com.bitgo.randombytes.**

# ═══════════════ Crypto-JS (JavaScript only, but keep related) ═══════════════
-keep class javax.crypto.** { *; }
-keep class java.security.** { *; }

# ═══════════════ React Native QRCode Styled (uses SVG) ═══════════════
# Already covered by react-native-svg rules

# ═══════════════ Additional MisterShare Native Modules ═══════════════
-keep class com.mistershare.filetransfer.BLEAdvertiserModule { *; }
-keep class com.mistershare.filetransfer.BLEConnectionModule { *; }
-keep class com.mistershare.filetransfer.BLEScannerModule { *; }
-keep class com.mistershare.filetransfer.BLEPackage { *; }
-keep class com.mistershare.filetransfer.ChecksumModule { *; }
-keep class com.mistershare.filetransfer.ChecksumPackage { *; }
-keep class com.mistershare.filetransfer.FileProviderModule { *; }
-keep class com.mistershare.filetransfer.FileProviderPackage { *; }
-keep class com.mistershare.filetransfer.NetworkHolder { *; }
-keep class com.mistershare.filetransfer.NsdServiceModule { *; }
-keep class com.mistershare.filetransfer.NsdServicePackage { *; }
-keep class com.mistershare.filetransfer.MainApplication { *; }

# ═══════════════ Android NSD (Network Service Discovery) ═══════════════
-keep class android.net.nsd.** { *; }
-dontwarn android.net.nsd.**

# ═══════════════ Keep ReactMethod Annotations ═══════════════
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
}

# ═══════════════ Keep ReactModule Annotations ═══════════════
-keep @com.facebook.react.module.annotations.ReactModule class *

# ═══════════════ Zustand (Pure JS - No rules needed) ═══════════════

# ═══════════════ Navigation Libraries ═══════════════
-keep class com.reactnativenavigation.** { *; }
-dontwarn com.reactnativenavigation.**

# ═══════════════ IntlPluralRules (JavaScript Polyfill) ═══════════════
# No native code, no rules needed

# ═══════════════ Base64 Library ═══════════════
-keep class android.util.Base64 { *; }

# ═══════════════ JSC / Hermes Additional Rules ═══════════════
-keep class com.facebook.react.jscexecutor.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.react.hermes.** { *; }

# ═══════════════ Fix for Missing Class Warnings ═══════════════
-dontwarn java.lang.invoke.StringConcatFactory
-dontwarn javax.lang.model.**
-dontwarn javax.tools.**
-dontwarn com.facebook.fbjni.**
-dontwarn com.facebook.flipper.**
-dontwarn com.facebook.react.flipper.**

# ═══════════════ Keep All React Native Modules ═══════════════
-keep class * extends com.facebook.react.bridge.ReactContextBaseJavaModule { *; }
-keep class * implements com.facebook.react.bridge.NativeModule { *; }
-keep class * extends com.facebook.react.uimanager.ViewManager { *; }
-keep class * extends com.facebook.react.bridge.JavaScriptModule { *; }

# ═══════════════ Keep TurboModules ═══════════════
-keep class * extends com.facebook.react.turbomodule.core.TurboModule { *; }
-keep class * implements com.facebook.react.turbomodule.core.interfaces.TurboModule { *; }

# ═══════════════ Keep Parcelize and Parcelable ═══════════════
-keepclassmembers class * implements android.os.Parcelable {
    public static final ** CREATOR;
}

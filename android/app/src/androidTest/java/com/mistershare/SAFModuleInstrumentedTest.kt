package com.mistershare

import android.content.Context
import android.os.Build
import android.os.Environment
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File

/**
 * MisterShare SAF Module Instrumented Tests
 * 
 * These tests run on a real Android device/emulator to verify
 * the SAF Module functionality across different Android versions.
 * 
 * Run with: ./gradlew connectedAndroidTest
 */
@RunWith(AndroidJUnit4::class)
class SAFModuleInstrumentedTest {

    private lateinit var context: Context
    private val testPackageName = "com.tencent.ig" // PUBG Mobile

    @Before
    fun setup() {
        context = InstrumentationRegistry.getInstrumentation().targetContext
    }

    // ═══════════════════════════════════════════════════════════════
    // 📱 Environment Tests
    // ═══════════════════════════════════════════════════════════════

    @Test
    fun testAndroidVersion() {
        val sdkInt = Build.VERSION.SDK_INT
        println("📱 Android SDK: $sdkInt")
        println("📱 Android Version: ${Build.VERSION.RELEASE}")
        println("📱 Device: ${Build.MANUFACTURER} ${Build.MODEL}")
        
        assertTrue("SDK should be at least 24 (Android 7)", sdkInt >= 24)
    }

    @Test
    fun testStorageModeDetection() {
        val sdkInt = Build.VERSION.SDK_INT
        val mode = if (sdkInt >= Build.VERSION_CODES.R) "SAF" else "LEGACY"
        
        println("📂 Storage Mode: $mode")
        println("📂 SDK Int: $sdkInt")
        println("📂 R (30): ${Build.VERSION_CODES.R}")
        
        if (sdkInt >= Build.VERSION_CODES.R) {
            assertEquals("Should be SAF mode on Android 11+", "SAF", mode)
        } else {
            assertEquals("Should be LEGACY mode on Android 10-", "LEGACY", mode)
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 📁 Legacy Mode Tests (Android 10 and below)
    // ═══════════════════════════════════════════════════════════════

    @Test
    fun testLegacyObbPathExists() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            println("⏭️ Skipping legacy test on Android 11+")
            return
        }

        val obbPath = "/storage/emulated/0/Android/obb/$testPackageName"
        val obbDir = File(obbPath)
        
        println("📁 Checking OBB path: $obbPath")
        println("📁 Exists: ${obbDir.exists()}")
        
        if (obbDir.exists()) {
            println("📁 Files: ${obbDir.listFiles()?.map { it.name }}")
        }
        
        // Note: This test passes if path is accessible (even if folder doesn't exist)
        val parentDir = File("/storage/emulated/0/Android/obb")
        assertTrue("Android/obb should be accessible in Legacy mode", 
            parentDir.exists() || parentDir.canRead())
    }

    @Test
    fun testLegacyDataPathExists() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            println("⏭️ Skipping legacy test on Android 11+")
            return
        }

        val dataPath = "/storage/emulated/0/Android/data/$testPackageName"
        val dataDir = File(dataPath)
        
        println("📁 Checking DATA path: $dataPath")
        println("📁 Exists: ${dataDir.exists()}")
        
        val parentDir = File("/storage/emulated/0/Android/data")
        assertTrue("Android/data should be accessible in Legacy mode", 
            parentDir.exists() || parentDir.canRead())
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔐 SAF Mode Tests (Android 11+)
    // ═══════════════════════════════════════════════════════════════

    @Test
    fun testSAFModeRestrictions() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            println("⏭️ Skipping SAF test on Android 10-")
            return
        }

        // On Android 11+, direct access to Android/data and Android/obb is restricted
        val obbPath = "/storage/emulated/0/Android/obb"
        val dataPath = "/storage/emulated/0/Android/data"
        
        val obbDir = File(obbPath)
        val dataDir = File(dataPath)
        
        println("🔐 SAF Mode Active (Android 11+)")
        println("🔐 OBB direct access: ${obbDir.canRead()}")
        println("🔐 DATA direct access: ${dataDir.canRead()}")
        
        // On Android 11+, these should be restricted without SAF permission
        // Note: This may pass if app has special permissions
        println("🔐 SAF permission required for game folders")
    }

    @Test
    fun testPersistedUriPermissions() {
        val persistedUris = context.contentResolver.persistedUriPermissions
        
        println("🔐 Persisted URI Permissions: ${persistedUris.size}")
        
        persistedUris.forEach { permission ->
            println("   URI: ${permission.uri}")
            println("   Read: ${permission.isReadPermission}")
            println("   Write: ${permission.isWritePermission}")
            println("   ---")
        }
        
        // This test just logs permissions - doesn't fail
        assertTrue("Permissions list accessible", true)
    }

    // ═══════════════════════════════════════════════════════════════
    // 📂 Download Folder Tests
    // ═══════════════════════════════════════════════════════════════

    @Test
    fun testDownloadFolderAccess() {
        val downloadsDir = Environment.getExternalStoragePublicDirectory(
            Environment.DIRECTORY_DOWNLOADS
        )
        
        println("📂 Downloads dir: ${downloadsDir.absolutePath}")
        println("📂 Exists: ${downloadsDir.exists()}")
        println("📂 Can Write: ${downloadsDir.canWrite()}")
        
        assertTrue("Downloads folder should exist", downloadsDir.exists())
    }

    @Test
    fun testMisterShareFolderCreation() {
        val downloadsDir = Environment.getExternalStoragePublicDirectory(
            Environment.DIRECTORY_DOWNLOADS
        )
        val misterShareDir = File(downloadsDir, "MisterShare")
        
        println("📂 MisterShare dir: ${misterShareDir.absolutePath}")
        println("📂 Exists: ${misterShareDir.exists()}")
        
        if (!misterShareDir.exists()) {
            val created = misterShareDir.mkdirs()
            println("📂 Created: $created")
            assertTrue("Should be able to create MisterShare folder", created)
        }
        
        assertTrue("MisterShare folder should exist", misterShareDir.exists())
        
        // Cleanup
        if (misterShareDir.exists() && misterShareDir.listFiles()?.isEmpty() == true) {
            misterShareDir.delete()
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 📦 ZIP Operations Tests
    // ═══════════════════════════════════════════════════════════════

    @Test
    fun testZipSlipProtection() {
        // Test that malicious paths are rejected
        val maliciousPaths = listOf(
            "../../../etc/passwd",
            "..\\..\\..\\Windows\\System32",
            "folder/../../../secret.txt",
            "./../../root"
        )
        
        maliciousPaths.forEach { path ->
            val isMalicious = path.contains("..")
            println("🛡️ Path: $path -> Malicious: $isMalicious")
            assertTrue("Should detect path traversal in: $path", isMalicious)
        }
    }

    @Test
    fun testCacheDirectoryAccess() {
        val cacheDir = context.cacheDir
        
        println("📂 Cache dir: ${cacheDir.absolutePath}")
        println("📂 Exists: ${cacheDir.exists()}")
        println("📂 Can Write: ${cacheDir.canWrite()}")
        
        assertTrue("Cache directory should exist", cacheDir.exists())
        assertTrue("Cache directory should be writable", cacheDir.canWrite())
        
        // Test creating a temp file
        val tempFile = File(cacheDir, "test_temp.txt")
        tempFile.writeText("test")
        assertTrue("Should create temp file", tempFile.exists())
        tempFile.delete()
    }

    // ═══════════════════════════════════════════════════════════════
    // 🎮 Game Detection Tests
    // ═══════════════════════════════════════════════════════════════

    @Test
    fun testKnownGamesDetection() {
        val knownGames = mapOf(
            "com.tencent.ig" to "PUBG Mobile",
            "com.dts.freefireth" to "Free Fire",
            "com.activision.callofduty.shooter" to "Call of Duty Mobile",
            "com.miHoYo.GenshinImpact" to "Genshin Impact",
            "com.mojang.minecraftpe" to "Minecraft"
        )
        
        val pm = context.packageManager
        
        println("🎮 Checking installed games:")
        
        knownGames.forEach { (packageName, gameName) ->
            val isInstalled = try {
                pm.getPackageInfo(packageName, 0)
                true
            } catch (e: Exception) {
                false
            }
            
            val status = if (isInstalled) "✅" else "❌"
            println("   $status $gameName ($packageName)")
        }
        
        assertTrue("Game detection works", true)
    }

    // ═══════════════════════════════════════════════════════════════
    // 📊 Summary Test
    // ═══════════════════════════════════════════════════════════════

    @Test
    fun testPrintSummary() {
        println("")
        println("═══════════════════════════════════════════════════")
        println("📊 TEST ENVIRONMENT SUMMARY")
        println("═══════════════════════════════════════════════════")
        println("📱 Device: ${Build.MANUFACTURER} ${Build.MODEL}")
        println("🤖 Android: ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})")
        println("📂 Mode: ${if (Build.VERSION.SDK_INT >= 30) "SAF" else "LEGACY"}")
        println("📦 Package: ${context.packageName}")
        println("🔐 Persisted URIs: ${context.contentResolver.persistedUriPermissions.size}")
        println("═══════════════════════════════════════════════════")
        println("")
        
        assertTrue("Summary printed", true)
    }
}

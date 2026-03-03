package com.mistershare.filetransfer

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.content.FileProvider
import com.facebook.react.bridge.*
import java.io.FileInputStream
import java.io.File
import java.io.FileOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream
import java.util.zip.ZipOutputStream

/**
 * FileProviderModule - Provides content:// URIs for secure file access
 * 
 * 2024 Android Best Practice:
 * Instead of copying APKs to a temp directory, we use FileProvider to generate
 * secure content:// URIs that allow streaming access to protected files.
 * This enables zero-copy file transfer.
 */
class FileProviderModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    override fun getName(): String = "FileProviderModule"
    
    /**
     * Get a content:// URI for a file path
     * This allows secure access to protected files like /data/app/.../base.apk
     */
    @ReactMethod
    fun getContentUri(filePath: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val file = File(filePath)
            
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "File does not exist: $filePath")
                return
            }
            
            val authority = "${context.packageName}.fileprovider"
            val contentUri = FileProvider.getUriForFile(context, authority, file)
            
            promise.resolve(contentUri.toString())
        } catch (e: IllegalArgumentException) {
            // FileProvider can't access this path - fallback to direct path
            // This happens for paths outside the configured file_paths.xml
            promise.resolve(filePath) // Return original path as fallback
        } catch (e: Exception) {
            promise.reject("URI_ERROR", "Failed to get content URI: ${e.message}")
        }
    }
    
    /**
     * Copy APK to cache and return content URI (fallback for restricted paths)
     * Uses streaming copy for efficiency
     */
    @ReactMethod
    fun copyApkToCache(sourcePath: String, appName: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val sourceFile = File(sourcePath)
            
            if (!sourceFile.exists()) {
                promise.reject("FILE_NOT_FOUND", "Source file does not exist: $sourcePath")
                return
            }
            
            // Create cache directory
            val cacheDir = File(context.cacheDir, "apk_transfer")
            if (!cacheDir.exists()) {
                cacheDir.mkdirs()
            }
            
            // Sanitize app name for filename
            val safeName = appName.replace(Regex("[^a-zA-Z0-9\\u0600-\\u06FF\\s._-]"), "_")
            val destFile = File(cacheDir, "$safeName.apk")
            
            // Stream copy (more efficient than loading entire file to memory)
            sourceFile.inputStream().use { input ->
                destFile.outputStream().use { output ->
                    input.copyTo(output, bufferSize = 256 * 1024) // 256KB buffer
                }
            }

            val srcSize = sourceFile.length()
            val destSize = destFile.length()
            if (srcSize > 0 && destSize != srcSize) {
                try {
                    destFile.delete()
                } catch (_: Exception) {}
                promise.reject("COPY_INCOMPLETE", "Incomplete APK copy: $destSize/$srcSize bytes")
                return
            }
            
            // Get content URI for the cached file
            val authority = "${context.packageName}.fileprovider"
            val contentUri = FileProvider.getUriForFile(context, authority, destFile)
            
            val result = WritableNativeMap().apply {
                putString("uri", contentUri.toString())
                putString("path", destFile.absolutePath)
                putDouble("size", destFile.length().toDouble())
            }
            
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("COPY_ERROR", "Failed to copy APK: ${e.message}")
        }
    }

    @ReactMethod
    fun exportInstalledAppToCache(packageName: String, appName: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val pm = context.packageManager
            val appInfo = pm.getApplicationInfo(packageName, 0)

            val baseApkPath = appInfo.sourceDir
            val splitApkPaths = (appInfo.splitSourceDirs?.toList() ?: emptyList())
                .filter { it.isNotBlank() }

            if (baseApkPath.isNullOrBlank()) {
                promise.reject("NO_APK_PATH", "No APK path for package: $packageName")
                return
            }

            val cacheDir = File(context.cacheDir, "apk_transfer")
            if (!cacheDir.exists()) cacheDir.mkdirs()

            val safeName = appName.replace(Regex("[^a-zA-Z0-9\\u0600-\\u06FF\\s._-]"), "_").trim().ifEmpty { packageName }

            if (splitApkPaths.isEmpty()) {
                val sourceFile = File(baseApkPath)
                if (!sourceFile.exists()) {
                    promise.reject("FILE_NOT_FOUND", "Source file does not exist: $baseApkPath")
                    return
                }

                val destFile = File(cacheDir, "$safeName.apk")
                sourceFile.inputStream().use { input ->
                    destFile.outputStream().use { output ->
                        input.copyTo(output, bufferSize = 256 * 1024)
                    }
                }

                val srcSize = sourceFile.length()
                val destSize = destFile.length()
                if (srcSize > 0 && destSize != srcSize) {
                    try {
                        destFile.delete()
                    } catch (_: Exception) {}
                    promise.reject("COPY_INCOMPLETE", "Incomplete APK copy: $destSize/$srcSize bytes")
                    return
                }

                val authority = "${context.packageName}.fileprovider"
                val contentUri = FileProvider.getUriForFile(context, authority, destFile)

                val result = WritableNativeMap().apply {
                    putString("uri", contentUri.toString())
                    putString("path", destFile.absolutePath)
                    putDouble("size", destFile.length().toDouble())
                    putBoolean("isSplit", false)
                    putString("filename", "$safeName.apk")
                }

                promise.resolve(result)
                return
            }

            val bundleFile = File(cacheDir, "$safeName.apks")
            if (bundleFile.exists()) {
                try {
                    bundleFile.delete()
                } catch (_: Exception) {}
            }

            ZipOutputStream(FileOutputStream(bundleFile)).use { zipOut ->
                fun addApkToZip(entryName: String, sourcePath: String) {
                    val src = File(sourcePath)
                    if (!src.exists()) return
                    FileInputStream(src).use { fis ->
                        val entry = ZipEntry(entryName)
                        entry.size = src.length()
                        zipOut.putNextEntry(entry)
                        fis.copyTo(zipOut, bufferSize = 256 * 1024)
                        zipOut.closeEntry()
                    }
                }

                addApkToZip("base.apk", baseApkPath)
                splitApkPaths.forEachIndexed { index, path ->
                    val name = File(path).name.ifEmpty { "split_$index.apk" }
                    val entryName = if (name.endsWith(".apk", ignoreCase = true)) name else "split_$index.apk"
                    addApkToZip(entryName, path)
                }
            }

            val bundleSize = bundleFile.length()
            if (bundleSize <= 0) {
                try {
                    bundleFile.delete()
                } catch (_: Exception) {}
                promise.reject("BUNDLE_EMPTY", "Failed to create APKS bundle")
                return
            }

            val authority = "${context.packageName}.fileprovider"
            val contentUri = FileProvider.getUriForFile(context, authority, bundleFile)

            val result = WritableNativeMap().apply {
                putString("uri", contentUri.toString())
                putString("path", bundleFile.absolutePath)
                putDouble("size", bundleSize.toDouble())
                putBoolean("isSplit", true)
                putString("filename", "$safeName.apks")
            }

            promise.resolve(result)
        } catch (e: android.content.pm.PackageManager.NameNotFoundException) {
            promise.reject("PACKAGE_NOT_FOUND", "Package not found: $packageName")
        } catch (e: Exception) {
            promise.reject("EXPORT_ERROR", "Failed to export app: ${e.message}")
        }
    }

    @ReactMethod
    fun installApk(filePath: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val file = File(filePath)
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "File does not exist: $filePath")
                return
            }

            val authority = "${context.packageName}.fileprovider"
            val uri = FileProvider.getUriForFile(context, authority, file)

            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            context.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("INSTALL_ERROR", "Failed to start APK install: ${e.message}")
        }
    }

    private var pendingInstallPromise: Promise? = null

    @ReactMethod
    fun installApksBundle(apksPath: String, promise: Promise) {
        val context = reactApplicationContext
        try {
            val bundleFile = File(apksPath)
            if (!bundleFile.exists()) {
                promise.reject("FILE_NOT_FOUND", "File does not exist: $apksPath")
                return
            }

            val tempDir = File(context.cacheDir, "apks_install_${System.currentTimeMillis()}")
            tempDir.mkdirs()

            val extractedApks = mutableListOf<File>()
            ZipInputStream(FileInputStream(bundleFile)).use { zin ->
                var entry: ZipEntry?
                while (true) {
                    entry = zin.nextEntry ?: break
                    if (entry!!.isDirectory) continue
                    val name = entry!!.name
                    if (!name.endsWith(".apk", ignoreCase = true)) continue

                    val outFile = File(tempDir, File(name).name)
                    FileOutputStream(outFile).use { out ->
                        zin.copyTo(out, bufferSize = 256 * 1024)
                    }
                    extractedApks.add(outFile)
                    zin.closeEntry()
                }
            }

            if (extractedApks.isEmpty()) {
                promise.reject("NO_APKS", "No APK entries found in bundle")
                return
            }

            val packageInstaller = context.packageManager.packageInstaller
            val params = android.content.pm.PackageInstaller.SessionParams(android.content.pm.PackageInstaller.SessionParams.MODE_FULL_INSTALL)
            if (android.os.Build.VERSION.SDK_INT >= 31) {
                params.setRequireUserAction(android.content.pm.PackageInstaller.SessionParams.USER_ACTION_REQUIRED)
            }

            val sessionId = packageInstaller.createSession(params)
            val session = packageInstaller.openSession(sessionId)

            extractedApks.forEach { apkFile ->
                FileInputStream(apkFile).use { input ->
                    session.openWrite(apkFile.name, 0, apkFile.length()).use { out ->
                        input.copyTo(out, bufferSize = 256 * 1024)
                        session.fsync(out)
                    }
                }
            }

            val action = "${context.packageName}.APKS_INSTALL_RESULT_${sessionId}"
            val receiver = object : android.content.BroadcastReceiver() {
                override fun onReceive(ctx: Context, intent: Intent) {
                    try {
                        val status = intent.getIntExtra(android.content.pm.PackageInstaller.EXTRA_STATUS, android.content.pm.PackageInstaller.STATUS_FAILURE)
                        val message = intent.getStringExtra(android.content.pm.PackageInstaller.EXTRA_STATUS_MESSAGE) ?: ""

                        if (status == android.content.pm.PackageInstaller.STATUS_SUCCESS) {
                            pendingInstallPromise?.resolve(true)
                        } else {
                            pendingInstallPromise?.reject("INSTALL_FAILED", "Install failed: $message")
                        }
                    } finally {
                        try {
                            ctx.unregisterReceiver(this)
                        } catch (_: Exception) {}
                        pendingInstallPromise = null
                    }
                }
            }

            if (pendingInstallPromise != null) {
                pendingInstallPromise?.reject("INSTALL_IN_PROGRESS", "Another install is already in progress")
                pendingInstallPromise = null
            }
            pendingInstallPromise = promise
            context.registerReceiver(receiver, android.content.IntentFilter(action))

            val pendingIntent = android.app.PendingIntent.getBroadcast(
                context,
                sessionId,
                Intent(action),
                android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
            )

            session.commit(pendingIntent.intentSender)
            session.close()
        } catch (e: Exception) {
            pendingInstallPromise = null
            promise.reject("INSTALL_ERROR", "Failed to install APKS bundle: ${e.message}")
        }
    }
    
    /**
     * Clean up cached APK files
     */
    @ReactMethod
    fun cleanupCache(promise: Promise) {
        try {
            val cacheDir = File(reactApplicationContext.cacheDir, "apk_transfer")
            if (cacheDir.exists()) {
                val deleted = cacheDir.deleteRecursively()
                promise.resolve(deleted)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("CLEANUP_ERROR", "Failed to cleanup cache: ${e.message}")
        }
    }
}


package com.mistershare.filetransfer

import android.app.Activity
import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.content.UriPermission
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.DocumentsContract
import android.provider.Settings
import android.util.Log
import androidx.documentfile.provider.DocumentFile
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.*
import java.io.*
import java.util.zip.ZipInputStream
import java.util.zip.ZipOutputStream
import java.util.zip.ZipEntry

/**
 * Storage Access Framework (SAF) Module
 * 
 * 2024 Android Best Practice for Android 11+ (API 30+):
 * - Uses SAF to access Android/data and Android/obb folders
 * - Requests permission for SPECIFIC game folders only (Android 13+ requirement)
 * - Supports ZIP extraction directly to SAF-managed directories
 * - Persists URI permissions across app restarts
 * - Google Play compliant - no MANAGE_EXTERNAL_STORAGE needed
 * 
 * Key Features:
 * 1. Request access to specific game data/obb folder
 * 2. Write files to SAF-managed directories
 * 3. Extract ZIP archives to game folders
 * 4. Check if permissions already granted
 * 5. Persist permissions for future use
 */
class SAFModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    companion object {
        const val TAG = "SAFModule"
        const val REQUEST_CODE_OPEN_DOCUMENT_TREE = 42
        const val BUFFER_SIZE = 256 * 1024 // 256KB optimal buffer
        
        // Storage paths
        const val ANDROID_DATA_PREFIX = "Android%2Fdata"
        const val ANDROID_OBB_PREFIX = "Android%2Fobb"
    }

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var pendingPromise: Promise? = null
    private var requestedPackageName: String? = null
    private var requestedFolderType: String? = null // "data" or "obb"
    
    // Permission cache to avoid redundant ContentResolver queries
    // Key: "$packageName:$folderType", Value: cached URI permission
    private val permissionCache = mutableMapOf<String, String>()
    private var cacheTimestamp: Long = 0
    private val CACHE_TTL = 30_000L // 30 seconds cache TTL

    override fun getName(): String = "SAFModule"

    init {
        reactContext.addActivityEventListener(this)
    }

    // ==================== URI Permission Management ====================

    /**
     * Check if we already have permission for a specific game folder
     * OPTIMIZED: Uses in-memory cache to avoid redundant ContentResolver queries
     * FIXED: Now supports LEGACY MODE (Android 10 and below)
     */
    @ReactMethod
    fun hasPermission(packageName: String, folderType: String, promise: Promise) {
        try {
            val cacheKey = "$packageName:$folderType"
            val now = System.currentTimeMillis()
            
            // Check cache first (within TTL)
            if (now - cacheTimestamp < CACHE_TTL && permissionCache.containsKey(cacheKey)) {
                Log.d(TAG, "Permission check (cached) for $packageName ($folderType): true")
                promise.resolve(true)
                return
            }
            
            // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
            // LEGACY MODE (Android 10 and below) - Check direct file access
            // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
                // Try multiple possible paths (some Samsung devices use different paths)
                val possiblePaths = listOf(
                    "/storage/emulated/0/Android/${if (folderType == "obb") "obb" else "data"}/$packageName",
                    "/sdcard/Android/${if (folderType == "obb") "obb" else "data"}/$packageName",
                    android.os.Environment.getExternalStorageDirectory().absolutePath + 
                        "/Android/${if (folderType == "obb") "obb" else "data"}/$packageName"
                )
                
                var foundFolder: File? = null
                var foundPath: String? = null
                
                for (path in possiblePaths) {
                    val folder = File(path)
                    Log.d(TAG, "Checking path: $path - exists=${folder.exists()}, canRead=${folder.canRead()}")
                    if (folder.exists() && folder.canRead()) {
                        foundFolder = folder
                        foundPath = path
                        break
                    }
                }
                
                val folder = foundFolder ?: File(possiblePaths[0])
                val folderPath = foundPath ?: possiblePaths[0]
                
                // Detailed diagnostic logs
                Log.d(TAG, "â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ")
                Log.d(TAG, "LEGACY MODE Permission Check")
                Log.d(TAG, "  Package: $packageName")
                Log.d(TAG, "  Folder Type: $folderType")
                Log.d(TAG, "  Checked Paths: ${possiblePaths.joinToString(", ")}")
                Log.d(TAG, "  Found Path: $folderPath")
                Log.d(TAG, "  folder.exists(): ${folder.exists()}")
                Log.d(TAG, "  folder.isDirectory(): ${folder.isDirectory}")
                Log.d(TAG, "  folder.canRead(): ${folder.canRead()}")
                Log.d(TAG, "  folder.canWrite(): ${folder.canWrite()}")
                
                // List parent directory to see if we can access it
                val parentDir = folder.parentFile
                if (parentDir != null) {
                    Log.d(TAG, "  Parent exists: ${parentDir.exists()}")
                    Log.d(TAG, "  Parent canRead: ${parentDir.canRead()}")
                    val siblings = parentDir.listFiles()
                    Log.d(TAG, "  Siblings count: ${siblings?.size ?: 0}")
                    siblings?.take(5)?.forEach { sibling ->
                        Log.d(TAG, "    - ${sibling.name}")
                    }
                }
                Log.d(TAG, "â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ")
                
                val hasAccess = folder.exists() && folder.canRead()
                
                if (hasAccess) {
                    // Cache the legacy path
                    permissionCache[cacheKey] = folderPath
                    cacheTimestamp = now
                }
                
                promise.resolve(hasAccess)
                return
            }
            
            // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
            // SAF MODE (Android 11+) - Check persisted URI permissions
            // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
            val persistedUris = reactContext.contentResolver.persistedUriPermissions
            val targetPath = if (folderType == "obb") {
                if (packageName.isNotEmpty()) "$ANDROID_OBB_PREFIX%2F$packageName" else ANDROID_OBB_PREFIX
            } else {
                if (packageName.isNotEmpty()) "$ANDROID_DATA_PREFIX%2F$packageName" else ANDROID_DATA_PREFIX
            }
            
            val matchingPermission = persistedUris.find { permission ->
                permission.uri.toString().contains(targetPath) &&
                permission.isWritePermission
            }
            
            val hasPermission = matchingPermission != null
            
            // Update cache
            if (hasPermission) {
                permissionCache[cacheKey] = matchingPermission!!.uri.toString()
                cacheTimestamp = now
            }
            
            Log.d(TAG, "Permission check (SAF) for $packageName ($folderType): $hasPermission")
            promise.resolve(hasPermission)
        } catch (e: Exception) {
            promise.reject("PERMISSION_CHECK_ERROR", e.message)
        }
    }

    /**
     * Get stored URI for a specific game folder
     * FIXED: Now supports LEGACY MODE (Android 10 and below)
     */
    @ReactMethod
    fun getStoredUri(packageName: String, folderType: String, promise: Promise) {
        try {
            // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
            // LEGACY MODE (Android 10 and below) - Return direct file path
            // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
                // Try multiple possible paths (consistent with hasPermission)
                val possiblePaths = listOf(
                    "/storage/emulated/0/Android/${if (folderType == "obb") "obb" else "data"}/$packageName",
                    "/sdcard/Android/${if (folderType == "obb") "obb" else "data"}/$packageName",
                    android.os.Environment.getExternalStorageDirectory().absolutePath + 
                        "/Android/${if (folderType == "obb") "obb" else "data"}/$packageName"
                )
                
                for (path in possiblePaths) {
                    val folder = File(path)
                    if (folder.exists() && folder.canRead()) {
                        Log.d(TAG, "getStoredUri (LEGACY): Found at $path")
                        promise.resolve(path)
                        return
                    }
                }
                
                // No accessible path found
                Log.d(TAG, "getStoredUri (LEGACY): No accessible path found for $packageName ($folderType)")
                promise.resolve(null)
                return
            }
            
            // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
            // SAF MODE (Android 11+) - Get from persisted URI permissions
            // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
            val persistedUris = reactContext.contentResolver.persistedUriPermissions
            val targetPath = if (folderType == "obb") {
                if (packageName.isNotEmpty()) "$ANDROID_OBB_PREFIX%2F$packageName" else ANDROID_OBB_PREFIX
            } else {
                if (packageName.isNotEmpty()) "$ANDROID_DATA_PREFIX%2F$packageName" else ANDROID_DATA_PREFIX
            }
            
            val matchingPermission = persistedUris.find { permission ->
                permission.uri.toString().contains(targetPath) &&
                permission.isWritePermission
            }
            
            if (matchingPermission != null) {
                Log.d(TAG, "getStoredUri (SAF): ${matchingPermission.uri}")
                promise.resolve(matchingPermission.uri.toString())
            } else {
                Log.d(TAG, "getStoredUri (SAF): no matching permission found")
                promise.resolve(null)
            }
        } catch (e: Exception) {
            promise.reject("GET_URI_ERROR", e.message)
        }
    }

    /**
     * Get all persisted URI permissions
     */
    @ReactMethod
    fun getAllPermissions(promise: Promise) {
        try {
            val persistedUris = reactContext.contentResolver.persistedUriPermissions
            val permissions = Arguments.createArray()
            
            for (permission in persistedUris) {
                val permissionMap = Arguments.createMap().apply {
                    putString("uri", permission.uri.toString())
                    putBoolean("read", permission.isReadPermission)
                    putBoolean("write", permission.isWritePermission)
                }
                permissions.pushMap(permissionMap)
            }
            
            promise.resolve(permissions)
        } catch (e: Exception) {
            promise.reject("GET_PERMISSIONS_ERROR", e.message)
        }
    }

    /**
     * Release a specific URI permission
     */
    @ReactMethod
    fun releasePermission(uriString: String, promise: Promise) {
        try {
            val uri = Uri.parse(uriString)
            val flags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            reactContext.contentResolver.releasePersistableUriPermission(uri, flags)
            Log.d(TAG, "Released permission for: $uriString")
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("RELEASE_ERROR", e.message)
        }
    }

    // ==================== Request Access ====================

    /**
     * Request access to a specific game's data or obb folder
     * 
     * Strategy:
     * - Android 11+ (SDK 30+): Use SAF (ACTION_OPEN_DOCUMENT_TREE)
     * - Android 10- (SDK < 30): Use Legacy Direct Access (WRITE_EXTERNAL_STORAGE)
     */
    @ReactMethod
    fun requestGameFolderAccess(packageName: String, folderType: String, promise: Promise) {
        // LEGACY MODE (Android 10 and below)
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            val folderPath = if (folderType == "obb") {
                "/storage/emulated/0/Android/obb/$packageName"
            } else {
                "/storage/emulated/0/Android/data/$packageName"
            }
            
            val file = File(folderPath)
            // Ensure directory exists
            if (!file.exists()) file.mkdirs()
            
            // Check if we can write
            if (file.canWrite() || file.exists()) {
                val result = Arguments.createMap().apply {
                    putString("uri", file.absolutePath) // Return absolute path for legacy
                    putString("packageName", packageName)
                    putString("folderType", folderType)
                    putBoolean("isCorrectFolder", true)
                    putBoolean("isLegacy", true)
                }
                promise.resolve(result)
                return
            }
            // If explicit write check fails, we might still need standard permission flow handled in JS
            // But usually this means permission is missing.
        }

        // MODERN SAF MODE (Android 11+)
        Log.d(TAG, "â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ")
        Log.d(TAG, "requestGameFolderAccess: Starting SAF request")
        Log.d(TAG, "  Package: $packageName")
        Log.d(TAG, "  FolderType: $folderType")
        Log.d(TAG, "  Build.VERSION.SDK_INT: ${Build.VERSION.SDK_INT}")
        
        val activity = currentActivity
        if (activity == null) {
            Log.e(TAG, "â‌Œ NO ACTIVITY - Cannot show SAF picker!")
            promise.reject("NO_ACTIVITY", "No activity available")
            return
        }
        
        Log.d(TAG, "  Activity: ${activity.javaClass.simpleName}")

        pendingPromise = promise
        requestedPackageName = packageName
        requestedFolderType = folderType

        try {
            // Build the initial URI for the game folder
            // This navigates the file picker directly to the target folder
            val storageId = "primary" // Main storage
            val folderPath = if (folderType == "obb") {
                if (packageName.isNotEmpty()) "Android%2Fobb%2F$packageName" else "Android%2Fobb"
            } else {
                if (packageName.isNotEmpty()) "Android%2Fdata%2F$packageName" else "Android%2Fdata"
            }
            
            val initialUri = Uri.parse(
                "content://com.android.externalstorage.documents/document/$storageId%3A$folderPath"
            )

            Log.d(TAG, "  Folder Path: $folderPath")
            Log.d(TAG, "  Initial URI: $initialUri")

            val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).apply {
                // Navigate directly to the target folder
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    putExtra(DocumentsContract.EXTRA_INITIAL_URI, initialUri)
                }
                
                // Request persistent permission
                addFlags(
                    Intent.FLAG_GRANT_READ_URI_PERMISSION or
                    Intent.FLAG_GRANT_WRITE_URI_PERMISSION or
                    Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
                )
            }

            Log.d(TAG, "  Launching SAF picker intent...")
            activity.startActivityForResult(intent, REQUEST_CODE_OPEN_DOCUMENT_TREE)
            Log.d(TAG, "  âœ… SAF picker intent launched successfully")
            Log.d(TAG, "â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ")
            
        } catch (e: Exception) {
            Log.e(TAG, "â‌Œ Failed to request folder access: ${e.message}")
            e.printStackTrace()
            pendingPromise?.reject("REQUEST_ERROR", "Failed to open folder picker: ${e.message}")
            pendingPromise = null
        }
    }

    // ==================== File Operations ====================

    /**
     * List files in SAF-managed directory OR Legacy path
     * 
     * PERFORMANCE OPTIMIZED: Uses ContentResolver.query() instead of DocumentFile.listFiles()
     * This is 10-50x faster because it fetches all metadata in a single query
     * rather than making separate IPC calls for each file.
     */
    @ReactMethod
    fun listFiles(directoryUri: String, promise: Promise) {
        scope.launch {
            try {
                val files = Arguments.createArray()
                
                // LEGACY MODE: Direct File IO (Already optimized)
                if (!directoryUri.startsWith("content://")) {
                    val dir = File(directoryUri)
                    if (!dir.exists() || !dir.isDirectory) {
                        withContext(Dispatchers.Main) {
                            promise.resolve(files)
                        }
                        return@launch
                    }
                    
                    dir.listFiles()?.forEach { file ->
                        val fileInfo = Arguments.createMap().apply {
                            putString("name", file.name)
                            putString("uri", file.absolutePath)
                            putBoolean("isDirectory", file.isDirectory)
                            putDouble("size", file.length().toDouble())
                            putDouble("lastModified", file.lastModified().toDouble())
                        }
                        files.pushMap(fileInfo)
                    }
                    
                    withContext(Dispatchers.Main) {
                        promise.resolve(files)
                    }
                    return@launch
                }
                
                // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
                // SAF MODE - OPTIMIZED with ContentResolver.query()
                // This is the 2024 Best Practice for listing files efficiently
                // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
                val treeUri = Uri.parse(directoryUri)
                val documentId = DocumentsContract.getTreeDocumentId(treeUri)
                val childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, documentId)
                
                // Define what columns we need - fetched in a SINGLE query
                val projection = arrayOf(
                    DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                    DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                    DocumentsContract.Document.COLUMN_MIME_TYPE,
                    DocumentsContract.Document.COLUMN_SIZE,
                    DocumentsContract.Document.COLUMN_LAST_MODIFIED
                )
                
                val cursor = reactContext.contentResolver.query(
                    childrenUri,
                    projection,
                    null,
                    null,
                    null
                )
                
                cursor?.use {
                    val idIndex = it.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_DOCUMENT_ID)
                    val nameIndex = it.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_DISPLAY_NAME)
                    val mimeIndex = it.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_MIME_TYPE)
                    val sizeIndex = it.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_SIZE)
                    val modifiedIndex = it.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_LAST_MODIFIED)
                    
                    while (it.moveToNext()) {
                        val docId = it.getString(idIndex)
                        val name = it.getString(nameIndex) ?: ""
                        val mimeType = it.getString(mimeIndex) ?: ""
                        val size = it.getLong(sizeIndex)
                        val lastModified = it.getLong(modifiedIndex)
                        
                        // Build the document URI for this file
                        val fileUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, docId)
                        
                        val fileInfo = Arguments.createMap().apply {
                            putString("name", name)
                            putString("uri", fileUri.toString())
                            putBoolean("isDirectory", mimeType == DocumentsContract.Document.MIME_TYPE_DIR)
                            putDouble("size", size.toDouble())
                            putDouble("lastModified", lastModified.toDouble())
                            putString("mimeType", mimeType)
                        }
                        files.pushMap(fileInfo)
                    }
                }
                
                Log.d(TAG, "Listed ${files.size()} files from: $directoryUri (optimized query)")
                
                withContext(Dispatchers.Main) {
                    promise.resolve(files)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to list files: ${e.message}")
                withContext(Dispatchers.Main) {
                    promise.reject("LIST_ERROR", e.message)
                }
            }
        }
    }

    /**
     * Write a file to SAF-managed directory OR Legacy path
     */
    @ReactMethod
    fun writeFile(directoryUri: String, fileName: String, sourceFilePath: String, promise: Promise) {
        scope.launch {
            try {
                // LEGACY MODE: Direct File IO
                if (!directoryUri.startsWith("content://")) {
                    val targetDir = File(directoryUri)
                    if (!targetDir.exists()) targetDir.mkdirs()
                    
                    val targetFile = File(targetDir, fileName)
                    val sourceFile = File(sourceFilePath)
                    
                    sourceFile.inputStream().use { input ->
                        FileOutputStream(targetFile).use { output ->
                            input.copyTo(output)
                        }
                    }
                    
                    withContext(Dispatchers.Main) {
                        val result = Arguments.createMap().apply {
                            putString("uri", targetFile.absolutePath)
                            putString("name", fileName)
                            putDouble("size", sourceFile.length().toDouble())
                        }
                        promise.resolve(result)
                    }
                    return@launch
                }

                // SAF MODE
                val uri = Uri.parse(directoryUri)
                val documentFile = DocumentFile.fromTreeUri(reactContext, uri)
                    ?: throw Exception("Cannot access directory")

                // Create or overwrite file
                var targetFile = documentFile.findFile(fileName)
                if (targetFile != null && targetFile.exists()) {
                    targetFile.delete()
                }
                
                // Determine MIME type
                val mimeType = getMimeType(fileName)
                targetFile = documentFile.createFile(mimeType, fileName)
                    ?: throw Exception("Failed to create file: $fileName")

                // Copy content
                val sourceFile = File(sourceFilePath)
                if (!sourceFile.exists()) {
                    throw Exception("Source file not found: $sourceFilePath")
                }

                val outputStream = reactContext.contentResolver.openOutputStream(targetFile.uri)
                    ?: throw Exception("Cannot open output stream")
                    
                sourceFile.inputStream().use { input ->
                    outputStream.use { output ->
                        input.copyTo(output, BUFFER_SIZE)
                    }
                }

                Log.d(TAG, "File written successfully: $fileName")
                
                withContext(Dispatchers.Main) {
                    val result = Arguments.createMap().apply {
                        putString("uri", targetFile.uri.toString())
                        putString("name", fileName)
                        putDouble("size", sourceFile.length().toDouble())
                    }
                    promise.resolve(result)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to write file: ${e.message}")
                withContext(Dispatchers.Main) {
                    promise.reject("WRITE_ERROR", e.message)
                }
            }
        }
    }

    /**
     * Extract ZIP file to SAF-managed directory OR Legacy path
     */
    @ReactMethod
    fun extractZipToDirectory(
        directoryUri: String,
        zipFilePath: String,
        flattenRoot: Boolean, // If true, skip first folder level in ZIP
        promise: Promise
    ) {
        scope.launch {
            try {
                // LEGACY MODE: Direct File IO
                if (!directoryUri.startsWith("content://")) {
                    val targetDir = File(directoryUri)
                    if (!targetDir.exists()) targetDir.mkdirs()
                    
                    val zipFile = File(zipFilePath)
                    if (!zipFile.exists()) throw Exception("ZIP file not found")
                    
                    var extractedCount = 0
                    var totalBytes: Long = 0
                    
                    ZipInputStream(BufferedInputStream(FileInputStream(zipFile), BUFFER_SIZE)).use { zis ->
                        var entry = zis.nextEntry
                        while (entry != null) {
                            var entryName = entry.name
                            if (entryName.contains("..")) { // Security check
                                entry = zis.nextEntry
                                continue
                            }
                            
                            if (flattenRoot && entryName.contains("/")) {
                                val parts = entryName.split("/", limit = 2)
                                if (parts.size > 1) entryName = parts[1]
                            }
                            
                            if (entryName.isEmpty()) {
                                entry = zis.nextEntry
                                continue
                            }
                            
                            val targetFile = File(targetDir, entryName)
                            if (entry.isDirectory) {
                                targetFile.mkdirs()
                            } else {
                                targetFile.parentFile?.mkdirs()
                                if (targetFile.exists()) targetFile.delete()
                                
                                FileOutputStream(targetFile).use { fos ->
                                    val buffer = ByteArray(BUFFER_SIZE)
                                    var len: Int
                                    while (zis.read(buffer).also { len = it } > 0) {
                                        fos.write(buffer, 0, len)
                                        totalBytes += len
                                    }
                                }
                                extractedCount++
                                sendEvent("onExtractProgress", Arguments.createMap().apply {
                                    putInt("extractedFiles", extractedCount)
                                    putDouble("totalBytes", totalBytes.toDouble())
                                    putString("currentFile", entryName)
                                })
                            }
                            zis.closeEntry()
                            entry = zis.nextEntry
                        }
                    }
                    
                    withContext(Dispatchers.Main) {
                        val result = Arguments.createMap().apply {
                            putInt("extractedFiles", extractedCount)
                            putDouble("totalBytes", totalBytes.toDouble())
                            putBoolean("success", true)
                        }
                        promise.resolve(result)
                    }
                    return@launch
                }

                // SAF MODE (Android 11+)
                val uri = Uri.parse(directoryUri)
                val rootDocument = DocumentFile.fromTreeUri(reactContext, uri)
                    ?: throw Exception("Cannot access directory")

                val zipFile = File(zipFilePath)
                if (!zipFile.exists()) {
                    throw Exception("ZIP file not found: $zipFilePath")
                }

                // Security: Verify destination directory is writable
                if (!rootDocument.canWrite()) {
                    throw Exception("Destination directory is not writable")
                }

                var extractedCount = 0
                var totalBytes: Long = 0
                val contentResolver = reactContext.contentResolver

                ZipInputStream(BufferedInputStream(FileInputStream(zipFile), BUFFER_SIZE)).use { zis ->
                    var entry = zis.nextEntry
                    
                    while (entry != null) {
                        var entryName = entry.name
                        
                        // SECURITY: Zip Slip Vulnerability Protection
                        if (entryName.contains("..")) {
                            Log.w(TAG, "Skipping potentially unsafe zip entry: $entryName")
                            entry = zis.nextEntry
                            continue
                        }

                        // Flatten: Skip the first directory level if requested
                        if (flattenRoot && entryName.contains("/")) {
                            val parts = entryName.split("/", limit = 2)
                            if (parts.size > 1) {
                                entryName = parts[1]
                            }
                        }
                        
                        // Skip empty entries after flattening
                        if (entryName.isEmpty()) {
                            entry = zis.nextEntry
                            continue
                        }

                        if (entry.isDirectory) {
                            // Create directory
                            createDirectoryRecursive(rootDocument, entryName)
                        } else {
                            // Extract file
                            val parentPath = entryName.substringBeforeLast("/", "")
                            val fileName = entryName.substringAfterLast("/")
                            
                            val parentDoc = if (parentPath.isNotEmpty()) {
                                createDirectoryRecursive(rootDocument, parentPath)
                            } else {
                                rootDocument
                            }
                            
                            // Create file
                            var targetFile = parentDoc.findFile(fileName)
                            if (targetFile != null && targetFile.exists()) {
                                targetFile.delete()
                            }
                            
                            val mimeType = getMimeType(fileName)
                            targetFile = parentDoc.createFile(mimeType, fileName)
                                ?: throw Exception("Failed to create: $fileName")

                            // Write content directly via ContentResolver stream
                            contentResolver.openOutputStream(targetFile.uri)?.use { output ->
                                val buffer = ByteArray(BUFFER_SIZE)
                                var len: Int
                                while (zis.read(buffer).also { len = it } > 0) {
                                    output.write(buffer, 0, len)
                                    totalBytes += len
                                }
                            }
                            
                            extractedCount++
                            
                            // Emit progress
                            sendEvent("onExtractProgress", Arguments.createMap().apply {
                                putInt("extractedFiles", extractedCount)
                                putDouble("totalBytes", totalBytes.toDouble())
                                putString("currentFile", fileName)
                            })
                        }
                        
                        zis.closeEntry()
                        entry = zis.nextEntry
                    }
                }

                Log.d(TAG, "ZIP extracted: $extractedCount files, ${totalBytes / 1024}KB")
                
                withContext(Dispatchers.Main) {
                    val result = Arguments.createMap().apply {
                        putInt("extractedFiles", extractedCount)
                        putDouble("totalBytes", totalBytes.toDouble())
                        putBoolean("success", true)
                    }
                    promise.resolve(result)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to extract ZIP: ${e.message}")
                withContext(Dispatchers.Main) {
                    promise.reject("EXTRACT_ERROR", e.message)
                }
            }
        }
    }

    // ==================== Helper Functions ====================

    /**
     * Create directory recursively in SAF
     */
    private fun createDirectoryRecursive(root: DocumentFile, path: String): DocumentFile {
        var current = root
        val parts = path.split("/").filter { it.isNotEmpty() }
        
        for (part in parts) {
            val existing = current.findFile(part)
            current = if (existing != null && existing.isDirectory) {
                existing
            } else {
                current.createDirectory(part)
                    ?: throw Exception("Failed to create directory: $part")
            }
        }
        
        return current
    }

    /**
     * Get MIME type for file
     */
    private fun getMimeType(fileName: String): String {
        val extension = fileName.substringAfterLast(".", "").lowercase()
        return when (extension) {
            "obb" -> "application/octet-stream"
            "apk" -> "application/vnd.android.package-archive"
            "zip" -> "application/zip"
            "json" -> "application/json"
            "xml" -> "application/xml"
            "txt" -> "text/plain"
            "png" -> "image/png"
            "jpg", "jpeg" -> "image/jpeg"
            else -> "application/octet-stream"
        }
    }

    /**
     * Send event to JavaScript
     */
    private fun sendEvent(eventName: String, params: WritableMap) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    // ==================== Activity Result Handler ====================

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        Log.d(TAG, "â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ")
        Log.d(TAG, "onActivityResult received:")
        Log.d(TAG, "  requestCode: $requestCode (expected: $REQUEST_CODE_OPEN_DOCUMENT_TREE)")
        Log.d(TAG, "  resultCode: $resultCode (RESULT_OK=${Activity.RESULT_OK})")
        Log.d(TAG, "  data: ${data?.data}")
        
        if (requestCode != REQUEST_CODE_OPEN_DOCUMENT_TREE) {
            Log.d(TAG, "  â†’ Ignoring (not for SAF)")
            return
        }

        val promise = pendingPromise
        pendingPromise = null

        if (resultCode != Activity.RESULT_OK || data?.data == null) {
            Log.d(TAG, "  â†’ User cancelled or no data")
            promise?.reject("CANCELLED", "User cancelled folder selection")
            return
        }

        val uri = data.data!!
        
        try {
            // Persist the permission
            val flags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            reactContext.contentResolver.takePersistableUriPermission(uri, flags)
            
            Log.d(TAG, "Permission granted for URI: $uri")

            // Verify the folder is correct
            val uriPath = uri.toString()
            val expectedPath = if (requestedFolderType == "obb") {
                "$ANDROID_OBB_PREFIX%2F$requestedPackageName"
            } else {
                "$ANDROID_DATA_PREFIX%2F$requestedPackageName"
            }
            
            val isCorrectFolder = uriPath.contains(expectedPath) || 
                                  uriPath.contains(requestedPackageName ?: "")

            if (!isCorrectFolder) {
                Log.w(TAG, "User selected different folder than expected")
            }

            val result = Arguments.createMap().apply {
                putString("uri", uri.toString())
                putString("packageName", requestedPackageName)
                putString("folderType", requestedFolderType)
                putBoolean("isCorrectFolder", isCorrectFolder)
            }
            
            promise?.resolve(result)
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to persist permission: ${e.message}")
            promise?.reject("PERSIST_ERROR", "Failed to save permission: ${e.message}")
        } finally {
            requestedPackageName = null
            requestedFolderType = null
        }
    }

    override fun onNewIntent(intent: Intent?) {}

    /**
     * Delete file or directory in SAF-managed location OR Legacy path
     */
    @ReactMethod
    fun deleteFile(fileUri: String, promise: Promise) {
        scope.launch {
            try {
                val success: Boolean
                
                // LEGACY MODE: Direct File IO
                if (!fileUri.startsWith("content://")) {
                    val file = File(fileUri)
                    success = if (file.isDirectory) {
                        file.deleteRecursively()
                    } else {
                        file.delete()
                    }
                } else {
                    // SAF MODE (Android 11+)
                    val uri = Uri.parse(fileUri)
                    val documentFile = DocumentFile.fromSingleUri(reactContext, uri)
                        ?: DocumentFile.fromTreeUri(reactContext, uri)
                    
                    success = documentFile?.delete() ?: false
                }
                
                Log.d(TAG, "Delete result for $fileUri: $success")
                
                withContext(Dispatchers.Main) {
                    promise.resolve(success)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to delete: ${e.message}")
                withContext(Dispatchers.Main) {
                    promise.reject("DELETE_ERROR", e.message)
                }
            }
        }
    }

    /**
     * Create ZIP from SAF-managed directory OR Legacy path
     * Used to package DATA folder for transfer
     * 
     * @param directoryUri - Source directory (SAF URI or file path)
     * @param outputZipPath - Where to save the ZIP file (must be app-accessible path)
     * @param packageName - Game package name (for naming the ZIP)
     */
    @ReactMethod
    fun createZipFromDirectory(directoryUri: String, outputZipPath: String, promise: Promise) {
        scope.launch {
            try {
                var filesZipped = 0
                var processedBytes: Long = 0
                var totalBytesToProcess: Long = 0
                
                // Create output ZIP file
                val zipFile = File(outputZipPath)
                zipFile.parentFile?.mkdirs()
                
                ZipOutputStream(BufferedOutputStream(FileOutputStream(zipFile), BUFFER_SIZE)).use { zos ->

                    if (!directoryUri.startsWith("content://")) {
                        val sourceDir = File(directoryUri)
                        if (!sourceDir.exists() || !sourceDir.isDirectory) {
                            throw Exception("Source directory not found")
                        }

                        fun calculateTotalBytes(file: File): Long {
                            if (file.isDirectory) {
                                if (file.name == "cache" || file.name == "code_cache" || file.name == "logs" || file.name == "temp" || file.name == "tmp") return 0
                                var sum = 0L
                                file.listFiles()?.forEach { child ->
                                    sum += calculateTotalBytes(child)
                                }
                                return sum
                            } else {
                                return file.length()
                            }
                        }

                        sourceDir.listFiles()?.forEach { file ->
                            totalBytesToProcess += calculateTotalBytes(file)
                        }

                        fun addFileToZip(file: File, basePath: String) {
                            val entryName = if (basePath.isEmpty()) file.name else "$basePath/${file.name}"

                            if (file.isDirectory) {
                                if (file.name == "cache" || file.name == "code_cache" || file.name == "logs" || file.name == "temp" || file.name == "tmp") return

                                file.listFiles()?.forEach { child ->
                                    addFileToZip(child, entryName)
                                }
                            } else {
                                zos.putNextEntry(ZipEntry(entryName))
                                file.inputStream().use { fis ->
                                    val buffer = ByteArray(BUFFER_SIZE)
                                    var len: Int
                                    while (fis.read(buffer).also { len = it } > 0) {
                                        zos.write(buffer, 0, len)
                                        processedBytes += len
                                    }
                                }
                                zos.closeEntry()
                                filesZipped++

                                if (totalBytesToProcess > 0) {
                                    val progressMap = Arguments.createMap().apply {
                                        putInt("filesZipped", filesZipped)
                                        putDouble("processedBytes", processedBytes.toDouble())
                                        putDouble("totalBytes", totalBytesToProcess.toDouble())
                                    }
                                    Log.d(TAG, "ZIP progress (LEGACY): files=$filesZipped, bytes=$processedBytes/$totalBytesToProcess")
                                    sendEvent("onZipProgress", progressMap)
                                }
                            }
                        }

                        sourceDir.listFiles()?.forEach { file ->
                            addFileToZip(file, "")
                        }

                    } else {
                        val treeUri = Uri.parse(directoryUri)

                        suspend fun calculateTotalBytes(docUri: Uri): Long {
                            var sum = 0L
                            val documentId = DocumentsContract.getDocumentId(docUri)
                            val childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, documentId)

                            val projection = arrayOf(
                                DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                                DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                                DocumentsContract.Document.COLUMN_MIME_TYPE,
                                DocumentsContract.Document.COLUMN_SIZE
                            )

                            val cursor = reactContext.contentResolver.query(childrenUri, projection, null, null, null)

                            cursor?.use {
                                val idIndex = it.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_DOCUMENT_ID)
                                val nameIndex = it.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_DISPLAY_NAME)
                                val mimeIndex = it.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_MIME_TYPE)
                                val sizeIndex = it.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_SIZE)

                                while (it.moveToNext()) {
                                    val docId = it.getString(idIndex)
                                    val name = it.getString(nameIndex) ?: ""
                                    val mimeType = it.getString(mimeIndex) ?: ""
                                    val size = it.getLong(sizeIndex)

                                    if (name == "cache" || name == "code_cache" || name == "logs" || name == "temp" || name == "tmp") continue

                                    val childUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, docId)

                                    if (mimeType == DocumentsContract.Document.MIME_TYPE_DIR) {
                                        sum += calculateTotalBytes(childUri)
                                    } else {
                                        sum += size
                                    }
                                }
                            }

                            return sum
                        }

                        val rootDocId = DocumentsContract.getTreeDocumentId(treeUri)
                        val rootUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, rootDocId)
                        totalBytesToProcess = calculateTotalBytes(rootUri)

                        suspend fun addDocumentToZip(docUri: Uri, basePath: String) {
                            val documentId = DocumentsContract.getDocumentId(docUri)
                            val childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, documentId)

                            val projection = arrayOf(
                                DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                                DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                                DocumentsContract.Document.COLUMN_MIME_TYPE,
                                DocumentsContract.Document.COLUMN_SIZE
                            )

                            val cursor = reactContext.contentResolver.query(childrenUri, projection, null, null, null)

                            cursor?.use {
                                val idIndex = it.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_DOCUMENT_ID)
                                val nameIndex = it.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_DISPLAY_NAME)
                                val mimeIndex = it.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_MIME_TYPE)
                                val sizeIndex = it.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_SIZE)

                                while (it.moveToNext()) {
                                    val docId = it.getString(idIndex)
                                    val name = it.getString(nameIndex) ?: ""
                                    val mimeType = it.getString(mimeIndex) ?: ""
                                    val size = it.getLong(sizeIndex)

                                    if (name == "cache" || name == "code_cache" || name == "logs" || name == "temp" || name == "tmp") continue

                                    val entryName = if (basePath.isEmpty()) name else "$basePath/$name"
                                    val childUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, docId)

                                    if (mimeType == DocumentsContract.Document.MIME_TYPE_DIR) {
                                        addDocumentToZip(childUri, entryName)
                                    } else {
                                        zos.putNextEntry(ZipEntry(entryName))
                                        reactContext.contentResolver.openInputStream(childUri)?.use { input ->
                                            val buffer = ByteArray(BUFFER_SIZE)
                                            var len: Int
                                            while (input.read(buffer).also { len = it } > 0) {
                                                zos.write(buffer, 0, len)
                                                processedBytes += len
                                            }
                                        }
                                        zos.closeEntry()
                                        filesZipped++

                                        if (totalBytesToProcess > 0) {
                                            val progressMap = Arguments.createMap().apply {
                                                putInt("filesZipped", filesZipped)
                                                putDouble("processedBytes", processedBytes.toDouble())
                                                putDouble("totalBytes", totalBytesToProcess.toDouble())
                                            }
                                            Log.d(TAG, "ZIP progress (SAF): files=$filesZipped, bytes=$processedBytes/$totalBytesToProcess")
                                            sendEvent("onZipProgress", progressMap)
                                        }
                                    }
                                }
                            }
                        }

                        addDocumentToZip(rootUri, "")
                    }
                }

                Log.d(TAG, "ZIP created: $outputZipPath with $filesZipped files ($processedBytes / $totalBytesToProcess bytes)")
                
                withContext(Dispatchers.Main) {
                    val result = Arguments.createMap().apply {
                        putString("zipPath", outputZipPath)
                        putInt("filesZipped", filesZipped)
                        putDouble("totalBytes", totalBytesToProcess.toDouble())
                    }
                    promise.resolve(result)
                }
                
            } catch (e: Exception) {
                Log.e(TAG, "Failed to create ZIP: ${e.message}")
                withContext(Dispatchers.Main) {
                    promise.reject("ZIP_CREATE_ERROR", e.message)
                }
            }
        }
    }

    // ==================== All Files Access (Android 11+) ====================

    @ReactMethod
    fun hasAllFilesAccess(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            promise.resolve(Environment.isExternalStorageManager())
        } else {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun requestAllFilesAccess(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            try {
                val uri = Uri.parse("package:${reactContext.packageName}")
                val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, uri)
                currentActivity?.startActivity(intent)
                promise.resolve(true)
            } catch (e: Exception) {
                val intent = Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION)
                currentActivity?.startActivity(intent)
                promise.resolve(true)
            }
        } else {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun openSystemAppInfo(packageName: String, promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
            intent.data = Uri.parse("package:$packageName")
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("OPEN_SETTINGS_ERROR", e.message)
        }
    }
}


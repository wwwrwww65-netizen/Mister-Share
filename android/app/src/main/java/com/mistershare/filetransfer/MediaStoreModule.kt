package com.mistershare.filetransfer

import android.content.ContentUris
import android.database.Cursor
import android.net.Uri
import android.provider.MediaStore
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import android.os.storage.StorageManager
import android.os.storage.StorageVolume
import android.content.Context
import android.os.Build
import java.io.File
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.media.ThumbnailUtils
import android.util.Base64
import java.io.ByteArrayOutputStream
import android.media.MediaMetadataRetriever
import android.content.pm.PackageManager

class MediaStoreModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "MediaStore"

    /**
     * Get all photos from MediaStore
     */
    @ReactMethod
    fun getAllPhotos(limit: Int, offset: Int, promise: Promise) {
        Thread {
            try {
                val photos = mutableListOf<WritableMap>()
                val projection = arrayOf(
                    MediaStore.Images.Media._ID,
                    MediaStore.Images.Media.DISPLAY_NAME,
                    MediaStore.Images.Media.SIZE,
                    MediaStore.Images.Media.DATE_MODIFIED,
                    MediaStore.Images.Media.MIME_TYPE,
                    MediaStore.Images.Media.DATA
                )

                val sortOrder = "${MediaStore.Images.Media.DATE_MODIFIED} DESC"

                reactApplicationContext.contentResolver.query(
                    MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                    projection,
                    null,
                    null,
                    sortOrder
                )?.use { cursor ->
                    val idColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID)
                    val nameColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME)
                    val sizeColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.SIZE)
                    val dateColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_MODIFIED)
                    val mimeColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.MIME_TYPE)
                    val pathColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATA)

                    // Pagination Logic
                    if (offset > 0) {
                        cursor.moveToPosition(offset - 1)
                    }

                    while (cursor.moveToNext()) {
                        if (limit > 0 && photos.size >= limit) break
                        
                        val id = cursor.getLong(idColumn)
                        val name = cursor.getString(nameColumn)
                        val size = cursor.getLong(sizeColumn)
                        val date = cursor.getLong(dateColumn)
                        val mime = cursor.getString(mimeColumn)
                        val path = cursor.getString(pathColumn)

                        val contentUri = ContentUris.withAppendedId(
                            MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                            id
                        )

                        val photo = Arguments.createMap().apply {
                            putDouble("id", id.toDouble())
                            putString("name", name)
                            putString("filename", name)
                            putDouble("size", size.toDouble())
                            putDouble("dateModified", date.toDouble())
                            putString("mime", mime)
                            putString("path", path)
                            putString("uri", contentUri.toString())
                        }

                        photos.add(photo)
                    }
                }

                val result = Arguments.createArray()
                photos.forEach { result.pushMap(it) }
                promise.resolve(result)

            } catch (e: Exception) {
                promise.reject("ERROR", "Failed to get photos: ${e.message}", e)
            }
        }.start()
    }

    /**
     * Get all videos from MediaStore
     */
    @ReactMethod
    fun getAllVideos(limit: Int, offset: Int, promise: Promise) {
        Thread {
            try {
                val videos = mutableListOf<WritableMap>()
            val projection = arrayOf(
                MediaStore.Video.Media._ID,
                MediaStore.Video.Media.DISPLAY_NAME,
                MediaStore.Video.Media.SIZE,
                MediaStore.Video.Media.DATE_MODIFIED,
                MediaStore.Video.Media.MIME_TYPE,
                MediaStore.Video.Media.DATA,
                MediaStore.Video.Media.DURATION
            )

            val sortOrder = "${MediaStore.Video.Media.DATE_MODIFIED} DESC"

            reactApplicationContext.contentResolver.query(
                MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
                projection,
                null,
                null,
                sortOrder
            )?.use { cursor ->
                val idColumn = cursor.getColumnIndexOrThrow(MediaStore.Video.Media._ID)
                val nameColumn = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.DISPLAY_NAME)
                val sizeColumn = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.SIZE)
                val dateColumn = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.DATE_MODIFIED)
                val mimeColumn = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.MIME_TYPE)
                val pathColumn = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.DATA)
                val durationColumn = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.DURATION)

                // Pagination
                if (offset > 0) cursor.moveToPosition(offset - 1)

                while (cursor.moveToNext()) {
                    if (limit > 0 && videos.size >= limit) break
                    val id = cursor.getLong(idColumn)
                    val name = cursor.getString(nameColumn)
                    val size = cursor.getLong(sizeColumn)
                    val date = cursor.getLong(dateColumn)
                    val mime = cursor.getString(mimeColumn)
                    val path = cursor.getString(pathColumn)
                    val duration = cursor.getLong(durationColumn)

                    val contentUri = ContentUris.withAppendedId(
                        MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
                        id
                    )

                    val video = Arguments.createMap().apply {
                        putDouble("id", id.toDouble())
                        putString("name", name)
                        putString("filename", name)
                        putDouble("size", size.toDouble())
                        putDouble("dateModified", date.toDouble())
                        putString("mime", mime)
                        putString("path", path)
                        putString("uri", contentUri.toString())
                        putDouble("duration", duration.toDouble())
                    }

                    videos.add(video)
                }
            }

            val result = Arguments.createArray()
            videos.forEach { result.pushMap(it) }
            promise.resolve(result)

        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to get videos: ${e.message}", e)
        }
        }.start()
    }

    /**
     * Get all audio/music files from MediaStore
     */
    @ReactMethod
    fun getAllMusic(limit: Int, offset: Int, promise: Promise) {
        Thread {
            try {
                val music = mutableListOf<WritableMap>()
            val projection = arrayOf(
                MediaStore.Audio.Media._ID,
                MediaStore.Audio.Media.DISPLAY_NAME,
                MediaStore.Audio.Media.SIZE,
                MediaStore.Audio.Media.DATE_MODIFIED,
                MediaStore.Audio.Media.MIME_TYPE,
                MediaStore.Audio.Media.DATA,
                MediaStore.Audio.Media.DURATION,
                MediaStore.Audio.Media.ARTIST,
                MediaStore.Audio.Media.ALBUM,
                MediaStore.Audio.Media.ALBUM_ID
            )

            val sortOrder = "${MediaStore.Audio.Media.DATE_MODIFIED} DESC"
            val selection = "${MediaStore.Audio.Media.IS_MUSIC} != 0"

            reactApplicationContext.contentResolver.query(
                MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                projection,
                selection,
                null,
                sortOrder
            )?.use { cursor ->
                val idColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
                val nameColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME)
                val sizeColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.SIZE)
                val dateColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_MODIFIED)
                val mimeColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.MIME_TYPE)
                val pathColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATA)
                val durationColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
                val artistColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
                val albumColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
                val albumIdColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID)

                // Pagination
                if (offset > 0) cursor.moveToPosition(offset - 1)

                while (cursor.moveToNext()) {
                    if (limit > 0 && music.size >= limit) break
                    val id = cursor.getLong(idColumn)
                    val name = cursor.getString(nameColumn)
                    val size = cursor.getLong(sizeColumn)
                    val date = cursor.getLong(dateColumn)
                    val mime = cursor.getString(mimeColumn)
                    val path = cursor.getString(pathColumn)
                    val duration = cursor.getLong(durationColumn)
                    val artist = cursor.getString(artistColumn) ?: "Unknown"
                    val album = cursor.getString(albumColumn) ?: "Unknown"
                    val albumId = cursor.getLong(albumIdColumn)

                    val contentUri = ContentUris.withAppendedId(
                        MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                        id
                    )

                    val albumArtUri = ContentUris.withAppendedId(
                        Uri.parse("content://media/external/audio/albumart"),
                        albumId
                    )

                    val audioFile = Arguments.createMap().apply {
                        putDouble("id", id.toDouble())
                        putString("name", name)
                        putString("filename", name)
                        putDouble("size", size.toDouble())
                        putDouble("dateModified", date.toDouble())
                        putString("mime", mime)
                        putString("path", path)
                        putString("uri", contentUri.toString())
                        putDouble("duration", duration.toDouble())
                        putString("artist", artist)
                        putString("album", album)
                        putString("albumArt", albumArtUri.toString())
                    }

                    music.add(audioFile)
                }
            }

            val result = Arguments.createArray()
            music.forEach { result.pushMap(it) }
            promise.resolve(result)

        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to get music: ${e.message}", e)
        }
        }.start()
    }

    /**
     * Get all files (documents, archives, etc.)
     */
    @ReactMethod
    fun getAllFiles(promise: Promise) {
        try {
            val files = mutableListOf<WritableMap>()
            val projection = arrayOf(
                MediaStore.Files.FileColumns._ID,
                MediaStore.Files.FileColumns.DISPLAY_NAME,
                MediaStore.Files.FileColumns.SIZE,
                MediaStore.Files.FileColumns.DATE_MODIFIED,
                MediaStore.Files.FileColumns.MIME_TYPE,
                MediaStore.Files.FileColumns.DATA
            )

            // Exclude images, videos, and audio to get only documents/files
            val selection = "${MediaStore.Files.FileColumns.MEDIA_TYPE} = ? OR ${MediaStore.Files.FileColumns.MEDIA_TYPE} IS NULL"
            val selectionArgs = arrayOf(MediaStore.Files.FileColumns.MEDIA_TYPE_NONE.toString())
            val sortOrder = "${MediaStore.Files.FileColumns.DATE_MODIFIED} DESC"

            reactApplicationContext.contentResolver.query(
                MediaStore.Files.getContentUri("external"),
                projection,
                selection,
                selectionArgs,
                sortOrder
            )?.use { cursor ->
                val idColumn = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns._ID)
                val nameColumn = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.DISPLAY_NAME)
                val sizeColumn = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.SIZE)
                val dateColumn = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.DATE_MODIFIED)
                val mimeColumn = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.MIME_TYPE)
                val pathColumn = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.DATA)

                while (cursor.moveToNext()) {
                    val id = cursor.getLong(idColumn)
                    val name = cursor.getString(nameColumn) ?: continue
                    val size = cursor.getLong(sizeColumn)
                    val date = cursor.getLong(dateColumn)
                    val mime = cursor.getString(mimeColumn) ?: "application/octet-stream"
                    val path = cursor.getString(pathColumn) ?: continue

                    // Professional Grade: No forced size filtering or path exclusion
                    // We show everything that the system allows us to see
                    // (The system already hides most of Android/data/ for us)


                    val file = Arguments.createMap().apply {
                        putDouble("id", id.toDouble())
                        putString("name", name)
                        putString("filename", name)
                        putDouble("size", size.toDouble())
                        putDouble("dateModified", date.toDouble())
                        putString("mime", mime)
                        putString("path", path)
                    }

                    files.add(file)
                }
            }

            val result = Arguments.createArray()
            files.forEach { result.pushMap(it) }
            promise.resolve(result)

        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to get files: ${e.message}", e)
        }
    }
    /**
     * Check for MANAGE_EXTERNAL_STORAGE (Android 11+)
     */
    @ReactMethod
    fun hasAllFilesPermission(promise: Promise) {
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                promise.resolve(android.os.Environment.isExternalStorageManager())
            } else {
                promise.resolve(true) // Implicitly true for older versions relative to this specific permission
            }
        } catch (e: Exception) {
             promise.resolve(false)
        }
    }

    /**
     * Request MANAGE_EXTERNAL_STORAGE (Android 11+)
     */
    @ReactMethod
    fun requestAllFilesPermission(promise: Promise) {
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                 val intent = android.content.Intent(android.provider.Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION)
                 intent.data = Uri.parse("package:" + reactApplicationContext.packageName)
                 intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                 reactApplicationContext.startActivity(intent)
                 promise.resolve(true)
            } else {
                 promise.resolve(true)
            }
        } catch (e: Exception) {
             promise.reject("ERROR", "Failed to open settings: ${e.message}", e)
        }
    }

    /**
     * Check if the app can request package installations (Android 8+)
     */
    @ReactMethod
    fun canInstallPackages(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                promise.resolve(reactApplicationContext.packageManager.canRequestPackageInstalls())
            } else {
                promise.resolve(true) // Implicitly true for older versions
            }
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    /**
     * Request permission to install unknown apps (Android 8+)
     */
    @ReactMethod
    fun requestInstallPackagesPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val intent = android.content.Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES)
                intent.data = Uri.parse("package:" + reactApplicationContext.packageName)
                intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to open install settings: ${e.message}", e)
        }
    }

    /**
     * Get directory listing for File Explorer
     */
    @ReactMethod
    fun getDirectoryListing(path: String, showHidden: Boolean, promise: Promise) {
        try {
            val directory = java.io.File(path)
            if (!directory.exists()) {
                promise.reject("ERROR", "Directory does not exist")
                return
            }
            if (!directory.isDirectory) {
                promise.reject("ERROR", "Path is not a directory")
                return
            }

            val files = directory.listFiles()
            val result = WritableNativeArray()

            files?.forEach { file ->
                // Professional Grade: Hidden file filtering logic
                if (!showHidden && file.name.startsWith(".")) {
                    return@forEach
                }

                val fileMap = WritableNativeMap()
                fileMap.putString("name", file.name)
                fileMap.putString("path", file.absolutePath)
                fileMap.putBoolean("isDirectory", file.isDirectory)
                fileMap.putDouble("size", file.length().toDouble())
                fileMap.putDouble("dateModified", file.lastModified().toDouble())
                
                // Simple mime type guess or just extension
                val extension = android.webkit.MimeTypeMap.getFileExtensionFromUrl(file.absolutePath)
                val mimeType = if (extension != null) {
                    android.webkit.MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension)
                } else {
                    "*/*"
                }
                fileMap.putString("mime", mimeType)

                // Enriched Metadata: Check if this is a package folder in Android/data or Android/obb
                if (file.isDirectory && (path.contains("/Android/data") || path.contains("/Android/obb"))) {
                    val packageName = file.name
                    // Basic package name regex check (Professional identifier)
                    if (packageName.matches(Regex("^[a-z][a-z0-9_]*(\\.[a-z0-9_]+)+[0-9a-z_]$"))) {
                        fileMap.putBoolean("isPackage", true)
                        fileMap.putString("packageName", packageName)
                    }
                }
                
                result.pushMap(fileMap)
            }

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to list directory: ${e.message}", e)
        }
    }

    /**
     * Get App Metadata (Label and Icon) for a package ID
     */
    @ReactMethod
    fun getAppMetadata(packageName: String, promise: Promise) {
        try {
            val pm = reactApplicationContext.packageManager
            val appInfo = pm.getApplicationInfo(packageName, 0)
            val label = pm.getApplicationLabel(appInfo).toString()
            val icon = pm.getApplicationIcon(appInfo)
            val bitmap = drawableToBitmap(icon)

            val baos = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, baos)
            val base64Icon = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP)

            val meta = WritableNativeMap()
            meta.putString("label", label)
            meta.putString("icon", "data:image/png;base64,$base64Icon")
            promise.resolve(meta)
        } catch (e: Exception) {
            promise.reject("ERROR", "App not found: $packageName")
        }
    }
    
    /**
     * Get Accurate App Size from PackageManager
     */
    @ReactMethod
    fun getAppSize(packageName: String, promise: Promise) {
        try {
            val pm = reactApplicationContext.packageManager
            val appInfo = pm.getApplicationInfo(packageName, 0)
            val file = File(appInfo.sourceDir)
            promise.resolve(file.length().toDouble())
        } catch (e: Exception) {
            promise.resolve(0.0)
        }
    }

    /**
     * Professional Dynamic Thumbnail Extractor
     * Supports: APK Icons, Video, Image, and Music Art
     */
    @ReactMethod
    fun getFileThumbnail(path: String, promise: Promise) {
        Thread {
            try {
                var bitmap: Bitmap? = null

                if (path.startsWith("content://")) {
                    val uri = Uri.parse(path)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        try {
                            bitmap = reactApplicationContext.contentResolver.loadThumbnail(uri, android.util.Size(256, 256), null)
                        } catch (e: Exception) { }
                    }
                } else {
                    val file = File(path)
                    if (!file.exists()) {
                        promise.resolve(null)
                        return@Thread
                    }

                    val ext = file.extension.lowercase()

                    when {
                        ext == "apk" -> {
                            val pm = reactApplicationContext.packageManager
                            val info = pm.getPackageArchiveInfo(path, 0)
                            if (info != null) {
                                info.applicationInfo?.let { appInfo ->
                                    appInfo.sourceDir = path
                                    appInfo.publicSourceDir = path
                                    val icon = appInfo.loadIcon(pm)
                                    bitmap = drawableToBitmap(icon)
                                }
                            }
                        }
                        ext in listOf("jpg", "jpeg", "png", "webp", "bmp") -> {
                            bitmap = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                                ThumbnailUtils.createImageThumbnail(file, android.util.Size(256, 256), null)
                            } else {
                                val options = BitmapFactory.Options()
                                options.inSampleSize = 8
                                BitmapFactory.decodeFile(path, options)
                            }
                        }
                        ext in listOf("mp4", "mkv", "avi", "mov", "flv", "wmv") -> {
                            bitmap = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                                ThumbnailUtils.createVideoThumbnail(file, android.util.Size(256, 256), null)
                            } else {
                                ThumbnailUtils.createVideoThumbnail(path, MediaStore.Video.Thumbnails.MINI_KIND)
                            }
                        }
                        ext in listOf("mp3", "wav", "ogg", "m4a", "aac", "flac") -> {
                            val retriever = MediaMetadataRetriever()
                            try {
                                retriever.setDataSource(path)
                                val art = retriever.embeddedPicture
                                if (art != null) {
                                    bitmap = BitmapFactory.decodeByteArray(art, 0, art.size)
                                }
                            } catch (e: Exception) {
                            } finally {
                                retriever.release()
                            }
                        }
                    }
                }

                bitmap?.let { b ->
                    val baos = ByteArrayOutputStream()
                    // Compress to JPEG 70% for balance between quality and speed
                    b.compress(Bitmap.CompressFormat.JPEG, 70, baos)
                    val base64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP)
                    promise.resolve("data:image/jpeg;base64,$base64")
                } ?: run {
                    promise.resolve(null)
                }
            } catch (e: Exception) {
                promise.resolve(null)
            }
        }.start()
    }

    private fun drawableToBitmap(drawable: android.graphics.drawable.Drawable): Bitmap {
        if (drawable is BitmapDrawable) return drawable.bitmap
        val bitmap = Bitmap.createBitmap(
            drawable.intrinsicWidth.coerceAtLeast(1),
            drawable.intrinsicHeight.coerceAtLeast(1),
            Bitmap.Config.ARGB_8888
        )
        val canvas = Canvas(bitmap)
        drawable.setBounds(0, 0, canvas.width, canvas.height)
        drawable.draw(canvas)
        return bitmap
    }

    /**
     * Get available storage volumes (Internal, SD Card, USB)
     */
    @ReactMethod
    fun getStorageVolumes(promise: Promise) {
        try {
            val result = WritableNativeArray()
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                val storageManager = reactApplicationContext.getSystemService(Context.STORAGE_SERVICE) as StorageManager
                val volumes = storageManager.storageVolumes
                
                volumes.forEach { volume: StorageVolume ->
                    val map = WritableNativeMap()
                    
                    // Use reflection to get the absolute path on older API versions or use volume methods on newer
                    val path = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        volume.directory?.absolutePath
                    } else {
                        try {
                            val getPath = volume.javaClass.getMethod("getPath")
                            getPath.invoke(volume) as String
                        } catch (e: Exception) {
                            null
                        }
                    }
                    
                    if (path != null) {
                        val isInternal = volume.isPrimary
                        val description = volume.getDescription(reactApplicationContext)
                        
                        map.putString("path", path)
                        map.putString("name", description ?: if (isInternal) "Internal Storage" else "External Storage")
                        map.putBoolean("isInternal", isInternal)
                        map.putBoolean("isRemovable", volume.isRemovable)
                        result.pushMap(map)
                    }
                }
            } else {
                // Fallback for very old versions
                val externalDirs = reactApplicationContext.getExternalFilesDirs(null)
                externalDirs.forEachIndexed { index, file ->
                    if (file != null) {
                        val map = WritableNativeMap()
                        val pathStr = file.absolutePath
                        val rootPath = if (pathStr.contains("/Android")) pathStr.split("/Android")[0] else pathStr
                        val isInternal = index == 0
                        map.putString("path", rootPath)
                        map.putString("name", if (isInternal) "Internal Storage" else "External Storage")
                        map.putBoolean("isInternal", isInternal)
                        map.putBoolean("isRemovable", !isInternal)
                        result.pushMap(map)
                    }
                }
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to get volumes: ${e.message}", e)
        }
    }
    /**
     * Check if VPN is active
     */
    @ReactMethod
    fun isVpnActive(promise: Promise) {
        try {
            val connectivityManager = reactApplicationContext.getSystemService(android.content.Context.CONNECTIVITY_SERVICE) as android.net.ConnectivityManager
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                val activeNetwork = connectivityManager.activeNetwork
                val caps = connectivityManager.getNetworkCapabilities(activeNetwork)
                val isVpn = caps?.hasTransport(android.net.NetworkCapabilities.TRANSPORT_VPN) == true
                promise.resolve(isVpn)
            } else {
                // For older devices, reliable check is harder without newer APIs, assumed false or basic check
                val networkInfo = connectivityManager.getNetworkInfo(android.net.ConnectivityManager.TYPE_VPN)
                val isVpn = networkInfo?.isConnectedOrConnecting == true
                promise.resolve(isVpn)
            }
        } catch (e: Exception) {
            promise.resolve(false) // Default to false on error
        }
    }

    /**
     * Save a file from internal/private storage to MediaStore (Public Gallery/Downloads)
     */
    /**
     * Save a file from internal/private storage to MediaStore (Public Gallery/Downloads)
     * AND organize it into a "MisterShare" folder.
     */
    @ReactMethod
    fun saveToMediaStore(filePath: String, mediaType: String, displayName: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val resolver = context.contentResolver
            val srcFile = java.io.File(filePath)
            
            if (!srcFile.exists()) {
                promise.reject("ERROR", "Source file not found: $filePath")
                return
            }

            // Determine relative path/subfolder based on type
            val relativeSubDir = "MisterShare"
            
            // --- Android Q (10) and above: Use MediaStore with RELATIVE_PATH ---
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                var collectionUri = MediaStore.Downloads.EXTERNAL_CONTENT_URI
                var relativePathHtml = android.os.Environment.DIRECTORY_DOWNLOADS + java.io.File.separator + relativeSubDir

                if (mediaType.startsWith("image/")) {
                    collectionUri = MediaStore.Images.Media.EXTERNAL_CONTENT_URI
                    relativePathHtml = android.os.Environment.DIRECTORY_PICTURES + java.io.File.separator + relativeSubDir
                } else if (mediaType.startsWith("video/")) {
                    collectionUri = MediaStore.Video.Media.EXTERNAL_CONTENT_URI
                    relativePathHtml = android.os.Environment.DIRECTORY_MOVIES + java.io.File.separator + relativeSubDir
                } else if (mediaType.startsWith("audio/")) {
                    collectionUri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
                    relativePathHtml = android.os.Environment.DIRECTORY_MUSIC + java.io.File.separator + relativeSubDir
                }

                val contentValues = android.content.ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, displayName)
                    put(MediaStore.MediaColumns.MIME_TYPE, mediaType)
                    put(MediaStore.MediaColumns.IS_PENDING, 1)
                    put(MediaStore.MediaColumns.RELATIVE_PATH, relativePathHtml)
                }

                val itemUri = resolver.insert(collectionUri, contentValues)
                    ?: throw Exception("Failed to create MediaStore entry")

                resolver.openOutputStream(itemUri)?.use { outStream ->
                    java.io.FileInputStream(srcFile).use { inStream ->
                        inStream.copyTo(outStream)
                    }
                }

                contentValues.clear()
                contentValues.put(MediaStore.MediaColumns.IS_PENDING, 0)
                resolver.update(itemUri, contentValues, null, null)
                promise.resolve(itemUri.toString())
                return
            }

            // --- Android 9 and below: Legacy Direct IO ---
            // organize physically: /sdcard/MisterShare/[Images|Videos|Music|Files]/filename
            
            var targetRoot = android.os.Environment.getExternalStorageDirectory() // root of sdcard
            // Or use public directories
            // Let's use standard public directories + MisterShare
            
            var publicDir = android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS)
            
            if (mediaType.startsWith("image/")) {
                publicDir = android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_PICTURES)
            } else if (mediaType.startsWith("video/")) {
                publicDir = android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_MOVIES)
            } else if (mediaType.startsWith("audio/")) {
                publicDir = android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_MUSIC)
            }
            
            // Append MisterShare
            val finalDir = java.io.File(publicDir, relativeSubDir)
            if (!finalDir.exists()) finalDir.mkdirs()

            // Ensure unique filename
            var destFile = java.io.File(finalDir, displayName)
            var counter = 1
            while (destFile.exists()) {
                val nameParts = displayName.split(".")
                val name = if (nameParts.size > 1) nameParts.dropLast(1).joinToString(".") else displayName
                val ext = if (nameParts.size > 1) "." + nameParts.last() else ""
                destFile = java.io.File(finalDir, "$name ($counter)$ext")
                counter++
            }

            // Copy
            java.io.FileInputStream(srcFile).use { inStream ->
                java.io.FileOutputStream(destFile).use { outStream ->
                    inStream.copyTo(outStream)
                }
            }

            // Scan so it shows up in Gallery
            android.media.MediaScannerConnection.scanFile(
                context,
                arrayOf(destFile.absolutePath),
                arrayOf(mediaType)
            ) { path, uri -> 
                 // scanned
            }
            
            promise.resolve("file://${destFile.absolutePath}")

        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to save to MediaStore: ${e.message}", e)
        }
    }
    /**
     * Get Dashboard Counts (Images, Videos, Music, Apps, Docs, etc.)
     * Optimized for speed using COUNT(*) queries.
     */
    @ReactMethod
    fun getDashboardCounts(promise: Promise) {
        val bgThread = Thread {
            try {
                val context = reactApplicationContext
                val resolver = context.contentResolver
                val counts = Arguments.createMap()

                // 1. Photos
                val imagesCount = getCount(resolver, MediaStore.Images.Media.EXTERNAL_CONTENT_URI, null, null)
                counts.putInt("photos", imagesCount)

                // 2. Videos
                val videosCount = getCount(resolver, MediaStore.Video.Media.EXTERNAL_CONTENT_URI, null, null)
                counts.putInt("videos", videosCount)

                // 3. Audio
                val audioCount = getCount(resolver, MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, "${MediaStore.Audio.Media.IS_MUSIC} != 0", null)
                counts.putInt("music", audioCount)

                // 4. Files (Docs, Archives, Big Files)
                // specific mime types
                val docMimes = arrayOf(
                    "application/pdf", "text/plain", "application/msword",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"
                )
                val archiveMimes = arrayOf("application/zip", "application/x-rar-compressed", "application/x-7z-compressed", "application/x-tar", "application/gzip")
                
                // Construct selection for docs
                val docSelection = StringBuilder()
                docSelection.append("(")
                for (i in docMimes.indices) {
                    docSelection.append("${MediaStore.Files.FileColumns.MIME_TYPE} = ?")
                    if (i < docMimes.size - 1) docSelection.append(" OR ")
                }
                docSelection.append(")")

                val docsCount = getCount(resolver, MediaStore.Files.getContentUri("external"), docSelection.toString(), docMimes)
                counts.putInt("docs", docsCount)

                // Archives
                val archiveSelection = StringBuilder()
                archiveSelection.append("(")
                for (i in archiveMimes.indices) {
                    archiveSelection.append("${MediaStore.Files.FileColumns.MIME_TYPE} = ?")
                    if (i < archiveMimes.size - 1) archiveSelection.append(" OR ")
                }
                archiveSelection.append(")")
                
                val archivesCount = getCount(resolver, MediaStore.Files.getContentUri("external"), archiveSelection.toString(), archiveMimes)
                counts.putInt("archives", archivesCount)
                
                // APKs
                val apkSelection = "${MediaStore.Files.FileColumns.MIME_TYPE} = ? OR ${MediaStore.Files.FileColumns.DATA} LIKE '%.apk'"
                val apkArgs = arrayOf("application/vnd.android.package-archive")
                val apksCount = getCount(resolver, MediaStore.Files.getContentUri("external"), apkSelection, apkArgs)
                counts.putInt("apks", apksCount)

                // Big Files (> 100MB)
                val bigFileSelection = "${MediaStore.Files.FileColumns.SIZE} > ?"
                val bigFileArgs = arrayOf((100 * 1024 * 1024).toString())
                val bigFilesCount = getCount(resolver, MediaStore.Files.getContentUri("external"), bigFileSelection, bigFileArgs)
                counts.putInt("bigfiles", bigFilesCount)

                promise.resolve(counts)

            } catch (e: Exception) {
                promise.reject("ERROR", "Failed to get dashboard counts: ${e.message}", e)
            }
        }
        bgThread.start()
    }

    private fun getCount(resolver: android.content.ContentResolver, uri: Uri, selection: String?, args: Array<String>?): Int {
        var count = 0
        try {
            val projection = arrayOf(MediaStore.MediaColumns._ID) // Minimal projection
            resolver.query(uri, projection, selection, args, null)?.use { cursor ->
                count = cursor.count
            }
        } catch (e: Exception) {
            // ignore
        }
        return count
    }
}


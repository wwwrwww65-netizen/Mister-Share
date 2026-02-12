package com.mistershare.filetransfer

import android.util.Log
import com.facebook.react.bridge.*
import kotlinx.coroutines.*
import java.io.File
import java.io.FileInputStream
import java.security.MessageDigest

/**
 * Checksum Module - File Integrity Verification
 * 
 * 2024 Best Practice:
 * Uses MD5 for fast checksums (suitable for transfer verification)
 * Uses SHA-256 for security-critical applications
 * 
 * This ensures files are transferred correctly without corruption.
 */
class ChecksumModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val TAG = "Checksum"
        const val BUFFER_SIZE = 256 * 1024 // 256KB buffer for optimal performance
    }

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun getName(): String = "ChecksumModule"

    /**
     * Calculate MD5 checksum of a file (fast, good for transfer verification)
     */
    @ReactMethod
    fun calculateMD5(filePath: String, promise: Promise) {
        scope.launch {
            try {
                val checksum = calculateHash(filePath, "MD5")
                withContext(Dispatchers.Main) {
                    promise.resolve(checksum)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("CHECKSUM_ERROR", "Failed to calculate MD5: ${e.message}")
                }
            }
        }
    }

    /**
     * Calculate SHA-256 checksum of a file (more secure, slower)
     */
    @ReactMethod
    fun calculateSHA256(filePath: String, promise: Promise) {
        scope.launch {
            try {
                val checksum = calculateHash(filePath, "SHA-256")
                withContext(Dispatchers.Main) {
                    promise.resolve(checksum)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("CHECKSUM_ERROR", "Failed to calculate SHA-256: ${e.message}")
                }
            }
        }
    }

    /**
     * Verify a file against an expected checksum
     */
    @ReactMethod
    fun verifyChecksum(filePath: String, expectedChecksum: String, algorithm: String, promise: Promise) {
        scope.launch {
            try {
                val algo = if (algorithm.equals("sha256", ignoreCase = true)) "SHA-256" else "MD5"
                val actualChecksum = calculateHash(filePath, algo)
                val isValid = actualChecksum.equals(expectedChecksum, ignoreCase = true)
                
                Log.d(TAG, "Verify: expected=$expectedChecksum, actual=$actualChecksum, valid=$isValid")
                
                val result = Arguments.createMap().apply {
                    putBoolean("valid", isValid)
                    putString("expected", expectedChecksum)
                    putString("actual", actualChecksum)
                }
                
                withContext(Dispatchers.Main) {
                    promise.resolve(result)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("VERIFY_ERROR", "Failed to verify checksum: ${e.message}")
                }
            }
        }
    }

    /**
     * Calculate checksum with progress updates (for large files)
     */
    @ReactMethod
    fun calculateWithProgress(filePath: String, algorithm: String, promise: Promise) {
        scope.launch {
            try {
                val file = File(filePath)
                if (!file.exists()) {
                    withContext(Dispatchers.Main) {
                        promise.reject("FILE_NOT_FOUND", "File does not exist: $filePath")
                    }
                    return@launch
                }

                val algo = if (algorithm.equals("sha256", ignoreCase = true)) "SHA-256" else "MD5"
                val digest = MessageDigest.getInstance(algo)
                val buffer = ByteArray(BUFFER_SIZE)
                val totalSize = file.length()
                var bytesRead: Long = 0

                FileInputStream(file).use { fis ->
                    var count: Int
                    while (fis.read(buffer).also { count = it } != -1) {
                        digest.update(buffer, 0, count)
                        bytesRead += count
                        
                        // Progress is calculated but not emitted for performance
                        // val progress = bytesRead.toDouble() / totalSize
                    }
                }

                val checksum = digest.digest().joinToString("") { "%02x".format(it) }
                
                val result = Arguments.createMap().apply {
                    putString("checksum", checksum)
                    putString("algorithm", algo)
                    putDouble("fileSize", totalSize.toDouble())
                }
                
                withContext(Dispatchers.Main) {
                    promise.resolve(result)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("CHECKSUM_ERROR", "Failed to calculate checksum: ${e.message}")
                }
            }
        }
    }

    /**
     * Internal: Calculate hash for a file
     */
    private fun calculateHash(filePath: String, algorithm: String): String {
        val file = File(filePath)
        if (!file.exists()) {
            throw IllegalArgumentException("File does not exist: $filePath")
        }

        val digest = MessageDigest.getInstance(algorithm)
        val buffer = ByteArray(BUFFER_SIZE)

        FileInputStream(file).use { fis ->
            var count: Int
            while (fis.read(buffer).also { count = it } != -1) {
                digest.update(buffer, 0, count)
            }
        }

        return digest.digest().joinToString("") { "%02x".format(it) }
    }
}


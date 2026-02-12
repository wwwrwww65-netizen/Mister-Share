package com.mistershare.filetransfer

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.location.LocationManager
import android.net.wifi.WifiConfiguration
import android.net.wifi.WifiManager
import android.os.Binder
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap

/**
 * HotspotForegroundService - 2024/2025 BEST PRACTICE
 * 
 * LocalOnlyHotspot REQUIRES the calling app to be in Foreground on Android 11+.
 * This Foreground Service ensures the hotspot starts reliably.
 * 
 * Why this is needed:
 * - Android 11+ throws ERROR_INCOMPATIBLE_MODE if app is not in foreground
 * - A Foreground Service counts as "foreground" for this purpose
 * - This is the same approach used by SHAREit, Files by Google, etc.
 */
class HotspotForegroundService : Service() {

    companion object {
        private const val TAG = "HotspotService"
        private const val CHANNEL_ID = "hotspot_channel"
        private const val NOTIFICATION_ID = 2001
        
        // Static callback for result delivery
        var onHotspotStarted: ((success: Boolean, ssid: String, password: String, ip: String, error: String?) -> Unit)? = null
        var onHotspotStopped: (() -> Unit)? = null
    }
    
    private val binder = LocalBinder()
    private var hotspotReservation: WifiManager.LocalOnlyHotspotReservation? = null
    private var currentSsid: String = ""
    private var currentPassword: String = ""
    
    inner class LocalBinder : Binder() {
        fun getService(): HotspotForegroundService = this@HotspotForegroundService
    }
    
    override fun onBind(intent: Intent?): IBinder = binder
    
    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        Log.d(TAG, "HotspotForegroundService created")
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "onStartCommand: action=${intent?.action}")
        
        when (intent?.action) {
            "START_HOTSPOT" -> {
                // Start as foreground FIRST (required for LocalOnlyHotspot)
                startForeground(NOTIFICATION_ID, createNotification("Starting Hotspot..."))
                
                // Then start the hotspot
                Handler(Looper.getMainLooper()).postDelayed({
                    startLocalOnlyHotspot()
                }, 100) // Small delay to ensure foreground is registered
            }
            "STOP_HOTSPOT" -> {
                stopHotspot()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
        }
        
        return START_NOT_STICKY
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Hotspot Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows when hotspot is active for file sharing"
                setShowBadge(false)
            }
            
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }
    
    private fun createNotification(title: String, body: String = "Ready to receive files"): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            packageManager.getLaunchIntentForPackage(packageName),
            PendingIntent.FLAG_IMMUTABLE
        )
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(R.mipmap.ic_launcher) // Use app icon
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .build()
    }
    
    @SuppressLint("MissingPermission")
    private fun startLocalOnlyHotspot() {
        Log.d(TAG, "ًں“، Starting LocalOnlyHotspot from Foreground Service...")
        
        // Pre-check: Android version
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            deliverResult(false, "", "", "", "Android 8+ required")
            return
        }
        
        // Pre-check: Location Services
        val locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager
        val isGpsEnabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
        val isNetworkEnabled = locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
        
        if (!isGpsEnabled && !isNetworkEnabled) {
            Log.e(TAG, "â‌Œ Location services disabled")
            deliverResult(false, "", "", "", "Location services must be enabled")
            return
        }
        
        // Pre-check: NEARBY_WIFI_DEVICES for Android 13+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val permission = androidx.core.content.ContextCompat.checkSelfPermission(
                this, android.Manifest.permission.NEARBY_WIFI_DEVICES
            )
            if (permission != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                Log.e(TAG, "â‌Œ NEARBY_WIFI_DEVICES permission not granted")
                deliverResult(false, "", "", "", "NEARBY_WIFI_DEVICES permission required")
                return
            }
        }
        
        val wifiManager = getSystemService(Context.WIFI_SERVICE) as? WifiManager
        if (wifiManager == null) {
            deliverResult(false, "", "", "", "WiFi service unavailable")
            return
        }
        
        // If already active, return existing
        if (hotspotReservation != null) {
            Log.d(TAG, "â™»ï¸ڈ Hotspot already running, returning existing config")
            deliverResult(true, currentSsid, currentPassword, "192.168.43.1", null)
            return
        }
        
        // Enable WiFi if disabled
        if (!wifiManager.isWifiEnabled) {
            try {
                @Suppress("DEPRECATION")
                wifiManager.setWifiEnabled(true)
                Thread.sleep(500)
            } catch (e: Exception) {
                Log.w(TAG, "Could not enable WiFi: ${e.message}")
            }
        }
        
        // Start LocalOnlyHotspot
        try {
            wifiManager.startLocalOnlyHotspot(object : WifiManager.LocalOnlyHotspotCallback() {
                override fun onStarted(reservation: WifiManager.LocalOnlyHotspotReservation?) {
                    hotspotReservation = reservation
                    
                    try {
                        @Suppress("DEPRECATION")
                        val config = reservation?.wifiConfiguration
                        
                        currentSsid = config?.SSID?.replace("\"", "") ?: "AndroidShare_${(1000..9999).random()}"
                        currentPassword = config?.preSharedKey?.replace("\"", "") ?: ""
                        
                        Log.d(TAG, "âœ… LocalOnlyHotspot SUCCESS! SSID: $currentSsid")
                        
                        // Update notification with SSID
                        val manager = getSystemService(NotificationManager::class.java)
                        manager.notify(NOTIFICATION_ID, createNotification(
                            "Hotspot Active",
                            "SSID: $currentSsid"
                        ))
                        
                        deliverResult(true, currentSsid, currentPassword, "192.168.43.1", null)
                        
                    } catch (e: Exception) {
                        Log.e(TAG, "Config retrieval failed: ${e.message}")
                        // Still running, just can't get creds
                        deliverResult(true, "Unknown", "", "192.168.43.1", "Hotspot started but config unavailable")
                    }
                }
                
                override fun onStopped() {
                    Log.d(TAG, "ًں›‘ LocalOnlyHotspot stopped by system")
                    hotspotReservation = null
                    currentSsid = ""
                    currentPassword = ""
                    onHotspotStopped?.invoke()
                }
                
                override fun onFailed(reason: Int) {
                    val reasonStr = when (reason) {
                        ERROR_NO_CHANNEL -> "ERROR_NO_CHANNEL - No available channel"
                        ERROR_GENERIC -> "ERROR_GENERIC - Unknown system error"
                        ERROR_INCOMPATIBLE_MODE -> "ERROR_INCOMPATIBLE_MODE - Turn off Personal Hotspot first"
                        ERROR_TETHERING_DISALLOWED -> "ERROR_TETHERING_DISALLOWED - Carrier/policy restriction"
                        else -> "Unknown error ($reason)"
                    }
                    
                    Log.e(TAG, "â‌Œ LocalOnlyHotspot FAILED: $reasonStr")
                    deliverResult(false, "", "", "", reasonStr)
                    
                    // Stop service since hotspot failed
                    stopForeground(STOP_FOREGROUND_REMOVE)
                    stopSelf()
                }
            }, Handler(Looper.getMainLooper()))
            
        } catch (e: Exception) {
            Log.e(TAG, "â‌Œ startLocalOnlyHotspot exception: ${e.message}")
            deliverResult(false, "", "", "", e.message ?: "Unknown exception")
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
        }
    }
    
    private fun stopHotspot() {
        try {
            hotspotReservation?.close()
            hotspotReservation = null
            currentSsid = ""
            currentPassword = ""
            Log.d(TAG, "ًں›‘ Hotspot stopped")
            onHotspotStopped?.invoke()
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping hotspot: ${e.message}")
        }
    }
    
    private fun deliverResult(success: Boolean, ssid: String, password: String, ip: String, error: String?) {
        onHotspotStarted?.invoke(success, ssid, password, ip, error)
    }
    
    override fun onDestroy() {
        super.onDestroy()
        stopHotspot()
        Log.d(TAG, "HotspotForegroundService destroyed")
    }
    
    // Public methods for binding clients
    fun getSsid(): String = currentSsid
    fun getPassword(): String = currentPassword
    fun isActive(): Boolean = hotspotReservation != null
}


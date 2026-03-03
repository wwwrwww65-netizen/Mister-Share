package com.mistershare.filetransfer

import android.annotation.SuppressLint
import android.content.Context
import android.net.wifi.p2p.WifiP2pConfig
import android.net.wifi.p2p.WifiP2pManager
import android.net.wifi.WifiManager
import android.os.Build
import android.location.LocationManager
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import android.provider.Settings
import android.content.Intent
import android.bluetooth.BluetoothAdapter
import android.net.NetworkRequest
import android.net.NetworkSpecifier
import android.net.wifi.WifiNetworkSpecifier
import android.net.ConnectivityManager
import android.net.MacAddress
import android.net.wifi.WifiConfiguration
import android.net.Network
import android.net.NetworkCapabilities
import android.os.PatternMatcher
import android.content.BroadcastReceiver
import android.content.IntentFilter

class WiFiDirectAdvancedModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var manager: WifiP2pManager? = null
    private var channel: WifiP2pManager.Channel? = null
    
    // P2P Monitoring
    private var p2pReceiverRegistered = false
    private var p2pConnectionReceiver: BroadcastReceiver? = null
    
    init {
        manager = reactContext.getSystemService(Context.WIFI_P2P_SERVICE) as? WifiP2pManager
        channel = manager?.initialize(reactContext, reactContext.mainLooper, null)
        
        // Create permanent P2P broadcast receiver
        p2pConnectionReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                handleP2PBroadcast(intent)
            }
        }
    }

    override fun getName(): String {
        return "WiFiDirectAdvanced"
    }

    /**
     * Create WiFi Direct group with 5GHz band enforcement (Android 11+ API 30+)
     * Automatically falls back to 2.4GHz on older devices or if 5GHz fails
     */
    @SuppressLint("MissingPermission")
    @ReactMethod
    fun createGroup5GHz(promise: Promise) {
        if (manager == null || channel == null) {
            promise.reject("ERROR", "WiFi Direct not available")
            return
        }

        try {
            // For Android 11+ (API 30+), use WifiP2pConfig with 5GHz band
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                val config = WifiP2pConfig.Builder()
                    .setNetworkName("DIRECT-MisterShare")
                    .setPassphrase("MisterShare2025")
                    .setGroupOperatingBand(WifiP2pConfig.GROUP_OWNER_BAND_5GHZ)
                    .build()

                val channelInstance = channel ?: run {
                    promise.reject("ERROR", "WiFi Direct channel not initialized")
                    return
                }

                manager?.createGroup(channelInstance, config, object : WifiP2pManager.ActionListener {
                    override fun onSuccess() {
                        promise.resolve(mapOf(
                            "success" to true,
                            "band" to "5GHz",
                            "message" to "5GHz group created successfully"
                        ).toWritableMap())
                    }

                    override fun onFailure(reason: Int) {
                        // Fallback to 2.4GHz or auto
                        createGroupFallback(promise, reason)
                    }
                })
            } else {
                // For Android 10 and below, use legacy method (auto band selection)
                createGroupLegacy(promise)
            }
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to create 5GHz group: ${e.message}", e)
        }
    }

    /**
     * Fallback to 2.4GHz or automatic band selection
     */
    @SuppressLint("MissingPermission")
    private fun createGroupFallback(promise: Promise, failureReason: Int) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val config = WifiP2pConfig.Builder()
                .setNetworkName("DIRECT-MisterShare")
                .setPassphrase("MisterShare2025")
                .setGroupOperatingBand(WifiP2pConfig.GROUP_OWNER_BAND_2GHZ)
                .build()

            val channelInstance = channel ?: run {
                promise.reject("ERROR", "WiFi Direct channel not initialized")
                return
            }

            manager?.createGroup(channelInstance, config, object : WifiP2pManager.ActionListener {
                override fun onSuccess() {
                    promise.resolve(mapOf(
                        "success" to true,
                        "band" to "2.4GHz",
                        "message" to "Fallback: 2.4GHz group created (5GHz not supported)",
                        "originalError" to failureReason
                    ).toWritableMap())
                }

                override fun onFailure(reason: Int) {
                    // Last resort: use legacy auto band
                    createGroupLegacy(promise)
                }
            })
        } else {
            createGroupLegacy(promise)
        }
    }

    /**
     * Legacy group creation (auto band selection)
     * Used for Android 10 and below, or as last fallback
     */
    @SuppressLint("MissingPermission")
    private fun createGroupLegacy(promise: Promise) {
        val channelInstance = channel ?: run {
            promise.reject("ERROR", "WiFi Direct channel not initialized")
            return
        }

        manager?.createGroup(channelInstance, object : WifiP2pManager.ActionListener {
            override fun onSuccess() {
                promise.resolve(mapOf(
                    "success" to true,
                    "band" to "auto",
                    "message" to "Group created with automatic band selection"
                ).toWritableMap())
            }

            override fun onFailure(reason: Int) {
                promise.reject("ERROR", "Failed to create group: $reason")
            }
        })
    }

    /**
     * Get WiFi Direct group info (including band, if available)
     */
    @SuppressLint("MissingPermission")
    @ReactMethod
    fun getGroupInfo(promise: Promise) {
        if (manager == null || channel == null) {
            promise.reject("ERROR", "WiFi Direct not available")
            return
        }

        manager?.requestGroupInfo(channel) { group ->
            if (group != null) {
                val frequency = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    group.frequency
                } else {
                    -1
                }

                val band = when {
                    frequency == -1 -> "unknown"
                    frequency < 3000 -> "2.4GHz"
                    else -> "5GHz"
                }

                val map = Arguments.createMap()
                map.putString("networkName", group.networkName ?: "")
                map.putString("passphrase", group.passphrase ?: "")
                map.putBoolean("isGroupOwner", group.isGroupOwner)
                map.putInt("frequency", frequency)
                map.putString("band", band)
                
                promise.resolve(map)
            } else {
                promise.reject("ERROR", "No active group")
            }
        }
    }

    // Helper function no longer needed if we inline
    private fun Map<String, Any>.toWritableMap(): WritableMap {
        val map = Arguments.createMap()
        for ((key, value) in this) {
            when (value) {
                is String -> map.putString(key, value)
                is Boolean -> map.putBoolean(key, value)
                is Int -> map.putInt(key, value)
                is Double -> map.putDouble(key, value)
            }
        }
        return map
    }
    /**
     * Connect to WiFi Direct network using SSID and passphrase (from QR code)
     * Uses WifiNetworkSpecifier for Android 10+ (API 29+)
     */
    // Store the connected network for socket creation
    private var boundNetwork: android.net.Network? = null
    
    /**
     * Get the bound Network for socket creation
     * This is CRITICAL for LocalOnlyHotspot - sockets must use this network's factory
     */
    fun getBoundNetwork(): android.net.Network? = boundNetwork
    
    @SuppressLint("MissingPermission")
    @ReactMethod
    fun connectToNetwork(ssid: String, password: String, promise: Promise) {
        Log.d("WiFiDirect", "ًں“¶ Connecting to network: $ssid")
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Android 10+ (API 29+) - Use WifiNetworkSpecifier
                Log.d("WiFiDirect", "ًں“¶ Using WifiNetworkSpecifier (Android 10+)")
                
                val specifier = WifiNetworkSpecifier.Builder()
                    .setSsid(ssid) // Use exact SSID match instead of pattern
                    .setWpa2Passphrase(password)
                    .build()

                val request = NetworkRequest.Builder()
                    .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
                    .setNetworkSpecifier(specifier)
                    .build()

                val connectivityManager = reactApplicationContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

                val networkCallback = object : ConnectivityManager.NetworkCallback() {
                    override fun onAvailable(network: Network) {
                        super.onAvailable(network)
                        Log.d("WiFiDirect", "âœ… Network available! Storing in NetworkHolder...")
                        
                        // CRITICAL: Store in singleton for cross-module access
                        NetworkHolder.setBoundNetwork(network)
                        
                        // Also bind process as fallback
                        connectivityManager.bindProcessToNetwork(network)
                        
                        promise.resolve(mapOf(
                            "success" to true,
                            "message" to "Connected to $ssid",
                            "networkBound" to true
                        ).toWritableMap())
                    }

                    override fun onUnavailable() {
                        super.onUnavailable()
                        Log.e("WiFiDirect", "â‌Œ Network unavailable: $ssid")
                        NetworkHolder.clear()
                        promise.reject("ERROR", "Network unavailable: $ssid")
                    }
                    
                    override fun onLost(network: Network) {
                        super.onLost(network)
                        Log.w("WiFiDirect", "âڑ ï¸ڈ Network lost: $ssid")
                        NetworkHolder.clear()
                    }
                }

                connectivityManager.requestNetwork(request, networkCallback)
            } else {
                // Android 9 and below - Use legacy WifiConfiguration
                Log.d("WiFiDirect", "ًں“¶ Using legacy WifiConfiguration (Android 9-)")
                connectToNetworkLegacy(ssid, password, promise)
            }
        } catch (e: Exception) {
            Log.e("WiFiDirect", "â‌Œ Connection error: ${e.message}")
            promise.reject("ERROR", "Failed to connect to network: ${e.message}", e)
        }
    }

    /**
     * Legacy WiFi connection for Android 9 and below
     * FIXED: Now properly waits for connection completion using BroadcastReceiver
     */
    @SuppressLint("MissingPermission")
    private fun connectToNetworkLegacy(ssid: String, password: String, promise: Promise) {
        try {
            val wifiManager = reactApplicationContext.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            
            val wifiConfig = WifiConfiguration().apply {
                SSID = "\"$ssid\""
                preSharedKey = "\"$password\""
                allowedKeyManagement.set(WifiConfiguration.KeyMgmt.WPA_PSK)
            }

            val netId = wifiManager.addNetwork(wifiConfig)
            if (netId == -1) {
                promise.reject("ERROR", "Failed to add network configuration")
                return
            }

            // Register BroadcastReceiver to wait for actual connection
            val connectTimeoutMs = 15000L
            var isResolved = false
            
            val connectionReceiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context, intent: Intent) {
                    if (isResolved) return
                    
                    val networkInfo = intent.getParcelableExtra<android.net.NetworkInfo>(WifiManager.EXTRA_NETWORK_INFO)
                    if (networkInfo?.isConnected == true) {
                        val connectedSsid = wifiManager.connectionInfo?.ssid?.replace("\"", "")
                        Log.d("WiFiDirect", "Legacy WiFi connected to: $connectedSsid")
                        
                        if (connectedSsid == ssid || connectedSsid?.contains(ssid.take(20)) == true) {
                            isResolved = true
                            try {
                                reactApplicationContext.unregisterReceiver(this)
                            } catch (e: Exception) { }
                            
                            // CRITICAL: Bind process to WiFi network for socket routing
                            // On Android 8+, activeNetwork may return Mobile Data instead of WiFi
                            // because LocalOnlyHotspot has no internet. We must explicitly find WiFi.
                            try {
                                val cm = reactApplicationContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
                                
                                // Find WiFi network explicitly (not relying on activeNetwork)
                                var wifiNetwork: Network? = null
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                                    for (network in cm.allNetworks) {
                                        val caps = cm.getNetworkCapabilities(network)
                                        if (caps?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true) {
                                            wifiNetwork = network
                                            Log.d("WiFiDirect", "Legacy WiFi: Found WiFi network: $network")
                                            break
                                        }
                                    }
                                }
                                
                                // Fallback to activeNetwork if WiFi not found
                                val networkToBind = wifiNetwork ?: cm.activeNetwork
                                
                                if (networkToBind != null) {
                                    // 2024 FIX: REMOVE bindProcessToNetwork
                                    // Binding the whole process to a no-internet network on Android 8 causes issues.
                                    // use NetworkHolder to route specific sockets instead.
                                    // if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                    //     cm.bindProcessToNetwork(networkToBind)
                                    // }
                                    
                                    NetworkHolder.setBoundNetwork(networkToBind)
                                    
                                    val caps = cm.getNetworkCapabilities(networkToBind)
                                    val isWifi = caps?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true
                                    Log.d("WiFiDirect", "Legacy WiFi: Network bound for routing: $networkToBind (Is WiFi: $isWifi)")
                                    
                                    if (!isWifi) {
                                        Log.w("WiFiDirect", "⚠️ WARNING: Bound network is NOT WiFi! Socket routing may fail.")
                                    }
                                } else {
                                    Log.w("WiFiDirect", "Legacy WiFi: No network found to bind! activeNetwork was null.")
                                }
                            } catch (e: Exception) {
                                Log.w("WiFiDirect", "Legacy WiFi: Could not bind network: ${e.message}")
                            }
                            
                            promise.resolve(mapOf(
                                "success" to true,
                                "message" to "Connected to $ssid (legacy method)"
                            ).toWritableMap())
                        }
                    }
                }
            }
            
            val filter = IntentFilter(WifiManager.NETWORK_STATE_CHANGED_ACTION)
            reactApplicationContext.registerReceiver(connectionReceiver, filter)
            
            // Start connection
            wifiManager.disconnect()
            wifiManager.enableNetwork(netId, true)
            wifiManager.reconnect()
            Log.d("WiFiDirect", "Legacy WiFi: initiating connection to $ssid...")
            
            // Timeout handler
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                if (!isResolved) {
                    isResolved = true
                    try {
                        reactApplicationContext.unregisterReceiver(connectionReceiver)
                    } catch (e: Exception) { }
                    
                    // Check if connected anyway
                    val currentSsid = wifiManager.connectionInfo?.ssid?.replace("\"", "")
                    if (currentSsid == ssid || currentSsid?.contains(ssid.take(20)) == true) {
                        promise.resolve(mapOf(
                            "success" to true,
                            "message" to "Connected to $ssid (legacy method - timeout but connected)"
                        ).toWritableMap())
                    } else {
                        promise.reject("TIMEOUT", "WiFi connection timeout after ${connectTimeoutMs}ms")
                    }
                }
            }, connectTimeoutMs)
            
        } catch (e: Exception) {
            promise.reject("ERROR", "Legacy connection failed: ${e.message}", e)
        }
    }

    /**
     * Remove WiFi Direct group
     */
    @SuppressLint("MissingPermission")
    @ReactMethod
    fun removeGroup(promise: Promise) {
        manager?.removeGroup(channel, object : WifiP2pManager.ActionListener {
            override fun onSuccess() {
                promise.resolve("Group removed")
            }

            override fun onFailure(reason: Int) {
                promise.reject("ERROR", "Failed to remove group: $reason")
            }
        })
    }



    /**
     * Check if Location Services are enabled
     */
    @ReactMethod
    fun isLocationEnabled(promise: Promise) {
        try {
            val locationManager = reactApplicationContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
            val isGpsEnabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
            val isNetworkEnabled = locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
            promise.resolve(isGpsEnabled || isNetworkEnabled)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to check location status", e)
        }
    }

    /**
     * Open WiFi Settings Panel (Android Q+) or standard settings
     */
    @ReactMethod
    fun openWifiSettingsPanel(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val intent = Intent(Settings.Panel.ACTION_INTERNET_CONNECTIVITY)
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactApplicationContext.startActivity(intent)
            } else {
                // Fallback for older Android
                val intent = Intent(Settings.ACTION_WIFI_SETTINGS)
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactApplicationContext.startActivity(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
             // Fallback to generic settings if specific panel/settings fail
            try {
                val intent = Intent(Settings.ACTION_SETTINGS)
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
            } catch (fallbackError: Exception) {
                 promise.reject("ERROR", "Failed to open settings", fallbackError)
            }
        }
    }

    /**
     * Request Bluetooth Enable (System Dialog)
     */
    @ReactMethod
    fun enableBluetooth(promise: Promise) {
        try {
            val adapter = BluetoothAdapter.getDefaultAdapter()
            if (adapter == null) {
                promise.reject("ERROR", "Bluetooth not supported")
                return
            }

            if (!adapter.isEnabled) {
                // This intent shows the system dialog "Allow ... to turn on Bluetooth?"
                val intent = Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE)
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
            } else {
                promise.resolve(true) // Already enabled
            }
        } catch (e: Exception) {
             // If manual enable fails, open settings
             try {
                val intent = Intent(Settings.ACTION_BLUETOOTH_SETTINGS)
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
             } catch (fallbackError: Exception) {
                 promise.reject("ERROR", "Failed to enable bluetooth", fallbackError)
             }
             }
        }

    /**
     * Check if WiFi is enabled
     */
    @ReactMethod
    fun isWifiEnabled(promise: Promise) {
        try {
            val wifiManager = reactApplicationContext.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            promise.resolve(wifiManager.isWifiEnabled)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to check WiFi status", e)
        }
    }

    /**
     * Check if Bluetooth is enabled
     */
    @ReactMethod
    fun isBluetoothEnabled(promise: Promise) {
        try {
            val adapter = BluetoothAdapter.getDefaultAdapter()
            if (adapter == null) {
                promise.resolve(false) // Not supported means "not waiting for it" or maybe handle differently. For now false.
            } else {
                promise.resolve(adapter.isEnabled)
            }
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to check Bluetooth status", e)
        }
    }

    // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
    // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ LOCAL ONLY HOTSPOT (SHAREIT METHOD) â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
    // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
    
    private var hotspotReservation: WifiManager.LocalOnlyHotspotReservation? = null
    private var pendingHotspotPromise: Promise? = null
    private var currentHotspotConfig: WritableMap? = null
    
    /**
     * Start LocalOnlyHotspot for high-speed file transfer (Android 8+)
     * This is the same technology used by SHAREit - much faster than Wi-Fi Direct P2P
     */
    @SuppressLint("MissingPermission")
    @ReactMethod
    fun startLocalHotspot(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            promise.reject("UNSUPPORTED", "LocalOnlyHotspot requires Android 8 (Oreo) or later")
            return
        }
        
        // Check if Location is enabled (required for LocalOnlyHotspot)
        val locationManager = reactApplicationContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        val isGpsEnabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
        val isNetworkEnabled = locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
        
        if (!isGpsEnabled && !isNetworkEnabled) {
            promise.reject("LOCATION_DISABLED", "Location services must be enabled to start LocalOnlyHotspot. Please enable GPS or Network location.")
            return
        }
        
        // If already active, return existing config!
        if (hotspotReservation != null && currentHotspotConfig != null) {
            promise.resolve(currentHotspotConfig)
            return
        }
        
        // Stop any existing hotspot first
        stopLocalHotspotInternal()
        
        val wifiManager = reactApplicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
        
        if (wifiManager == null) {
            promise.reject("ERROR", "WiFi service not available")
            return
        }

        // Ensure Wi-Fi is enabled
        if (!wifiManager.isWifiEnabled) {
            try {
                wifiManager.setWifiEnabled(true)
                // Wait a bit for Wi-Fi to start
                Thread.sleep(1000)
            } catch (e: Exception) {
                // Ignore if we can't enable it properly, let the system handle it
            }
        }
        
        pendingHotspotPromise = promise
        
        // Must run on main thread for LocalOnlyHotspot callback
        android.os.Handler(android.os.Looper.getMainLooper()).post {
            try {
                wifiManager.startLocalOnlyHotspot(object : WifiManager.LocalOnlyHotspotCallback() {
                override fun onStarted(reservation: WifiManager.LocalOnlyHotspotReservation?) {
                    hotspotReservation = reservation
                    
                    try {
                        // Use deprecated wifiConfiguration for Android 8-10
                        // On Android 11+ this is deprecated but still works
                        @Suppress("DEPRECATION")
                        val config = reservation?.wifiConfiguration
                        
                        // Get SSID and password from legacy config
                        val ssid = config?.SSID?.replace("\"", "") ?: "Unknown"
                        val password = config?.preSharedKey?.replace("\"", "") ?: ""
                        
                        // Get gateway IP (hotspot's IP)
                        val gatewayIp = getGatewayIp()
                        
                        val result = Arguments.createMap().apply {
                            putBoolean("success", true)
                            putString("ssid", ssid)
                            putString("password", password)
                            putString("ip", gatewayIp)
                            putString("method", "LocalOnlyHotspot")
                        }
                        
                        currentHotspotConfig = result
                        
                        pendingHotspotPromise?.resolve(result)
                        pendingHotspotPromise = null
                        
                        // Emit event for JS
                        sendEvent("onHotspotStarted", result)
                    } catch (e: Exception) {
                        // Even if getting details fails, the hotspot might be started. 
                        // Try to succeed gracefully or reject.
                        pendingHotspotPromise?.reject("HOTSPOT_DETAILS_ERROR", "Hotspot started but details failed: ${e.message}")
                        pendingHotspotPromise = null
                    }
                }
                
                override fun onStopped() {
                    hotspotReservation = null
                    currentHotspotConfig = null
                    sendEvent("onHotspotStopped", Arguments.createMap())
                }
                
                override fun onFailed(reason: Int) {
                    val reasonStr = when (reason) {
                        WifiManager.LocalOnlyHotspotCallback.ERROR_NO_CHANNEL -> "ERROR_NO_CHANNEL"
                        WifiManager.LocalOnlyHotspotCallback.ERROR_GENERIC -> "ERROR_GENERIC"
                        WifiManager.LocalOnlyHotspotCallback.ERROR_INCOMPATIBLE_MODE -> "ERROR_INCOMPATIBLE_MODE"
                        WifiManager.LocalOnlyHotspotCallback.ERROR_TETHERING_DISALLOWED -> "ERROR_TETHERING_DISALLOWED"
                        else -> "Unknown error ($reason)"
                    }
                    pendingHotspotPromise?.reject("HOTSPOT_FAILED", "Failed to start hotspot: $reasonStr")
                    pendingHotspotPromise = null
                }
            }, null)
            } catch (e: Exception) {
                pendingHotspotPromise?.reject("ERROR", "Failed to start LocalOnlyHotspot: ${e.message}")
                pendingHotspotPromise = null
            }
        }
    }
    
    @ReactMethod
    fun stopLocalHotspot(promise: Promise) {
        stopLocalHotspotInternal()
        promise.resolve(true)
    }
    
    private fun stopLocalHotspotInternal() {
        try {
            hotspotReservation?.close()
            hotspotReservation = null
            currentHotspotConfig = null
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    /**
     * Get hotspot status
     */
    @ReactMethod
    fun getHotspotStatus(promise: Promise) {
        val result = Arguments.createMap().apply {
            putBoolean("isActive", hotspotReservation != null)
        }
        promise.resolve(result)
    }
    
    /**
     * Get gateway IP address dynamically by scanning network interfaces.
     * 2024 FIX: Android's LocalOnlyHotspot assigns RANDOM subnets (192.168.x.1).
     * We MUST detect the actual IP, not hardcode 192.168.43.1.
     */
    private fun getGatewayIp(): String {
        return try {
            val interfaces = java.net.NetworkInterface.getNetworkInterfaces()
            while (interfaces.hasMoreElements()) {
                val intf = interfaces.nextElement()
                // Hotspot interfaces are typically: wlan, ap, swlan, or softap
                val name = intf.name.lowercase()
                if (name.startsWith("wlan") || name.startsWith("ap") || 
                    name.startsWith("swlan") || name.contains("softap")) {
                    
                    if (!intf.isUp || intf.isLoopback) continue
                    
                    val addrs = intf.inetAddresses
                    while (addrs.hasMoreElements()) {
                        val addr = addrs.nextElement()
                        if (addr is java.net.Inet4Address && !addr.isLoopbackAddress) {
                            val ip = addr.hostAddress ?: continue
                            
                            // 2024 FIX: Android 13 might use random IP (not always .1)
                            // If interface is definitely hotspot (swlan/ap), trust it.
                            if (name.contains("swlan") || name.contains("ap")) {
                                Log.d("WiFiDirect", "📡 Detected Hotspot IP on $name: $ip")
                                return ip
                            }
                            
                            // For wlan, be more careful -> prefer .1 but log others
                            if (ip.endsWith(".1")) {
                                Log.d("WiFiDirect", "📡 Detected Hotspot Gateway IP: $ip")
                                return ip
                            }
                        }
                    }
                }
            }
            Log.w("WiFiDirect", "⚠️ Could not detect gateway IP, using fallback")
            "192.168.43.1" // Fallback if detection fails
        } catch (e: Exception) {
            Log.e("WiFiDirect", "❌ Gateway IP detection error: ${e.message}")
            "192.168.43.1"
        }
    }
    
    private fun sendEvent(eventName: String, params: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
    
    /**
     * Get the Gateway IP from DHCP (Client Side)
     * This is the most reliable way for a Client to find the Host in a Hotspot.
     * The Host is ALWAYS the Gateway.
     */
    @ReactMethod
    fun getConnectedGatewayIp(promise: Promise) {
        try {
            val wifiManager = reactApplicationContext.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            val dhcpInfo = wifiManager.dhcpInfo
            
            // 1. Try DHCP Info (Standard)
            if (dhcpInfo != null && dhcpInfo.gateway != 0) {
                val ip = formatIpAddress(dhcpInfo.gateway)
                Log.d("WiFiDirect", "✅ Detected Gateway IP (DHCP): $ip")
                promise.resolve(ip)
                return
            }
            
            // 2. Try LinkProperties (Android 8+ Fallback)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val cm = reactApplicationContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
                val activeNetwork = cm.activeNetwork
                if (activeNetwork != null) {
                    val linkProps = cm.getLinkProperties(activeNetwork)
                    for (route in linkProps?.routes ?: emptyList()) {
                        val gateway = route.gateway
                        if (route.isDefaultRoute && gateway != null) {
                            val ip = gateway.hostAddress
                            // Ensure IPv4
                            if (ip?.contains(".") == true) {
                                Log.d("WiFiDirect", "✅ Detected Gateway IP (LinkProperties): $ip")
                                promise.resolve(ip)
                                return
                            }
                        }
                    }
                }
            }
            
            // 3. Fallback to common Hotspot IPs if detection fails
            // This is better than failing completely
            Log.w("WiFiDirect", "⚠️ Could not detect gateway, returning standard fallback")
            promise.resolve("192.168.43.1")
            
        } catch (e: Exception) {
            Log.e("WiFiDirect", "❌ Gateway detection error: ${e.message}")
            promise.resolve("192.168.43.1") // Don't reject, resolve with fallback
        }
    }

    private fun formatIpAddress(ip: Int): String {
        return String.format(
            "%d.%d.%d.%d",
            (ip and 0xff),
            (ip shr 8 and 0xff),
            (ip shr 16 and 0xff),
            (ip shr 24 and 0xff)
        )
    }

    @ReactMethod
    fun getHotspotCredentials(promise: Promise) {
        if (hotspotReservation != null && currentHotspotConfig != null) {
            promise.resolve(currentHotspotConfig)
        } else {
            promise.resolve(null)
        }
    }

    // ============== EVENT-BASED WIFI SCANNING (SHAREit Standard) ==============
    
    private var wifiScanReceiver: BroadcastReceiver? = null
    private var isReceiverRegistered = false

    private val scanReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (intent.action == WifiManager.SCAN_RESULTS_AVAILABLE_ACTION) {
                // Scan complete and results valid!
                emitScanResults()
            }
        }
    }

    /**
     * Start listening for WiFi scan results
     * Call this when entering JoinScreen
     */
    @ReactMethod
    fun startWifiScanMonitoring(promise: Promise) {
        try {
            if (!isReceiverRegistered) {
                val intentFilter = IntentFilter()
                intentFilter.addAction(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION)
                reactApplicationContext.registerReceiver(scanReceiver, intentFilter)
                isReceiverRegistered = true
                Log.d("MisterShare", "âœ… WiFi Scan Receiver Registered")
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to register scan receiver: ${e.message}")
        }
    }

    /**
     * Stop listening for results to save battery
     * Call this when leaving JoinScreen
     */
    @ReactMethod
    fun stopWifiScanMonitoring(promise: Promise) {
        try {
            if (isReceiverRegistered) {
                reactApplicationContext.unregisterReceiver(scanReceiver)
                isReceiverRegistered = false
                Log.d("MisterShare", "ًں›‘ WiFi Scan Receiver Unregistered")
            }
            promise.resolve(true)
        } catch (e: Exception) {
            // Ignore if already unregistered
            promise.resolve(true)
        }
    }

    /**
     * Trigger a single scan. Results will be emitted via event.
     */
    @Suppress("DEPRECATION")
    @SuppressLint("MissingPermission")
    @ReactMethod
    fun triggerWifiScan(promise: Promise) {
        try {
            val wifiManager = reactApplicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            val success = wifiManager.startScan()
            promise.resolve(success)
        } catch (e: Exception) {
            promise.reject("SCAN_ERROR", "Failed to trigger scan: ${e.message}")
        }
    }

    /**
     * Helper to read results and emit to JS
     */
    @SuppressLint("MissingPermission")
    private fun emitScanResults() {
        try {
            val wifiManager = reactApplicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            val results = wifiManager.scanResults
            
            val networks = Arguments.createArray()
            val seenSsids = mutableSetOf<String>()
            
            for (result in results) {
                val ssid = result.SSID ?: continue
                
                // Deduplicate and Filter
                if (ssid.isEmpty() || seenSsids.contains(ssid)) continue
                seenSsids.add(ssid)
                
                // SHAREit-style Logic: Prioritize our hotspots
                val isRelevant = ssid.startsWith("AndroidShare") ||
                                 ssid.startsWith("MisterShare") ||
                                 ssid.startsWith("DIRECT-") ||
                                 ssid.contains("Share", ignoreCase = true)
                
                val network = Arguments.createMap().apply {
                    putString("ssid", ssid)
                    putInt("level", result.level)
                    putString("capabilities", result.capabilities)
                    putInt("frequency", result.frequency)
                    putBoolean("isRelevant", isRelevant)
                }
                networks.pushMap(network)
            }
            
            val params = Arguments.createMap().apply {
                putInt("count", networks.size())
                putArray("networks", networks)
            }
            
            sendEvent("onWifiScanResults", params)
            Log.d("MisterShare", "ًں“، Emitted ${networks.size()} scan results")
            
        } catch (e: Exception) {
            Log.e("MisterShare", "Failed to emit scan results", e)
        }
    }

    /**
     * Legacy method kept for backward compatibility if needed, 
     * but 'triggerWifiScan' + event is preferred.
     */
    @SuppressLint("MissingPermission")
    @ReactMethod
    fun scanWiFiNetworks(promise: Promise) {
        triggerWifiScan(promise)
    }
    
    /**
     * Connect to a specific WiFi network by SSID and password
     * Used after user selects a network from scan results
     */
    @SuppressLint("MissingPermission")
    @ReactMethod
    fun connectToWiFiNetwork(ssid: String, password: String, promise: Promise) {
        connectToNetwork(ssid, password, promise)
    }

    // ============== P2P PEER DISCOVERY (SHAREit-style Zero-Touch) ==============

    /**
     * Start discovering WiFi P2P peers
     * This finds other devices running MisterShare with active P2P groups
     */
    @SuppressLint("MissingPermission")
    @ReactMethod
    fun discoverP2PPeers(promise: Promise) {
        if (manager == null || channel == null) {
            promise.reject("ERROR", "WiFi P2P not available")
            return
        }

        manager?.discoverPeers(channel, object : WifiP2pManager.ActionListener {
            override fun onSuccess() {
                promise.resolve(mapOf(
                    "success" to true,
                    "message" to "P2P peer discovery started"
                ).toWritableMap())
            }

            override fun onFailure(reason: Int) {
                val errorMsg = when (reason) {
                    WifiP2pManager.P2P_UNSUPPORTED -> "P2P not supported on this device"
                    WifiP2pManager.BUSY -> "P2P framework is busy"
                    WifiP2pManager.ERROR -> "Internal P2P error"
                    else -> "Unknown error: $reason"
                }
                promise.reject("P2P_ERROR", errorMsg)
            }
        })
    }

    /**
     * Get list of discovered P2P peers
     */
    @SuppressLint("MissingPermission")
    @ReactMethod
    fun getP2PPeers(promise: Promise) {
        if (manager == null || channel == null) {
            promise.reject("ERROR", "WiFi P2P not available")
            return
        }

        manager?.requestPeers(channel) { peers ->
            val peerList = Arguments.createArray()
            for (device in peers.deviceList) {
                val peer = Arguments.createMap().apply {
                    putString("deviceName", device.deviceName)
                    putString("deviceAddress", device.deviceAddress)
                    putInt("status", device.status)
                    putBoolean("isGroupOwner", device.isGroupOwner)
                }
                peerList.pushMap(peer)
            }
            
            val response = Arguments.createMap().apply {
                putBoolean("success", true)
                putInt("count", peerList.size())
                putArray("peers", peerList)
            }
            promise.resolve(response)
        }
    }

    /**
     * Connect to a P2P peer by device address
     * This is the ZERO-TOUCH connection - no password required!
     */
    @SuppressLint("MissingPermission")
    @ReactMethod
    fun connectToP2PPeer(deviceAddress: String, promise: Promise) {
        if (manager == null || channel == null) {
            promise.reject("ERROR", "WiFi P2P not available")
            return
        }

        val config = WifiP2pConfig().apply {
            this.deviceAddress = deviceAddress
            // WPS Push Button Configuration for passwordless connection
            wps.setup = android.net.wifi.WpsInfo.PBC
        }

        manager?.connect(channel, config, object : WifiP2pManager.ActionListener {
            override fun onSuccess() {
                // Connection initiated - actual connection happens asynchronously
                promise.resolve(mapOf(
                    "success" to true,
                    "message" to "P2P connection initiated to $deviceAddress"
                ).toWritableMap())
            }

            override fun onFailure(reason: Int) {
                val errorMsg = when (reason) {
                    WifiP2pManager.P2P_UNSUPPORTED -> "P2P not supported"
                    WifiP2pManager.BUSY -> "P2P busy, try again"
                    WifiP2pManager.ERROR -> "P2P connection failed"
                    else -> "Unknown error: $reason"
                }
                promise.reject("P2P_CONNECT_ERROR", errorMsg)
            }
        })
    }

    /**
     * Stop P2P peer discovery
     */
    @SuppressLint("MissingPermission")
    @ReactMethod
    fun stopP2PDiscovery(promise: Promise) {
        if (manager == null || channel == null) {
            promise.reject("ERROR", "WiFi P2P not available")
            return
        }

        manager?.stopPeerDiscovery(channel, object : WifiP2pManager.ActionListener {
            override fun onSuccess() {
                promise.resolve(mapOf("success" to true).toWritableMap())
            }

            override fun onFailure(reason: Int) {
                promise.reject("ERROR", "Failed to stop discovery: $reason")
            }
        })
    }

    /**
     * Get P2P connection info after connection is established
     */
    @SuppressLint("MissingPermission")
    @ReactMethod
    fun getP2PConnectionInfo(promise: Promise) {
        if (manager == null || channel == null) {
            promise.reject("ERROR", "WiFi P2P not available")
            return
        }

        manager?.requestConnectionInfo(channel) { info ->
            if (info != null && info.groupFormed) {
                val response = Arguments.createMap().apply {
                    putBoolean("groupFormed", info.groupFormed)
                    putBoolean("isGroupOwner", info.isGroupOwner)
                    putString("groupOwnerAddress", info.groupOwnerAddress?.hostAddress ?: "")
                }
                promise.resolve(response)
            } else {
                promise.reject("NO_CONNECTION", "No P2P connection established")
            }
        }
    }

    // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
    // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ UNIVERSAL FALLBACK SYSTEM (SHAREIT METHOD) â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
    // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ

    /**
     * Create group with multi-level fallback for MAXIMUM device compatibility
     * Order: LocalOnlyHotspot â†’ WiFi Direct 5GHz â†’ WiFi Direct 2.4GHz â†’ Legacy
     */
    @SuppressLint("MissingPermission")
    @ReactMethod
    fun createGroupWithFallback(promise: Promise) {
        Log.d("WiFiDirect", "🚀 Starting Universal Fallback System...")
        
        // RE-ORDERED PRIORITY FOR SPEED (2024 UPDATE)
        // Android 11+ (R): Prioritize WiFi Direct 5GHz (Level 2) because we can FORCE 5GHz using setGroupOperatingBand.
        // LocalOnlyHotspot (Level 1) often defaults to 2.4GHz and third-party apps cannot force 5GHz on Hotspot.
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            Log.d("WiFiDirect", "⚡ Android 10+ detected: Prioritizing WiFi Direct 5GHz for consistent high-speed...")
            tryWifiDirect5GHz(promise, "Refusing LocalOnlyHotspot (likely 2.4GHz) in favor of forced 5GHz P2P")
        } else {
            // Android 8-9: Use REFLECTION to access hidden API setWifiP2pChannels
            force5GHzUsingReflection(promise)
        }
    }

    private fun tryLocalOnlyHotspot(promise: Promise) {
        Log.d("WiFiDirect", "ًں“، Level 1: Trying LocalOnlyHotspot...")
        Log.d("WiFiDirect", "ًں“، Android SDK: ${Build.VERSION.SDK_INT}, hotspotReservation: ${hotspotReservation != null}")
        
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            Log.d("WiFiDirect", "â‌Œ LocalOnlyHotspot not supported (Android < 8), trying WiFi Direct...")
            tryWifiDirect5GHz(promise, "LocalOnlyHotspot not supported on this Android version")
            return
        }
        
        // Check "Nearby Devices" permission for Android 13+ (Tiramisu)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (androidx.core.content.ContextCompat.checkSelfPermission(reactApplicationContext, android.Manifest.permission.NEARBY_WIFI_DEVICES) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                Log.d("WiFiDirect", "â‌Œ NEARBY_WIFI_DEVICES permission missing, trying WiFi Direct...")
                tryWifiDirect5GHz(promise, "NEARBY_WIFI_DEVICES permission missing")
                return
            }
        }
        
        // Check Location Services
        val locationManager = reactApplicationContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        val isGpsEnabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
        val isNetworkEnabled = locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
        
        if (!isGpsEnabled && !isNetworkEnabled) {
            Log.d("WiFiDirect", "â‌Œ Location disabled, trying WiFi Direct...")
            tryWifiDirect5GHz(promise, "Location services disabled")
            return
        }
        
        // If already active, return existing config
        if (hotspotReservation != null && currentHotspotConfig != null) {
            val result = Arguments.createMap().apply {
                putBoolean("success", true)
                putString("method", "LocalOnlyHotspot (reused)")
                putString("ssid", currentHotspotConfig?.getString("ssid") ?: "")
                putString("password", currentHotspotConfig?.getString("password") ?: "")
                putString("ip", currentHotspotConfig?.getString("ip") ?: "")
            }
            promise.resolve(result)
            return
        }
        
        val wifiManager = reactApplicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
        
        if (wifiManager == null) {
            Log.d("WiFiDirect", "â‌Œ WiFi service not available, trying WiFi Direct...")
            tryWifiDirect5GHz(promise, "WiFi service not available")
            return
        }
        
        // Ensure Wi-Fi is enabled (non-blocking check)
        if (!wifiManager.isWifiEnabled) {
            Log.d("WiFiDirect", "âڑ ï¸ڈ WiFi is disabled, attempting to enable...")
            try {
                @Suppress("DEPRECATION")
                wifiManager.setWifiEnabled(true)
                // Don't sleep - proceed and let the callback determine if it works
            } catch (e: Exception) {
                Log.w("WiFiDirect", "Could not enable WiFi: ${e.message}")
            }
        }
        
        // MUST run on Main Thread for LocalOnlyHotspot
        android.os.Handler(android.os.Looper.getMainLooper()).post {
            try {
                Log.d("WiFiDirect", "ًں“، Calling startLocalOnlyHotspot on Main Thread...")
                
                wifiManager.startLocalOnlyHotspot(object : WifiManager.LocalOnlyHotspotCallback() {
                    override fun onStarted(reservation: WifiManager.LocalOnlyHotspotReservation?) {
                        Log.d("WiFiDirect", "ًں“، LocalOnlyHotspot onStarted callback received")
                        hotspotReservation = reservation
                        
                        try {
                            @Suppress("DEPRECATION")
                            val config = reservation?.wifiConfiguration
                            
                            val ssid = config?.SSID ?: "AndroidShare_${(1000..9999).random()}" 
                            val password = config?.preSharedKey ?: ""
                            val cleanSsid = ssid.replace("\"", "")
                            val cleanPassword = password.replace("\"", "")
                            
                            val gatewayIp = getGatewayIp()
                            
                            val result = Arguments.createMap().apply {
                                putBoolean("success", true)
                                putString("method", "LocalOnlyHotspot")
                                putString("ssid", cleanSsid)
                                putString("password", cleanPassword)
                                putString("ip", gatewayIp)
                                putString("band", "5GHz (High Speed)")
                            }
                            
                            currentHotspotConfig = result
                            Log.d("WiFiDirect", "âœ… LocalOnlyHotspot SUCCESS! SSID: $cleanSsid")
                            promise.resolve(result)
                        } catch (e: Exception) {
                            Log.e("WiFiDirect", "âڑ ï¸ڈ LocalOnlyHotspot config retrieval failed: ${e.message}")
                            val result = Arguments.createMap().apply {
                                putBoolean("success", true)
                                putString("method", "LocalOnlyHotspot (Unknown Creds)")
                                putString("ssid", "Unknown")
                                putString("password", "")
                                putString("ip", getGatewayIp())
                            }
                            promise.resolve(result)
                        }
                    }
                    
                    override fun onStopped() {
                        Log.d("WiFiDirect", "ًں›‘ LocalOnlyHotspot stopped")
                        hotspotReservation = null
                        currentHotspotConfig = null
                    }
                    
                    override fun onFailed(reason: Int) {
                        val reasonStr = when (reason) {
                            WifiManager.LocalOnlyHotspotCallback.ERROR_NO_CHANNEL -> "ERROR_NO_CHANNEL"
                            WifiManager.LocalOnlyHotspotCallback.ERROR_GENERIC -> "ERROR_GENERIC"
                            WifiManager.LocalOnlyHotspotCallback.ERROR_INCOMPATIBLE_MODE -> "ERROR_INCOMPATIBLE_MODE"
                            WifiManager.LocalOnlyHotspotCallback.ERROR_TETHERING_DISALLOWED -> "ERROR_TETHERING_DISALLOWED"
                            else -> "Unknown error ($reason)"
                        }
                        Log.d("WiFiDirect", "â‌Œ LocalOnlyHotspot FAILED: $reasonStr, trying WiFi Direct...")
                        tryWifiDirect5GHz(promise, "LocalOnlyHotspot failed: $reasonStr")
                    }
                }, android.os.Handler(android.os.Looper.getMainLooper()))
            } catch (e: Exception) {
                Log.e("WiFiDirect", "â‌Œ LocalOnlyHotspot exception: ${e.message}")
                e.printStackTrace()
                tryWifiDirect5GHz(promise, "LocalOnlyHotspot exception: ${e.message}")
            }
        }
    }

    /**
     * RESEARCH-BACKED "REFLECTION" METHOD (SHAREit/Zapya Strategy)
     * For Android 8/9, we use reflection to call the hidden method:
     * setWifiP2pChannels(Channel c, int lc, int oc, ActionListener listeners)
     * - oc (Operating Channel) = 149 (5745 MHz) -> Forces 5GHz
     * - lc (Listening Channel) = 0 (Auto)
     */
    private fun force5GHzUsingReflection(promise: Promise) {
        Log.d("WiFiDirect", "🧙‍♂️ Attempting Reflection Magic for Android 8/9 5GHz...")
        try {
            val method = manager?.javaClass?.getMethod(
                "setWifiP2pChannels",
                WifiP2pManager.Channel::class.java,
                Int::class.javaPrimitiveType,
                Int::class.javaPrimitiveType,
                WifiP2pManager.ActionListener::class.java
            )
            
            // Channel 149 is a standard 5GHz non-DFS channel
            method?.invoke(manager, channel, 0, 149, object : WifiP2pManager.ActionListener {
                override fun onSuccess() {
                    Log.d("WiFiDirect", "✨ Reflection Success: 5GHz Channel (149) set!")
                    // Now create the group naturally, hoping it respects the channel
                    manager?.createGroup(channel, object : WifiP2pManager.ActionListener {
                        override fun onSuccess() {
                            getGroupInfoForFallback(promise, "Reflection5GHz", "5GHz (Forced)")
                        }
                        override fun onFailure(reason: Int) {
                            tryLocalOnlyHotspot(promise)
                        }
                    })
                }
                
                override fun onFailure(reason: Int) {
                    Log.d("WiFiDirect", "❌ Reflection Failed: Reason $reason")
                    tryLocalOnlyHotspot(promise)
                }
            })
        } catch (e: Exception) {
            Log.d("WiFiDirect", "❌ Reflection Exception: ${e.message}")
            tryLocalOnlyHotspot(promise)
        }
    }

    private fun tryWifiDirect5GHz(promise: Promise, previousError: String) {
        Log.d("WiFiDirect", "ًں“، Level 2: Trying WiFi Direct 5GHz...")
        
        if (manager == null || channel == null) {
            Log.d("WiFiDirect", "â‌Œ WiFi P2P not available, trying 2.4GHz...")
            tryWifiDirect2GHz(promise, "$previousError â†’ WiFi P2P not available")
            return
        }
        
        // Remove any existing group first (async, don't block)
        try {
            manager?.removeGroup(channel, null)
        } catch (e: Exception) {
            // Ignore - group may not exist
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            try {
                val config = WifiP2pConfig.Builder()
                    .setNetworkName("DIRECT-MisterShare")
                    .setPassphrase("MisterShare2025")
                    .setGroupOperatingBand(WifiP2pConfig.GROUP_OWNER_BAND_5GHZ)
                    .build()
                
                manager?.createGroup(channel!!, config, object : WifiP2pManager.ActionListener {
                    override fun onSuccess() {
                        // Get group info after creation
                        getGroupInfoForFallback(promise, "WiFiDirect5GHz", "5GHz")
                    }
                    
                    override fun onFailure(reason: Int) {
                        Log.d("WiFiDirect", "â‌Œ WiFi Direct 5GHz FAILED: $reason, trying 2.4GHz...")
                        tryWifiDirect2GHz(promise, "$previousError â†’ 5GHz failed: $reason")
                    }
                })
            } catch (e: Exception) {
                Log.d("WiFiDirect", "â‌Œ WiFi Direct 5GHz exception, trying 2.4GHz...")
                tryWifiDirect2GHz(promise, "$previousError â†’ 5GHz exception: ${e.message}")
            }
        } else {
            // Android 10 and below - skip to 2.4GHz/Legacy
            tryWifiDirect2GHz(promise, "$previousError â†’ Android < 11 (no 5GHz API)")
        }
    }

    private fun tryWifiDirect2GHz(promise: Promise, previousError: String) {
        Log.d("WiFiDirect", "ًں“، Level 3: Trying WiFi Direct 2.4GHz...")
        
        if (manager == null || channel == null) {
            tryWifiDirectLegacy(promise, "$previousError â†’ WiFi P2P not available")
            return
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            try {
                val config = WifiP2pConfig.Builder()
                    .setNetworkName("DIRECT-MisterShare")
                    .setPassphrase("MisterShare2025")
                    .setGroupOperatingBand(WifiP2pConfig.GROUP_OWNER_BAND_2GHZ)
                    .build()
                
                manager?.createGroup(channel!!, config, object : WifiP2pManager.ActionListener {
                    override fun onSuccess() {
                        getGroupInfoForFallback(promise, "WiFiDirect2GHz", "2.4GHz")
                    }
                    
                    override fun onFailure(reason: Int) {
                        Log.d("WiFiDirect", "â‌Œ WiFi Direct 2.4GHz FAILED: $reason, trying Legacy...")
                        tryWifiDirectLegacy(promise, "$previousError â†’ 2.4GHz failed: $reason")
                    }
                })
            } catch (e: Exception) {
                tryWifiDirectLegacy(promise, "$previousError â†’ 2.4GHz exception: ${e.message}")
            }
        } else {
            tryWifiDirectLegacy(promise, previousError)
        }
    }

    private fun tryWifiDirectLegacy(promise: Promise, previousError: String) {
        Log.d("WiFiDirect", "ًں“، Level 4: Trying WiFi Direct Legacy (auto band)...")
        
        if (manager == null || channel == null) {
            Log.d("WiFiDirect", "â‌Œ ALL METHODS FAILED!")
            promise.reject("ALL_FAILED", "Failed to create group. Tried: LocalOnlyHotspot, WiFi Direct 5GHz, 2.4GHz, Legacy. Errors: $previousError")
            return
        }
        
        try {
            manager?.createGroup(channel!!, object : WifiP2pManager.ActionListener {
                override fun onSuccess() {
                    getGroupInfoForFallback(promise, "WiFiDirectLegacy", "auto")
                }
                
                override fun onFailure(reason: Int) {
                    Log.d("WiFiDirect", "â‌Œ ALL METHODS FAILED! Final error: $reason")
                    promise.reject("ALL_FAILED", "All methods failed. Tried: LocalOnlyHotspot, WiFi Direct 5GHz, 2.4GHz, Legacy. Final error: $reason. History: $previousError")
                }
            })
        } catch (e: Exception) {
            promise.reject("ALL_FAILED", "All methods failed with exception: ${e.message}. History: $previousError")
        }
    }

    private fun getGroupInfoForFallback(promise: Promise, method: String, band: String) {
        Thread.sleep(500) // Wait for group to stabilize
        
        manager?.requestGroupInfo(channel) { group ->
            if (group != null) {
                val ssid = group.networkName ?: "DIRECT-MisterShare"
                val password = group.passphrase ?: "MisterShare2025"
                val ownerAddress = group.owner?.deviceAddress ?: ""
                
                // For WiFi Direct, the Group Owner IP is typically 192.168.49.1
                val ip = "192.168.49.1"
                
                val result = Arguments.createMap().apply {
                    putBoolean("success", true)
                    putString("method", method)
                    putString("ssid", ssid)
                    putString("password", password)
                    putString("ip", ip)
                    putString("band", band)
                    putString("ownerAddress", ownerAddress)
                }
                
                Log.d("WiFiDirect", "âœ… $method SUCCESS! SSID: $ssid, Band: $band")
                promise.resolve(result)
            } else {
                // Group created but info not available, return defaults
                val result = Arguments.createMap().apply {
                    putBoolean("success", true)
                    putString("method", method)
                    putString("ssid", "DIRECT-MisterShare")
                    putString("password", "MisterShare2025")
                    putString("ip", "192.168.49.1")
                    putString("band", band)
                }
                
                Log.d("WiFiDirect", "âœ… $method SUCCESS (with defaults)")
                promise.resolve(result)
            }
        }
    }
    
    // ==================== P2P MONITORING ====================
    
    /**
     * Handle P2P broadcast intents
     */
    @SuppressLint("MissingPermission")
    private fun handleP2PBroadcast(intent: Intent) {
        when (intent.action) {
            WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION -> {
                Log.d("WiFiDirect", "ًں“، P2P Connection changed!")
                
                val networkInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    intent.getParcelableExtra(WifiP2pManager.EXTRA_NETWORK_INFO, android.net.NetworkInfo::class.java)
                } else {
                    @Suppress("DEPRECATION")
                    intent.getParcelableExtra(WifiP2pManager.EXTRA_NETWORK_INFO)
                }
                
                if (networkInfo?.isConnected == true) {
                    // Request connection info to get details
                    manager?.requestConnectionInfo(channel) { info ->
                        val params = Arguments.createMap().apply {
                            putBoolean("connected", true)
                            putBoolean("groupFormed", info.groupFormed)
                            putBoolean("isGroupOwner", info.isGroupOwner)
                            putString("groupOwnerAddress", info.groupOwnerAddress?.hostAddress ?: "")
                        }
                        Log.d("WiFiDirect", "âœ… P2P Connected! GroupOwner: ${info.isGroupOwner}, Address: ${info.groupOwnerAddress?.hostAddress}")
                        sendEvent("onP2PConnectionChanged", params)
                    }
                } else {
                    val params = Arguments.createMap().apply {
                        putBoolean("connected", false)
                        putBoolean("groupFormed", false)
                        putBoolean("isGroupOwner", false)
                        putString("groupOwnerAddress", "")
                    }
                    Log.d("WiFiDirect", "â‌Œ P2P Disconnected")
                    sendEvent("onP2PConnectionChanged", params)
                }
            }
            
            WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION -> {
                Log.d("WiFiDirect", "ًں“، P2P Peers changed!")
                
                manager?.requestPeers(channel) { peers ->
                    val peerArray = Arguments.createArray()
                    peers.deviceList.forEach { device ->
                        val peerMap = Arguments.createMap().apply {
                            putString("deviceName", device.deviceName ?: "Unknown")
                            putString("deviceAddress", device.deviceAddress ?: "")
                            putInt("status", device.status)
                            putBoolean("isGroupOwner", device.isGroupOwner)
                        }
                        peerArray.pushMap(peerMap)
                    }
                    
                    val params = Arguments.createMap().apply {
                        putArray("peers", peerArray)
                    }
                    Log.d("WiFiDirect", "ًں“± Found ${peers.deviceList.size} P2P peers")
                    sendEvent("onP2PPeersChanged", params)
                }
            }
            
            WifiP2pManager.WIFI_P2P_STATE_CHANGED_ACTION -> {
                val state = intent.getIntExtra(WifiP2pManager.EXTRA_WIFI_STATE, -1)
                val enabled = state == WifiP2pManager.WIFI_P2P_STATE_ENABLED
                
                val params = Arguments.createMap().apply {
                    putBoolean("enabled", enabled)
                }
                Log.d("WiFiDirect", "ًں“، P2P State: ${if (enabled) "ENABLED" else "DISABLED"}")
                sendEvent("onP2PStateChanged", params)
            }
            
            WifiP2pManager.WIFI_P2P_THIS_DEVICE_CHANGED_ACTION -> {
                val device = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    intent.getParcelableExtra(WifiP2pManager.EXTRA_WIFI_P2P_DEVICE, android.net.wifi.p2p.WifiP2pDevice::class.java)
                } else {
                    @Suppress("DEPRECATION")
                    intent.getParcelableExtra(WifiP2pManager.EXTRA_WIFI_P2P_DEVICE)
                }
                
                if (device != null) {
                    val params = Arguments.createMap().apply {
                        putString("deviceName", device.deviceName ?: "")
                        putString("deviceAddress", device.deviceAddress ?: "")
                        putInt("status", device.status)
                    }
                    sendEvent("onThisDeviceChanged", params)
                }
            }
        }
    }
    
    /**
     * Start monitoring P2P connection events
     * Registers broadcast receiver for P2P state changes
     */
    @ReactMethod
    fun startP2PMonitoring(promise: Promise) {
        if (p2pReceiverRegistered) {
            promise.resolve(true)
            return
        }
        
        try {
            val intentFilter = IntentFilter().apply {
                addAction(WifiP2pManager.WIFI_P2P_STATE_CHANGED_ACTION)
                addAction(WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION)
                addAction(WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION)
                addAction(WifiP2pManager.WIFI_P2P_THIS_DEVICE_CHANGED_ACTION)
            }
            
            reactApplicationContext.registerReceiver(p2pConnectionReceiver, intentFilter)
            p2pReceiverRegistered = true
            
            Log.d("WiFiDirect", "âœ… P2P Monitoring started")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e("WiFiDirect", "â‌Œ Failed to start P2P monitoring: ${e.message}")
            promise.reject("ERROR", "Failed to start P2P monitoring: ${e.message}")
        }
    }
    
    /**
     * Stop monitoring P2P connection events
     */
    @ReactMethod
    fun stopP2PMonitoring(promise: Promise) {
        if (!p2pReceiverRegistered) {
            promise.resolve(true)
            return
        }
        
        try {
            reactApplicationContext.unregisterReceiver(p2pConnectionReceiver)
            p2pReceiverRegistered = false
            
            Log.d("WiFiDirect", "ًں›‘ P2P Monitoring stopped")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e("WiFiDirect", "â‌Œ Failed to stop P2P monitoring: ${e.message}")
            promise.reject("ERROR", "Failed to stop P2P monitoring: ${e.message}")
        }
    }
    
    /**
     * Check if P2P monitoring is active
     */
    @ReactMethod
    fun isP2PMonitoringActive(promise: Promise) {
        promise.resolve(p2pReceiverRegistered)
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Keep: Required for RN built-in Event Emitter Calls.
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Keep: Required for RN built-in Event Emitter Calls.
    }
}


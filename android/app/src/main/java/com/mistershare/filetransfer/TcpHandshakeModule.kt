package com.mistershare.filetransfer

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.*
import java.io.*
import java.net.*

/**
 * TCP Handshake Module - SHAREit-style connection handshake
 * 
 * This module handles:
 * 1. Host: Start a TCP server to receive connection requests
 * 2. Client: Connect to host and perform handshake
 * 3. Approval mechanism for first-time devices
 * 4. Trusted device storage for auto-approval
 */
class TcpHandshakeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val TAG = "TcpHandshake"
        const val HANDSHAKE_PORT = 12321
        const val PREFS_NAME = "mistershare_trusted"
        const val KEY_TRUSTED_DEVICES = "trusted_devices"
    }

    private var handshakeServer: ServerSocket? = null
    private var isServerRunning = false
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val pendingApprovals = mutableMapOf<String, Socket>()
    private var hostDeviceName = "MisterShare"
    private var isHandshaking = false
    private var prefs: SharedPreferences? = null

    init {
        prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    override fun getName(): String = "TcpHandshake"

    /**
     * Send event to JavaScript layer
     */
    private fun sendEvent(eventName: String, params: WritableMap) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    /**
     * Get list of trusted device IDs
     */
    private fun getTrustedDevices(): Set<String> {
        return prefs?.getStringSet(KEY_TRUSTED_DEVICES, emptySet()) ?: emptySet()
    }

    /**
     * Add a device to trusted list
     */
    private fun addTrustedDevice(deviceId: String) {
        val trusted = getTrustedDevices().toMutableSet()
        trusted.add(deviceId)
        prefs?.edit()?.putStringSet(KEY_TRUSTED_DEVICES, trusted)?.apply()
        Log.d(TAG, "âœ… Device added to trusted: $deviceId")
    }

    /**
     * Check if device is trusted
     */
    private fun isDeviceTrusted(deviceId: String): Boolean {
        return getTrustedDevices().contains(deviceId)
    }

    /**
     * Get the hotspot interface IP address
     * Scans network interfaces to find the gateway IP (ending in .1)
     * This ensures TCP server binds to the correct interface on all Android versions
     */
    private fun getHotspotInterfaceIp(): String {
        try {
            val interfaces = java.net.NetworkInterface.getNetworkInterfaces()
            while (interfaces.hasMoreElements()) {
                val iface = interfaces.nextElement()
                val name = iface.name.lowercase()
                
                // Check hotspot-related interfaces
                if (name.contains("wlan") || name.contains("ap") || 
                    name.contains("swlan") || name.contains("softap") ||
                    name.contains("p2p")) {
                    
                    val addresses = iface.inetAddresses
                    while (addresses.hasMoreElements()) {
                        val addr = addresses.nextElement()
                        if (!addr.isLoopbackAddress && addr is java.net.Inet4Address) {
                            val ip = addr.hostAddress ?: continue
                            
                            // 2024 FIX: Android 13 might use random IP (not always .1)
                            // If interface is definitely hotspot (swlan/ap), trust it.
                            if (name.contains("swlan") || name.contains("ap")) {
                                Log.d(TAG, "Found Hotspot IP on $name: $ip")
                                return ip
                            }
                            
                            if (ip.endsWith(".1")) {
                                Log.d(TAG, "Found hotspot Gateway IP on $name: $ip")
                                return ip
                            }
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error detecting hotspot IP: ${e.message}")
        }
        
        // Fallback - bind to all interfaces
        Log.w(TAG, "Using fallback 0.0.0.0 for server binding")
        return "0.0.0.0"
    }

    /**
     * HOST: Start the handshake server to receive connection requests
     */
    @ReactMethod
    fun startHandshakeServer(deviceName: String, promise: Promise) {
        if (isServerRunning) {
            promise.resolve(true)
            return
        }

        hostDeviceName = deviceName

        scope.launch {
            try {
                // Create ServerSocket - network binding is handled by Android for LocalOnlyHotspot
                // The host device's network is already correctly configured when hotspot is active
                val boundNetwork = NetworkHolder.boundNetwork
                if (boundNetwork != null) {
                    Log.d(TAG, "ًں“¶ Bound network available: $boundNetwork")
                }
                
                handshakeServer = ServerSocket().apply {
                    reuseAddress = true
                    // 2024 FIX: Bind to 0.0.0.0 (Wildcard) to listen on ALL interfaces.
                    // Binding to a specific IP (getHotspotInterfaceIp) can fail on Android 13+
                    // due to security restrictions or incorrect interface detection.
                    bind(InetSocketAddress(HANDSHAKE_PORT))
                    Log.d(TAG, "📡 Handshake server started on PORT $HANDSHAKE_PORT (Listening on ALL interfaces)")
                }
                isServerRunning = true
                Log.d(TAG, "ًں“، Handshake server started on port $HANDSHAKE_PORT")
                
                withContext(Dispatchers.Main) {
                    promise.resolve(true)
                }

                // Accept connections loop
                while (isServerRunning && !handshakeServer!!.isClosed) {
                    try {
                        val clientSocket = handshakeServer?.accept() ?: break
                        Log.d(TAG, "ًں”Œ Client connected: ${clientSocket.inetAddress.hostAddress}")
                        handleHandshakeClient(clientSocket)
                    } catch (e: SocketException) {
                        if (isServerRunning) {
                            Log.e(TAG, "Socket error: ${e.message}")
                        }
                        break
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "â‌Œ Failed to start handshake server: ${e.message}")
                withContext(Dispatchers.Main) {
                    promise.reject("ERROR", "Failed to start handshake server: ${e.message}")
                }
            }
        }
    }

    /**
     * Handle incoming handshake request from client
     */
    private fun handleHandshakeClient(socket: Socket) {
        scope.launch {
            try {
                socket.soTimeout = 30000 // 30 second timeout
                val reader = BufferedReader(InputStreamReader(socket.inputStream))
                val writer = PrintWriter(socket.outputStream, true)

                // Read handshake request: "HELLO|ClientName|ClientID"
                val request = reader.readLine()
                Log.d(TAG, "ًں“¨ Received: $request")

                if (request?.startsWith("HELLO|") == true) {
                    val parts = request.split("|")
                    val clientName = parts.getOrNull(1) ?: "Unknown"
                    val clientId = parts.getOrNull(2) ?: java.util.UUID.randomUUID().toString()
                    val clientIp = socket.inetAddress.hostAddress ?: "0.0.0.0"

                    Log.d(TAG, "ًں¤‌ Handshake request from: $clientName ($clientId) @ $clientIp")

                    if (isDeviceTrusted(clientId)) {
                        // AUTO-APPROVE: Device is trusted
                        Log.d(TAG, "âœ… Auto-approving trusted device: $clientName")
                        writer.println("WELCOME|$hostDeviceName|12345")

                        // Emit peer connected event
                        val params = Arguments.createMap().apply {
                            putString("ip", clientIp)
                            putString("name", clientName)
                            putString("id", clientId)
                            putBoolean("autoApproved", true)
                        }
                        withContext(Dispatchers.Main) {
                            sendEvent("onPeerConnected", params)
                        }

                        socket.close()
                    } else {
                        // FIRST TIME: Request approval from host user
                        Log.d(TAG, "âڈ³ Requesting approval for new device: $clientName")
                        pendingApprovals[clientId] = socket

                        val params = Arguments.createMap().apply {
                            putString("clientName", clientName)
                            putString("clientId", clientId)
                            putString("clientIp", clientIp)
                        }
                        withContext(Dispatchers.Main) {
                            sendEvent("onApprovalRequest", params)
                        }

                        // Don't close socket yet - wait for approval response
                    }
                } else {
                    Log.w(TAG, "âڑ ï¸ڈ Invalid handshake request: $request")
                    writer.println("ERROR|Invalid request")
                    socket.close()
                }
            } catch (e: SocketTimeoutException) {
                Log.w(TAG, "âڈ° Handshake timeout")
                socket.close()
            } catch (e: Exception) {
                Log.e(TAG, "â‌Œ Error handling handshake: ${e.message}")
                try { socket.close() } catch (ignored: Exception) {}
            }
        }
    }

    /**
     * HOST: Approve a pending connection request
     */
    @ReactMethod
    fun approveConnection(clientId: String, addToTrusted: Boolean, promise: Promise) {
        scope.launch {
            try {
                val socket = pendingApprovals.remove(clientId)
                if (socket == null || socket.isClosed) {
                    withContext(Dispatchers.Main) {
                        promise.reject("ERROR", "Connection no longer pending or already closed")
                    }
                    return@launch
                }

                val writer = PrintWriter(socket.outputStream, true)
                val clientIp = socket.inetAddress.hostAddress ?: "0.0.0.0"

                // Send approval response
                writer.println("WELCOME|$hostDeviceName|12345")

                // Add to trusted if requested
                if (addToTrusted) {
                    addTrustedDevice(clientId)
                }

                // Emit peer connected event
                val params = Arguments.createMap().apply {
                    putString("ip", clientIp)
                    putString("name", clientId) // We don't have name stored, use ID
                    putString("id", clientId)
                    putBoolean("autoApproved", false)
                }
                withContext(Dispatchers.Main) {
                    sendEvent("onPeerConnected", params)
                    promise.resolve(true)
                }

                // Close the handshake socket
                socket.close()
                Log.d(TAG, "âœ… Connection approved for: $clientId")

            } catch (e: Exception) {
                Log.e(TAG, "â‌Œ Error approving connection: ${e.message}")
                withContext(Dispatchers.Main) {
                    promise.reject("ERROR", "Failed to approve connection: ${e.message}")
                }
            }
        }
    }

    /**
     * HOST: Reject a pending connection request
     */
    @ReactMethod
    fun rejectConnection(clientId: String, promise: Promise) {
        scope.launch {
            try {
                val socket = pendingApprovals.remove(clientId)
                if (socket != null && !socket.isClosed) {
                    val writer = PrintWriter(socket.outputStream, true)
                    writer.println("REJECTED|Connection declined")
                    socket.close()
                    Log.d(TAG, "â‌Œ Connection rejected for: $clientId")
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(true)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("ERROR", "Failed to reject connection: ${e.message}")
                }
            }
        }
    }

    /**
     * CLIENT: Perform handshake with host
     */
    @ReactMethod
    fun performHandshake(hostIp: String, myDeviceName: String, myDeviceId: String, promise: Promise) {
        // REMOVED: isHandshaking check to allow retries if previous attempt is stuck
        // if (isHandshaking) { ... } 
        // We trust the JS layer to manage timeout/retries.

        isHandshaking = true

        scope.launch(Dispatchers.IO) {
            var socket: Socket? = null
            try {
                Log.d(TAG, "🔗 Performing handshake with: $hostIp")

                // STRATEGY 1: Use Bound Network
                val boundNetwork = NetworkHolder.boundNetwork
                if (boundNetwork != null) {
                    try {
                        socket = boundNetwork.socketFactory.createSocket()
                        Log.d(TAG, "✅ Using bound network socket")
                    } catch (e: Exception) {
                        Log.w(TAG, "⚠️ Bound network socket failed: ${e.message}")
                    }
                }

                // STRATEGY 2: Fallback to Interface Binding
                if (socket == null) {
                    socket = Socket()
                    try {
                        val localIp = getHotspotInterfaceIp()
                        // 2026 FIX: Only bind if we are REALLY sure, otherwise let OS decide.
                        // Binding often fails on Android 12+ due to network restrictions.
                        if (localIp != "0.0.0.0" && !localIp.startsWith("127")) {
                            // socket.bind(InetSocketAddress(localIp, 0)) 
                            // DISABLED BINDING: It causes more harm than good on modern Android.
                            // The OS routing table usually knows best where to send packets 
                            // for 192.168.49.1 (P2P) or 192.168.x.x (Hotspot).
                            Log.d(TAG, "ℹ️ Skipping explicit bind to $localIp (Letting OS route)")
                        }
                    } catch (e: Exception) {
                       Log.w(TAG, "⚠️ Bind logic error: ${e.message}")
                    }
                }

                withContext(Dispatchers.IO) {
                    // Increased connection timeout for older devices
                    socket?.connect(InetSocketAddress(hostIp, HANDSHAKE_PORT), 7000)
                }

                socket?.soTimeout = 10000 // 10s read timeout
                val writer = PrintWriter(socket!!.outputStream, true)
                val reader = BufferedReader(InputStreamReader(socket.inputStream))

                writer.println("HELLO|$myDeviceName|$myDeviceId")

                val response = reader.readLine()
                Log.d(TAG, "📩 Handshake response: $response")

                if (response?.startsWith("WELCOME|") == true) {
                    val parts = response.split("|")
                    val hostName = parts.getOrNull(1) ?: "Unknown"
                    
                    val result = Arguments.createMap().apply {
                        putBoolean("success", true)
                        putString("hostName", hostName)
                        putString("hostIp", hostIp)
                        putInt("transferPort", 12345)
                    }
                    withContext(Dispatchers.Main) {
                        promise.resolve(result)
                    }
                } else {
                    withContext(Dispatchers.Main) {
                        promise.reject("FAILED", "Handshake rejected/invalid: $response")
                    }
                }

            } catch (e: Exception) {
                Log.e(TAG, "❌ Handshake failed: ${e.message}")
                withContext(Dispatchers.Main) {
                    promise.reject("ERROR", "Handshake failed: ${e.message}")
                }
            } finally {
                try { socket?.close() } catch (ignored: Exception) {}
                // isHandshaking = false
            }
        }
    }

    /**
     * Stop the handshake server
     */
    @ReactMethod
    fun stopHandshakeServer(promise: Promise) {
        scope.launch {
            try {
                isServerRunning = false
                
                // Close all pending connections
                pendingApprovals.values.forEach { socket ->
                    try { socket.close() } catch (ignored: Exception) {}
                }
                pendingApprovals.clear()

                // Close server socket
                handshakeServer?.close()
                handshakeServer = null

                Log.d(TAG, "🛑 Handshake server stopped")
                withContext(Dispatchers.Main) {
                    promise.resolve(true)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("ERROR", "Failed to stop handshake server: ${e.message}")
                }
            }
        }
    }

    /**
     * Get list of trusted devices
     */
    @ReactMethod
    fun getTrustedDevicesList(promise: Promise) {
        val trusted = getTrustedDevices()
        val array = Arguments.createArray()
        trusted.forEach { array.pushString(it) }
        promise.resolve(array)
    }

    /**
     * Clear all trusted devices
     */
    @ReactMethod
    fun clearTrustedDevices(promise: Promise) {
        prefs?.edit()?.remove(KEY_TRUSTED_DEVICES)?.apply()
        Log.d(TAG, "ًں—‘ï¸ڈ Cleared all trusted devices")
        promise.resolve(true)
    }

    /**
     * Remove a specific trusted device
     */
    @ReactMethod
    fun removeTrustedDevice(deviceId: String, promise: Promise) {
        val trusted = getTrustedDevices().toMutableSet()
        trusted.remove(deviceId)
        prefs?.edit()?.putStringSet(KEY_TRUSTED_DEVICES, trusted)?.apply()
        Log.d(TAG, "ًں—‘ï¸ڈ Removed trusted device: $deviceId")
        promise.resolve(true)
    }

    /**
     * Check if handshake server is running
     */
    @ReactMethod
    fun isServerRunning(promise: Promise) {
        promise.resolve(isServerRunning && handshakeServer != null && !handshakeServer!!.isClosed)
    }
}


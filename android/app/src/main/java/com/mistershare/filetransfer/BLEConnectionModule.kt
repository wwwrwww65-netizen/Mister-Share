package com.mistershare.filetransfer

import android.annotation.SuppressLint
import android.bluetooth.*
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.nio.charset.StandardCharsets
import java.util.*

/**
 * BLE Connection Handler - SHAREit-style connection handshake
 * 
 * This module handles the BLE GATT connection for:
 * - Sending connection requests (client)
 * - Receiving connection requests (server)
 * - Sending/receiving approval + hotspot credentials
 */
class BLEConnectionModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val TAG = "BLEConnection"
        
        // MisterShare BLE Service UUID
        val SERVICE_UUID: UUID = UUID.fromString("0000FE00-0000-1000-8000-00805F9B34FB")
        
        // Characteristics
        val CHAR_DEVICE_INFO: UUID = UUID.fromString("0000FE01-0000-1000-8000-00805F9B34FB")
        val CHAR_CONNECTION_REQUEST: UUID = UUID.fromString("0000FE02-0000-1000-8000-00805F9B34FB")
        val CHAR_CONNECTION_RESPONSE: UUID = UUID.fromString("0000FE03-0000-1000-8000-00805F9B34FB")
        val CHAR_HOTSPOT_CREDENTIALS: UUID = UUID.fromString("0000FE04-0000-1000-8000-00805F9B34FB")
        
        // Client Characteristic Configuration Descriptor
        val CCCD_UUID: UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
        
        // Response codes
        const val RESPONSE_APPROVED = "APPROVED"
        const val RESPONSE_REJECTED = "REJECTED"
        const val RESPONSE_PENDING = "PENDING"
    }

    private var bluetoothManager: BluetoothManager? = null
    private var bluetoothAdapter: BluetoothAdapter? = null
    private var gattServer: BluetoothGattServer? = null
    private var gattClient: BluetoothGatt? = null
    
    // Server state
    private var isServerRunning = false
    private var hostDeviceName = "MisterShare"
    private var hotspotSSID = ""
    private var hotspotPassword = ""
    private val pendingRequests = mutableMapOf<String, String>() // deviceAddress -> deviceName
    private val connectedClients = mutableListOf<BluetoothDevice>()
    
    // Client state
    private var isConnecting = false
    private var targetDevice: BluetoothDevice? = null
    private var clientMyName: String = ""
    private var clientMyId: String = ""

    init {
        bluetoothManager = reactContext.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        bluetoothAdapter = bluetoothManager?.adapter
    }

    override fun getName(): String = "BLEConnection"

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }



    // ==================== SERVER SIDE (Host - Device A) ====================

    /**
     * Start GATT server for receiving connection requests
     */
    @SuppressLint("MissingPermission")
    @ReactMethod
    fun startServer(deviceName: String, ssid: String, password: String, promise: Promise) {
        if (isServerRunning) {
            promise.resolve(true)
            return
        }

        hostDeviceName = deviceName
        hotspotSSID = ssid
        hotspotPassword = password

        try {
            gattServer = bluetoothManager?.openGattServer(reactContext, gattServerCallback)
            
            if (gattServer == null) {
                promise.reject("BLE_ERROR", "Failed to open GATT server")
                return
            }

            // Create service with characteristics
            val service = BluetoothGattService(SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY)
            
            // Device info characteristic (readable)
            val deviceInfoChar = BluetoothGattCharacteristic(
                CHAR_DEVICE_INFO,
                BluetoothGattCharacteristic.PROPERTY_READ,
                BluetoothGattCharacteristic.PERMISSION_READ
            )
            deviceInfoChar.value = hostDeviceName.toByteArray(StandardCharsets.UTF_8)
            service.addCharacteristic(deviceInfoChar)
            
            // Connection request characteristic (writable)
            val requestChar = BluetoothGattCharacteristic(
                CHAR_CONNECTION_REQUEST,
                BluetoothGattCharacteristic.PROPERTY_WRITE,
                BluetoothGattCharacteristic.PERMISSION_WRITE
            )
            service.addCharacteristic(requestChar)
            
            // Connection response characteristic (notifiable + readable)
            val responseChar = BluetoothGattCharacteristic(
                CHAR_CONNECTION_RESPONSE,
                BluetoothGattCharacteristic.PROPERTY_NOTIFY or BluetoothGattCharacteristic.PROPERTY_READ,
                BluetoothGattCharacteristic.PERMISSION_READ
            )
            val cccd = BluetoothGattDescriptor(CCCD_UUID, BluetoothGattDescriptor.PERMISSION_WRITE or BluetoothGattDescriptor.PERMISSION_READ)
            responseChar.addDescriptor(cccd)
            service.addCharacteristic(responseChar)
            
            // Hotspot credentials characteristic (readable after approval)
            val credentialsChar = BluetoothGattCharacteristic(
                CHAR_HOTSPOT_CREDENTIALS,
                BluetoothGattCharacteristic.PROPERTY_READ,
                BluetoothGattCharacteristic.PERMISSION_READ
            )
            service.addCharacteristic(credentialsChar)
            
            // Store promise to resolve when onServiceAdded callback fires
            serviceAddedPromise = promise
            
            // Add service - this is async! onServiceAdded will be called when done
            Log.d(TAG, "ًں“‌ Adding GATT service...")
            val addResult = gattServer?.addService(service)
            Log.d(TAG, "ًں“‌ addService returned: $addResult")
            
            if (addResult != true) {
                serviceAddedPromise = null
                promise.reject("BLE_ERROR", "Failed to initiate addService")
                return
            }
            
            // Note: promise will be resolved in onServiceAdded callback
            Log.d(TAG, "âڈ³ Waiting for onServiceAdded callback...")

        } catch (e: Exception) {
            Log.e(TAG, "Failed to start GATT server", e)
            serviceAddedPromise = null
            promise.reject("BLE_ERROR", e.message)
        }
    }

    /**
     * Stop GATT server
     */
    @SuppressLint("MissingPermission")
    @ReactMethod
    fun stopServer(promise: Promise) {
        try {
            gattServer?.close()
            gattServer = null
            isServerRunning = false
            pendingRequests.clear()
            connectedClients.clear()
            Log.d(TAG, "ًں›‘ GATT Server stopped")
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("BLE_ERROR", e.message)
        }
    }

    /**
     * Approve a connection request
     */
    @SuppressLint("MissingPermission")
    @ReactMethod
    fun approveConnection(deviceAddress: String, promise: Promise) {
        Log.d(TAG, "ًں“¤ approveConnection called for: $deviceAddress")
        
        val device = connectedClients.find { it.address == deviceAddress }
        if (device == null) {
            Log.e(TAG, "â‌Œ Device not found in connectedClients. Available: ${connectedClients.map { it.address }}")
            promise.reject("BLE_ERROR", "Device not found")
            return
        }

        try {
            val service = gattServer?.getService(SERVICE_UUID)
            if (service == null) {
                Log.e(TAG, "â‌Œ Service not found!")
                promise.reject("BLE_ERROR", "Service not found")
                return
            }
            
            // First, update credentials characteristic
            val credentialsChar = service.getCharacteristic(CHAR_HOTSPOT_CREDENTIALS)
            if (credentialsChar != null) {
                val credentialsData = "$hotspotSSID|$hotspotPassword"
                credentialsChar.value = credentialsData.toByteArray(StandardCharsets.UTF_8)
                Log.d(TAG, "ًں“‌ Credentials set: SSID=$hotspotSSID")
            } else {
                Log.e(TAG, "â‌Œ Credentials characteristic not found!")
            }
            
            // Then send approval notification
            val responseChar = service.getCharacteristic(CHAR_CONNECTION_RESPONSE)
            if (responseChar != null) {
                responseChar.value = RESPONSE_APPROVED.toByteArray(StandardCharsets.UTF_8)
                
                @Suppress("DEPRECATION")
                val notifySuccess = gattServer?.notifyCharacteristicChanged(device, responseChar, false)
                Log.d(TAG, "ًں“¤ Notification sent: success=$notifySuccess")
                
                Log.d(TAG, "âœ… Approved connection from: $deviceAddress")
                
                // Remove from pending
                val deviceName = pendingRequests[deviceAddress] ?: "Unknown"
                pendingRequests.remove(deviceAddress)
                
                // Emit event
                val params = Arguments.createMap().apply {
                    putString("deviceAddress", deviceAddress)
                    putString("deviceName", deviceName)
                }
                sendEvent("onConnectionApproved", params)
                
                promise.resolve(true)
            } else {
                Log.e(TAG, "â‌Œ Response characteristic not found!")
                promise.reject("BLE_ERROR", "Response characteristic not found")
            }
        } catch (e: Exception) {
            Log.e(TAG, "â‌Œ Failed to approve connection", e)
            promise.reject("BLE_ERROR", e.message)
        }
    }

    /**
     * Reject a connection request
     */
    @SuppressLint("MissingPermission")
    @ReactMethod
    fun rejectConnection(deviceAddress: String, promise: Promise) {
        val device = connectedClients.find { it.address == deviceAddress }
        if (device == null) {
            promise.reject("BLE_ERROR", "Device not found")
            return
        }

        try {
            val responseChar = gattServer?.getService(SERVICE_UUID)
                ?.getCharacteristic(CHAR_CONNECTION_RESPONSE)
            
            if (responseChar != null) {
                responseChar.value = RESPONSE_REJECTED.toByteArray(StandardCharsets.UTF_8)
                gattServer?.notifyCharacteristicChanged(device, responseChar, false)
                
                pendingRequests.remove(deviceAddress)
                
                Log.d(TAG, "â‌Œ Rejected connection from: $deviceAddress")
                promise.resolve(true)
            } else {
                promise.reject("BLE_ERROR", "Response characteristic not found")
            }
        } catch (e: Exception) {
            promise.reject("BLE_ERROR", e.message)
        }
    }

    private var serviceAddedPromise: Promise? = null
    
    private val gattServerCallback = object : BluetoothGattServerCallback() {
        
        override fun onServiceAdded(status: Int, service: BluetoothGattService?) {
            if (status == BluetoothGatt.GATT_SUCCESS) {
                Log.d(TAG, "âœ… GATT Service added successfully: ${service?.uuid}")
                isServerRunning = true
                serviceAddedPromise?.resolve(true)
            } else {
                Log.e(TAG, "â‌Œ Failed to add GATT service: status=$status")
                serviceAddedPromise?.reject("BLE_ERROR", "Failed to add service: $status")
            }
            serviceAddedPromise = null
        }
        
        @SuppressLint("MissingPermission")
        override fun onConnectionStateChange(device: BluetoothDevice?, status: Int, newState: Int) {
            if (device == null) return
            Log.d(TAG, "ًں“، Server connection state change: device=${device.address}, status=$status, newState=$newState")
            when (newState) {
                BluetoothProfile.STATE_CONNECTED -> {
                    Log.d(TAG, "ًں“± Client connected: ${device.address}")
                    connectedClients.add(device)
                }
                BluetoothProfile.STATE_DISCONNECTED -> {
                    Log.d(TAG, "ًں“± Client disconnected: ${device.address}")
                    connectedClients.remove(device)
                    pendingRequests.remove(device.address)
                }
            }
        }

        @SuppressLint("MissingPermission")
        override fun onCharacteristicReadRequest(
            device: BluetoothDevice?,
            requestId: Int,
            offset: Int,
            characteristic: BluetoothGattCharacteristic?
        ) {
            device?.let { dev ->
                characteristic?.let { char ->
                    when (char.uuid) {
                        CHAR_DEVICE_INFO -> {
                            val value = hostDeviceName.toByteArray(StandardCharsets.UTF_8)
                            gattServer?.sendResponse(dev, requestId, BluetoothGatt.GATT_SUCCESS, offset, value)
                        }
                        CHAR_HOTSPOT_CREDENTIALS -> {
                            // Only send credentials if device was approved
                            if (!pendingRequests.containsKey(dev.address)) {
                                val value = "$hotspotSSID|$hotspotPassword".toByteArray(StandardCharsets.UTF_8)
                                gattServer?.sendResponse(dev, requestId, BluetoothGatt.GATT_SUCCESS, offset, value)
                            } else {
                                gattServer?.sendResponse(dev, requestId, BluetoothGatt.GATT_FAILURE, offset, null)
                            }
                        }
                        else -> {
                            gattServer?.sendResponse(dev, requestId, BluetoothGatt.GATT_SUCCESS, offset, char.value)
                        }
                    }
                }
            }
        }

        @SuppressLint("MissingPermission")
        override fun onCharacteristicWriteRequest(
            device: BluetoothDevice?,
            requestId: Int,
            characteristic: BluetoothGattCharacteristic?,
            preparedWrite: Boolean,
            responseNeeded: Boolean,
            offset: Int,
            value: ByteArray?
        ) {
            device?.let { dev ->
                characteristic?.let { char ->
                    if (char.uuid == CHAR_CONNECTION_REQUEST && value != null) {
                        val requestData = String(value, StandardCharsets.UTF_8)
                        Log.d(TAG, "ًں¤‌ Received connection request: $requestData from ${dev.address}")
                        
                        // Parse request: "deviceName|deviceId"
                        val parts = requestData.split("|")
                        val clientName = if (parts.isNotEmpty()) parts[0] else "Unknown"
                        val clientId = if (parts.size > 1) parts[1] else dev.address
                        
                        // Add to pending requests
                        pendingRequests[dev.address] = clientName
                        
                        // Send response
                        if (responseNeeded) {
                            gattServer?.sendResponse(dev, requestId, BluetoothGatt.GATT_SUCCESS, offset, null)
                        }
                        
                        // Emit event to show approval dialog
                        val params = Arguments.createMap().apply {
                            putString("deviceAddress", dev.address)
                            putString("deviceName", clientName)
                            putString("deviceId", clientId)
                        }
                        sendEvent("onConnectionRequest", params)
                    }
                }
            }
        }

        @SuppressLint("MissingPermission")
        override fun onDescriptorWriteRequest(
            device: BluetoothDevice?,
            requestId: Int,
            descriptor: BluetoothGattDescriptor?,
            preparedWrite: Boolean,
            responseNeeded: Boolean,
            offset: Int,
            value: ByteArray?
        ) {
            if (responseNeeded) {
                gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, null)
            }
        }
    }


    /**
     * Connect to a host device and request connection
     * Implements robust retry logic: LE -> AUTO fallback
     */
    @SuppressLint("MissingPermission")
    @ReactMethod
    fun requestConnection(deviceAddress: String, myName: String, myId: String, promise: Promise) {
        val storedDeviceAddress = deviceAddress
        Log.e(TAG, "ًںڑ€ requestConnection: $deviceAddress")
        
        if (isConnecting) {
            Log.w(TAG, "âڑ ï¸ڈ Already connecting, resetting...")
            resetConnectionState()
        }

        try {
            // Get device instance
            var device = BLEScannerModule.getDevice(deviceAddress)
            if (device == null) {
                device = bluetoothAdapter?.getRemoteDevice(deviceAddress)
            }
            
            if (device == null) {
                promise.reject("BLE_ERROR", "Device not found")
                return
            }

            targetDevice = device
            isConnecting = true
            clientMyName = myName
            clientMyId = myId
            
            // Start connection sequence (Attempt 1: TRANSPORT_LE)
            connectToGatt(device, false)
            
            promise.resolve(true)

        } catch (e: Exception) {
            isConnecting = false
            Log.e(TAG, "Failed to connect", e)
            promise.reject("BLE_ERROR", e.message)
        }
    }

    /**
     * Helper to connect with retry parameter
     */
    @SuppressLint("MissingPermission")
    private fun connectToGatt(device: BluetoothDevice, isRetry: Boolean) {
        val transport = if (isRetry) BluetoothDevice.TRANSPORT_AUTO else BluetoothDevice.TRANSPORT_LE
        val transportName = if (isRetry) "AUTO" else "LE"
        
        Log.d(TAG, "ًں”— Connecting to ${device.address} using $transportName...")

        Handler(Looper.getMainLooper()).post {
            try {
                gattClient = device.connectGatt(
                    reactContext.applicationContext, // Use Application Context
                    false, 
                    createGattClientCallback(device, isRetry),
                    transport
                )
            } catch (e: Exception) {
                Log.e(TAG, "â‌Œ connectGatt failed: ${e.message}")
                isConnecting = false
                val params = Arguments.createMap().apply {
                    putString("deviceAddress", device.address)
                    putString("status", "error")
                    putInt("errorCode", -1)
                }
                sendEvent("onConnectionStateChanged", params)
            }
        }
    }

    /**
     * Create GATT client callback with retry logic
     */
    @SuppressLint("MissingPermission")
    private fun createGattClientCallback(device: BluetoothDevice, isRetry: Boolean): BluetoothGattCallback {
        return object : BluetoothGattCallback() {
            
            override fun onConnectionStateChange(gatt: BluetoothGatt?, status: Int, newState: Int) {
                Log.d(TAG, "ًں“، State Change: status=$status, newState=$newState, retry=$isRetry")
                
                if (status != BluetoothGatt.GATT_SUCCESS) {
                    Log.e(TAG, "â‌Œ Connection failed with status $status")
                    gatt?.close()
                    gattClient = null
                    
                    if (!isRetry) {
                        Log.w(TAG, "âڑ ï¸ڈ First attempt (LE) failed. Retrying with AUTO in 200ms...")
                        Handler(Looper.getMainLooper()).postDelayed({
                            if (isConnecting) connectToGatt(device, true)
                        }, 200)
                    } else {
                        Log.e(TAG, "â‌Œ Retry (AUTO) also failed. Giving up.")
                        isConnecting = false
                        val params = Arguments.createMap().apply {
                            putString("deviceAddress", device.address)
                            putString("status", "error")
                            putInt("errorCode", status)
                        }
                        sendEvent("onConnectionStateChanged", params)
                    }
                    return
                }
                
                when (newState) {
                    BluetoothProfile.STATE_CONNECTED -> {
                        Log.d(TAG, "âœ… Connected! Discovering services...")
                        // Reset retry state implies success
                        gatt?.discoverServices()
                    }
                    BluetoothProfile.STATE_DISCONNECTED -> {
                        Log.d(TAG, "â‌Œ Disconnected")
                        isConnecting = false
                        gatt?.close()
                        
                        val params = Arguments.createMap().apply {
                            putString("deviceAddress", device.address)
                            putString("status", "disconnected")
                        }
                        sendEvent("onConnectionStateChanged", params)
                    }
                }
            }

            override fun onServicesDiscovered(gatt: BluetoothGatt?, status: Int) {
                if (status != BluetoothGatt.GATT_SUCCESS) {
                    Log.e(TAG, "â‌Œ Service discovery failed: $status")
                    return
                }
                
                Log.d(TAG, "âœ… Services discovered")
                
                val service = gatt?.getService(SERVICE_UUID)
                if (service == null) {
                    Log.e(TAG, "â‌Œ MisterShare service not found!")
                    return
                }
                
                // Enable notifications on response characteristic
                val responseChar = service.getCharacteristic(CHAR_CONNECTION_RESPONSE)
                if (responseChar != null) {
                    gatt.setCharacteristicNotification(responseChar, true)
                    
                    val cccd = responseChar.getDescriptor(CCCD_UUID)
                    if (cccd != null) {
                        cccd.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                        val success = gatt.writeDescriptor(cccd)
                        Log.d(TAG, "ًں“‌ CCCD write initiated: $success")
                    } else {
                        Log.d(TAG, "âڑ ï¸ڈ No CCCD found, sending request directly")
                        sendConnectionRequest(gatt, service)
                        startPollingForResponse(gatt)
                    }
                } else {
                    Log.e(TAG, "â‌Œ Response characteristic not found!")
                    sendConnectionRequest(gatt, service)
                }
            }

            override fun onDescriptorWrite(gatt: BluetoothGatt?, descriptor: BluetoothGattDescriptor?, status: Int) {
                Log.d(TAG, "ًں“‌ Descriptor write complete: status=$status")
                
                if (descriptor?.uuid == CCCD_UUID) {
                    if (status == BluetoothGatt.GATT_SUCCESS) {
                        Log.d(TAG, "âœ… CCCD enabled, sending connection request")
                        val service = gatt?.getService(SERVICE_UUID)
                        if (service != null) {
                            sendConnectionRequest(gatt, service)
                            startPollingForResponse(gatt)
                        }
                    } else {
                        Log.e(TAG, "â‌Œ CCCD write failed: $status")
                        // Try sending anyway
                        val service = gatt?.getService(SERVICE_UUID)
                        if (service != null) sendConnectionRequest(gatt, service)
                    }
                }
            }

            override fun onCharacteristicWrite(gatt: BluetoothGatt?, characteristic: BluetoothGattCharacteristic?, status: Int) {
                if (characteristic?.uuid == CHAR_CONNECTION_REQUEST) {
                    if (status == BluetoothGatt.GATT_SUCCESS) {
                        Log.d(TAG, "âœ… API Request sent successfully")
                    } else {
                        Log.e(TAG, "â‌Œ API Request write failed")
                    }
                }
            }

            // DEPRECATED signature for Android < 13
            @Deprecated("Deprecated in API 33")
            override fun onCharacteristicChanged(gatt: BluetoothGatt?, characteristic: BluetoothGattCharacteristic?) {
                characteristic?.let { char ->
                    handleCharacteristicChanged(gatt, char.uuid, char.value, device.address)
                }
            }
            
            // NEW signature for Android 13+ (API 33+)
            override fun onCharacteristicChanged(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, value: ByteArray) {
                handleCharacteristicChanged(gatt, characteristic.uuid, value, device.address)
            }

            override fun onCharacteristicRead(gatt: BluetoothGatt?, characteristic: BluetoothGattCharacteristic?, status: Int) {
                if (status != BluetoothGatt.GATT_SUCCESS) return
                
                characteristic?.let { char ->
                    when (char.uuid) {
                        CHAR_CONNECTION_RESPONSE -> {
                            val response = String(char.value ?: ByteArray(0), StandardCharsets.UTF_8)
                            Log.d(TAG, "ًں“¥ Polled response: '$response'")
                            
                            if (response == RESPONSE_APPROVED) {
                                Log.d(TAG, "âœ… APPROVED via polling! Reading credentials...")
                                val credentialsChar = gatt?.getService(SERVICE_UUID)
                                    ?.getCharacteristic(CHAR_HOTSPOT_CREDENTIALS)
                                if (credentialsChar != null) {
                                    gatt.readCharacteristic(credentialsChar)
                                }
                            } else if (response == RESPONSE_REJECTED) {
                                handleRejection(gatt)
                            }
                        }
                        CHAR_HOTSPOT_CREDENTIALS -> {
                            handleCredentialsReceived(gatt, char.value, device.address)
                        }
                    }
                }
            }
        }
    }
    
    private fun handleCharacteristicChanged(gatt: BluetoothGatt?, uuid: java.util.UUID?, value: ByteArray?, deviceAddress: String) {
        if (uuid == CHAR_CONNECTION_RESPONSE && value != null) {
            val response = String(value, StandardCharsets.UTF_8)
            Log.d(TAG, "ًں“¥ Response notification received: $response")
            
            when (response) {
                RESPONSE_APPROVED -> {
                    Log.d(TAG, "âœ… APPROVED! Reading credentials...")
                    val credentialsChar = gatt?.getService(SERVICE_UUID)
                        ?.getCharacteristic(CHAR_HOTSPOT_CREDENTIALS)
                    if (credentialsChar != null) {
                        gatt.readCharacteristic(credentialsChar)
                    }
                }
                RESPONSE_REJECTED -> {
                    handleRejection(gatt)
                }
            }
        }
    }
    
    @SuppressLint("MissingPermission")
    private fun handleRejection(gatt: BluetoothGatt?) {
        Log.d(TAG, "â‌Œ Connection rejected by host")
        isConnecting = false
        gatt?.close()
        
        val params = Arguments.createMap().apply {
            putString("status", "rejected")
        }
        sendEvent("onConnectionRejected", params)
    }
    
    @SuppressLint("MissingPermission")
    private fun handleCredentialsReceived(gatt: BluetoothGatt?, value: ByteArray?, hostAddress: String) {
        if (value == null) return
        
        val credentials = String(value, StandardCharsets.UTF_8)
        val parts = credentials.split("|")
        
        if (parts.size >= 2) {
            val ssid = parts[0]
            val password = parts[1]
            
            Log.d(TAG, "ًںژ‰ Credentials received! SSID=$ssid")
            isConnecting = false
            
            val params = Arguments.createMap().apply {
                putString("ssid", ssid)
                putString("password", password)
                putString("hostAddress", hostAddress)
            }
            sendEvent("onCredentialsReceived", params)
            
            // Close GATT connection after getting credentials
            gatt?.close()
        } else {
            Log.e(TAG, "â‌Œ Invalid credentials format: $credentials")
        }
    }
    
    @SuppressLint("MissingPermission")
    private fun startPollingForResponse(gatt: BluetoothGatt) {
        // Poll for response every 500ms for up to 30 seconds
        Thread {
            var attempts = 0
            val maxAttempts = 60 // 30 seconds
            
            while (isConnecting && attempts < maxAttempts) {
                Thread.sleep(500)
                attempts++
                
                if (attempts % 4 == 0) { // Every 2 seconds
                    Log.d(TAG, "ًں”„ Polling for response... attempt $attempts")
                    try {
                        val responseChar = gatt.getService(SERVICE_UUID)
                            ?.getCharacteristic(CHAR_CONNECTION_RESPONSE)
                        if (responseChar != null) {
                            gatt.readCharacteristic(responseChar)
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Polling error", e)
                    }
                }
            }
            
            if (attempts >= maxAttempts && isConnecting) {
                Log.e(TAG, "âڈ° Polling timeout - no response received")
                isConnecting = false
                val params = Arguments.createMap().apply {
                    putString("status", "timeout")
                }
                sendEvent("onConnectionTimeout", params)
            }
        }.start()
    }

    @SuppressLint("MissingPermission")
    private fun sendConnectionRequest(gatt: BluetoothGatt, service: BluetoothGattService) {
        val requestChar = service.getCharacteristic(CHAR_CONNECTION_REQUEST)
        if (requestChar != null) {
            val requestData = "$clientMyName|$clientMyId".toByteArray(StandardCharsets.UTF_8)
            requestChar.value = requestData
            val success = gatt.writeCharacteristic(requestChar)
            Log.d(TAG, "ًں“¤ Sent connection request, success: $success")
        } else {
            Log.e(TAG, "â‌Œ Connection request characteristic not found!")
        }
    }

    @SuppressLint("MissingPermission")
    private fun resetConnectionState() {
        Log.d(TAG, "ًں”„ Resetting connection state")
        try {
            gattClient?.close()
        } catch (e: Exception) {
            Log.e(TAG, "Error closing GATT", e)
        }
        gattClient = null
        isConnecting = false
        targetDevice = null
        clientMyName = ""
        clientMyId = ""
    }

    /**
     * Reset connection state (for manual reset from JS)
     */
    @ReactMethod
    fun resetConnection(promise: Promise) {
        resetConnectionState()
        promise.resolve(true)
    }

    /**
     * Disconnect from GATT client
     */
    @SuppressLint("MissingPermission")
    @ReactMethod
    fun disconnect(promise: Promise) {
        try {
            gattClient?.close()
            gattClient = null
            isConnecting = false
            targetDevice = null
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("BLE_ERROR", e.message)
        }
    }
}


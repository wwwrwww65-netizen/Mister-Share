package com.mistershare.filetransfer

import android.bluetooth.*
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.Context
import android.os.ParcelUuid
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.*

class BLEGattServerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var bluetoothManager: BluetoothManager? = null
    private var bluetoothAdapter: BluetoothAdapter? = null
    private var gattServer: BluetoothGattServer? = null
    private var advertiser: BluetoothLeAdvertiser? = null
    
    private val SERVICE_UUID = UUID.fromString("12345678-1234-5678-1234-567812345678")
    private val IP_CHAR_UUID = UUID.fromString("87654321-4321-8765-4321-876543218765")
    private val PORT_CHAR_UUID = UUID.fromString("11111111-2222-3333-4444-555555555555")
    private val SSID_CHAR_UUID = UUID.fromString("22222222-3333-4444-5555-666666666666")
    private val PASS_CHAR_UUID = UUID.fromString("33333333-4444-5555-6666-777777777777")
    
    // Store credentials relative to server instance
    private var currentSsid: String = ""
    private var currentPass: String = ""
    private var currentIp: String = ""
    private var currentPort: Int = 0

    // Callback for BLE Advertising
    private val advertiseCallback = object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings) {
            super.onStartSuccess(settingsInEffect)
            Log.d("BLE", "Advertising started successfully")
        }

        override fun onStartFailure(errorCode: Int) {
            super.onStartFailure(errorCode)
            Log.e("BLE", "Advertising failed: $errorCode")
        }
    }

    init {
        bluetoothManager = reactContext.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        bluetoothAdapter = bluetoothManager?.adapter
        advertiser = bluetoothAdapter?.bluetoothLeAdvertiser
    }

    override fun getName(): String = "BLEGattServer"

    /**
     * Start BLE advertising with GATT server
     */
    @ReactMethod
    fun startAdvertising(deviceName: String, ipAddress: String, port: Int, ssid: String, password: String, promise: Promise) {
        try {
            // Detailed diagnostics
            if (bluetoothAdapter == null) {
                promise.reject("BT_NO_ADAPTER", "This device does not have Bluetooth hardware")
                return
            }
            
            if (!bluetoothAdapter!!.isEnabled) {
                promise.reject("BT_DISABLED", "Bluetooth is turned OFF. Please turn it ON.")
                return
            }
            
            // Refresh advertiser in case Bluetooth was just enabled
            advertiser = bluetoothAdapter?.bluetoothLeAdvertiser
            
            if (advertiser == null) {
                val reason = if (bluetoothAdapter?.isMultipleAdvertisementSupported == false) {
                    "This device does NOT support BLE Advertising (Peripheral Mode)"
                } else {
                    "BLE Advertiser not available. Try restarting Bluetooth."
                }
                promise.reject("BLE_NO_ADVERTISER", reason)
                return
            }

            // Store credentials
            currentSsid = ssid
            currentPass = password
            currentIp = ipAddress
            currentPort = port

            // Set device name
            bluetoothAdapter?.name = deviceName

            // Create GATT server
            setupGattServer()

            // Start advertising
            val settings = AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                .setConnectable(true)
                .setTimeout(0)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                .build()

            val data = AdvertiseData.Builder()
                .setIncludeDeviceName(true)
                .addServiceUuid(ParcelUuid(SERVICE_UUID))
                .build()

            advertiser?.startAdvertising(settings, data, advertiseCallback)
            
            val map = Arguments.createMap()
            map.putBoolean("success", true)
            map.putString("message", "Advertising started")
            promise.resolve(map)
            
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to start advertising: ${e.message}")
        }
    }

    /**
     * Stop BLE advertising
     */
    @ReactMethod
    fun stopAdvertising(promise: Promise) {
        try {
            advertiser?.stopAdvertising(advertiseCallback)
            gattServer?.close()
            gattServer = null
            promise.resolve("Stopped")
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    // Event emitter helper
    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    /**
     * Setup GATT server with connection info characteristics
     */
    private fun setupGattServer() {
        val serverCallback = object : BluetoothGattServerCallback() {
            override fun onConnectionStateChange(device: BluetoothDevice?, status: Int, newState: Int) {
                if (newState == BluetoothProfile.STATE_CONNECTED) {
                    Log.d("BLE", "Device connected: ${device?.address}")
                } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                    Log.d("BLE", "Device disconnected")
                }
            }

            override fun onCharacteristicWriteRequest(
                device: BluetoothDevice?,
                requestId: Int,
                characteristic: BluetoothGattCharacteristic?,
                preparedWrite: Boolean,
                responseNeeded: Boolean,
                offset: Int,
                value: ByteArray?
            ) {
                if (characteristic?.uuid == PASS_CHAR_UUID) {
                    // Client is sending a HANDSHAKE REQUEST
                    // Format: "REQUEST|<DeviceName>"
                    val requestStr = value?.toString(Charsets.UTF_8) ?: ""
                    Log.d("BLE", "Received Write Request: $requestStr")

                    if (requestStr.startsWith("REQUEST|")) {
                         val parts = requestStr.split("|")
                         val clientName = if (parts.size > 1) parts[1] else "Unknown Device"
                         val clientId = if (parts.size > 2) parts[2] else ""
                         
                         // Notify JS to show Approval Dialog
                         val params = Arguments.createMap().apply {
                             putString("requestId", requestId.toString())
                             putString("deviceAddress", device?.address)
                             putString("deviceName", clientName)
                             putString("deviceId", clientId)
                         }
                         sendEvent("onBLERequest", params)
                         
                         // We DO NOT respond success yet. We wait for user approval.
                         // But to keep connection alive, we can send a pending response if needed, 
                         // or just let the client wait (with timeout).
                         // Standard practice: Send success for the WRITE itself, but the *data* (password) comes later via Notification.
                         if (responseNeeded) {
                             gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, value)
                         }
                    } else {
                        if (responseNeeded) {
                            gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_FAILURE, offset, null)
                        }
                    }
                }
            }
            
            // Block direct reads of credentials (SECURITY)
            override fun onCharacteristicReadRequest(
                device: BluetoothDevice?,
                requestId: Int,
                offset: Int,
                characteristic: BluetoothGattCharacteristic?
            ) {
                 // For IP/Port/SSID we might allow public read? 
                 // NO, strictly follow "Tap to Connect" = Nothing visible until approved.
                 // We reject all reads. Handshake must be via Write Request -> Notify.
                 gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_FAILURE, 0, null)
            }
            
            override fun onNotificationSent(device: BluetoothDevice?, status: Int) {
                Log.d("BLE", "Notification sent to ${device?.address} status=$status")
            }
        }

        gattServer = bluetoothManager?.openGattServer(reactApplicationContext, serverCallback)

        // Create service
        val service = BluetoothGattService(SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY)

        // Characteristics
        // IP/Port/SSID/PASS - properties WRITABLE (for request) and NOTIFY (for response)
        // We actually only need ONE characteristic for the handshake to keep it simple.
        // Let's use PASS_CHAR_UUID as the "Handshake Channel"
        
        val handshakeChar = BluetoothGattCharacteristic(
            PASS_CHAR_UUID,
            BluetoothGattCharacteristic.PROPERTY_WRITE or BluetoothGattCharacteristic.PROPERTY_NOTIFY,
            BluetoothGattCharacteristic.PERMISSION_WRITE
        )

        service.addCharacteristic(handshakeChar)
        gattServer?.addService(service)
    }
    
    /**
     * Approve connection request
     * Sends credentials back to the specific device via Notification
     */
    @ReactMethod
    fun approveConnection(requestIdStr: String, deviceAddress: String, promise: Promise) {
        val device = bluetoothAdapter?.getRemoteDevice(deviceAddress)
        if (device == null || gattServer == null) {
            promise.reject("ERROR", "Device or Server not found")
            return
        }

        val service = gattServer?.getService(SERVICE_UUID)
        val characteristic = service?.getCharacteristic(PASS_CHAR_UUID)
        
        if (characteristic == null) {
             promise.reject("ERROR", "Handshake characteristic not found")
             return
        }

        // Response Format: "APPROVED|<SSID>|<PASSWORD>|<IP>|<PORT>"
        val response = "APPROVED|$currentSsid|$currentPass|$currentIp|$currentPort"
        characteristic.value = response.toByteArray(Charsets.UTF_8)
        
        // Send Notification
        val success = gattServer?.notifyCharacteristicChanged(device, characteristic, false) ?: false
        
        if (success) {
            promise.resolve("Approved")
        } else {
            promise.reject("ERROR", "Failed to send notification")
        }
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


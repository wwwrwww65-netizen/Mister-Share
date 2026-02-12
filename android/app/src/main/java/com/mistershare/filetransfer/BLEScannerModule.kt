package com.mistershare.filetransfer

import android.annotation.SuppressLint
import android.bluetooth.*
import android.bluetooth.le.*
import android.content.Context
import android.os.Build
import android.os.ParcelUuid
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.nio.charset.StandardCharsets
import java.util.*

/**
 * BLE Scanner Module - SHAREit-style device discovery
 * 
 * This module scans for nearby MisterShare devices that are advertising.
 * Discovered devices are emitted to JavaScript for display in JoinScreen.
 */
class BLEScannerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val TAG = "BLEScanner"
        
        // MisterShare BLE Service UUID (same as advertiser)
        val SERVICE_UUID: UUID = UUID.fromString("0000FE00-0000-1000-8000-00805F9B34FB")
        
        // Manufacturer ID for custom data
        const val MANUFACTURER_ID = 0xFFFF
        
        // Static cache of discovered BluetoothDevices for cross-module access
        private val deviceCache = mutableMapOf<String, BluetoothDevice>()
        
        fun getDevice(address: String): BluetoothDevice? = deviceCache[address]
        fun clearCache() = deviceCache.clear()
    }

    private var bluetoothAdapter: BluetoothAdapter? = null
    private var bleScanner: BluetoothLeScanner? = null
    private var isScanning = false
    
    // Keep track of discovered devices to avoid duplicates
    private val discoveredDevices = mutableMapOf<String, DiscoveredDevice>()

    data class DiscoveredDevice(
        val address: String,
        val name: String,
        val rssi: Int,
        val lastSeen: Long,
        val device: BluetoothDevice,
        val ssid: String? = null,
        val password: String? = null
    )

    init {
        val bluetoothManager = reactContext.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        bluetoothAdapter = bluetoothManager?.adapter
        bleScanner = bluetoothAdapter?.bluetoothLeScanner
    }

    override fun getName(): String = "BLEScanner"

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    /**
     * Start scanning for MisterShare devices
     */
    @SuppressLint("MissingPermission")
    @ReactMethod
    fun startScanning(promise: Promise) {
        if (isScanning) {
            Log.d(TAG, "Already scanning")
            promise.resolve(true)
            return
        }

        if (bleScanner == null) {
            Log.e(TAG, "BLE Scanner not available")
            promise.reject("BLE_ERROR", "BLE Scanning not supported on this device")
            return
        }

        // Clear previously discovered devices
        discoveredDevices.clear()

        try {
            // Build scan filter for MisterShare service UUID
            val filters = listOf(
                ScanFilter.Builder()
                    .setServiceUuid(ParcelUuid(SERVICE_UUID))
                    .build()
            )

            val settings = ScanSettings.Builder()
                .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                .setReportDelay(0) // Report immediately
                .build()

            bleScanner?.startScan(filters, settings, scanCallback)
            isScanning = true
            
            Log.d(TAG, "ًں”چ Started BLE scanning for MisterShare devices")
            promise.resolve(true)

        } catch (e: Exception) {
            Log.e(TAG, "Failed to start scanning", e)
            promise.reject("BLE_ERROR", e.message)
        }
    }

    /**
     * Stop scanning
     */
    @SuppressLint("MissingPermission")
    @ReactMethod
    fun stopScanning(promise: Promise) {
        if (!isScanning) {
            promise.resolve(true)
            return
        }

        try {
            bleScanner?.stopScan(scanCallback)
            isScanning = false
            Log.d(TAG, "ًں›‘ Stopped BLE scanning")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to stop scanning", e)
            promise.reject("BLE_ERROR", e.message)
        }
    }

    /**
     * Check if currently scanning
     */
    @ReactMethod
    fun isScanning(promise: Promise) {
        promise.resolve(isScanning)
    }

    /**
     * Get list of discovered devices
     */
    @ReactMethod
    fun getDiscoveredDevices(promise: Promise) {
        val devices = Arguments.createArray()
        
        discoveredDevices.values.forEach { device ->
            val deviceMap = Arguments.createMap().apply {
                putString("address", device.address)
                putString("name", device.name)
                putInt("rssi", device.rssi)
            }
            devices.pushMap(deviceMap)
        }
        
        promise.resolve(devices)
    }

    /**
     * Clear discovered devices list
     */
    @ReactMethod
    fun clearDiscoveredDevices(promise: Promise) {
        discoveredDevices.clear()
        promise.resolve(true)
    }

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult?) {
            result?.let { processResult(it) }
        }

        override fun onBatchScanResults(results: MutableList<ScanResult>?) {
            results?.forEach { processResult(it) }
        }

        override fun onScanFailed(errorCode: Int) {
            isScanning = false
            val errorMessage = when (errorCode) {
                SCAN_FAILED_ALREADY_STARTED -> "Scan already started"
                SCAN_FAILED_APPLICATION_REGISTRATION_FAILED -> "App registration failed"
                SCAN_FAILED_INTERNAL_ERROR -> "Internal error"
                SCAN_FAILED_FEATURE_UNSUPPORTED -> "Feature unsupported"
                else -> "Unknown error: $errorCode"
            }
            Log.e(TAG, "â‌Œ BLE Scan failed: $errorMessage")
            
            val params = Arguments.createMap().apply {
                putBoolean("success", false)
                putString("error", errorMessage)
            }
            sendEvent("onScanFailed", params)
        }
    }

    @SuppressLint("MissingPermission")
    private fun processResult(result: ScanResult) {
        val device = result.device
        val address = device.address
        val rssi = result.rssi
        
        // Extract device name from manufacturer data
        var deviceName = "Unknown"
        var isMisterShareDevice = false
        var ssid: String? = null
        var password: String? = null
        
        result.scanRecord?.let { scanRecord ->
            // Check for our SERVICE_UUID in advertised services
            val serviceUuids = scanRecord.serviceUuids
            if (serviceUuids != null) {
                for (uuid in serviceUuids) {
                    if (uuid.uuid == SERVICE_UUID) {
                        isMisterShareDevice = true
                        break
                    }
                }
            }
            
            // Get manufacturer data (MS|DeviceName|SSID|Password format)
            val manufacturerData = scanRecord.getManufacturerSpecificData(MANUFACTURER_ID)
            if (manufacturerData != null) {
                val dataString = String(manufacturerData, StandardCharsets.UTF_8)
                if (dataString.startsWith("MS|")) {
                    val parts = dataString.split("|")
                    if (parts.size >= 2) {
                        deviceName = parts[1] // Remove "MS|" prefix (effectively)
                        isMisterShareDevice = true 
                    }
                    if (parts.size >= 4) {
                        ssid = parts[2]
                        password = parts[3]
                        Log.d(TAG, "ًں”“ Credentials found in advertisement: SSID=$ssid")
                    }
                }
            }
            
            // Fallback to device name ONLY if we confirmed it's a MisterShare device
            if (isMisterShareDevice && deviceName == "Unknown") {
                deviceName = device.name ?: scanRecord.deviceName ?: "MisterShare Device"
            }
        }

        // STRICT: Only process if this is a confirmed MisterShare device
        if (!isMisterShareDevice) {
            return // Skip non-MisterShare devices
        }

        // Check if this is a new device or update
        val isNew = !discoveredDevices.containsKey(address)
        
        // Cache the actual BluetoothDevice for GATT connection
        deviceCache[address] = device
        
        // Update or add device info
        val discoveredDevice = DiscoveredDevice(
            address = address,
            name = deviceName,
            rssi = rssi,
            lastSeen = System.currentTimeMillis(),
            device = device,
            ssid = ssid,
            password = password
        )
        discoveredDevices[address] = discoveredDevice

        // Emit event
        val params = Arguments.createMap().apply {
            putString("address", address)
            putString("name", deviceName)
            putInt("rssi", rssi)
            putBoolean("isNew", isNew)
            if (ssid != null) putString("ssid", ssid)
            if (password != null) putString("password", password)
        }
        
        Log.d(TAG, "ًں“± Found MisterShare device: $deviceName ($address) RSSI: $rssi")
        sendEvent("onDeviceFound", params)
    }
}


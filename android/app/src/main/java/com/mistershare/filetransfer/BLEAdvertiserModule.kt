package com.mistershare.filetransfer

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
 * BLE Advertiser Module - SHAREit-style device discovery
 * 
 * This module handles BLE advertising to make the device discoverable
 * to other MisterShare devices without WiFi connection.
 */
class BLEAdvertiserModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val TAG = "BLEAdvertiser"
        
        // MisterShare BLE Service UUID
        val SERVICE_UUID: UUID = UUID.fromString("0000FE00-0000-1000-8000-00805F9B34FB")
        
        // Manufacturer ID for custom data (using 0xFFFF for testing)
        const val MANUFACTURER_ID = 0xFFFF
    }

    private var bluetoothAdapter: BluetoothAdapter? = null
    private var bleAdvertiser: BluetoothLeAdvertiser? = null
    private var isAdvertising = false
    private var deviceName = "MisterShare"

    init {
        val bluetoothManager = reactContext.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        bluetoothAdapter = bluetoothManager?.adapter
        bleAdvertiser = bluetoothAdapter?.bluetoothLeAdvertiser
    }

    override fun getName(): String = "BLEAdvertiser"

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    /**
     * Start BLE advertising with device name
     */
    /**
     * Start BLE advertising with device name and optional credentials
     */
    @ReactMethod
    fun startAdvertising(deviceName: String, ssid: String?, password: String?, promise: Promise) {
        if (isAdvertising) {
            Log.d(TAG, "Already advertising")
            promise.resolve(true)
            return
        }

        if (bleAdvertiser == null) {
            Log.e(TAG, "BLE Advertiser not available")
            promise.reject("BLE_ERROR", "BLE Advertising not supported on this device")
            return
        }

        this.deviceName = deviceName

        try {
            val settings = AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                .setConnectable(true)
                .setTimeout(0) // No timeout
                .build()

            // Build advertise data with service UUID
            val advertiseData = AdvertiseData.Builder()
                .setIncludeDeviceName(false)
                .addServiceUuid(ParcelUuid(SERVICE_UUID))
                .build()

            // Build scan response with credentials
            // Format: "MS|DeviceName|SSID|Password"
            // If no credentials, just "MS|DeviceName"
            val dataString = if (!ssid.isNullOrEmpty() && !password.isNullOrEmpty()) {
                "MS|$deviceName|$ssid|$password"
            } else {
                "MS|$deviceName"
            }
            
            // Truncate if too long (max 31 bytes for manufacturer data)
            // We prioritize SSID/Pass over Name if needed, but for now simple truncate
            var bytes = dataString.toByteArray(StandardCharsets.UTF_8)
            if (bytes.size > 31) {
                Log.w(TAG, "âڑ ï¸ڈ Advertisement data too long (${bytes.size} bytes), truncating name...")
                // Try to shorten name to fit
                val credsLen = if (!ssid.isNullOrEmpty()) (ssid!!.length + password!!.length + 2) else 0 // +2 for | separators
                val msLen = 3 // "MS|"
                val maxNameLen = 31 - msLen - credsLen
                
                if (maxNameLen > 0) {
                    val shortName = deviceName.take(maxNameLen)
                    val shortData = "MS|$shortName|$ssid|$password"
                     bytes = shortData.toByteArray(StandardCharsets.UTF_8)
                } else {
                    Log.e(TAG, "â‌Œ Credentials too long to fit in advertisement!")
                }
            }
            
            val scanResponse = AdvertiseData.Builder()
                .setIncludeDeviceName(false)
                .addManufacturerData(MANUFACTURER_ID, bytes)
                .build()

            bleAdvertiser?.startAdvertising(settings, advertiseData, scanResponse, advertiseCallback)
            
            Log.d(TAG, "ًں“، Starting BLE advertising: $dataString")
            promise.resolve(true)

        } catch (e: Exception) {
            Log.e(TAG, "Failed to start advertising", e)
            promise.reject("BLE_ERROR", e.message)
        }
    }

    /**
     * Stop BLE advertising
     */
    @ReactMethod
    fun stopAdvertising(promise: Promise) {
        if (!isAdvertising) {
            promise.resolve(true)
            return
        }

        try {
            bleAdvertiser?.stopAdvertising(advertiseCallback)
            isAdvertising = false
            Log.d(TAG, "ًں›‘ Stopped BLE advertising")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to stop advertising", e)
            promise.reject("BLE_ERROR", e.message)
        }
    }

    /**
     * Check if currently advertising
     */
    @ReactMethod
    fun isAdvertising(promise: Promise) {
        promise.resolve(isAdvertising)
    }

    /**
     * Check if BLE advertising is supported
     */
    @ReactMethod
    fun isSupported(promise: Promise) {
        val supported = bleAdvertiser != null && 
            bluetoothAdapter?.isMultipleAdvertisementSupported == true
        promise.resolve(supported)
    }

    private val advertiseCallback = object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
            isAdvertising = true
            Log.d(TAG, "âœ… BLE Advertising started successfully")
            
            val params = Arguments.createMap().apply {
                putBoolean("success", true)
                putString("deviceName", deviceName)
            }
            sendEvent("onAdvertisingStarted", params)
        }

        override fun onStartFailure(errorCode: Int) {
            isAdvertising = false
            val errorMessage = when (errorCode) {
                ADVERTISE_FAILED_DATA_TOO_LARGE -> "Data too large"
                ADVERTISE_FAILED_TOO_MANY_ADVERTISERS -> "Too many advertisers"
                ADVERTISE_FAILED_ALREADY_STARTED -> "Already started"
                ADVERTISE_FAILED_INTERNAL_ERROR -> "Internal error"
                ADVERTISE_FAILED_FEATURE_UNSUPPORTED -> "Feature unsupported"
                else -> "Unknown error: $errorCode"
            }
            Log.e(TAG, "â‌Œ BLE Advertising failed: $errorMessage")
            
            val params = Arguments.createMap().apply {
                putBoolean("success", false)
                putString("error", errorMessage)
            }
            sendEvent("onAdvertisingFailed", params)
        }
    }
}


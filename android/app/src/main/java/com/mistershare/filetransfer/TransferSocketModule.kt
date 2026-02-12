package com.mistershare.filetransfer

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.IBinder
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class TransferSocketModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var transferService: TransferService? = null
    private var isBound = false

    private val connection = object : ServiceConnection {
        override fun onServiceConnected(className: ComponentName, service: IBinder) {
            val binder = service as TransferService.LocalBinder
            transferService = binder.getService()
            isBound = true
            
            // Set up listener to forward events to React Native
            transferService?.setListener { event, data ->
                sendEvent(event, data)
            }
        }

        override fun onServiceDisconnected(arg0: ComponentName) {
            isBound = false
            transferService = null
        }
    }

    init {
        val intent = Intent(reactContext, TransferService::class.java)
        reactContext.bindService(intent, connection, Context.BIND_AUTO_CREATE)
    }

    override fun getName(): String {
        return "TransferSocketModule"
    }

    @ReactMethod
    fun startServer(port: Int, promise: Promise) {
        if (isBound && transferService != null) {
            transferService?.startServer(port)
            promise.resolve(true)
        } else {
            promise.reject("SERVICE_NOT_BOUND", "Transfer Service not bound yet")
        }
    }
    
    @ReactMethod
    fun prepareReceive(fileName: String, savePath: String, promise: Promise) {
        if (isBound && transferService != null) {
            transferService?.prepareReceive(fileName, savePath)
            promise.resolve(true)
        } else {
             promise.reject("SERVICE_NOT_BOUND", "Transfer Service not bound yet")
        }
    }

    @ReactMethod
    fun connectAndSend(host: String, port: Int, filePath: String, displayName: String, promise: Promise) {
        connectAndSendWithRole(host, port, filePath, displayName, false, promise)
    }
    
    /**
     * Connect and send with explicit role specification.
     * @param isGroupOwner true if this device is the hotspot owner (Host mode)
     *                     false if this device connected to someone else's hotspot (Client mode)
     */
    @ReactMethod
    fun connectAndSendWithRole(host: String, port: Int, filePath: String, displayName: String, isGroupOwner: Boolean, promise: Promise) {
        if (isBound && transferService != null) {
            android.util.Log.d("TransferSocket", "ًں“¤ connectAndSend: host=$host, isGroupOwner=$isGroupOwner")
            
            if (isGroupOwner) {
                // HOST MODE: We created the hotspot, so we MUST use socket binding
                // Do NOT use NetworkHolder.boundNetwork - that's the home WiFi!
                android.util.Log.d("TransferSocket", "ًں“¶ Host mode: Will use socket binding to hotspot interface")
                transferService?.setBoundNetwork(null) // Clear any stale network
                transferService?.setIsGroupOwner(true)
            } else {
                // CLIENT MODE: We connected to someone's hotspot, use boundNetwork
                val network = NetworkHolder.boundNetwork
                
                if (network != null) {
                    android.util.Log.d("TransferSocket", "ًں“¶ Client mode: Using NetworkHolder bound network âœ…")
                    transferService?.setBoundNetwork(network)
                } else {
                    android.util.Log.w("TransferSocket", "âڑ ï¸ڈ Client mode but no bound network, trying fallback...")
                    
                    // Fallback: Try to get active WiFi network
                    try {
                        val connectivityManager = reactApplicationContext.getSystemService(android.content.Context.CONNECTIVITY_SERVICE) as android.net.ConnectivityManager
                        val activeNetwork = connectivityManager.activeNetwork
                        val capabilities = connectivityManager.getNetworkCapabilities(activeNetwork)
                        
                        if (capabilities?.hasTransport(android.net.NetworkCapabilities.TRANSPORT_WIFI) == true) {
                            android.util.Log.d("TransferSocket", "ًں“¶ Found active WiFi network as fallback")
                            transferService?.setBoundNetwork(activeNetwork)
                        } else {
                            android.util.Log.e("TransferSocket", "â‌Œ No WiFi network available!")
                        }
                    } catch (e: Exception) {
                        android.util.Log.e("TransferSocket", "â‌Œ Error in fallback: ${e.message}")
                    }
                }
                transferService?.setIsGroupOwner(false)
            }
            
            transferService?.connectAndSend(host, port, filePath, displayName)
            promise.resolve(true)
        } else {
            promise.reject("SERVICE_NOT_BOUND", "Transfer Service not bound yet")
        }
    }

    @ReactMethod
    fun stop(promise: Promise) {
         if (isBound && transferService != null) {
            transferService?.stop()
            promise.resolve(true)
        } else {
            promise.resolve(false)
        }
    }

    // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ HYPERSPEED PARALLEL TRANSFER â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
    
    @ReactMethod
    fun parallelSend(host: String, filePath: String, displayName: String, promise: Promise) {
        if (isBound && transferService != null) {
            transferService?.parallelSend(host, filePath, displayName)
            promise.resolve(true)
        } else {
            promise.reject("SERVICE_NOT_BOUND", "Transfer Service not bound yet")
        }
    }
    
    @ReactMethod
    fun startParallelReceiver(fileName: String, fileSize: Double, savePath: String, promise: Promise) {
        if (isBound && transferService != null) {
            transferService?.startParallelReceiver(fileName, fileSize.toLong(), savePath)
            promise.resolve(true)
        } else {
            promise.reject("SERVICE_NOT_BOUND", "Transfer Service not bound yet")
        }
    }

    private fun sendEvent(eventName: String, data: Any) {
        val params = Arguments.createMap()
        
        when (data) {
            is String -> params.putString("data", data)
            is Map<*, *> -> {
                for ((k, v) in data) {
                    when (v) {
                        is String -> params.putString(k as String, v)
                        is Int -> params.putInt(k as String, v)
                        is Long -> params.putDouble(k as String, v.toDouble()) // JS uses double for large numbers
                        is Double -> params.putDouble(k as String, v)
                        is Boolean -> params.putBoolean(k as String, v)
                    }
                }
            }
        }
        
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}


package com.mistershare.filetransfer

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * NSD Service Discovery Module - SHAREit-style Service Advertisement
 * 
 * 2024 Android Best Practice:
 * Uses mDNS/DNS-SD to advertise the handshake server on the local network.
 * This allows clients to discover the host without hardcoding IP addresses.
 * 
 * Protocol: _mistershare._tcp (custom service type for MisterShare)
 */
class NsdServiceModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val TAG = "NsdService"
        const val SERVICE_TYPE = "_mistershare._tcp."
        const val SERVICE_NAME_PREFIX = "MisterShare_"
    }

    private var nsdManager: NsdManager? = null
    private var registrationListener: NsdManager.RegistrationListener? = null
    private var discoveryListener: NsdManager.DiscoveryListener? = null
    private var resolveListener: NsdManager.ResolveListener? = null
    private var isRegistered = false
    private var isDiscovering = false
    private var serviceName: String? = null

    override fun getName(): String = "NsdService"

    init {
        nsdManager = reactContext.getSystemService(Context.NSD_SERVICE) as NsdManager
    }

    /**
     * Send event to JavaScript layer
     */
    private fun sendEvent(eventName: String, params: WritableMap) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    // ==================== HOST: Register Service ====================

    /**
     * Register the handshake server as an NSD service
     * Called by the receiver/host when starting the handshake server
     */
    @ReactMethod
    fun registerService(deviceName: String, port: Int, promise: Promise) {
        if (isRegistered) {
            promise.resolve(true)
            return
        }

        try {
            val serviceInfo = NsdServiceInfo().apply {
                this.serviceName = "$SERVICE_NAME_PREFIX$deviceName"
                this.serviceType = SERVICE_TYPE
                this.port = port
            }

            registrationListener = object : NsdManager.RegistrationListener {
                override fun onServiceRegistered(info: NsdServiceInfo) {
                    serviceName = info.serviceName
                    isRegistered = true
                    Log.d(TAG, "âœ… Service registered: ${info.serviceName} on port $port")
                    
                    val params = Arguments.createMap().apply {
                        putString("serviceName", info.serviceName)
                        putInt("port", port)
                    }
                    sendEvent("onNsdServiceRegistered", params)
                }

                override fun onRegistrationFailed(info: NsdServiceInfo, errorCode: Int) {
                    isRegistered = false
                    Log.e(TAG, "â‌Œ Registration failed: $errorCode")
                }

                override fun onServiceUnregistered(info: NsdServiceInfo) {
                    isRegistered = false
                    Log.d(TAG, "ًں›‘ Service unregistered: ${info.serviceName}")
                }

                override fun onUnregistrationFailed(info: NsdServiceInfo, errorCode: Int) {
                    Log.e(TAG, "â‌Œ Unregistration failed: $errorCode")
                }
            }

            nsdManager?.registerService(serviceInfo, NsdManager.PROTOCOL_DNS_SD, registrationListener)
            promise.resolve(true)
            
        } catch (e: Exception) {
            Log.e(TAG, "â‌Œ Failed to register service: ${e.message}")
            promise.reject("REGISTER_ERROR", "Failed to register NSD service: ${e.message}")
        }
    }

    /**
     * Unregister the NSD service
     */
    @ReactMethod
    fun unregisterService(promise: Promise) {
        try {
            if (isRegistered && registrationListener != null) {
                nsdManager?.unregisterService(registrationListener)
                isRegistered = false
                serviceName = null
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("UNREGISTER_ERROR", "Failed to unregister: ${e.message}")
        }
    }

    // ==================== CLIENT: Discover Services ====================

    /**
     * Start discovering MisterShare services on the network
     * Called by the client/sender to find available hosts
     */
    @ReactMethod
    fun startDiscovery(promise: Promise) {
        if (isDiscovering) {
            promise.resolve(true)
            return
        }

        try {
            discoveryListener = object : NsdManager.DiscoveryListener {
                override fun onDiscoveryStarted(serviceType: String) {
                    isDiscovering = true
                    Log.d(TAG, "ًں”چ Discovery started for: $serviceType")
                }

                override fun onServiceFound(serviceInfo: NsdServiceInfo) {
                    Log.d(TAG, "ًں“، Service found: ${serviceInfo.serviceName}")
                    
                    // Only process MisterShare services
                    if (serviceInfo.serviceType == SERVICE_TYPE ||
                        serviceInfo.serviceName.startsWith(SERVICE_NAME_PREFIX)) {
                        resolveService(serviceInfo)
                    }
                }

                override fun onServiceLost(serviceInfo: NsdServiceInfo) {
                    Log.d(TAG, "ًں“´ Service lost: ${serviceInfo.serviceName}")
                    
                    val params = Arguments.createMap().apply {
                        putString("serviceName", serviceInfo.serviceName)
                    }
                    sendEvent("onNsdServiceLost", params)
                }

                override fun onDiscoveryStopped(serviceType: String) {
                    isDiscovering = false
                    Log.d(TAG, "ًں›‘ Discovery stopped")
                }

                override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {
                    isDiscovering = false
                    Log.e(TAG, "â‌Œ Discovery start failed: $errorCode")
                }

                override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) {
                    Log.e(TAG, "â‌Œ Discovery stop failed: $errorCode")
                }
            }

            nsdManager?.discoverServices(SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, discoveryListener)
            promise.resolve(true)
            
        } catch (e: Exception) {
            Log.e(TAG, "â‌Œ Failed to start discovery: ${e.message}")
            promise.reject("DISCOVERY_ERROR", "Failed to start discovery: ${e.message}")
        }
    }

    /**
     * Resolve a discovered service to get its IP and port
     */
    private fun resolveService(serviceInfo: NsdServiceInfo) {
        resolveListener = object : NsdManager.ResolveListener {
            override fun onResolveFailed(info: NsdServiceInfo, errorCode: Int) {
                Log.e(TAG, "â‌Œ Resolve failed: $errorCode for ${info.serviceName}")
            }

            override fun onServiceResolved(info: NsdServiceInfo) {
                val hostAddress = info.host?.hostAddress ?: return
                val port = info.port
                val name = info.serviceName.removePrefix(SERVICE_NAME_PREFIX)
                
                Log.d(TAG, "âœ… Service resolved: $name @ $hostAddress:$port")
                
                val params = Arguments.createMap().apply {
                    putString("serviceName", info.serviceName)
                    putString("deviceName", name)
                    putString("hostAddress", hostAddress)
                    putInt("port", port)
                }
                sendEvent("onNsdServiceResolved", params)
            }
        }

        try {
            nsdManager?.resolveService(serviceInfo, resolveListener)
        } catch (e: Exception) {
            Log.e(TAG, "â‌Œ Failed to resolve service: ${e.message}")
        }
    }

    /**
     * Stop service discovery
     */
    @ReactMethod
    fun stopDiscovery(promise: Promise) {
        try {
            if (isDiscovering && discoveryListener != null) {
                nsdManager?.stopServiceDiscovery(discoveryListener)
                isDiscovering = false
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", "Failed to stop discovery: ${e.message}")
        }
    }

    /**
     * Check if service is registered
     */
    @ReactMethod
    fun isServiceRegistered(promise: Promise) {
        promise.resolve(isRegistered)
    }

    /**
     * Check if discovery is running
     */
    @ReactMethod
    fun isDiscoveryRunning(promise: Promise) {
        promise.resolve(isDiscovering)
    }
}


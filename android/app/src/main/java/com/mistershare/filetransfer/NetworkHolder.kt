package com.mistershare.filetransfer

import android.net.Network
import android.util.Log

/**
 * NetworkHolder - Singleton for sharing the bound Network across modules.
 * 
 * This is the recommended approach for Android WifiNetworkSpecifier/LocalOnlyHotspot
 * to ensure all sockets use the correct network interface.
 * 
 * Usage:
 *   - WiFiDirectAdvancedModule stores the network in onAvailable()
 *   - TransferSocketModule reads the network before creating sockets
 *   - TransferService uses network.socketFactory for socket creation
 */
object NetworkHolder {
    private const val TAG = "NetworkHolder"
    
    /**
     * The bound network from WifiNetworkSpecifier connection.
     * Volatile ensures visibility across threads.
     */
    @Volatile
    var boundNetwork: Network? = null
        private set
    
    /**
     * Store a new bound network and log the change.
     */
    fun setBoundNetwork(network: Network?) {
        val oldNetwork = boundNetwork
        boundNetwork = network
        Log.d(TAG, "ًں“¶ Network changed: ${oldNetwork?.toString() ?: "null"} -> ${network?.toString() ?: "null"}")
    }
    
    /**
     * Clear the bound network (call on disconnect/lost).
     */
    fun clear() {
        Log.d(TAG, "ًں”Œ Clearing bound network")
        boundNetwork = null
    }
    
    /**
     * Check if a valid bound network exists.
     */
    fun hasNetwork(): Boolean = boundNetwork != null
}


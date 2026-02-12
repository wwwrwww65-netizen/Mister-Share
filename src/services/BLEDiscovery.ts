import { NativeModules, DeviceEventEmitter, EmitterSubscription } from 'react-native';

const { BLEAdvertiser, BLEScanner, BLEConnection } = NativeModules;

// ==================== Types ====================

export interface DiscoveredDevice {
    address: string;
    name: string;
    rssi: number;
    isNew?: boolean;
    ssid?: string;
    password?: string;
}

export interface ConnectionRequest {
    deviceAddress: string;
    deviceName: string;
    deviceId: string;
}

export interface HotspotCredentials {
    ssid: string;
    password: string;
    hostAddress: string;
}

// Legacy type for backward compatibility
export interface BLECredentials {
    ssid: string;
    password: string;
    ip: string;
    port: number;
}

export type BLEDiscoveryState = 'idle' | 'scanning' | 'advertising' | 'connecting';

// ==================== BLE Discovery Service ====================

class BLEDiscoveryService {
    private deviceFoundListeners: ((device: DiscoveredDevice) => void)[] = [];
    private connectionRequestListeners: ((request: ConnectionRequest) => void)[] = [];
    private credentialsReceivedListeners: ((credentials: HotspotCredentials) => void)[] = [];
    private connectionStateListeners: ((state: { deviceAddress: string; status: string }) => void)[] = [];

    private subscriptions: EmitterSubscription[] = [];
    private isInitialized = false;
    private state: BLEDiscoveryState = 'idle';

    /**
     * Initialize BLE service and setup event listeners
     */
    async initialize(): Promise<boolean> {
        if (this.isInitialized) return true;

        // Device discovery events
        this.subscriptions.push(
            DeviceEventEmitter.addListener('onDeviceFound', (device: DiscoveredDevice) => {
                console.log('[BLE] 📱 Device found:', device.name, device.address);
                this.deviceFoundListeners.forEach(cb => cb(device));
            })
        );

        // Connection request events (host receives this)
        this.subscriptions.push(
            DeviceEventEmitter.addListener('onConnectionRequest', (request: ConnectionRequest) => {
                console.log('[BLE] 🤝 Connection request from:', request.deviceName);
                this.connectionRequestListeners.forEach(cb => cb(request));
            })
        );

        // Credentials received events (client receives this after approval)
        this.subscriptions.push(
            DeviceEventEmitter.addListener('onCredentialsReceived', (credentials: HotspotCredentials) => {
                console.log('[BLE] ✅ Credentials received for:', credentials.ssid);
                this.credentialsReceivedListeners.forEach(cb => cb(credentials));
            })
        );

        // Connection state changes
        this.subscriptions.push(
            DeviceEventEmitter.addListener('onConnectionStateChanged', (state: any) => {
                console.log('[BLE] 🔄 Connection state:', state.status, 'errorCode:', state.errorCode);
                if (state.status === 'error') {
                    console.error('[BLE] ❌ GATT Error! Code:', state.errorCode, 'Address:', state.deviceAddress);
                }
                this.connectionStateListeners.forEach(cb => cb(state));
            })
        );

        // Connection rejected
        this.subscriptions.push(
            DeviceEventEmitter.addListener('onConnectionRejected', () => {
                console.log('[BLE] ❌ Connection rejected by host');
                this.connectionStateListeners.forEach(cb => cb({
                    deviceAddress: '',
                    status: 'rejected'
                }));
            })
        );

        // Connection approved
        this.subscriptions.push(
            DeviceEventEmitter.addListener('onConnectionApproved', (data: any) => {
                console.log('[BLE] ✅ Connection approved for:', data.deviceAddress);
            })
        );

        this.isInitialized = true;
        console.log('[BLE] ✅ Discovery service initialized');
        return true;
    }

    /**
     * Cleanup all listeners
     */
    async cleanup(): Promise<void> {
        this.subscriptions.forEach(sub => sub.remove());
        this.subscriptions = [];
        this.deviceFoundListeners = [];
        this.connectionRequestListeners = [];
        this.credentialsReceivedListeners = [];
        this.connectionStateListeners = [];
        this.isInitialized = false;
        this.state = 'idle';

        // Stop any ongoing operations
        await this.stopAdvertising();
        await this.stopScanning();
    }

    /**
     * Get current discovery state
     */
    getState(): BLEDiscoveryState {
        return this.state;
    }

    // ==================== Event Subscription ====================

    onDeviceFound(callback: (device: DiscoveredDevice) => void): () => void {
        this.deviceFoundListeners.push(callback);
        return () => {
            const index = this.deviceFoundListeners.indexOf(callback);
            if (index > -1) this.deviceFoundListeners.splice(index, 1);
        };
    }

    onConnectionRequest(callback: (request: ConnectionRequest) => void): () => void {
        this.connectionRequestListeners.push(callback);
        return () => {
            const index = this.connectionRequestListeners.indexOf(callback);
            if (index > -1) this.connectionRequestListeners.splice(index, 1);
        };
    }

    onCredentialsReceived(callback: (credentials: HotspotCredentials) => void): () => void {
        this.credentialsReceivedListeners.push(callback);
        return () => {
            const index = this.credentialsReceivedListeners.indexOf(callback);
            if (index > -1) this.credentialsReceivedListeners.splice(index, 1);
        };
    }

    onConnectionStateChanged(callback: (state: { deviceAddress: string; status: string }) => void): () => void {
        this.connectionStateListeners.push(callback);
        return () => {
            const index = this.connectionStateListeners.indexOf(callback);
            if (index > -1) this.connectionStateListeners.splice(index, 1);
        };
    }

    // ==================== Advertiser (Host - Device A) ====================

    /**
     * Start BLE advertising as a MisterShare host
     * Also starts the GATT server for receiving connection requests
     */
    async startAdvertising(deviceName: string, ssid?: string, password?: string, ip?: string, port?: number): Promise<void> {
        try {
            if (!this.isInitialized) await this.initialize();

            console.log('[BLE] 📡 Starting advertising as:', deviceName);
            console.log('[BLE] 📋 Credentials - SSID:', ssid, 'Password:', password ? '[provided]' : '[MISSING]');

            // Start BLE advertising beacon with credentials
            // Connectionless Handshake: Embed SSID/Pass in Manufacturer Data
            await BLEAdvertiser.startAdvertising(deviceName, ssid, password);
            console.log('[BLE] ✅ BLE Advertising beacon started (Connectionless Mode)');

            // ALWAYS start GATT server for connection requests - use default if no credentials
            const serverSSID = ssid || 'MisterShare';
            const serverPassword = password || 'mistershare123';

            console.log('[BLE] 🔧 Starting GATT Server with:', serverSSID);
            await BLEConnection.startServer(deviceName, serverSSID, serverPassword);
            console.log('[BLE] ✅ GATT Server started with credentials');

            this.state = 'advertising';
            console.log('[BLE] ✅ Advertising started successfully');
        } catch (error: any) {
            console.error('[BLE] ❌ Failed to start advertising:', error.message);
            throw error;
        }
    }

    /**
     * Stop BLE advertising and GATT server
     */
    async stopAdvertising(): Promise<void> {
        try {
            await BLEAdvertiser?.stopAdvertising?.();
            await BLEConnection?.stopServer?.();
            this.state = 'idle';
            console.log('[BLE] 🛑 Advertising stopped');
        } catch (error: any) {
            console.error('[BLE] Failed to stop advertising:', error.message);
        }
    }

    /**
     * Check if BLE advertising is supported
     */
    async isAdvertisingSupported(): Promise<boolean> {
        try {
            return await BLEAdvertiser?.isSupported?.() ?? false;
        } catch {
            return false;
        }
    }

    // ==================== Scanner (Client - Device B) ====================

    /**
     * Start scanning for MisterShare devices
     */
    async startScanning(onDeviceFound?: (device: DiscoveredDevice) => void, timeoutMs: number = 30000): Promise<void> {
        try {
            if (!this.isInitialized) await this.initialize();

            console.log('[BLE] 🔍 Starting scan for MisterShare devices');

            // Register callback if provided
            if (onDeviceFound) {
                this.onDeviceFound(onDeviceFound);
            }

            await BLEScanner.startScanning();
            this.state = 'scanning';

            // Auto-stop after timeout
            if (timeoutMs > 0) {
                setTimeout(() => {
                    if (this.state === 'scanning') {
                        this.stopScanning();
                    }
                }, timeoutMs);
            }
        } catch (error: any) {
            console.error('[BLE] ❌ Failed to start scanning:', error.message);
            throw error;
        }
    }

    /**
     * Stop scanning
     */
    async stopScanning(): Promise<void> {
        try {
            await BLEScanner?.stopScanning?.();
            if (this.state === 'scanning') {
                this.state = 'idle';
            }
            console.log('[BLE] 🛑 Scanning stopped');
        } catch (error: any) {
            console.error('[BLE] Failed to stop scanning:', error.message);
        }
    }

    /**
     * Get list of discovered devices
     */
    async getDiscoveredDevices(): Promise<DiscoveredDevice[]> {
        try {
            return await BLEScanner?.getDiscoveredDevices?.() ?? [];
        } catch {
            return [];
        }
    }

    /**
     * Clear discovered devices
     */
    async clearDiscoveredDevices(): Promise<void> {
        try {
            await BLEScanner?.clearDiscoveredDevices?.();
        } catch (error: any) {
            console.error('[BLE] Failed to clear devices:', error.message);
        }
    }

    // ==================== Connection (GATT Handshake) ====================

    /**
     * Approve a connection request (Host - Device A)
     * This sends credentials to the requesting device
     */
    async approveConnection(deviceAddress: string): Promise<boolean> {
        try {
            console.log('[BLE] ✅ Approving connection for:', deviceAddress);
            return await BLEConnection.approveConnection(deviceAddress);
        } catch (error: any) {
            console.error('[BLE] Failed to approve:', error.message);
            return false;
        }
    }

    /**
     * Reject a connection request (Host - Device A)
     */
    async rejectConnection(deviceAddress: string): Promise<boolean> {
        try {
            console.log('[BLE] ❌ Rejecting connection for:', deviceAddress);
            return await BLEConnection.rejectConnection(deviceAddress);
        } catch (error: any) {
            console.error('[BLE] Failed to reject:', error.message);
            return false;
        }
    }

    /**
     * Request connection to a host device (Client - Device B)
     * This initiates the handshake process
     */
    async requestConnection(deviceAddress: string, myName: string, myId: string): Promise<boolean> {
        try {
            if (!this.isInitialized) await this.initialize();

            console.log('[BLE] 🤝 Requesting connection to:', deviceAddress);
            console.log('[BLE] 📍 Calling native BLEConnection.requestConnection...');
            this.state = 'connecting';

            const result = await BLEConnection.requestConnection(deviceAddress, myName, myId);
            console.log('[BLE] ✅ Native requestConnection returned:', result);
            return result;
        } catch (error: any) {
            console.error('[BLE] ❌ Failed to request connection:', error.message);
            console.error('[BLE] ❌ Error details:', error);
            this.state = 'idle';
            return false;
        }
    }

    /**
     * Disconnect from GATT (Client)
     */
    async disconnect(): Promise<void> {
        try {
            await BLEConnection?.disconnect?.();
            this.state = 'idle';
        } catch (error: any) {
            console.error('[BLE] Failed to disconnect:', error.message);
        }
    }

    // ==================== Legacy Methods (for backward compatibility) ====================

    /**
     * @deprecated Use requestConnection + onCredentialsReceived instead
     */
    async getCredentials(deviceId: string): Promise<BLECredentials> {
        console.warn('[BLE] getCredentials is deprecated. Use requestConnection + onCredentialsReceived');
        throw new Error('Use requestConnection + onCredentialsReceived instead');
    }

    /**
     * @deprecated Use cleanup instead
     */
    async writeConnectionInfo(address: string, port: number): Promise<void> {
        console.warn('[BLE] writeConnectionInfo is deprecated');
    }
}

// Export singleton instance
const BLEDiscovery = new BLEDiscoveryService();
export { BLEDiscovery };
export default BLEDiscovery;

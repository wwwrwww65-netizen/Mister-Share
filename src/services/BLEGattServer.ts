import { NativeModules, NativeEventEmitter } from 'react-native';

const { BLEGattServer } = NativeModules;

export interface BLEAdvertisingConfig {
    deviceName: string;
    ipAddress: string;
    port: number;
    ssid: string;
    password: string;
}

class BLEGattServerService {
    private eventEmitter: NativeEventEmitter | null = null;

    constructor() {
        if (BLEGattServer) {
            this.eventEmitter = new NativeEventEmitter(BLEGattServer);
        }
    }

    /**
     * Start Advertising BLE signals with encrypted credentials ready for handshake
     */
    async startAdvertising(config: BLEAdvertisingConfig): Promise<{ success: boolean; message: string }> {
        if (!BLEGattServer) return { success: false, message: 'Module not found' };

        try {
            return await BLEGattServer.startAdvertising(
                config.deviceName,
                config.ipAddress,
                config.port,
                config.ssid,
                config.password
            );
        } catch (error) {
            console.error('[BLE Server] Start Error:', error);
            throw error;
        }
    }

    /**
     * Stop Advertising
     */
    async stopAdvertising(): Promise<void> {
        if (!BLEGattServer) return;
        try {
            await BLEGattServer.stopAdvertising();
        } catch (error) {
            console.error('[BLE Server] Stop Error:', error);
        }
    }

    /**
     * Approve a pending connection request
     * This pushes the credentials to the waiting client
     */
    async approveConnection(requestId: string, deviceAddress: string): Promise<void> {
        if (!BLEGattServer) return;
        try {
            await BLEGattServer.approveConnection(requestId, deviceAddress);
        } catch (error) {
            console.error('[BLE Server] Approve Error:', error);
            throw error;
        }
    }

    /**
     * Add Listener for incoming handshake requests
     */
    onRequest(callback: (data: { requestId: string, deviceAddress: string, deviceName: string }) => void) {
        if (!this.eventEmitter) return () => { };

        const sub = this.eventEmitter.addListener('onBLERequest', callback);
        return () => sub.remove();
    }
}

export default new BLEGattServerService();

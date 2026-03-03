/**
 * NSD Service - Network Service Discovery
 * 
 * 2024 SHAREit Architecture:
 * Uses mDNS/DNS-SD to advertise and discover transfer services on local network.
 * This eliminates the need for hardcoded IP addresses.
 * 
 * Usage:
 * - Host: NsdService.registerService('MyDevice', 12321) → advertises handshake server
 * - Client: NsdService.startDiscovery() → discovers available hosts
 */

import { NativeModules, DeviceEventEmitter, EmitterSubscription } from 'react-native';

const { NsdService } = NativeModules;

export interface NsdServiceInfo {
    serviceName: string;
    deviceName: string;
    hostAddress: string;
    port: number;
}

export interface NsdEvents {
    onServiceRegistered: (info: { serviceName: string; port: number }) => void;
    onServiceResolved: (info: NsdServiceInfo) => void;
    onServiceLost: (info: { serviceName: string }) => void;
}

class NsdServiceClass {
    private subscriptions: EmitterSubscription[] = [];
    private serviceResolvedCallbacks: ((info: NsdServiceInfo) => void)[] = [];
    private serviceLostCallbacks: ((name: string) => void)[] = [];
    private isInitialized = false;

    /**
     * Initialize event listeners
     */
    initialize(): void {
        if (this.isInitialized || !NsdService) return;

        this.subscriptions.push(
            DeviceEventEmitter.addListener('onNsdServiceResolved', (info: NsdServiceInfo) => {
                console.log('[NsdService] 📡 Service resolved:', info.deviceName, '@', info.hostAddress);
                this.serviceResolvedCallbacks.forEach(cb => cb(info));
            })
        );

        this.subscriptions.push(
            DeviceEventEmitter.addListener('onNsdServiceLost', (info: { serviceName: string }) => {
                console.log('[NsdService] 📴 Service lost:', info.serviceName);
                this.serviceLostCallbacks.forEach(cb => cb(info.serviceName));
            })
        );

        this.isInitialized = true;
        console.log('[NsdService] ✅ Initialized');
    }

    /**
     * Cleanup
     */
    cleanup(): void {
        this.subscriptions.forEach(sub => sub.remove());
        this.subscriptions = [];
        this.serviceResolvedCallbacks = [];
        this.serviceLostCallbacks = [];
        this.isInitialized = false;
    }

    // ==================== HOST: Register Service ====================

    /**
     * Register the handshake server as an NSD service
     * @param deviceName - Name to advertise (e.g., "Samsung Galaxy S21")
     * @param port - Handshake server port (default: 12321)
     */
    async registerService(deviceName: string, port: number = 12321): Promise<boolean> {
        if (!NsdService) {
            console.warn('[NsdService] Not available on this platform');
            return false;
        }

        try {
            console.log('[NsdService] 📡 Registering service:', deviceName, 'on port', port);
            const result = await NsdService.registerService(deviceName, port);
            console.log('[NsdService] ✅ Service registered');
            return result;
        } catch (error: any) {
            console.error('[NsdService] ❌ Failed to register:', error.message);
            return false;
        }
    }

    /**
     * Unregister the NSD service
     */
    async unregisterService(): Promise<boolean> {
        if (!NsdService) return true;

        try {
            const result = await NsdService.unregisterService();
            console.log('[NsdService] 🛑 Service unregistered');
            return result;
        } catch (error: any) {
            console.error('[NsdService] Failed to unregister:', error.message);
            return false;
        }
    }

    // ==================== CLIENT: Discover Services ====================

    /**
     * Start discovering MisterShare services on the network
     */
    async startDiscovery(): Promise<boolean> {
        if (!NsdService) {
            console.warn('[NsdService] Not available on this platform');
            return false;
        }

        if (!this.isInitialized) this.initialize();

        try {
            console.log('[NsdService] 🔍 Starting discovery...');
            const result = await NsdService.startDiscovery();
            return result;
        } catch (error: any) {
            console.error('[NsdService] ❌ Failed to start discovery:', error.message);
            return false;
        }
    }

    /**
     * Stop service discovery
     */
    async stopDiscovery(): Promise<boolean> {
        if (!NsdService) return true;

        try {
            const result = await NsdService.stopDiscovery();
            console.log('[NsdService] 🛑 Discovery stopped');
            return result;
        } catch (error: any) {
            console.error('[NsdService] Failed to stop discovery:', error.message);
            return false;
        }
    }

    // ==================== Event Handlers ====================

    /**
     * Register callback for when a service is discovered and resolved
     */
    onServiceResolved(callback: (info: NsdServiceInfo) => void): () => void {
        if (!this.isInitialized) this.initialize();
        this.serviceResolvedCallbacks.push(callback);
        return () => {
            const index = this.serviceResolvedCallbacks.indexOf(callback);
            if (index > -1) this.serviceResolvedCallbacks.splice(index, 1);
        };
    }

    /**
     * Register callback for when a service is lost
     */
    onServiceLost(callback: (serviceName: string) => void): () => void {
        if (!this.isInitialized) this.initialize();
        this.serviceLostCallbacks.push(callback);
        return () => {
            const index = this.serviceLostCallbacks.indexOf(callback);
            if (index > -1) this.serviceLostCallbacks.splice(index, 1);
        };
    }

    // ==================== Status Checks ====================

    /**
     * Check if service is registered
     */
    async isServiceRegistered(): Promise<boolean> {
        if (!NsdService) return false;
        try {
            return await NsdService.isServiceRegistered();
        } catch {
            return false;
        }
    }

    /**
     * Check if discovery is running
     */
    async isDiscoveryRunning(): Promise<boolean> {
        if (!NsdService) return false;
        try {
            return await NsdService.isDiscoveryRunning();
        } catch {
            return false;
        }
    }
}

export const NsdServiceInstance = new NsdServiceClass();
export default NsdServiceInstance;

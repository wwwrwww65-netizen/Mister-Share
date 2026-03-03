/**
 * TcpHandshakeService - Native Module Wrapper
 * 
 * This service wraps the native TcpHandshakeModule.kt for React Native.
 * It provides a unified interface for the SHAREit-style TCP handshake protocol.
 * 
 * Architecture:
 * - Host: Starts handshake server on Port 12321
 * - Client: Connects to host, sends HELLO, receives WELCOME
 * - Approval: First-time devices require user approval, trusted devices auto-approve
 */

import { NativeModules, DeviceEventEmitter, EmitterSubscription } from 'react-native';

const { TcpHandshake } = NativeModules;

// ==================== Types ====================

export interface PeerInfo {
    ip: string;
    name: string;
    id: string;
    autoApproved?: boolean;
}

export interface ApprovalRequest {
    clientName: string;
    clientId: string;
    clientIp: string;
}

export interface HandshakeResult {
    success: boolean;
    hostName?: string;
    hostIp?: string;
    transferPort?: number;
}

// ==================== Service ====================

class TcpHandshakeService {
    private subscriptions: EmitterSubscription[] = [];
    private peerConnectedListeners: ((peer: PeerInfo) => void)[] = [];
    private approvalRequestListeners: ((request: ApprovalRequest) => void)[] = [];
    private isInitialized = false;

    /**
     * Initialize event listeners for native module events
     */
    initialize(): void {
        if (this.isInitialized) return;

        // Listen for peer connected events (Host receives this after approval)
        this.subscriptions.push(
            DeviceEventEmitter.addListener('onPeerConnected', (peer: PeerInfo) => {
                console.log('[TcpHandshakeService] 🤝 Peer connected:', peer.name, '@', peer.ip);
                this.peerConnectedListeners.forEach(cb => cb(peer));
            })
        );

        // Listen for approval requests (Host receives this for first-time devices)
        this.subscriptions.push(
            DeviceEventEmitter.addListener('onApprovalRequest', (request: ApprovalRequest) => {
                console.log('[TcpHandshakeService] 📋 Approval request from:', request.clientName);
                this.approvalRequestListeners.forEach(cb => cb(request));
            })
        );

        this.isInitialized = true;
        console.log('[TcpHandshakeService] ✅ Initialized');
    }

    /**
     * Cleanup all listeners
     */
    cleanup(): void {
        this.subscriptions.forEach(sub => sub.remove());
        this.subscriptions = [];
        this.peerConnectedListeners = [];
        this.approvalRequestListeners = [];
        this.isInitialized = false;
    }

    // ==================== Event Subscription ====================

    /**
     * Register callback for when a peer connects successfully
     */
    onPeerConnected(callback: (peer: PeerInfo) => void): () => void {
        if (!this.isInitialized) this.initialize();
        this.peerConnectedListeners.push(callback);
        return () => {
            const index = this.peerConnectedListeners.indexOf(callback);
            if (index > -1) this.peerConnectedListeners.splice(index, 1);
        };
    }

    /**
     * Register callback for approval requests (first-time devices)
     */
    onApprovalRequest(callback: (request: ApprovalRequest) => void): () => void {
        if (!this.isInitialized) this.initialize();
        this.approvalRequestListeners.push(callback);
        return () => {
            const index = this.approvalRequestListeners.indexOf(callback);
            if (index > -1) this.approvalRequestListeners.splice(index, 1);
        };
    }

    // ==================== Host Methods ====================

    /**
     * Start the handshake server (Host mode)
     * Listens for incoming connection requests from clients
     */
    async startServer(deviceName: string): Promise<boolean> {
        if (!this.isInitialized) this.initialize();

        try {
            console.log('[TcpHandshakeService] 📡 Starting handshake server as:', deviceName);
            const result = await TcpHandshake.startHandshakeServer(deviceName);
            console.log('[TcpHandshakeService] ✅ Handshake server started');
            return result;
        } catch (error: any) {
            console.error('[TcpHandshakeService] ❌ Failed to start server:', error.message);
            throw error;
        }
    }

    /**
     * Stop the handshake server
     */
    async stopServer(): Promise<boolean> {
        try {
            const result = await TcpHandshake.stopHandshakeServer();
            console.log('[TcpHandshakeService] 🛑 Server stopped');
            return result;
        } catch (error: any) {
            console.error('[TcpHandshakeService] Failed to stop server:', error.message);
            return false;
        }
    }

    /**
     * Check if server is running
     */
    async isServerRunning(): Promise<boolean> {
        try {
            return await TcpHandshake.isServerRunning();
        } catch {
            return false;
        }
    }

    /**
     * Approve a pending connection request
     * @param clientId - The ID of the client to approve
     * @param addToTrusted - Whether to add this device to trusted list for auto-approval
     */
    async approveConnection(clientId: string, addToTrusted: boolean = false): Promise<boolean> {
        try {
            console.log('[TcpHandshakeService] ✅ Approving connection:', clientId, addToTrusted ? '(+ trusted)' : '');
            return await TcpHandshake.approveConnection(clientId, addToTrusted);
        } catch (error: any) {
            console.error('[TcpHandshakeService] Failed to approve:', error.message);
            throw error;
        }
    }

    /**
     * Reject a pending connection request
     */
    async rejectConnection(clientId: string): Promise<boolean> {
        try {
            console.log('[TcpHandshakeService] ❌ Rejecting connection:', clientId);
            return await TcpHandshake.rejectConnection(clientId);
        } catch (error: any) {
            console.error('[TcpHandshakeService] Failed to reject:', error.message);
            throw error;
        }
    }

    // ==================== Client Methods ====================

    /**
     * Perform handshake with host (Client mode)
     * Connects to the host's handshake server and requests connection
     */
    async performHandshake(hostIp: string, myName: string, myId: string): Promise<HandshakeResult> {
        if (!this.isInitialized) this.initialize();

        try {
            console.log('[TcpHandshakeService] 🔗 Performing handshake with:', hostIp);
            const result = await TcpHandshake.performHandshake(hostIp, myName, myId);
            console.log('[TcpHandshakeService] ✅ Handshake result:', result);
            return result;
        } catch (error: any) {
            console.error('[TcpHandshakeService] ❌ Handshake failed:', error.message);
            throw error;
        }
    }

    // ==================== Trusted Devices Management ====================

    /**
     * Get list of trusted device IDs
     */
    async getTrustedDevices(): Promise<string[]> {
        try {
            return await TcpHandshake.getTrustedDevicesList();
        } catch {
            return [];
        }
    }

    /**
     * Clear all trusted devices
     */
    async clearTrustedDevices(): Promise<boolean> {
        try {
            return await TcpHandshake.clearTrustedDevices();
        } catch {
            return false;
        }
    }

    /**
     * Remove a specific trusted device
     */
    async removeTrustedDevice(deviceId: string): Promise<boolean> {
        try {
            return await TcpHandshake.removeTrustedDevice(deviceId);
        } catch {
            return false;
        }
    }
}

// Export singleton instance
const tcpHandshakeService = new TcpHandshakeService();
export { tcpHandshakeService as TcpHandshakeService };
export default tcpHandshakeService;

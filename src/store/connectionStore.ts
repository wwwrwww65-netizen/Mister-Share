import { create } from 'zustand';
import { Vibration, Platform } from 'react-native';

/**
 * Connected peer information
 */
export interface ConnectedPeer {
    deviceAddress: string;
    deviceName: string;
    connectedAt: number;
}

/**
 * WiFi Direct Group information
 */
export interface GroupInfo {
    isGroupOwner: boolean;
    ssid: string | null;
    passphrase: string | null;
    groupOwnerAddress?: string;
}

/**
 * Global connection state interface
 */
interface ConnectionState {
    // Connection status
    isConnected: boolean;
    isConnecting: boolean;
    isGroupOwner: boolean;

    // Group info
    ssid: string | null;
    passphrase: string | null;

    // Connected peers
    connectedPeers: ConnectedPeer[];

    // Server IP (for file transfer - Group Owner's IP)
    serverIP: string;

    // Peer IP (for Host to send to Client)
    peerIP: string | null;

    // Error state
    error: string | null;

    // Target SSID (for connecting state display)
    targetSsid: string | null;

    // Actions
    setConnecting: (connecting: boolean, targetSsid?: string) => void;
    connectToNetwork: (ssid: string, password?: string) => Promise<void>;

    setGroupInfo: (info: GroupInfo) => void;
    addPeer: (peer: ConnectedPeer) => void;
    removePeer: (address: string) => void;
    updatePeers: (peers: ConnectedPeer[]) => void;
    setError: (error: string | null) => void;
    setPeerIP: (ip: string) => void;
    disconnect: () => void;
    reset: () => void;
}

/**
 * Default connection state
 */
const initialState = {
    isConnected: false,
    isConnecting: false,
    isGroupOwner: false,
    ssid: null,
    targetSsid: null,
    passphrase: null,
    connectedPeers: [],
    // Default IP - will be overridden by groupOwnerAddress from native module
    // LocalOnlyHotspot: 192.168.43.1 | WiFi Direct: 192.168.49.1
    serverIP: '192.168.43.1',
    peerIP: null,
    error: null,
};

/**
 * Haptic feedback patterns for connection events
 */
export const ConnectionHaptics = {
    connected: () => {
        if (Platform.OS === 'android') {
            // Double short vibration for connection success
            Vibration.vibrate([0, 100, 50, 100]);
        }
    },
    peerJoined: () => {
        if (Platform.OS === 'android') {
            // Single short vibration for peer join
            Vibration.vibrate(100);
        }
    },
    peerLeft: () => {
        if (Platform.OS === 'android') {
            // Long vibration for peer disconnect
            Vibration.vibrate(200);
        }
    },
    disconnected: () => {
        if (Platform.OS === 'android') {
            // Double long vibration for disconnect
            Vibration.vibrate([0, 200, 100, 200]);
        }
    },
    error: () => {
        if (Platform.OS === 'android') {
            // Triple short vibration for error
            Vibration.vibrate([0, 100, 50, 100, 50, 100]);
        }
    },
};

// Import necessary module for the action (Circular dependency check needed?)
import WiFiDirectAdvanced from '../services/WiFiDirectAdvanced';
import NsdServiceInstance from '../services/NsdService';

/**
 * 2024 SHAREIT ARCHITECTURE: Hybrid Host IP Discovery
 * 
 * Strategy:
 * 1. Direct DHCP Gateway Check (Fastest & Most Reliable for Hotspots)
 * 2. NSD/mDNS Discovery (Backup)
 * 
 * @param timeoutMs Maximum time to wait
 * @returns Host IP address
 */
export async function discoverHostIP(timeoutMs = 3000): Promise<string> {
    // 1. Try DHCP Gateway IP first (The "Gateway of Truth")
    try {
        console.log('[ConnectionStore] 🔍 Trying DHCP Gateway IP...');
        const gatewayIp = await WiFiDirectAdvanced.getConnectedGatewayIp();
        if (gatewayIp) {
            console.log('[ConnectionStore] ✅ Found Host via DHCP Gateway:', gatewayIp);
            return gatewayIp;
        }
    } catch (e) {
        // Only warn, don't error out, as we have fallbacks
        // console.warn('[ConnectionStore] DHCP Gateway check failed:', e);
    }

    // 2. Fallback to NSD
    return new Promise((resolve) => {
        let resolved = false;

        const timeoutId = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                console.warn('[ConnectionStore] ⚠️ Discovery timed out, using fallback 192.168.49.1');
                resolve('192.168.49.1'); // WiFi Direct Default
            }
        }, timeoutMs);

        // Listen for NSD services
        const unsubscribe = NsdServiceInstance.onServiceResolved((info: any) => { // Type 'any' to avoid strict check
            if (resolved) return;

            if (info.hostAddress && info.port === 12321) {
                console.log('[ConnectionStore] 📡 Found Host via NSD:', info.hostAddress);
                resolved = true;
                clearTimeout(timeoutId);
                NsdServiceInstance.stopDiscovery();
                unsubscribe();
                resolve(info.hostAddress);
            }
        });

        // Start Discovery
        NsdServiceInstance.initialize();
        NsdServiceInstance.startDiscovery().catch((err: any) => {
            console.warn('[ConnectionStore] NSD Discovery scan failed:', err);
        });
    });
}

/**
 * Global connection store using Zustand
 * Tracks WiFi Direct P2P connection state across all screens
 */
export const useConnectionStore = create<ConnectionState>((set, get) => ({
    ...initialState,

    setConnecting: (connecting: boolean, targetSsid?: string) => {
        set({ isConnecting: connecting, targetSsid: targetSsid || null, error: null });
    },

    connectToNetwork: async (ssid: string, password?: string) => {
        // 1. Set global connecting state
        set({ isConnecting: true, targetSsid: ssid, error: null });

        try {
            // 2. Perform connection
            await WiFiDirectAdvanced.connectToWiFiNetwork(ssid, password || '');

            // 3. Update state on success
            const state = get();
            // Haptic feedback for successful connection
            ConnectionHaptics.connected();

            // Smart IP detection based on SSID pattern:
            // DIRECT-* = WiFi Direct (192.168.49.1)
            // AndroidShare_* or other = LocalOnlyHotspot (192.168.43.1)
            const serverIP = ssid.startsWith('DIRECT-') ? '192.168.49.1' : '192.168.43.1';

            set({
                isConnected: true,
                isConnecting: false,
                isGroupOwner: false, // We joined, so we are client
                ssid: ssid,
                passphrase: password || null,
                serverIP: serverIP,
                targetSsid: null,
                error: null,
            });

            console.log(`[ConnectionStore] Connected to: ${ssid}, Server IP: ${serverIP}`);

        } catch (e: any) {
            console.error("[ConnectionStore] Connection failed:", e);
            ConnectionHaptics.error();
            set({
                isConnecting: false,
                targetSsid: null,
                error: "Connection Failed"
            });
            // We'll let the UI handle displaying the error via toast or status bar
            throw e; // Re-throw so caller can handle navigation if needed
        }
    },

    setGroupInfo: (info: GroupInfo) => {
        const { connectedPeers } = get();

        // Haptic feedback for successful connection
        ConnectionHaptics.connected();

        set({
            isConnected: true,
            isConnecting: false,
            isGroupOwner: info.isGroupOwner,
            ssid: info.ssid,
            passphrase: info.passphrase,
            serverIP: info.groupOwnerAddress || '192.168.43.1',
            error: null,
        });

        console.log('[ConnectionStore] Group info set:', {
            isGroupOwner: info.isGroupOwner,
            ssid: info.ssid,
            serverIP: info.groupOwnerAddress || '192.168.43.1',
            peerCount: connectedPeers.length,
        });
    },

    addPeer: (peer: ConnectedPeer) => {
        const { connectedPeers } = get();

        // Check if peer already exists
        const exists = connectedPeers.some(p => p.deviceAddress === peer.deviceAddress);
        if (exists) {
            console.log('[ConnectionStore] Peer already connected:', peer.deviceName);
            return;
        }

        // Haptic feedback for peer join
        ConnectionHaptics.peerJoined();

        set({
            connectedPeers: [...connectedPeers, peer],
            isConnected: true,
        });

        console.log('[ConnectionStore] Peer added:', peer.deviceName);
    },

    removePeer: (address: string) => {
        const { connectedPeers } = get();

        // Haptic feedback for peer leave
        ConnectionHaptics.peerLeft();

        const newPeers = connectedPeers.filter(p => p.deviceAddress !== address);

        set({
            connectedPeers: newPeers,
            // If no peers left and we're not the owner, we might be disconnected
            isConnected: newPeers.length > 0,
        });

        console.log('[ConnectionStore] Peer removed, remaining:', newPeers.length);
    },

    updatePeers: (peers: ConnectedPeer[]) => {
        const { connectedPeers } = get();

        // Check for new peers (to trigger haptic)
        const newPeers = peers.filter(
            p => !connectedPeers.some(existing => existing.deviceAddress === p.deviceAddress)
        );

        if (newPeers.length > 0) {
            ConnectionHaptics.peerJoined();
        }

        set({
            connectedPeers: peers,
            isConnected: peers.length > 0 || get().isGroupOwner,
        });
    },

    setError: (error: string | null) => {
        if (error) {
            ConnectionHaptics.error();
        }
        set({ error, isConnecting: false });
    },

    setPeerIP: (ip: string) => {
        console.log('[ConnectionStore] Peer IP set:', ip);
        set({ peerIP: ip });
    },

    disconnect: () => {
        // Haptic feedback for disconnect
        ConnectionHaptics.disconnected();

        set({
            isConnected: false,
            isConnecting: false,
            connectedPeers: [],
            error: null,
        });

        console.log('[ConnectionStore] Disconnected');
    },

    reset: () => {
        set(initialState);
        console.log('[ConnectionStore] Reset to initial state');
    },
}));

/**
 * Helper function to get the target IP for file transfer
 * - If we're the Group Owner (Host): we send to peerIP (client's IP)
 * - If we're a Client: we send to the Group Owner at serverIP
 */
export function getTransferTargetIP(): string {
    const state = useConnectionStore.getState();
    // Host sends to peerIP (client), Client sends to serverIP (host)
    if (state.isGroupOwner && state.peerIP) {
        console.log('[ConnectionStore] Host sending to peer:', state.peerIP);
        return state.peerIP;
    }
    console.log('[ConnectionStore] Client sending to server:', state.serverIP);
    return state.serverIP;
}

/**
 * Helper to check if currently connected
 */
export function isP2PConnected(): boolean {
    return useConnectionStore.getState().isConnected;
}

export default useConnectionStore;

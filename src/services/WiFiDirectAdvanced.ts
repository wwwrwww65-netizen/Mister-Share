import { NativeModules } from 'react-native';

const { WiFiDirectAdvanced } = NativeModules;

export interface WiFiGroupInfo {
    success: boolean;
    band: '5GHz' | '2.4GHz' | 'auto' | 'unknown';
    message: string;
    networkName?: string;
    passphrase?: string;
    isGroupOwner?: boolean;
    frequency?: number;
}

class WiFiDirectAdvancedService {
    /**
     * Create WiFi Direct group with 5GHz enforcement
     * Automatically falls back to 2.4GHz if 5GHz is not supported
     */
    async create5GHzGroup(): Promise<WiFiGroupInfo> {
        try {
            const result = await WiFiDirectAdvanced.createGroup5GHz();
            console.log('WiFi Direct group created:', result);
            return result;
        } catch (error) {
            console.error('Failed to create 5GHz group:', error);
            throw error;
        }
    }

    /**
     * Get current WiFi Direct group information
     * Including band (5GHz or 2.4GHz) and other details
     */
    async getGroupInfo(): Promise<WiFiGroupInfo> {
        try {
            const info = await WiFiDirectAdvanced.getGroupInfo();
            return {
                success: true,
                ...info,
            };
        } catch (error) {
            console.error('Failed to get group info:', error);
            throw error;
        }
    }

    /**
     * Remove WiFi Direct group
     */
    async removeGroup(): Promise<void> {
        try {
            await WiFiDirectAdvanced.removeGroup();
            console.log('WiFi Direct group removed');
        } catch (error) {
            console.error('Failed to remove group:', error);
            throw error;
        }
    }

    /**
     * Check if device is connected as Group Owner
     * This determines if device is receiver (server) or sender (client)
     */
    async isGroupOwner(): Promise<boolean> {
        try {
            const info = await this.getGroupInfo();
            return info.isGroupOwner || false;
        } catch {
            return false;
        }
    }

    /**
     * Get current operating band
     */
    async getCurrentBand(): Promise<string> {
        try {
            const info = await this.getGroupInfo();
            return info.band;
        } catch {
            return 'unknown';
        }
    }

    /**
     * Check if system Location Services are enabled
     */
    async isLocationEnabled(): Promise<boolean> {
        try {
            return await WiFiDirectAdvanced.isLocationEnabled();
        } catch (error) {
            console.error('Failed to check location status:', error);
            return false;
        }
    }

    /**
     * Open WiFi Settings Panel (Android Q+) or standard settings
     */
    async openWifiSettingsPanel(): Promise<boolean> {
        try {
            return await WiFiDirectAdvanced.openWifiSettingsPanel();
        } catch (error) {
            console.error('Failed to open WiFi settings:', error);
            return false;
        }
    }

    /**
     * Request to enable Bluetooth via system dialog
     */
    async enableBluetooth(): Promise<boolean> {
        try {
            return await WiFiDirectAdvanced.enableBluetooth();
        } catch (error) {
            console.error('Failed to enable Bluetooth:', error);
            return false;
        }
    }

    /**
     * Check if WiFi is enabled (hardware)
     */
    async isWifiEnabled(): Promise<boolean> {
        try {
            return await WiFiDirectAdvanced.isWifiEnabled();
        } catch (error) {
            console.error('Failed to check WiFi status:', error);
            return false;
        }
    }

    /**
     * Check if Bluetooth is enabled (hardware)
     */
    async isBluetoothEnabled(): Promise<boolean> {
        try {
            return await WiFiDirectAdvanced.isBluetoothEnabled();
        } catch (error) {
            console.error('Failed to check Bluetooth status:', error);
            return false;
        }
    }

    /**
     * Connect to specific WiFi Network (Legacy or Specifier)
     * Used for joining group via QR code credentials
     */
    async connectToNetwork(ssid: string, pass: string): Promise<boolean> {
        try {
            return await WiFiDirectAdvanced.connectToNetwork(ssid, pass);
        } catch (error) {
            console.error('Failed to connect to network:', error);
            throw error;
        }
    }

    // ═══════════════ LOCAL ONLY HOTSPOT (SHAREIT METHOD) ═══════════════

    /**
     * Start LocalOnlyHotspot for high-speed transfer (Android 8+)
     * This is what SHAREit uses - much faster than Wi-Fi Direct P2P
     * @returns { ssid, password, ip, method }
     */
    async startLocalHotspot(): Promise<{
        success: boolean;
        ssid: string;
        password: string;
        ip: string;
        method: string;
    }> {
        try {
            const result = await WiFiDirectAdvanced.startLocalHotspot();
            console.log('LocalOnlyHotspot started:', result);
            return result;
        } catch (error) {
            console.error('Failed to start LocalOnlyHotspot:', error);
            throw error;
        }
    }

    /**
     * Stop LocalOnlyHotspot
     */
    async stopLocalHotspot(): Promise<void> {
        try {
            await WiFiDirectAdvanced.stopLocalHotspot();
            console.log('LocalOnlyHotspot stopped');
        } catch (error) {
            console.error('Failed to stop LocalOnlyHotspot:', error);
        }
    }

    // ═══════════════ UNIVERSAL FALLBACK SYSTEM (SHAREIT METHOD) ═══════════════

    /**
     * Create group with multi-level fallback for MAXIMUM device compatibility
     * Tries: LocalOnlyHotspot → WiFi Direct 5GHz → WiFi Direct 2.4GHz → Legacy
     * This is the recommended method for production use
     * @returns { success, method, ssid, password, ip, band }
     */
    async createGroupWithFallback(): Promise<{
        success: boolean;
        method: string;
        ssid: string;
        password: string;
        ip: string;
        band?: string;
        ownerAddress?: string;
    }> {
        try {
            console.log('🚀 Starting Universal Fallback System...');
            const result = await WiFiDirectAdvanced.createGroupWithFallback();
            console.log(`✅ Group created via ${result.method}:`, result);
            return result;
        } catch (error: any) {
            console.error('❌ All fallback methods failed:', error);
            throw error;
        }
    }

    /**
     * Check if LocalOnlyHotspot is active
     */
    async isHotspotActive(): Promise<boolean> {
        try {
            const status = await WiFiDirectAdvanced.getHotspotStatus();
            return status.isActive;
        } catch {
            return false;
        }
    }

    /**
     * Start listening for scan results (Event-based)
     */
    async startWifiScanMonitoring(): Promise<void> {
        try {
            await WiFiDirectAdvanced.startWifiScanMonitoring();
            console.log('Started WiFi scan monitoring');
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * Stop listening for scan results
     */
    async stopWifiScanMonitoring(): Promise<void> {
        try {
            await WiFiDirectAdvanced.stopWifiScanMonitoring();
            console.log('Stopped WiFi scan monitoring');
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * Trigger a fresh WiFi scan
     * Results will be delivered via 'onWifiScanResults' event
     */
    async triggerWifiScan(): Promise<boolean> {
        try {
            return await WiFiDirectAdvanced.triggerWifiScan();
        } catch (e) {
            console.error('Trigger scan failed:', e);
            return false;
        }
    }

    /**
     * Scan method wrapper (Legacy support, but now triggers async scan)
     */
    async scanWiFiNetworks(): Promise<any> {
        return this.triggerWifiScan();
    }

    /**
     * Connect to a specific WiFi network by SSID and password
     */
    async connectToWiFiNetwork(ssid: string, pass: string): Promise<any> {
        try {
            return await WiFiDirectAdvanced.connectToWiFiNetwork(ssid, pass);
        } catch (error) {
            console.error('Failed to connect to WiFi network:', error);
            throw error;
        }
    }

    async getHotspotCredentials(): Promise<{ ssid: string, password: string, ip: string, method: string } | null> {
        try {
            return await WiFiDirectAdvanced.getHotspotCredentials();
        } catch (e) {
            return null;
        }
    }

    /**
     * Get the Gateway IP from DHCP (Client Side)
     * This is the Host's true IP in a hotspot scenario.
     * Essential for Android 13+ where Host IP is randomized.
     */
    async getConnectedGatewayIp(): Promise<string | null> {
        try {
            return await WiFiDirectAdvanced.getConnectedGatewayIp();
        } catch (e) {
            console.warn('Failed to get Gateway IP:', e);
            return null;
        }
    }

    // ============== P2P PEER DISCOVERY (SHAREit-style Zero-Touch) ==============

    /**
     * Start discovering WiFi P2P peers
     * This finds other devices running MisterShare with active P2P groups
     */
    async discoverP2PPeers(): Promise<{ success: boolean; message: string }> {
        try {
            const result = await WiFiDirectAdvanced.discoverP2PPeers();
            console.log('[P2P] Peer discovery started');
            return result;
        } catch (error) {
            console.error('[P2P] Failed to start discovery:', error);
            throw error;
        }
    }

    /**
     * Get list of discovered P2P peers
     */
    async getP2PPeers(): Promise<{ success: boolean; count: number; peers: P2PPeer[] }> {
        try {
            const result = await WiFiDirectAdvanced.getP2PPeers();
            console.log(`[P2P] Found ${result.count} peers`);
            return result;
        } catch (error) {
            console.error('[P2P] Failed to get peers:', error);
            throw error;
        }
    }

    /**
     * Connect to a P2P peer by device address
     * This is the ZERO-TOUCH connection - no password required!
     */
    async connectToP2PPeer(deviceAddress: string): Promise<{ success: boolean; message: string }> {
        try {
            const result = await WiFiDirectAdvanced.connectToP2PPeer(deviceAddress);
            console.log(`[P2P] Connection initiated to ${deviceAddress}`);
            return result;
        } catch (error) {
            console.error('[P2P] Failed to connect to peer:', error);
            throw error;
        }
    }

    /**
     * Stop P2P peer discovery
     */
    async stopP2PDiscovery(): Promise<void> {
        try {
            await WiFiDirectAdvanced.stopP2PDiscovery();
            console.log('[P2P] Discovery stopped');
        } catch (error) {
            console.error('[P2P] Failed to stop discovery:', error);
        }
    }

    /**
     * Get P2P connection info after connection is established
     */
    async getP2PConnectionInfo(): Promise<{
        groupFormed: boolean;
        isGroupOwner: boolean;
        groupOwnerAddress: string;
    }> {
        try {
            return await WiFiDirectAdvanced.getP2PConnectionInfo();
        } catch (error) {
            console.error('[P2P] Failed to get connection info:', error);
            throw error;
        }
    }

    // ============== P2P MONITORING (Real-time Connection Events) ==============

    /**
     * Start monitoring P2P connection events
     * This registers a broadcast receiver for real-time connection state changes
     * Events: onP2PConnectionChanged, onP2PPeersChanged, onP2PStateChanged
     */
    async startP2PMonitoring(): Promise<boolean> {
        try {
            const result = await WiFiDirectAdvanced.startP2PMonitoring();
            console.log('[P2P] Monitoring started');
            return result;
        } catch (error) {
            console.error('[P2P] Failed to start monitoring:', error);
            throw error;
        }
    }

    /**
     * Stop monitoring P2P connection events
     */
    async stopP2PMonitoring(): Promise<boolean> {
        try {
            const result = await WiFiDirectAdvanced.stopP2PMonitoring();
            console.log('[P2P] Monitoring stopped');
            return result;
        } catch (error) {
            console.error('[P2P] Failed to stop monitoring:', error);
            throw error;
        }
    }

    /**
     * Check if P2P monitoring is currently active
     */
    async isP2PMonitoringActive(): Promise<boolean> {
        try {
            return await WiFiDirectAdvanced.isP2PMonitoringActive();
        } catch (error) {
            return false;
        }
    }
}

export interface P2PPeer {
    deviceName: string;
    deviceAddress: string;
    status: number;
    isGroupOwner: boolean;
}

export interface WifiNetwork {
    ssid: string;
    level: number;
    capabilities: string;
    frequency: number;
    isRelevant: boolean;
}

export default new WiFiDirectAdvancedService();


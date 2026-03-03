import {
    initialize,
    startDiscoveringPeers,
    subscribeOnPeersUpdates,
    connect,
    createGroup,
    removeGroup,
    getGroupInfo
} from 'react-native-wifi-p2p';
import { PermissionsAndroid, Platform } from 'react-native';

export interface WifiP2pGroupInfo {
    isGroupOwner?: boolean;
    groupOwnerAddress?: string;
    groupFormed?: boolean;
    networkName?: string;
    passphrase?: string;
    clients?: any[];
    owner?: {
        deviceAddress: string;
        deviceName?: string;
    }
}

class WiFiDirectService {
    initializationPromise: Promise<void> | null = null;
    isInitialized: boolean = false;
    peers: any[] = [];

    constructor() {
        this.initializeService();
    }

    async initializeService() {
        if (this.isInitialized) return;

        if (!this.initializationPromise) {
            this.initializationPromise = (async () => {
                try {
                    await initialize();
                    this.isInitialized = true;
                    console.log('WiFiP2P Initialized');
                } catch (e) {
                    console.error('Failed to initialize WiFiP2P', e);
                    this.isInitialized = false;
                    throw e; // Re-throw to handle in caller
                } finally {
                    this.initializationPromise = null;
                }
            })();
        }

        return this.initializationPromise;
    }

    async requestPermissions() {
        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES
            ]);

            return (
                granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED ||
                granted[PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES] === PermissionsAndroid.RESULTS.GRANTED
            );
        }
        return true;
    }

    async waitForInitialization() {
        if (this.isInitialized) return;
        if (this.initializationPromise) {
            await this.initializationPromise;
        } else {
            await this.initializeService();
        }
    }

    async startDiscovery(onPeersFound: (peers: any[]) => void) {
        await this.waitForInitialization();
        const hasPerms = await this.requestPermissions();
        if (!hasPerms) throw new Error("Permissions not granted");

        try {
            await startDiscoveringPeers();
            subscribeOnPeersUpdates((peerList) => {
                this.peers = peerList.devices;
                onPeersFound(this.peers);
            });
        } catch (e) {
            console.error('Discovery failed', e);
        }
    }

    async connectToPeer(deviceAddress: string) {
        await this.waitForInitialization();
        try {
            await connect(deviceAddress);
            console.log(`Connecting to ${deviceAddress}`);
        } catch (e) {
            console.error('Connection failed', e);
            throw e;
        }
    }

    async createHostGroup() {
        await this.waitForInitialization();
        try {
            await createGroup();
            console.log('Group created');
        } catch (e) {
            console.error('Failed to create group', e);
            throw e;
        }
    }

    async getConnectionInfo(): Promise<WifiP2pGroupInfo> {
        await this.waitForInitialization();
        return new Promise((resolve, reject) => {
            getGroupInfo()
                .then(info => resolve(info as unknown as WifiP2pGroupInfo))
                .catch(err => reject(err));
        })
    }

    async disconnect() {
        // If not even initialized, trying to disconnect might crash or be useless.
        // We'll try to init first, but suppress errors if it fails, just guard against NPE.
        try {
            await this.waitForInitialization();
            await removeGroup();
        } catch (e) {
            console.warn("Disconnect failed or service not ready", e);
        }
    }

    async stopDiscovery() {
        console.log('Stop discovery called (handled by library)');
    }
}

export default new WiFiDirectService();

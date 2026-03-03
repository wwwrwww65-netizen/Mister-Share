// BLE Device discovered via scanning
export interface BLEDevice {
    id: string;
    name: string | null;
    rssi: number;
    manufacturerData?: string;
}

// Connection info exchanged via BLE GATT
export interface BLEConnectionInfo {
    deviceAddress: string; // WiFi Direct MAC address
    port: number;
    deviceName: string;
    isReady: boolean;
}

// Discovery state
export type BLEDiscoveryState = 'idle' | 'advertising' | 'scanning' | 'connected';

// Error types
export type BLEError =
    | 'BLUETOOTH_OFF'
    | 'PERMISSION_DENIED'
    | 'DEVICE_NOT_FOUND'
    | 'CONNECTION_FAILED'
    | 'TIMEOUT';

import { BleManager, Device, Characteristic } from 'react-native-ble-plx';
import { Platform } from 'react-native';
import { Buffer } from 'buffer';

const SERVICE_UUID = "12345678-1234-5678-1234-567812345678";
const PASS_CHAR_UUID = "33333333-4444-5555-6666-777777777777";

class BLEHandshakeClient {
    private manager: BleManager;

    constructor() {
        this.manager = new BleManager();
    }

    /**
     * Attempt to find and handshake with a Host Device
     * @param hostName The name of the hotspot we want to join (we assume BLE name is similar)
     * @param myName My device name to send to host
     */
    async attemptHandshake(hostName: string, myName: string, myId: string): Promise<{ ssid: string, pass: string, ip: string, port: number }> {
        return new Promise((resolve, reject) => {
            console.log(`[BLE Handshake] Looking for host: ${hostName}`);

            // Timeout after 15 seconds
            const timeout = setTimeout(() => {
                this.manager.stopDeviceScan();
                reject(new Error("Handshake timed out (Device not found or not approved)"));
            }, 15000);

            let connectedDevice: Device | null = null;

            this.manager.startDeviceScan(null, null, async (error, device) => {
                if (error) {
                    console.log('[BLE Handshake] Scan error:', error);
                    return;
                }

                // Filtering: Check if device name matches or is relevant
                // For simplicity, we assume the BLE name matches the specific "MisterShare" pattern or is the host name
                // In production, might need fuzzy match.
                // Assuming Host sets BLE name == Hotspot Name (or subset)

                // Case insensitive match logic
                const localName = device?.name || device?.localName;
                if (!localName) return;

                // Strict or Partial match?
                // Hotspot: "AndroidShare_1234" -> BLE: "AndroidShare_1234" (Ideally)
                if (localName === hostName) {
                    console.log(`[BLE Handshake] Found Match: ${localName}`);
                    this.manager.stopDeviceScan();

                    try {
                        // 1. Connect
                        connectedDevice = await device!.connect();
                        await connectedDevice.discoverAllServicesAndCharacteristics();
                        console.log('[BLE Handshake] Connected & Discovered');

                        // 2. Setup Notification FIRST (to receive approval)
                        connectedDevice.monitorCharacteristicForService(
                            SERVICE_UUID,
                            PASS_CHAR_UUID,
                            (err, characteristic) => {
                                if (err) {
                                    console.log('[BLE Handshake] Monitor error:', err);
                                    return;
                                }

                                const val = characteristic?.value;
                                if (val) {
                                    const raw = Buffer.from(val, 'base64').toString('utf8');
                                    console.log(`[BLE Handshake] Received: ${raw}`);

                                    if (raw.startsWith('APPROVED|')) {
                                        // "APPROVED|SSID|PASS|IP|PORT"
                                        const parts = raw.split('|');
                                        clearTimeout(timeout);
                                        resolve({
                                            ssid: parts[1],
                                            pass: parts[2],
                                            ip: parts[3],
                                            port: parseInt(parts[4] || '8080')
                                        });

                                        // Cleanup
                                        // connectedDevice?.cancelConnection(); // Keep connected? Or disconnect?
                                        // Better to disconnect BLE one WiFi connection starts
                                    }
                                }
                            }
                        );

                        // 3. Write Request
                        // "REQUEST|MyName|MyUniqueId"
                        const payload = `REQUEST|${myName}|${myId}`;
                        const base64 = Buffer.from(payload).toString('base64');

                        await connectedDevice.writeCharacteristicWithResponseForService(
                            SERVICE_UUID,
                            PASS_CHAR_UUID,
                            base64
                        );
                        console.log('[BLE Handshake] Request Sent, waiting for approval...');

                    } catch (connErr) {
                        console.log('[BLE Handshake] Connection Flow Failed:', connErr);
                        // Don't reject immediately, maybe retry? For now, let generic timeout handle it.
                    }
                }
            });
        });
    }

    stop() {
        this.manager.stopDeviceScan();
    }
}

export default new BLEHandshakeClient();

import { Platform, PermissionsAndroid, Alert, Linking, NativeModules } from 'react-native';
import { hasAllFilesPermission, requestAllFilesPermission } from './FileSystem';
import WiFiDirectAdvanced from './WiFiDirectAdvanced';

const { MediaStore } = NativeModules;

export interface PermissionStatus {
    location: boolean;
    storage: boolean;
    wifiNearby: boolean;
    bluetooth: boolean;
    camera: boolean;
    allFilesAccess: boolean;
    allGranted: boolean;
    // Granular media permissions
    readImages: boolean;
    readVideo: boolean;
    readAudio: boolean;
}

class PermissionsManager {
    /**
     * Request location permissions (required for WiFi Direct)
     */
    async requestLocationPermission(): Promise<boolean> {
        if (Platform.OS !== 'android') {
            return true;
        }

        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                {
                    title: 'Location Permission',
                    message: 'MisterShare needs location access to discover nearby devices via WiFi Direct.',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'OK',
                }
            );

            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
            console.error('Location permission error:', err);
            return false;
        }
    }

    /**
     * Request storage permissions (Android 12 and below)
     */
    async requestStoragePermissions(): Promise<boolean> {
        if (Platform.OS !== 'android') {
            return true;
        }

        try {
            // Android 13+ (Tiramisu)
            if (Platform.Version >= 33) {
                const readMedia = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
                    PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
                    PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
                ]);

                // For robust "All Files" access on Android 11+ (API 30+)
                // We check if we have the special management permission
                const hasManage = await hasAllFilesPermission();

                if (!hasManage) {
                    console.log('[PermissionsManager] Missing MANAGE_EXTERNAL_STORAGE, requesting...');
                    await requestAllFilesPermission();
                    // We can't await the result of the intent easily here without AppState change listener
                    // So we return true if media is granted, but user might need to grant the other one in settings
                }

                return Object.values(readMedia).every(
                    status => status === PermissionsAndroid.RESULTS.GRANTED
                );
            }

            // Android 11 (R) and 12 (S)
            // They also support this special permission for file managers
            if (Platform.Version >= 30) {
                const hasManage = await hasAllFilesPermission();
                if (!hasManage) {
                    await requestAllFilesPermission();
                }

                // Also request legacy read for compatibility
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED || (await hasAllFilesPermission());
            }

            else {
                // Android 10 and below or 11/12 fallback
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
                    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                ]);

                return Object.values(granted).every(
                    status => status === PermissionsAndroid.RESULTS.GRANTED
                );
            }
        } catch (err) {
            console.error('Storage permission error:', err);
            return false;
        }
    }

    /**
     * Request WiFi nearby devices permission (Android 13+)
     */
    async requestWiFiPermissions(): Promise<boolean> {
        if (Platform.OS !== 'android') {
            return true;
        }

        try {
            // Android 13+ requires NEARBY_WIFI_DEVICES
            if (Platform.Version >= 33) {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES,
                    {
                        title: 'WiFi Permission',
                        message: 'MisterShare needs access to nearby WiFi devices for peer-to-peer connections.',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'OK',
                    }
                );

                return granted === PermissionsAndroid.RESULTS.GRANTED;
            }

            return true; // Not needed for older versions
        } catch (err) {
            console.error('WiFi permission error:', err);
            return false;
        }
    }

    /**
     * Request Camera permission
     */
    async requestCameraPermission(): Promise<boolean> {
        if (Platform.OS !== 'android') {
            return true;
        }

        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.CAMERA,
                {
                    title: 'Camera Permission',
                    message: 'MisterShare needs camera access to scan QR codes.',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'OK',
                }
            );

            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
            console.error('Camera permission error:', err);
            return false;
        }
    }

    /**
     * Request Bluetooth permissions (Android 12+)
     */
    async requestBluetoothPermissions(): Promise<boolean> {
        if (Platform.OS !== 'android') {
            return true;
        }

        try {
            // Android 12+ (API 31+) requires new Bluetooth permissions
            if (Platform.Version >= 31) {
                const permissions = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
                ]);

                return Object.values(permissions).every(
                    status => status === PermissionsAndroid.RESULTS.GRANTED
                );
            }

            // Older Android versions don't need runtime Bluetooth permissions
            return true;
        } catch (err) {
            console.error('Bluetooth permission error:', err);
            return false;
        }
    }

    /**
     * Request ONLY media permissions (for onboarding)
     * Modern UX: Don't overwhelm user with all permissions at start
     * Also requests MANAGE_EXTERNAL_STORAGE for full file access (needed for file sharing app)
     */
    async requestMediaPermissionsOnly(): Promise<'granted' | 'denied' | 'blocked'> {
        if (Platform.OS !== 'android') {
            return 'granted';
        }

        try {
            let statuses: Record<string, string> = {};

            // Android 13+ (Tiramisu) - Granular media permissions
            if (Platform.Version >= 33) {
                statuses = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
                    PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
                    PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
                ]);
            } else {
                // Android 6-12 - Storage permissions
                statuses = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
                    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                ]);
            }

            const results = Object.values(statuses);

            // 1. All Granted
            if (results.every(s => s === PermissionsAndroid.RESULTS.GRANTED)) {

                if (Platform.Version >= 30) {
                    const hasManage = await hasAllFilesPermission();
                    if (!hasManage) {
                        // PARTIAL ACCESS: Media granted, All Files missing.
                        // Don't block user. Allow them to use the app with media only.
                        console.log('[PermissionsManager] Media granted, All Files missing. Proceeding with partial access.');
                    }
                }
                return 'granted';
            }

            // 2. Blocked (Never Ask Again)
            if (results.some(s => s === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)) {
                return 'blocked';
            }

            // 3. Denied (Can try again)
            return 'denied';

        } catch (err) {
            console.error('Media permissions error:', err);
            return 'denied';
        }
    }

    /**
     * Request connection permissions (GPS, WiFi, Bluetooth)
     * Called when user wants to create/join group
     */
    async requestConnectionPermissions(): Promise<boolean> {
        if (Platform.OS !== 'android') {
            return true;
        }

        try {
            const permissions = [];

            // Location (required for WiFi Direct)
            permissions.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);

            // Bluetooth (Android 12+)
            if (Platform.Version >= 31) {
                permissions.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
                permissions.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
                permissions.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE);
            }

            // WiFi (Android 13+)
            if (Platform.Version >= 33) {
                permissions.push(PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES);
            }

            const results = await PermissionsAndroid.requestMultiple(permissions as any);

            return Object.values(results).every(
                status => status === PermissionsAndroid.RESULTS.GRANTED
            );
        } catch (err) {
            console.error('Connection permissions error:', err);
            return false;
        }
    }

    /**
     * Request all required permissions (including Bluetooth)
     */
    async requestAllPermissions(): Promise<PermissionStatus> {
        const location = await this.requestLocationPermission();
        const storage = await this.requestStoragePermissions();
        const wifiNearby = await this.requestWiFiPermissions();
        const bluetooth = await this.requestBluetoothPermissions();
        const camera = await this.requestCameraPermission();

        // For now, we don't explicitly request allFilesAccess here,
        // as it's often a separate user action via settings.
        // We'll check its status in checkPermissionStatus.
        const allFilesAccess = await hasAllFilesPermission();

        const allGranted = location && storage && wifiNearby && bluetooth && camera && allFilesAccess;

        return {
            location,
            storage,
            wifiNearby,
            bluetooth,
            camera,
            allFilesAccess,
            allGranted,
            readImages: storage,
            readVideo: storage,
            readAudio: storage,
        };
    }

    /**
     * Check current permission status
     */
    async checkPermissionStatus(): Promise<PermissionStatus> {
        if (Platform.OS !== 'android') {
            return {
                location: true,
                storage: true,
                wifiNearby: true,
                bluetooth: true,
                camera: true,
                allFilesAccess: true,
                allGranted: true,
                readImages: true,
                readVideo: true,
                readAudio: true,
            };
        }

        try {
            const location = await PermissionsAndroid.check(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
            );

            // Check specific All Files Access (Android 11+)
            const allFilesAccess = await hasAllFilesPermission();

            let storage = false;
            if (Platform.Version >= 33) {
                const readImages = await PermissionsAndroid.check(
                    PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
                );
                const readVideo = await PermissionsAndroid.check(
                    PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO
                );
                const readAudio = await PermissionsAndroid.check(
                    PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
                );
                // At least one media permission should be granted
                storage = readImages || readVideo || readAudio;

                console.log('[PermissionsManager] Permission Status:', {
                    readImages, readVideo, readAudio, allFilesAccess
                });
            } else {
                storage = await PermissionsAndroid.check(
                    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
                );
                console.log('[PermissionsManager] Permission Status:', {
                    storage, allFilesAccess
                });
            }

            let wifiNearby = true; // Default true for older Android
            if (Platform.Version >= 33) {
                wifiNearby = await PermissionsAndroid.check(
                    PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES
                );
            }

            let bluetooth = true; // Default true for older Android
            if (Platform.Version >= 31) {
                const bluetoothScan = await PermissionsAndroid.check(
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
                );
                const bluetoothConnect = await PermissionsAndroid.check(
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
                );
                bluetooth = bluetoothScan && bluetoothConnect;
            }

            const camera = await PermissionsAndroid.check(
                PermissionsAndroid.PERMISSIONS.CAMERA
            );

            // Note: We consider 'allGranted' true if basic storage is there, 
            // but for full functionality we might want to enforce allFilesAccess
            const allGranted = location && storage && wifiNearby && bluetooth && camera && allFilesAccess;

            return {
                location,
                storage,
                wifiNearby,
                bluetooth,
                camera,
                allFilesAccess,
                allGranted,
                readImages: storage,
                readVideo: storage,
                readAudio: storage,
            };
        } catch (err) {
            console.error('Check permission status error:', err);
            return {
                location: false,
                storage: false,
                wifiNearby: false,
                bluetooth: false,
                camera: false,
                allFilesAccess: false,
                allGranted: false,
                readImages: false,
                readVideo: false,
                readAudio: false,
            };
        }
    }

    /**
     * Check ONLY connection-related permission status
     */
    async checkConnectionPermissionStatus(): Promise<{ allGranted: boolean, details: any }> {
        if (Platform.OS !== 'android') {
            return { allGranted: true, details: {} };
        }

        try {
            const location = await PermissionsAndroid.check(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
            );

            let wifiNearby = true;
            if (Platform.Version >= 33) {
                wifiNearby = await PermissionsAndroid.check(
                    PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES
                );
            }

            let bluetooth = true;
            if (Platform.Version >= 31) {
                const bluetoothScan = await PermissionsAndroid.check(
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
                );
                const bluetoothConnect = await PermissionsAndroid.check(
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
                );
                bluetooth = bluetoothScan && bluetoothConnect;
            }

            const allPermissionsGranted = location && wifiNearby && bluetooth;

            // Hardware checks
            const isWifiOn = await WiFiDirectAdvanced.isWifiEnabled();
            const isBluetoothOn = await WiFiDirectAdvanced.isBluetoothEnabled();

            // Strict Gating: permissions AND hardware must be ON
            const allGranted = allPermissionsGranted && isWifiOn && isBluetoothOn;

            return {
                allGranted,
                details: {
                    location,
                    wifiNearby,
                    bluetooth,
                    isWifiOn,
                    isBluetoothOn
                }
            };
        } catch (err) {
            console.error('Check connection permission status error:', err);
            return { allGranted: false, details: {} };
        }
    }

    /**
     * Open app settings for manual permission grant
     */
    openAppSettings() {
        Linking.openSettings();
    }

    /**
     * Show alert for permission denial with option to open settings
     */
    showPermissionDeniedAlert(permissionName: string) {
        Alert.alert(
            'Permission Required',
            `${permissionName} permission is required for this feature. Please enable it in app settings.`,
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Open Settings',
                    onPress: () => this.openAppSettings(),
                },
            ]
        );
    }

    /**
     * Check if GPS/Location is enabled
     */
    async isGPSEnabled(): Promise<boolean> {
        if (Platform.OS !== 'android') {
            return true;
        }
        return await WiFiDirectAdvanced.isLocationEnabled();
    }

    /**
     * Ensure GPS is enabled, prompt user if not
     */
    async ensureGPSEnabled(): Promise<boolean> {
        const isEnabled = await this.isGPSEnabled();

        if (!isEnabled) {
            return new Promise((resolve) => {
                Alert.alert(
                    'GPS Required',
                    'Please enable GPS/Location for WiFi Direct discovery',
                    [
                        {
                            text: 'Cancel',
                            onPress: () => resolve(false),
                            style: 'cancel',
                        },
                        {
                            text: 'Enable',
                            onPress: () => {
                                Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
                                resolve(false);
                            },
                        },
                    ]
                );
            });
        }

        return true;
    }

    /**
     * Ensure Bluetooth is enabled
     */
    async ensureBluetoothEnabled(): Promise<boolean> {
        if (Platform.OS !== 'android') return true;

        // This will show the system dialog if BT is off
        return await WiFiDirectAdvanced.enableBluetooth();
    }

    /**
     * Open WiFi Settings Panel or Settings
     */
    async openWifiSettingsPanel(): Promise<boolean> {
        if (Platform.OS !== 'android') return true;

        return await WiFiDirectAdvanced.openWifiSettingsPanel();
    }

    /**
     * Request permission with retry option
     */
    async requestWithRetry(
        requestFn: () => Promise<boolean>,
        permissionName: string
    ): Promise<boolean> {
        const granted = await requestFn.call(this);

        if (!granted) {
            return new Promise((resolve) => {
                Alert.alert(
                    'Permission Denied',
                    `${permissionName} permission is required. Would you like to try again?`,
                    [
                        {
                            text: 'Cancel',
                            style: 'cancel',
                            onPress: () => resolve(false),
                        },
                        {
                            text: 'Open Settings',
                            onPress: () => {
                                this.openAppSettings();
                                resolve(false);
                            },
                        },
                        {
                            text: 'Try Again',
                            onPress: async () => {
                                const result = await requestFn.call(this);
                                resolve(result);
                            },
                        },
                    ]
                );
            });
        }

        return granted;
    }
    /**
     * Check if VPN is active
     */
    async isVpnActive(): Promise<boolean> {
        try {
            if (Platform.OS === 'android' && MediaStore) {
                return await MediaStore.isVpnActive();
            }
            return false;
        } catch (e) {
            return false;
        }
    }
}

export default new PermissionsManager();

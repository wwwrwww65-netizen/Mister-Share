import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, FONTS } from '../theme';
import WiFiDirectAdvanced from '../services/WiFiDirectAdvanced';
import { useConnectionStore } from '../store/connectionStore';
import {
    Camera,
    useCameraDevice,
    useCameraPermission,
    useCodeScanner,
} from 'react-native-vision-camera';

const ScanScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const { hasPermission, requestPermission } = useCameraPermission();
    const [isScanning, setIsScanning] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const { setGroupInfo } = useConnectionStore();
    const device = useCameraDevice('back');
    const lastScannedRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        const checkAndRequestPermissions = async () => {
            // 1. Check/Request Camera Permission first
            if (!hasPermission) {
                const granted = await requestPermission();
                if (!granted) {
                    Alert.alert(
                        t('permissions.camera_required', { defaultValue: 'Camera Required' }),
                        t('permissions.camera_msg', { defaultValue: 'Please grant camera permission to scan QR codes.' }),
                        [
                            { text: t('common.cancel', { defaultValue: 'Cancel' }), onPress: () => navigation.goBack() },
                            { text: t('common.settings', { defaultValue: 'Settings' }), onPress: () => Linking.openSettings() }
                        ]
                    );
                    return;
                }
            }

            // 2. Request Scan/Connect Permissions (Bluetooth, Location, Nearby)
            const PermissionsManager = require('../services/PermissionsManager').default;
            const connected = await PermissionsManager.requestConnectionPermissions();

            if (!connected) {
                console.warn('[ScanScreen] Connection permissions denied, scanning may fail');
                // Optional: Show alert, but maybe let them proceed with just Camera if they want
            }
        };

        checkAndRequestPermissions();
    }, [hasPermission]);

    // Handle scanned QR code - this runs on JS thread (useCodeScanner handles the worklet→JS bridge)
    const handleScannedCode = useCallback((qrData: string) => {
        console.log('[ScanScreen] 📸 Processing QR:', qrData);

        setIsScanning(false);

        // ═══════════════════════════════════════════════════════════════════════
        // 2024 SHAREIT ARCHITECTURE: Dual QR Format Parser
        // ═══════════════════════════════════════════════════════════════════════
        // Format 1 (MisterShare): MSHARE:S:SSID;P:PASSWORD;H:HOST_IP;;
        // Format 2 (Legacy WiFi): WIFI:S:SSID;T:WPA;P:PASSWORD;;
        // ═══════════════════════════════════════════════════════════════════════

        let ssid: string | undefined;
        let password: string | undefined;
        let embeddedHostIP: string | undefined;

        if (qrData.startsWith('MSHARE:')) {
            // MisterShare custom format (preferred - includes Host IP)
            const ssidMatch = qrData.match(/S:([^;]+);/);
            const passMatch = qrData.match(/P:([^;]+);/);
            const hostMatch = qrData.match(/H:([^;]+);/);

            ssid = ssidMatch?.[1];
            password = passMatch?.[1];
            embeddedHostIP = hostMatch?.[1];

            console.log('[ScanScreen] ✅ MisterShare QR parsed:', { ssid, hostIP: embeddedHostIP, password: '***' });
        } else if (qrData.startsWith('WIFI:')) {
            // Legacy WiFi format (fallback - will need NSD discovery)
            const ssidMatch = qrData.match(/S:([^;]+);/);
            const passMatch = qrData.match(/P:([^;]+);/);

            ssid = ssidMatch?.[1];
            password = passMatch?.[1];

            console.log('[ScanScreen] ✅ Legacy WiFi QR parsed:', { ssid, password: '***' });
        }

        if (ssid && password) {
            setConnecting(true);
            WiFiDirectAdvanced.connectToNetwork(ssid, password)
                .then(async () => {
                    console.log('[ScanScreen] ✅ Connected to:', ssid);

                    // ═══════════════════════════════════════════════════════════════
                    // 2024 ANDROID 11+ FIX: Network Stabilization Delay
                    // ═══════════════════════════════════════════════════════════════
                    // On Android 11-15, network binding may not be fully propagated
                    // immediately after WiFi connection. Give OS time to stabilize.
                    // ═══════════════════════════════════════════════════════════════
                    console.log('[ScanScreen] ⏳ Waiting for network binding stabilization (Android 11+ fix)...');
                    await new Promise<void>(r => setTimeout(r, 800));

                    // ═══════════════════════════════════════════════════════════════
                    // 2024 SHAREIT ARCHITECTURE: NSD-based IP Discovery
                    // ═══════════════════════════════════════════════════════════════
                    // After WiFi connection, discover Host IP via mDNS (NSD)
                    // This is how SHAREit/Zapya find the Host - NEVER hardcode IPs!
                    // ═══════════════════════════════════════════════════════════════

                    const { discoverHostIP } = require('../store/connectionStore');
                    const TcpHandshakeService = require('../services/TcpHandshakeService').default;
                    const DeviceInfo = require('react-native-device-info').default;

                    // Use embedded IP from QR (MSHARE format) or discover via Gateway/NSD
                    let hostIP: string;
                    if (embeddedHostIP) {
                        hostIP = embeddedHostIP;
                        console.log('[ScanScreen] 🚀 Using embedded Host IP from QR:', hostIP);
                    } else {
                        console.log('[ScanScreen] 🔍 Discovering Host IP (Gateway/NSD)...');
                        hostIP = await discoverHostIP(3000);
                        console.log('[ScanScreen] 📡 Host IP discovered:', hostIP);
                    }

                    // Update global state with REAL IP
                    setGroupInfo({
                        isGroupOwner: false,
                        ssid: ssid!,
                        passphrase: password!,
                        groupOwnerAddress: hostIP
                    });

                    // ═══════════════════════════════════════════════════════════════
                    // 2024 ROBUST HANDSHAKE: 3 retries with exponential backoff
                    // ═══════════════════════════════════════════════════════════════
                    // On Android 11+, first attempt may fail due to network timing.
                    // SHAREit/Zapya use similar retry patterns for reliability.
                    // ═══════════════════════════════════════════════════════════════
                    const myName = await DeviceInfo.getDeviceName();
                    const myId = await DeviceInfo.getUniqueId();
                    const delays = [0, 500, 1000]; // Exponential backoff

                    let handshakeSuccess = false;
                    for (let i = 0; i < delays.length && !handshakeSuccess; i++) {
                        if (delays[i] > 0) {
                            console.log(`[ScanScreen] ⏳ Retry ${i + 1}: waiting ${delays[i]}ms...`);
                            await new Promise<void>(r => setTimeout(r, delays[i]));
                        }

                        try {
                            console.log(`[ScanScreen] 🔗 Handshake attempt ${i + 1} with:`, hostIP);
                            const result = await TcpHandshakeService.performHandshake(hostIP, myName, myId);
                            if (result.success) {
                                console.log('[ScanScreen] ✅ Handshake successful with:', result.hostName);
                                handshakeSuccess = true;
                            }
                        } catch (e: any) {
                            console.warn(`[ScanScreen] ⚠️ Handshake attempt ${i + 1} failed:`, e.message);
                        }
                    }

                    if (!handshakeSuccess) {
                        console.warn('[ScanScreen] ⚠️ All handshake attempts failed (transfers may still work)');
                    }

                    // BIDIRECTIONAL: Start receiver so Host can send files to us
                    try {
                        const { useTransferStore } = require('../store/transferStore');
                        useTransferStore.getState().startReceiverListening();
                        console.log('[ScanScreen] ✅ Started receiver for bidirectional transfer');
                    } catch (e) {
                        console.warn('[ScanScreen] Could not start receiver:', e);
                    }

                    Alert.alert(
                        t('connect_ui.connected', { defaultValue: 'Connected!' }),
                        t('connect_ui.connected_msg', { defaultValue: `Successfully joined ${ssid}` }),
                        [{
                            text: 'OK',
                            onPress: () => {
                                navigation.replace('FileBrowser', {
                                    mode: 'send',
                                    serverIP: hostIP  // ← NSD-discovered IP
                                });
                            }
                        }]
                    );
                })
                .catch(err => {
                    console.error('[ScanScreen] ❌ Connect Error:', err);
                    lastScannedRef.current = undefined;
                    Alert.alert(
                        t('common.error'),
                        t('connect_ui.connect_failed', { defaultValue: 'Failed to connect: ' }) + (err?.message || 'Unknown error'),
                        [{ text: 'OK', onPress: () => setIsScanning(true) }]
                    );
                })
                .finally(() => {
                    setConnecting(false);
                });
        } else {
            console.log('[ScanScreen] ⚠️ Invalid QR format');
            Alert.alert(
                t('common.error'),
                t('connect_ui.invalid_qr', { defaultValue: 'Invalid QR code format' }),
                [{ text: 'OK', onPress: () => { setIsScanning(true); lastScannedRef.current = undefined; } }]
            );
        }
    }, [t, navigation, setGroupInfo]);

    // useCodeScanner - onCodeScanned runs on JS thread (not worklet)
    // VisionCamera internally handles the worklet→JS bridge
    const codeScanner = useCodeScanner({
        codeTypes: ['qr'],
        onCodeScanned: (codes) => {
            // Early returns
            if (!isScanning || connecting) return;
            if (codes.length === 0) return;

            const code = codes[0];
            const qrData = code.value;

            // Prevent duplicate scans
            if (qrData === lastScannedRef.current) return;
            if (!qrData) return;

            lastScannedRef.current = qrData;
            console.log('[ScanScreen] 📸 QR Code detected:', qrData);

            // Direct call - onCodeScanned already runs on JS thread
            handleScannedCode(qrData);
        }
    });

    if (!hasPermission) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Icon name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('connect_ui.scan_qr_code', { defaultValue: 'Scan QR Code' })}</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.centerContainer}>
                    <Icon name="camera-alt" size={80} color={COLORS.textDim} />
                    <Text style={styles.permissionText}>
                        {t('permissions.camera_required', { defaultValue: 'Camera Permission Required' })}
                    </Text>
                    <TouchableOpacity
                        style={styles.settingsButton}
                        onPress={() => Linking.openSettings()}
                    >
                        <Text style={styles.settingsButtonText}>
                            {t('common.open_settings', { defaultValue: 'Open Settings' })}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (!device) {
        return (
            <View style={styles.container}>
                <View style={styles.centerContainer}>
                    <Icon name="error-outline" size={80} color={COLORS.error} />
                    <Text style={styles.permissionText}>
                        {t('errors.no_camera', { defaultValue: 'No camera device found' })}
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Camera
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={isScanning && !connecting}
                codeScanner={codeScanner}
            />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('connect_ui.scan_qr_code', { defaultValue: 'Scan QR Code' })}</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Scanning Frame Overlay */}
            <View style={styles.overlay}>
                <View style={styles.scannerFrame}>
                    <View style={[styles.corner, styles.topLeft]} />
                    <View style={[styles.corner, styles.topRight]} />
                    <View style={[styles.corner, styles.bottomLeft]} />
                    <View style={[styles.corner, styles.bottomRight]} />
                </View>

                <Text style={styles.instructionText}>
                    {t('connect_ui.qr_scan_instruction', {
                        defaultValue: 'Position the QR code within the frame'
                    })}
                </Text>
            </View>

            {connecting && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>{t('connect_ui.connecting', { defaultValue: 'Connecting...' })}</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        position: 'absolute',
        top: 40,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        zIndex: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    headerTitle: {
        ...FONTS.h3,
        color: '#FFF',
    },
    overlay: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scannerFrame: {
        width: 280,
        height: 280,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: COLORS.secondary,
        borderWidth: 4,
    },
    topLeft: {
        top: 0,
        left: 0,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        borderTopLeftRadius: 8,
    },
    topRight: {
        top: 0,
        right: 0,
        borderLeftWidth: 0,
        borderBottomWidth: 0,
        borderTopRightRadius: 8,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderRightWidth: 0,
        borderTopWidth: 0,
        borderBottomLeftRadius: 8,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderBottomRightRadius: 8,
    },
    instructionText: {
        color: '#FFF',
        textAlign: 'center',
        paddingHorizontal: 40,
        fontSize: 16,
        fontWeight: '500',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 15,
        borderRadius: 8,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    permissionText: {
        ...FONTS.body2,
        color: COLORS.white,
        textAlign: 'center',
        marginTop: 20,
    },
    settingsButton: {
        marginTop: 30,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 8,
    },
    settingsButtonText: {
        ...FONTS.body2,
        color: COLORS.white,
        fontWeight: 'bold',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20,
    },
    loadingText: {
        ...FONTS.h3,
        color: '#FFF',
        marginTop: 20,
    }
});

export default ScanScreen;

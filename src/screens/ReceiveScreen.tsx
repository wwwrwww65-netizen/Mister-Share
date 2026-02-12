import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator, Alert, Modal, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS, FONTS, SIZES } from '../theme';
import ModernQR from '../components/modern/ModernQR';
import WiFiDirectService from '../services/WiFiDirect';
import WiFiDirectAdvanced from '../services/WiFiDirectAdvanced';
import BLEDiscovery, { type ConnectionRequest } from '../services/BLEDiscovery';
import PermissionsManager from '../services/PermissionsManager';
import TransferEngine from '../services/TransferEngine';
import { useConnectionStore, ConnectionHaptics, type ConnectedPeer } from '../store/connectionStore';
import { showToast } from '../services/ToastManager';
import { useTransferStore, type TransferHistory } from '../store/transferStore';
import SoundService from '../services/SoundService';
import NotificationService from '../services/NotificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { DeviceEventEmitter } from 'react-native';
import TcpHandshakeService, { type PeerInfo, type ApprovalRequest as TcpApprovalRequest } from '../services/TcpHandshakeService';
import NsdService from '../services/NsdService';

const { width } = Dimensions.get('window');

const ReceiveScreen = ({ navigation, route }: any) => {
    // Connection store (Global State Source of Truth)
    const filesToTransfer = route.params?.files;
    const {
        isGroupOwner,
        ssid: storeSsid,
        passphrase: storePass,
        connectedPeers, // use global peers
        setGroupInfo,
        // setConnecting, // unused
        // addPeer, // unused locally
        // disconnect: disconnectStore // unused locally
    } = useConnectionStore();

    const { t } = useTranslation();
    const [groupName, setGroupName] = useState('');

    // Initialize UI state based on global store (Resume vs New)
    const [ssid, setSsid] = useState(storeSsid || '');
    const [password, setPassword] = useState(storePass || '');
    const [isCreating, setIsCreating] = useState(!isGroupOwner); // If hosting, don't show creating spinner
    const [error, setError] = useState<string | null>(null);
    const [hostIP, setHostIP] = useState('192.168.43.1'); // Dynamic Host IP for QR

    // const [connectedPeers, setConnectedPeers] = useState<ConnectedPeer[]>([]); // Removed local state

    // BLE Handshake State
    const [approvalRequest, setApprovalRequest] = useState<{ requestId: string, deviceAddress: string, deviceName: string, deviceId?: string } | null>(null);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [trustedDevices, setTrustedDevices] = useState<string[]>([]);

    // ... (existing effects)

    // Load Trusted Devices
    useEffect(() => {
        const loadTrusted = async () => {
            try {
                const stored = await AsyncStorage.getItem('trusted_devices');
                if (stored) setTrustedDevices(JSON.parse(stored));
            } catch (e) {
                console.log('Failed to load trusted devices');
            }
        };
        loadTrusted();
    }, []);

    // BLE Discovery Initialization (SHAREit-style - device discoverable via BLE)
    useEffect(() => {
        let connectionRequestUnsub: (() => void) | undefined;
        let credentialsReceivedUnsub: (() => void) | undefined;

        console.log('[ReceiveScreen] BLE Effect triggered - ssid:', ssid, 'isCreating:', isCreating);

        const startBLEDiscovery = async () => {
            try {
                const deviceName = await DeviceInfo.getDeviceName();

                // 1. Initialize BLE service
                await BLEDiscovery.initialize();
                console.log('[ReceiveScreen] ✅ BLE Discovery initialized');

                // 2. Start BLE Advertising (make this device discoverable)
                console.log('[ReceiveScreen] 📡 Starting BLE Advertising as:', deviceName);
                await BLEDiscovery.startAdvertising(deviceName, ssid, password);
                console.log('[ReceiveScreen] ✅ BLE Advertising started - device is now discoverable!');

                // 3. Listen for connection requests
                connectionRequestUnsub = BLEDiscovery.onConnectionRequest((request) => {
                    console.log('[ReceiveScreen] 🤝 Received BLE Connection Request:', request);
                    SoundService.notification();

                    // Always show approval dialog (disable auto-approve for now until deviceId is fixed)
                    // TODO: Fix deviceId parsing issue before re-enabling auto-approve
                    setApprovalRequest({
                        requestId: request.deviceId || request.deviceAddress,
                        deviceAddress: request.deviceAddress,
                        deviceName: request.deviceName,
                        deviceId: request.deviceId || request.deviceAddress
                    });
                    setShowApprovalModal(true);
                });

                // 4. Start P2P monitoring for WiFi connection events
                await WiFiDirectAdvanced.startP2PMonitoring();
                console.log('[ReceiveScreen] 📡 P2P Monitoring Started');

            } catch (e) {
                console.log('[ReceiveScreen] ❌ BLE Discovery Start Failed:', e);
            }
        };

        // Start BLE discovery when hotspot is ready
        if (ssid && !isCreating) {
            console.log('[ReceiveScreen] ✅ Hotspot ready, starting BLE discovery...');
            startBLEDiscovery();
        } else {
            console.log('[ReceiveScreen] ⏳ Waiting for hotspot... ssid:', ssid, 'isCreating:', isCreating);
        }

        return () => {
            console.log('[ReceiveScreen] 🔄 State Change Cleanup (Listeners only)');
            if (connectionRequestUnsub) connectionRequestUnsub();
            if (credentialsReceivedUnsub) credentialsReceivedUnsub();
            // Do NOT stop advertising here - causes interruptions when state changes!
            // Cleanup is handled in unmount effect.
        };
    }, [ssid, password, isCreating, trustedDevices]);

    const handleApproveConnection = async () => {
        if (!approvalRequest) return;

        try {
            // Approve via Native TCP Handshake Module
            const addToTrusted = true; // Auto-trust approved devices
            await TcpHandshakeService.approveConnection(approvalRequest.deviceId || approvalRequest.requestId, addToTrusted);
            console.log('[ReceiveScreen] ✅ Connection approved, client will receive WELCOME');

            showToast(t('connect_ui.approved', 'Connection Approved!'), 'success');
            setShowApprovalModal(false);
            setApprovalRequest(null);

            // Navigation will be handled by onPeerConnected event
        } catch (e) {
            console.log('[ReceiveScreen] ❌ Approval failed:', e);
            showToast(t('connect_ui.approve_failed', 'Failed to approve'), 'error');
        }
    };

    const handleRejectConnection = async () => {
        if (approvalRequest) {
            try {
                await TcpHandshakeService.rejectConnection(approvalRequest.deviceId || approvalRequest.requestId);
            } catch (e) {
                console.log('Reject failed:', e);
            }
        }
        setShowApprovalModal(false);
        setApprovalRequest(null);
    };

    const transferQueueLength = useTransferStore(state => state.queue.length);
    const hasNavigated = useRef(false);

    useEffect(() => {
        if (transferQueueLength > 0 && !hasNavigated.current) {
            console.log('[ReceiveScreen] Detected incoming file, navigating...');
            hasNavigated.current = true;
            navigation.navigate('Transfer', {
                mode: 'receive'
            });
        }
        if (transferQueueLength === 0) {
            hasNavigated.current = false;
        }
    }, [transferQueueLength]);

    useEffect(() => {
        let mounted = true;
        // ... (rest of existing effect)

        const initializeGroup = async () => {
            try {
                // Modern UX: Check and Request Permissions FIRST
                // This ensures 'LocalOnlyHotspot' (which needs NEARBY_WIFI_DEVICES on Android 13) won't fail
                const permStatus = await PermissionsManager.checkConnectionPermissionStatus();

                if (!permStatus.allGranted) {
                    console.log('[ReceiveScreen] Missing permissions, requesting...');
                    const granted = await PermissionsManager.requestConnectionPermissions();

                    if (!granted) {
                        // Double check if it's just hardware off (Wifi/BT) vs actual permission denial
                        const newStatus = await PermissionsManager.checkConnectionPermissionStatus();
                        if (!newStatus.details.wifiNearby || !newStatus.details.location) {
                            setError(t('errors.permissions_required', { defaultValue: 'Permissions required to start Hotspot' }));
                            return;
                        }
                    }
                }

                // Ensure GPS is enabled (required for Hotspot/P2P)
                const gpsEnabled = await PermissionsManager.ensureGPSEnabled();
                if (!gpsEnabled && Platform.OS === 'android') {
                    // If user cancelled GPS enable, we might still try but it will likely fail/fallback
                    console.log('[ReceiveScreen] GPS weak/disabled, hotspot might default to Legacy');
                }

                await createGroup();
            } catch (e: any) {
                console.error("Initialization error:", e);
                if (mounted) setError(e.message || 'Unknown error');
            }
        };

        const createGroup = async () => {
            try {
                // Only show loading if we aren't already hosting
                if (mounted && !isGroupOwner) setIsCreating(true);

                // ═══════════════ UNIVERSAL FALLBACK SYSTEM (SHAREIT METHOD) ═══════════════
                // Tries: LocalOnlyHotspot → WiFi Direct 5GHz → 2.4GHz → Legacy
                // This ensures ALL devices can create a group!

                console.log('🚀 Starting Universal Fallback System...');

                // 1. Check if hotspot is already active (Re-entry optimization)
                let info: any = await WiFiDirectAdvanced.getHotspotCredentials();

                if (info) {
                    console.log('♻️ Reusing existing active hotspot:', info);
                } else {
                    // 2. Use the new fallback system that tries all methods
                    info = await WiFiDirectAdvanced.createGroupWithFallback();
                }

                if (!info || !info.ssid) {
                    throw new Error('Failed to create group (all methods failed)');
                }

                console.log(`✅ Group created via ${info.method}:`, info);

                const ssidVal = info.ssid;
                const passVal = info.password;
                const ipVal = info.ip;
                const methodUsed = info.method || 'Unknown';

                if (mounted) {
                    // Show which method was used
                    const groupNameWithMethod = methodUsed.includes('LocalOnly')
                        ? 'MisterShare Hotspot'
                        : `MisterShare (${info.band || 'P2P'})`;

                    setGroupName(groupNameWithMethod);
                    setSsid(ssidVal);
                    setPassword(passVal);
                    setHostIP(ipVal); // Store dynamic IP for QR code
                    setIsCreating(false);

                    // Update global connection store
                    setGroupInfo({
                        isGroupOwner: true,
                        ssid: ssidVal,
                        passphrase: passVal,
                        groupOwnerAddress: ipVal
                    });

                    // Set server address for sender to connect
                    TransferEngine.setDestination(ipVal);

                    // Start listening for incoming transfers
                    useTransferStore.getState().clearQueue();
                    useTransferStore.getState().startReceiverListening();

                    // NEW: Start Native TCP Handshake Server (SHAREit Architecture)
                    // This is the robust handshake module with approval workflow
                    // CRITICAL: This server MUST be running before any client connects
                    const deviceName = await DeviceInfo.getDeviceName();

                    // Retry starting handshake server if it fails
                    let serverStarted = false;
                    for (let attempt = 1; attempt <= 3; attempt++) {
                        try {
                            console.log(`[ReceiveScreen] 📡 Starting Handshake Server (attempt ${attempt}/3)...`);
                            await TcpHandshakeService.startServer(deviceName);

                            // Verify server is actually running
                            const isRunning = await TcpHandshakeService.isServerRunning();
                            if (isRunning) {
                                serverStarted = true;
                                console.log('[ReceiveScreen] ✅ Native Handshake Server started and verified');
                                break;
                            } else {
                                console.warn('[ReceiveScreen] ⚠️ Server reported started but isRunning=false');
                            }
                        } catch (e: any) {
                            console.error(`[ReceiveScreen] ❌ Failed to start handshake server (attempt ${attempt}):`, e.message);
                            if (attempt < 3) {
                                await new Promise<void>(resolve => setTimeout(() => resolve(), 500)); // Brief wait before retry
                            }
                        }
                    }

                    if (!serverStarted) {
                        console.warn('[ReceiveScreen] ⚠️ Handshake server failed to start - clients may not be notified');
                    }

                    // 2024 BEST PRACTICE: Register NSD service for automatic discovery
                    // This allows clients to find us without knowing our IP address (SHAREit style)
                    if (serverStarted) {
                        try {
                            await NsdService.registerService(deviceName, 12321);
                            console.log('[ReceiveScreen] 📡 NSD service registered for discovery');

                            // Layer 2: NSD-based client detection (backup for TCP handshake)
                            // This detects clients that are advertising themselves on the network
                            NsdService.onServiceResolved((info: any) => {
                                const clientIp = info.hostAddress;
                                // 2024 FIX: Filter self by IP OR Name
                                // Critical: hostIP might be 192.168.43.1 (fallback) while real IP is dynamic
                                if (!clientIp || clientIp === hostIP || info.deviceName === deviceName) {
                                    return; // Skip self
                                }

                                console.log('[ReceiveScreen] 📡 NSD: Client detected:', info.deviceName || 'Unknown', '@', clientIp);

                                // Check if already in peers list
                                const store = useConnectionStore.getState();
                                const alreadyConnected = store.connectedPeers.some(p => p.deviceAddress === clientIp);
                                if (alreadyConnected) return;

                                // Add as detected peer (backup detection via NSD)
                                showToast(`Device found: ${info.deviceName || 'Unknown'}`, 'info');
                                store.addPeer({
                                    deviceName: info.deviceName || 'NSD Device',
                                    deviceAddress: clientIp,
                                    connectedAt: Date.now(),
                                });
                                store.setPeerIP(clientIp);
                                console.log('[ReceiveScreen] ✅ Client detected via NSD:', clientIp);
                            });

                            // Also start discovery to find clients
                            await NsdService.startDiscovery();
                            console.log('[ReceiveScreen] 🔍 NSD discovery started for client detection');
                        } catch (e) {
                            console.warn('[ReceiveScreen] NSD registration failed (non-critical):', e);
                        }
                    }

                    // Listen for peer connections (auto or manual approval)
                    TcpHandshakeService.onPeerConnected((peer: PeerInfo) => {
                        console.log('[ReceiveScreen] 🤝 Peer Connected:', peer.name, '@', peer.ip);
                        showToast(`Connected to ${peer.name}`, 'success');
                        SoundService.notification();

                        // Update connection store
                        const store = useConnectionStore.getState();
                        store.addPeer({
                            deviceName: peer.name,
                            deviceAddress: peer.ip,
                            connectedAt: Date.now()
                        });

                        // CRITICAL: Set peerIP so host can send files to client (bidirectional)
                        store.setPeerIP(peer.ip);
                        console.log('[ReceiveScreen] ✅ Peer IP set for bidirectional transfer:', peer.ip);

                        // Navigate to Transfer Screen
                        if (!hasNavigated.current) {
                            hasNavigated.current = true;
                            navigation.navigate('Transfer', {
                                mode: filesToTransfer ? 'send' : 'receive',
                                serverIP: peer.ip,
                                files: filesToTransfer
                            });
                        }
                    });

                    // Listen for approval requests (first-time devices)
                    TcpHandshakeService.onApprovalRequest((request: TcpApprovalRequest) => {
                        console.log('[ReceiveScreen] 📋 Approval Request from:', request.clientName);
                        SoundService.notification();

                        setApprovalRequest({
                            requestId: request.clientId,
                            deviceAddress: request.clientIp,
                            deviceName: request.clientName,
                            deviceId: request.clientId
                        });
                        setShowApprovalModal(true);
                    });

                    // NOTE: We no longer create an additional P2P group when LocalOnlyHotspot is active.
                    // The P2P group (create5GHzGroup) was creating a Wi-Fi Direct network with 
                    // the name "DIRECT-MisterShare" which was overriding our LocalOnlyHotspot.
                    // LocalOnlyHotspot alone is sufficient for discovery via BLE + QR + NSD.

                    console.log(`🚀 Ready! Method: ${methodUsed}, SSID: ${ssidVal}`);
                }

            } catch (e: any) {
                console.error("Group creation error:", e);
                if (mounted) {
                    let errorMessage = e.message || 'Failed to create group';

                    // Detailed Alert for debugging Release builds
                    Alert.alert(
                        t('errors.hotspot_failed_title', { defaultValue: "Hotspot Creation Failed" }),
                        `${errorMessage}\n\n${t('errors.code', { defaultValue: 'Code' })}: ${e.code || 'UNKNOWN'}`,
                        [{ text: t('common.ok', { defaultValue: "OK" }) }]
                    );

                    // Add helpful suggestions based on error type
                    if (errorMessage.includes('WIFI_P2P_SERVICE') || errorMessage.includes('not available')) {
                        errorMessage = t('errors.wifi_p2p_unavailable', {
                            defaultValue: 'WiFi Direct service is not available on this device. Please ensure:\n\n1. WiFi is turned ON\n2. Location is turned ON\n3. Your device supports WiFi Direct\n4. Try restarting your device'
                        });
                    } else if (errorMessage.includes('permission')) {
                        errorMessage = t('errors.permission_denied', {
                            defaultValue: 'Permission denied. Please grant all required permissions in Settings.'
                        });
                    } else if (errorMessage.includes('busy') || errorMessage.includes('in use') || errorMessage.includes('INCOMPATIBLE_MODE')) {
                        // New specific handling for Incompatible Mode
                        errorMessage = t('errors.hotspot_incompatible', {
                            defaultValue: 'Cannot start Hotspot. Please turn OFF your personal WiFi Hotspot/Tethering in Settings and try again.'
                        });

                        // Also show Alert immediately for visibility
                        Alert.alert(
                            t('errors.hotspot_conflict_title', { defaultValue: "Hotspot Conflict" }),
                            t('errors.hotspot_conflict_msg', { defaultValue: "Your system Personal Hotspot seems to be ON. Please turn it OFF to use this feature." }),
                            [{ text: t('common.ok', { defaultValue: "OK" }) }]
                        );
                    } else if (errorMessage.includes('busy')) {
                        errorMessage = t('errors.wifi_busy', {
                            defaultValue: 'WiFi is busy. Please disconnect from current WiFi and try again.'
                        });
                    }

                    setError(errorMessage);
                    setIsCreating(false);
                }
            }
        };

        initializeGroup();

        return () => {
            mounted = false;
            // NOTE: Do NOT stop server or disconnect here!
            // The server should keep running while connection is active.
            // Cleanup only happens when user explicitly disconnects.

            // Unregister NSD when leaving screen (service no longer advertised)
            NsdService.unregisterService().catch(() => { });

            // Allow clean shutdown of BLE and P2P monitoring
            console.log('[ReceiveScreen] 🛑 Final Cleanup: Stopping services');
            const { BLEDiscovery } = require('../services/BLEDiscovery');
            BLEDiscovery.stopAdvertising();
            WiFiDirectAdvanced.stopP2PMonitoring();
        };
    }, []); // Run on mount (check for resume)

    // 2024 SHAREIT ARCHITECTURE: Custom QR format with Host IP embedded
    // Format: MSHARE:S:SSID;P:PASSWORD;H:HOST_IP;;
    // This allows Client to know Host IP immediately without NSD discovery
    const qrValue = ssid && password && hostIP
        ? `MSHARE:S:${ssid};P:${password};H:${hostIP};;`
        : 'LOADING';

    return (
        <LinearGradient
            colors={['#05103A', '#0A1E5E']}
            style={styles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('connect_ui.create_group')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>

                {/* Status Text */}
                <Text style={styles.statusText}>
                    {isCreating
                        ? t('connect_ui.creating_group', { defaultValue: 'Creating safe connection...' })
                        : error
                            ? t('connect_ui.error_occurred', { defaultValue: 'Error Occurred' })
                            : t('connect_ui.waiting_for_friends', { defaultValue: 'Waiting for friends to join...' })
                    }
                </Text>

                {/* QR Code Container */}
                <View style={[styles.qrContainer, { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 }]}>
                    {isCreating ? (
                        <ActivityIndicator size="large" color="#4DACFF" />
                    ) : error ? (
                        <Icon name="error-outline" size={80} color="#FF5252" />
                    ) : (
                        <ModernQR
                            value={qrValue}
                            size={220}
                            color="#000"
                            backgroundColor="#FFF"
                        // logo={require('../../assets/logo.png')} // File not found
                        />
                    )}
                </View>


                {error ? (
                    <>
                        <Text style={[styles.instructionText, { color: '#FF5252', marginBottom: 20 }]}>{error}</Text>
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={() => {
                                setError(null);
                                setIsCreating(true);
                                // Retry initialization
                                navigation.replace('ReceiveScreen');
                            }}
                        >
                            <Icon name="refresh" size={20} color="#FFF" style={{ marginRight: 8 }} />
                            <Text style={styles.retryButtonText}>{t('common.retry', { defaultValue: 'Try Again' })}</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        {/* Instruction */}
                        <Text style={styles.instructionText}>
                            {t('connect_ui.scan_qr_instruction')}
                        </Text>

                        {/* Network Details - IMPROVED UX */}
                        {!isCreating && (
                            <View style={styles.detailsContainer}>
                                <Text style={styles.detailLabel}>شبكة الاتصال (SSID):</Text>
                                <Text style={styles.ssidText}>{ssid}</Text>

                                <View style={styles.passwordSection}>
                                    <Text style={styles.detailLabel}>كلمة المرور:</Text>
                                    <View style={styles.passwordBox}>
                                        <Text style={styles.passwordText}>{password}</Text>
                                    </View>
                                    <Text style={styles.passwordHint}>
                                        أخبر صديقك بهذه الكلمة أو دعه يمسح QR
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Connected Peers Section */}
                        {!isCreating && connectedPeers.length > 0 && (
                            <View style={styles.peersSection}>
                                <Text style={styles.peersTitle}>
                                    {t('connection.connected_peers', {
                                        count: connectedPeers.length,
                                        defaultValue: `Connected Devices (${connectedPeers.length})`
                                    })}
                                </Text>
                                {connectedPeers.map((peer, index) => (
                                    <View key={peer.deviceAddress || index} style={styles.peerItem}>
                                        <Icon name="smartphone" size={20} color="#4DACFF" />
                                        <Text style={styles.peerName}>{peer.deviceName || 'Unknown Device'}</Text>
                                        <Icon name="check-circle" size={18} color={COLORS.success} />
                                    </View>
                                ))}
                            </View>
                        )}
                    </>
                )}

            </View>

            {/* BLE Connection Approval Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={showApprovalModal}
                onRequestClose={() => setShowApprovalModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalIconContainer}>
                            <Icon name="bluetooth" size={36} color="#FF6B35" />
                        </View>
                        <Text style={styles.modalTitle}>{t('connect_ui.connection_request', 'طلب اتصال')}</Text>
                        <Text style={styles.modalText}>
                            {t('connect_ui.device_wants_connect', { name: approvalRequest?.deviceName || 'Unknown Device', defaultValue: `${approvalRequest?.deviceName} يريد الاتصال` })}
                        </Text>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.rejectBtn]}
                                onPress={handleRejectConnection}
                            >
                                <Text style={styles.rejectBtnText}>{t('connect_ui.reject', 'رفض')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalBtn, styles.approveBtn]}
                                onPress={handleApproveConnection}
                            >
                                <Text style={styles.approveBtnText}>{t('connect_ui.approve', 'موافق')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
    },
    headerTitle: {
        ...FONTS.h3,
        color: '#FFF',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 30,
    },
    statusText: {
        ...FONTS.h4,
        color: '#DDD',
        marginBottom: 30,
        textAlign: 'center',
    },
    qrContainer: {
        width: 280,
        height: 280,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },

    // Approval Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    modalIconContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: COLORS.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        ...FONTS.h2,
        color: COLORS.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    modalText: {
        ...FONTS.body3,
        color: COLORS.textDim,
        textAlign: 'center',
        marginBottom: 24,
        paddingHorizontal: 10,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 12,
    },
    modalBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rejectBtn: {
        backgroundColor: '#FFEBEE',
    },
    approveBtn: {
        backgroundColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    rejectBtnText: {
        ...FONTS.h4,
        color: '#D32F2F',
    },
    approveBtnText: {
        ...FONTS.h4,
        color: '#FFFFFF',
    },


    instructionText: {
        ...FONTS.body3,
        color: '#BBB',
        textAlign: 'center',
        marginBottom: 15,
        lineHeight: 22,
    },
    detailsContainer: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 15,
        borderRadius: 10,
        width: '100%',
    },
    detailRow: {
        ...FONTS.body3,
        color: '#EEE',
        marginBottom: 5,
        textAlign: 'center',
    },
    detailLabel: {
        ...FONTS.body3,
        color: '#AAA',
        marginBottom: 4,
        textAlign: 'center',
    },
    ssidText: {
        ...FONTS.body2,
        color: '#FFF',
        fontWeight: '600',
        marginBottom: 16,
        textAlign: 'center',
    },
    passwordSection: {
        width: '100%',
        alignItems: 'center',
    },
    passwordBox: {
        backgroundColor: 'rgba(77, 172, 255, 0.2)',
        borderWidth: 2,
        borderColor: '#4DACFF',
        borderRadius: 12,
        paddingHorizontal: 24,
        paddingVertical: 12,
        marginVertical: 8,
    },
    passwordText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#4DACFF',
        letterSpacing: 2,
        textAlign: 'center',
    },
    passwordHint: {
        ...FONTS.caption,
        color: '#888',
        textAlign: 'center',
        marginTop: 4,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 10,
    },
    retryButtonText: {
        ...FONTS.body2,
        color: '#FFF',
        fontWeight: 'bold',
    },
    peersSection: {
        width: '100%',
        marginTop: 20,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: 16,
    },
    peersTitle: {
        ...FONTS.h4,
        color: '#FFF',
        marginBottom: 12,
    },
    peerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    peerName: {
        ...FONTS.body3,
        color: '#FFF',
        flex: 1,
        marginLeft: 12,
    },
});

export default ReceiveScreen;

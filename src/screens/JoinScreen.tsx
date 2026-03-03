import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Easing, ActivityIndicator, Alert, TextInput, Modal, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS, FONTS } from '../theme';
import WiFiDirectAdvanced, { WifiNetwork, P2PPeer } from '../services/WiFiDirectAdvanced';
import { useConnectionStore, ConnectionHaptics } from '../store/connectionStore';
import { showToast } from '../services/ToastManager';
import TransferEngine from '../services/TransferEngine';
import DeviceInfo from 'react-native-device-info';
import BLEDiscovery, { type DiscoveredDevice, type HotspotCredentials } from '../services/BLEDiscovery';
import { DeviceEventEmitter } from 'react-native';
import TcpHandshakeService from '../services/TcpHandshakeService'; // Native Handshake
// SHAREit-style: BLE for discovery, WiFi for transfer

const { width, height } = Dimensions.get('window');

const JoinScreen = ({ navigation, route }: any) => {
    const { t } = useTranslation();
    const filesToTransfer = route.params?.files;

    // Animation Values
    const pulseAnim = useRef(new Animated.Value(0)).current;
    const rippleAnim1 = useRef(new Animated.Value(0)).current;
    const rippleAnim2 = useRef(new Animated.Value(0)).current;

    // UseRef for scan interval
    const scanIntervalRef = useRef<any>(null);

    // P2P Peers for zero-touch connection
    const [p2pPeers, setP2PPeers] = useState<P2PPeer[]>([]);
    // WiFi Networks as fallback
    const [networks, setNetworks] = useState<WifiNetwork[]>([]);
    const [isScanning, setIsScanning] = useState(true);

    // Password Modal State (only for WiFi fallback, not needed for P2P)
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedNetwork, setSelectedNetwork] = useState<WifiNetwork | null>(null);
    const [password, setPassword] = useState('');

    // Connection in progress
    const [isConnecting, setIsConnecting] = useState(false);

    // BLE Discovered Devices (SHAREit-style)
    const [bleDevices, setBleDevices] = useState<DiscoveredDevice[]>([]);
    const { setGroupInfo } = useConnectionStore();

    useEffect(() => {
        // Continuous Ripple Animation
        const createRipple = (anim: Animated.Value, delay: number) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: 3000,
                        easing: Easing.out(Easing.ease),
                        delay: delay,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: true,
                    })
                ])
            );
        };



        const anim1 = createRipple(rippleAnim1, 0);
        const anim2 = createRipple(rippleAnim2, 1500);

        anim1.start();
        anim2.start();

        return () => {
            anim1.stop();
            anim2.stop();
        };
    }, []);

    // BLE + P2P + WiFi Scanning Logic (SHAREit Method)
    useEffect(() => {
        let mounted = true;
        let wifiSubscription: any;
        let credentialsUnsub: (() => void) | undefined;

        const startScanning = async () => {
            if (!mounted) return;
            try {
                // 1. Initialize BLE Discovery
                await BLEDiscovery.initialize();
                console.log('[JoinScreen] ✅ BLE Discovery initialized');

                // 2. Start BLE Scanning (SHAREit-style - discovers hosts even before WiFi)
                BLEDiscovery.onDeviceFound((device) => {
                    if (mounted) {
                        console.log('[JoinScreen] 📡 BLE Device found:', device.name);

                        // NEW: Connectionless Handshake (SHAREit mode)
                        // If device broadcasts credentials, connect IMMEDIATELY (Bypass GATT)
                        if (device.ssid && device.password && !isConnecting) {
                            console.log(`[JoinScreen] 🚀 Connectionless Credentials Found for ${device.name}! Auto-connecting...`);
                            showToast(`Auto-connecting to ${device.name}...`, 'success');

                            // Stop scanning immediately
                            BLEDiscovery.stopScanning();
                            if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

                            // Connect directly to WiFi
                            setIsConnecting(true);
                            connectToNetwork(device.ssid, device.password)
                                .then(async () => {
                                    // Perform Native TCP Handshake with Host
                                    try {
                                        const myName = await DeviceInfo.getDeviceName();
                                        const myId = await DeviceInfo.getUniqueId();
                                        await TcpHandshakeService.performHandshake('192.168.49.1', myName, myId);
                                        console.log('[JoinScreen] ✅ Handshake with host successful');
                                    } catch (e: any) {
                                        console.log('[JoinScreen] Handshake info:', e.message);
                                    }
                                });
                            return;
                        }

                        setBleDevices(prev => {
                            const exists = prev.find(d => d.address === device.address);
                            if (exists) {
                                return prev.map(d => d.address === device.address ? device : d);
                            }
                            return [...prev, device];
                        });
                    }
                });

                // 3. Listen for credentials (after host approves connection)
                credentialsUnsub = BLEDiscovery.onCredentialsReceived(async (credentials) => {
                    if (!mounted) return;
                    console.log('[JoinScreen] 🎉 Received credentials via BLE:', credentials.ssid);

                    try {
                        showToast(t('connect_ui.connecting', 'Connecting to WiFi...'), 'info');

                        // Connect to hotspot using received credentials
                        const connected = await WiFiDirectAdvanced.connectToNetwork(
                            credentials.ssid,
                            credentials.password
                        );

                        if (connected) {
                            console.log('[JoinScreen] ✅ WiFi Connected via BLE credentials!');
                            showToast(t('connect_ui.connected', 'Connected!'), 'success');

                            // Get host IP from BLE credentials OR discover via NSD
                            let hostIP = credentials.hostAddress;
                            if (!hostIP) {
                                console.log('[JoinScreen] 🔍 BLE credentials missing hostIP, discovering via NSD...');
                                const { discoverHostIPViaNSD } = require('../store/connectionStore');
                                hostIP = await discoverHostIPViaNSD(3000);
                            }
                            console.log('[JoinScreen] 📡 Host IP:', hostIP);

                            // Setup Transfer Engine
                            TransferEngine.setDestination(hostIP);

                            // Update connection store
                            setGroupInfo({
                                isGroupOwner: false,
                                groupOwnerAddress: hostIP,
                                ssid: credentials.ssid,
                                passphrase: credentials.password
                            });
                            useConnectionStore.setState({ isConnected: true });

                            ConnectionHaptics.connected();

                            // Start receiver for bidirectional transfer
                            try {
                                const { useTransferStore } = require('../store/transferStore');
                                useTransferStore.getState().startReceiverListening();
                                console.log('[JoinScreen] ✅ Started receiver for bidirectional transfer');
                            } catch (e) {
                                console.warn('[JoinScreen] Could not start receiver:', e);
                            }

                            // Navigate to Transfer screen
                            navigation.navigate('Transfer', {
                                mode: 'send',
                                serverIP: hostIP,
                                files: filesToTransfer
                            });
                        } else {
                            showToast(t('connect_ui.connection_failed', 'WiFi connection failed'), 'error');
                        }
                    } catch (e) {
                        console.log('[JoinScreen] ❌ WiFi connection failed:', e);
                        showToast(t('connect_ui.connection_failed', 'Connection failed'), 'error');
                    } finally {
                        setIsConnecting(false);
                    }
                });

                await BLEDiscovery.startScanning();
                console.log('[JoinScreen] 🔍 BLE Scanning started');

                // 4. Also start WiFi Scanning (as fallback/alternative)
                await WiFiDirectAdvanced.startWifiScanMonitoring();
                wifiSubscription = DeviceEventEmitter.addListener('onWifiScanResults', (data: any) => {
                    if (mounted && data.networks) {
                        const relevantNetworks = data.networks.filter((n: WifiNetwork) => n.isRelevant);
                        setNetworks(relevantNetworks);
                    }
                });
                await WiFiDirectAdvanced.triggerWifiScan();

                // 5. Start P2P Discovery
                // DISABLED: Causes Radio Interference (Error 22) on many devices
                // await WiFiDirectAdvanced.discoverP2PPeers(); 
                /*
                setTimeout(async () => {
                    if (mounted) {
                        const p2pRes = await WiFiDirectAdvanced.getP2PPeers();
                        if (p2pRes.success) setP2PPeers(p2pRes.peers);
                    }
                }, 2000);
                */
                setIsScanning(false);

            } catch (e) {
                console.error('[JoinScreen] Setup error:', e);
                setIsScanning(false);
            }
        };

        startScanning();

        // Periodic rescan
        scanIntervalRef.current = setInterval(async () => {
            if (!mounted) return;
            // Only scan if NOT connecting to avoid interference
            WiFiDirectAdvanced.triggerWifiScan();
            // WiFiDirectAdvanced.discoverP2PPeers(); // DISABLED for stability
            // const p2pRes = await WiFiDirectAdvanced.getP2PPeers();
            // if (mounted && p2pRes.success) setP2PPeers(p2pRes.peers);
        }, 5000);

        return () => {
            mounted = false;
            if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
            if (wifiSubscription) wifiSubscription.remove();
            if (credentialsUnsub) credentialsUnsub();
            BLEDiscovery.stopScanning();
            WiFiDirectAdvanced.stopWifiScanMonitoring();
            WiFiDirectAdvanced.stopP2PDiscovery();

            console.log('[JoinScreen] 🛑 Cleanup complete');
        };
    }, []);

    const { connectToNetwork } = useConnectionStore();

    // P2P Peer connection (ZERO-TOUCH - no password!)
    const handleP2PPeerSelect = async (peer: P2PPeer) => {
        if (isConnecting) return;

        try {
            setIsConnecting(true);
            console.log(`[JoinScreen] Connecting to P2P peer: ${peer.deviceName}`);
            showToast(`Connecting to ${peer.deviceName}...`, 'info');

            // Connect via P2P (no password needed!)
            await WiFiDirectAdvanced.connectToP2PPeer(peer.deviceAddress);

            // Wait for connection to establish
            setTimeout(async () => {
                try {
                    const info = await WiFiDirectAdvanced.getP2PConnectionInfo();
                    if (info.groupFormed) {
                        console.log('[JoinScreen] P2P Connected! Group Owner:', info.groupOwnerAddress);

                        // Update connection store
                        setGroupInfo({
                            isGroupOwner: info.isGroupOwner,
                            groupOwnerAddress: info.groupOwnerAddress,
                            ssid: 'P2P-' + peer.deviceName,
                            passphrase: ''
                        });

                        // Set transfer destination
                        TransferEngine.setDestination(info.groupOwnerAddress);

                        showToast(`Connected to ${peer.deviceName}!`, 'success');
                        ConnectionHaptics.connected();

                        // Navigate to main screen
                        navigation.navigate('Main'); // P2P usually handling internally or need update
                        // For consistency, we should navigate to Transfer if we have files
                        if (filesToTransfer) {
                            navigation.navigate('Transfer', {
                                mode: 'send',
                                serverIP: info.groupOwnerAddress,
                                files: filesToTransfer
                            });
                        } else {
                            navigation.navigate('Main');
                        }
                    }
                } catch (e) {
                    console.log('[JoinScreen] P2P connection check:', e);
                }
            }, 3000);

        } catch (e: any) {
            console.error('[JoinScreen] P2P connection failed:', e);
            showToast('Connection failed. Try again.', 'error');
        } finally {
            setIsConnecting(false);
        }
    };

    // BLE Device selection (SHAREit Style - Primary Method!)
    // When user taps a BLE device, we request connection via BLE
    // Host shows approval dialog, then sends credentials back via BLE
    const handleBLEDeviceSelect = async (device: DiscoveredDevice) => {
        if (isConnecting) return;

        try {
            setIsConnecting(true);
            console.log(`[JoinScreen] 🔗 Requesting BLE connection to: ${device.name}`);
            showToast(t('connect_ui.requesting', 'Requesting connection...'), 'info');

            // CRITICAL: Stop scanning before connecting (fixes Error 22 on many devices!)
            console.log('[JoinScreen] 🛑 Stopping BLE scan before connection...');
            await BLEDiscovery.stopScanning();

            // Add small delay after stopping scan (required for some devices)
            console.log('[JoinScreen] ⏳ Waiting 500ms for BLE stack to settle...');
            await new Promise<void>(resolve => setTimeout(resolve, 500));

            // Get device info
            const myName = await DeviceInfo.getDeviceName();
            const myId = await DeviceInfo.getUniqueId();

            // Request connection via BLE GATT
            // The host will receive this and show approval dialog
            // After approval, onCredentialsReceived will fire with WiFi credentials
            console.log('[JoinScreen] 📤 Sending connection request...');
            await BLEDiscovery.requestConnection(device.address, myName, myId);

            // Note: isConnecting will be set to false in onCredentialsReceived callback
            // or after timeout if connection fails

        } catch (e: any) {
            console.error('[JoinScreen] BLE connection request failed:', e);
            showToast(t('connect_ui.connection_failed', 'Connection failed'), 'error');
            setIsConnecting(false);

            // Restart scanning after failure
            BLEDiscovery.startScanning().catch(() => { });
        }
    };

    // WiFi Network selection (Fallback for when BLE is not used)
    const handleNetworkSelect = async (network: WifiNetwork) => {
        // For known app hotspots, we need the password
        if (network.isRelevant || network.ssid.startsWith('AndroidShare') || network.ssid.startsWith('MisterShare') || network.ssid.startsWith('DIRECT-')) {
            // AndroidShare networks have random passwords - need QR or manual entry
            if (network.ssid.startsWith('AndroidShare') || network.ssid.startsWith('MisterShare')) {
                setSelectedNetwork(network);
                setModalVisible(true);
                return;
            }

            try {
                setIsConnecting(true);
                showToast(t('connect_ui.connecting', 'Connecting...'), 'info');

                // For DIRECT- networks (WiFi P2P Group)
                let wifiPassword = 'MisterShare2025'; // Default for our P2P groups

                console.log('[JoinScreen] 📡 Attempting WiFi connection to:', network.ssid);
                const wifiConnected = await WiFiDirectAdvanced.connectToNetwork(network.ssid, wifiPassword);

                if (!wifiConnected) {
                    // Ask for password
                    setSelectedNetwork(network);
                    setModalVisible(true);
                    setIsConnecting(false);
                    return;
                }

                console.log('[JoinScreen] ✅ WiFi Connected!');
                showToast(t('connect_ui.connected', 'Connected!'), 'success');

                // ═══════════════════════════════════════════════════════════════
                // 2024 SHAREIT ARCHITECTURE: Discover Host IP via NSD
                // ═══════════════════════════════════════════════════════════════

                // ANDROID 11+ FIX: Network stabilization delay
                console.log('[JoinScreen] ⏳ Waiting for network binding stabilization (Android 11+ fix)...');
                await new Promise<void>(r => setTimeout(r, 800));

                const { discoverHostIP } = require('../store/connectionStore');
                console.log('[JoinScreen] 🔍 Discovering Host IP (Gateway/NSD)...');
                const hostIP = await discoverHostIP(3000);
                console.log('[JoinScreen] 📡 Host IP discovered:', hostIP);

                // Setup Transfer Engine with REAL IP
                TransferEngine.setDestination(hostIP);

                // Update connection store with REAL IP
                setGroupInfo({
                    isGroupOwner: false,
                    groupOwnerAddress: hostIP,
                    ssid: network.ssid,
                    passphrase: wifiPassword
                });
                useConnectionStore.setState({ isConnected: true });

                ConnectionHaptics.connected();

                // ═══════════════════════════════════════════════════════════════
                // 2024 ROBUST HANDSHAKE: Notify Host that we connected
                // ═══════════════════════════════════════════════════════════════
                const TcpHandshakeService = require('../services/TcpHandshakeService').default;
                const DeviceInfo = require('react-native-device-info').default;
                const myName = await DeviceInfo.getDeviceName();
                const myId = await DeviceInfo.getUniqueId();
                const delays = [0, 500, 1000];

                let handshakeSuccess = false;
                for (let i = 0; i < delays.length && !handshakeSuccess; i++) {
                    if (delays[i] > 0) {
                        await new Promise<void>(r => setTimeout(r, delays[i]));
                    }
                    try {
                        console.log(`[JoinScreen] 🔗 Handshake attempt ${i + 1} with:`, hostIP);
                        const result = await TcpHandshakeService.performHandshake(hostIP, myName, myId);
                        if (result.success) {
                            console.log('[JoinScreen] ✅ Handshake successful with:', result.hostName);
                            handshakeSuccess = true;
                        }
                    } catch (e: any) {
                        console.warn(`[JoinScreen] ⚠️ Handshake attempt ${i + 1} failed:`, e.message);
                    }
                }

                // Start receiver for bidirectional transfer
                try {
                    const { useTransferStore } = require('../store/transferStore');
                    useTransferStore.getState().startReceiverListening();
                    console.log('[JoinScreen] ✅ Started receiver for bidirectional transfer');
                } catch (e) {
                    console.warn('[JoinScreen] Could not start receiver:', e);
                }

                // Navigate to Transfer Screen with NSD-discovered IP
                navigation.navigate('Transfer', {
                    mode: 'send',
                    serverIP: hostIP,
                    files: filesToTransfer
                });

            } catch (e: any) {
                console.log('[JoinScreen] ❌ Connection Failed:', e);
                showToast(t('connect_ui.connection_failed', 'Connection failed'), 'error');
                setSelectedNetwork(network);
                setPassword('');
                setModalVisible(true);
            } finally {
                setIsConnecting(false);
            }
        } else {
            // Standard WiFi (Router) - Ask for Password
            setSelectedNetwork(network);
            setPassword('');
            setModalVisible(true);
        }
    };

    const confirmConnect = () => {
        if (!selectedNetwork) return;
        if (password.length < 8) {
            Alert.alert("Invalid Password", "Password must be at least 8 characters");
            return;
        }

        setModalVisible(false);

        // Trigger connection in background via store
        connectToNetwork(selectedNetwork.ssid, password);

        // Navigate immediately to Home (Main)
        navigation.navigate('Main');
    };

    // Calculate Position for Planetary Layout
    const getDevicePosition = (index: number, total: number) => {
        const radius = width * 0.35; // Distance from center
        const angle = (index / total) * 2 * Math.PI - (Math.PI / 2); // Start from top
        return {
            left: radius * Math.cos(angle) + (width / 2) - 40, // Center X offset
            top: radius * Math.sin(angle) + (width / 2) - 40,  // Center Y offset
        };
    };

    return (
        <LinearGradient
            colors={['#05103A', '#020C26']} // Deep Blue Background
            style={styles.container}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('connect_ui.join_group')}</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Help')}>
                    <Icon name="help-outline" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <Text style={styles.instructionText}>
                    {t('connect_ui.tap_friend_avatar', { defaultValue: 'Tap on your friend\'s avatar to join' })}
                </Text>

                {/* Radar Container */}
                <View style={styles.radarContainer}>

                    {/* Ripples */}
                    <Animated.View style={[styles.ripple, {
                        transform: [{ scale: rippleAnim1.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2] }) }],
                        opacity: rippleAnim1.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] })
                    }]} />

                    <Animated.View style={[styles.ripple, {
                        transform: [{ scale: rippleAnim2.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2] }) }],
                        opacity: rippleAnim2.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] })
                    }]} />

                    {/* Center User Avatar (Me) */}
                    <View style={styles.centerAvatarData}>
                        <LinearGradient colors={['#eee', '#ccc']} style={styles.centerAvatar}>
                            <MaterialCommunityIcons name="cellphone-sound" size={40} color="#555" />
                        </LinearGradient>
                        <Text style={styles.myDeviceName}>{t('connect_ui.me', { defaultValue: 'Me' })}</Text>
                    </View>

                    {/* P2P Peers (ZERO-TOUCH - Priority) */}
                    {p2pPeers.map((peer, index) => {
                        const pos = getDevicePosition(index, Math.max(bleDevices.length + p2pPeers.length + networks.length, 1));

                        return (
                            <TouchableOpacity
                                key={peer.deviceAddress}
                                style={[styles.planetNode, { left: pos.left, top: pos.top }]}
                                onPress={() => handleP2PPeerSelect(peer)}
                                disabled={isConnecting}
                            >
                                <LinearGradient colors={['#00E676', '#00C853']} style={styles.planetAvatar}>
                                    <MaterialCommunityIcons name="wifi" size={28} color="#FFF" />
                                </LinearGradient>
                                <Text style={styles.planetName} numberOfLines={1}>
                                    {peer.deviceName || 'Device'}
                                </Text>
                                <Text style={styles.autoConnectBadge}>Auto</Text>
                            </TouchableOpacity>
                        );
                    })}

                    {/* BLE Devices (SHAREit-style - BEST - No Password!) */}
                    {bleDevices.map((device, index) => {
                        const pos = getDevicePosition(index + p2pPeers.length, Math.max(bleDevices.length + p2pPeers.length + networks.length, 1));

                        return (
                            <TouchableOpacity
                                key={device.address}
                                style={[styles.planetNode, { left: pos.left, top: pos.top }]}
                                onPress={() => handleBLEDeviceSelect(device)}
                                disabled={isConnecting}
                            >
                                <LinearGradient colors={['#FF6B35', '#FF3D00']} style={styles.planetAvatar}>
                                    <MaterialCommunityIcons name="bluetooth" size={28} color="#FFF" />
                                </LinearGradient>
                                <Text style={styles.planetName} numberOfLines={1}>
                                    {device.name || 'MisterShare'}
                                </Text>
                                <Text style={[styles.autoConnectBadge, { backgroundColor: '#FF6B35' }]}>BLE</Text>
                            </TouchableOpacity>
                        );
                    })}

                    {/* WiFi Networks (Fallback - needs password) */}
                    {networks.map((network, index) => {
                        const pos = getDevicePosition(index + p2pPeers.length + bleDevices.length, Math.max(bleDevices.length + p2pPeers.length + networks.length, 1));

                        return (
                            <TouchableOpacity
                                key={network.ssid}
                                style={[styles.planetNode, { left: pos.left, top: pos.top }]}
                                onPress={() => handleNetworkSelect(network)}
                            >
                                <LinearGradient colors={['#4DACFF', '#007AFF']} style={styles.planetAvatar}>
                                    <MaterialCommunityIcons name="cellphone" size={28} color="#FFF" />
                                </LinearGradient>
                                <Text style={styles.planetName} numberOfLines={1}>
                                    {network.ssid.replace(/^(AndroidShare_|MisterShare_)/i, '')}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}

                    {/* Scanning Text if Empty */}
                    {bleDevices.length === 0 && p2pPeers.length === 0 && networks.length === 0 && (
                        <Text style={styles.scanningText}>
                            {isScanning ? '...' : 'No devices found'}
                        </Text>
                    )}
                </View>

                {/* Bottom QR Scan */}
                <TouchableOpacity style={styles.qrButton} onPress={() => navigation.navigate('ScanScreen')}>
                    <Icon name="qr-code-scanner" size={20} color="#AAA" style={{ marginRight: 8 }} />
                    <Text style={styles.qrText}>{t('connect_ui.scan_qr_code', { defaultValue: 'Scan QR Code' })}</Text>
                </TouchableOpacity>
            </View>

            {/* Password Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Enter Password</Text>
                        <Text style={styles.modalSubtitle}>for {selectedNetwork?.ssid}</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor="#999"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                            autoFocus
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setModalVisible(false)}>
                                <Text style={styles.btnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, styles.connectBtn]} onPress={confirmConnect}>
                                <Text style={styles.btnText}>Connect</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 20 },
    backButton: { width: 40 },
    headerTitle: { ...FONTS.h3, color: '#FFF' },
    content: { flex: 1, alignItems: 'center' },
    instructionText: { ...FONTS.body3, color: '#AAA', marginTop: 10, marginBottom: 30 },

    radarContainer: {
        width: width,
        height: width, // Square container for circle calculations
        justifyContent: 'center', // Center vertically relative to itself
        alignItems: 'center', // Center horizontally
        position: 'relative',
        marginTop: 40,
    },
    ripple: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    centerAvatarData: {
        alignItems: 'center',
        zIndex: 10,
    },
    centerAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.1)',
        elevation: 10,
    },
    myDeviceName: {
        color: '#FFF',
        marginTop: 8,
        fontWeight: 'bold',
        fontSize: 14,
    },

    // Planet Nodes (Devices)
    planetNode: {
        position: 'absolute',
        width: 80,
        alignItems: 'center',
    },
    planetAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
        elevation: 5,
    },
    planetName: {
        color: '#FFF',
        fontSize: 12,
        marginTop: 4,
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    autoBadge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: '#FFD700',
        borderRadius: 10,
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFF',
    },
    nodeLoader: {
        position: 'absolute',
        top: 15,
    },
    scanningText: {
        position: 'absolute',
        bottom: 40,
        color: 'rgba(255,255,255,0.3)',
        fontSize: 24,
    },

    qrButton: {
        position: 'absolute',
        bottom: 50,
        flexDirection: 'row',
        alignItems: 'center',
    },
    qrText: {
        color: '#AAA',
        fontSize: 14,
    },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '80%', backgroundColor: '#222', borderRadius: 15, padding: 25, alignItems: 'center' },
    modalTitle: { ...FONTS.h3, color: '#FFF', marginBottom: 5 },
    modalSubtitle: { ...FONTS.body3, color: '#AAA', marginBottom: 20 },
    input: { width: '100%', height: 50, backgroundColor: '#333', borderRadius: 10, paddingHorizontal: 15, color: '#FFF', marginBottom: 20 },
    modalButtons: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
    modalBtn: { flex: 1, height: 45, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginHorizontal: 5 },
    cancelBtn: { backgroundColor: '#444' },
    connectBtn: { backgroundColor: COLORS.primary },
    btnText: { color: '#FFF', fontWeight: 'bold' },
    autoConnectBadge: {
        position: 'absolute',
        bottom: -5,
        backgroundColor: '#00E676',
        borderRadius: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        fontSize: 9,
        color: '#FFF',
        fontWeight: 'bold',
        overflow: 'hidden',
    }
});

export default JoinScreen;

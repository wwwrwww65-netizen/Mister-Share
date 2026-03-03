import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, FONTS } from '../../theme';
import PermissionsManager from '../../services/PermissionsManager';

const { width } = Dimensions.get('window');

interface PermissionCheckModalProps {
    visible: boolean;
    onClose: () => void;
    onAllGranted: () => void;
}

// Helper specific to this component, maybe move to service later if needed
// We want to detect if we need to show "Turn on WiFi" vs "Grant Permission"
// But currently `checkConnectionPermissionStatus` mixes them.
// For the requested "Zapya" look, we ideally need separate rows for:
// 1. GPS
// 2. WiFi (Enabled)
// 3. Bluetooth (Enabled)
// Currently 'permissions' row covers WiFi/BT PERMISSIONS.
// Usage suggests the user wants to Toggle them ON.

const PermissionCheckModal = ({ visible, onClose, onAllGranted }: PermissionCheckModalProps) => {
    const { t } = useTranslation();
    const [status, setStatus] = useState({
        gps: true,
        permissions: true,
        wifi: true,
        bluetooth: true,
        vpn: false,
        storage: true // Added storage
    });
    const [loading, setLoading] = useState(true);

    const checkAll = async () => {
        setLoading(true);
        // Use the specific connection check
        const statusCheck = await PermissionsManager.checkConnectionPermissionStatus();
        // Also check storage permission
        const fullStatus = await PermissionsManager.checkPermissionStatus();
        const isGpsOn = await PermissionsManager.isGPSEnabled();
        const isVpnOn = await PermissionsManager.isVpnActive();

        const newStatus = {
            gps: isGpsOn,
            // Permissions only checks if we have the RIGHTS
            permissions: statusCheck.details.location && statusCheck.details.wifiNearby && statusCheck.details.bluetooth,
            // Hardware checks
            wifi: statusCheck.details.isWifiOn,
            bluetooth: statusCheck.details.isBluetoothOn,
            vpn: isVpnOn,
            storage: fullStatus.storage
        };

        setStatus(newStatus);
        setLoading(false);

        // Auto-proceed if everything is good
        if (newStatus.gps && newStatus.permissions && newStatus.wifi && newStatus.bluetooth && !newStatus.vpn && newStatus.storage) {
            onAllGranted();
        }
    };

    useEffect(() => {
        if (visible) {
            checkAll();
        }
    }, [visible]);

    const handleTurnOnGps = async () => {
        await PermissionsManager.ensureGPSEnabled();
        // Wait a bit for system to register change
        setTimeout(checkAll, 1000);
    };

    const handleGrantPermissions = async () => {
        // 1. Try to enable Bluetooth in-place
        if (!status.permissions) {
            await PermissionsManager.ensureBluetoothEnabled();
            await PermissionsManager.requestConnectionPermissions();
        }
        checkAll();
    };

    const handleGrantStorage = async () => {
        await PermissionsManager.requestMediaPermissionsOnly();
        checkAll();
    };

    const handleTurnonWifi = async () => {
        await PermissionsManager.openWifiSettingsPanel();
        // Wait for user to toggle and return
        setTimeout(checkAll, 1000); // Check after a delay
    }

    const handleTurnOffVpn = () => {
        try {
            Linking.sendIntent('android.settings.VPN_SETTINGS');
            setTimeout(() => onClose(), 500);
        } catch (error) {
            try {
                Linking.sendIntent('android.settings.WIRELESS_SETTINGS');
                setTimeout(() => onClose(), 500);
            } catch (fallbackError) {
                onClose();
            }
        }
    };

    const allReady = status.gps && status.permissions && status.wifi && status.bluetooth && !status.vpn && status.storage;

    const handleNext = () => {
        if (allReady) {
            onAllGranted();
        }
    };

    // Render Items helper
    const renderItem = (type: 'gps' | 'permissions' | 'vpn' | 'wifi' | 'bluetooth' | 'storage') => {
        let isReady = false;
        let title = '';
        let desc = '';
        let icon = '';
        let action = () => { };
        let btnText = t('connect_ui.turn_on', { defaultValue: 'Turn On' });

        switch (type) {
            case 'gps':
                isReady = status.gps;
                title = t('connect_ui.perm_gps_title');
                desc = t('connect_ui.perm_gps_desc');
                icon = 'location-on';
                action = handleTurnOnGps;
                break;
            case 'permissions':
                isReady = status.permissions;
                title = t('connect_ui.perm_req_title', { defaultValue: 'Connection Services' });
                desc = t('connect_ui.perm_req_desc', { defaultValue: 'Grant WiFi & Bluetooth permissions.' });
                icon = 'security';
                action = handleGrantPermissions;
                btnText = t('common.grant_permission', { defaultValue: 'Grant' });
                break;
            case 'storage':
                isReady = status.storage;
                title = t('permissions.required_title', { defaultValue: 'Permission Required' });
                desc = t('permissions.storage_msg', { defaultValue: 'Storage permission is required.' });
                icon = 'folder';
                action = handleGrantStorage;
                btnText = t('common.grant_permission', { defaultValue: 'Grant' });
                break;
            case 'vpn':
                isReady = !status.vpn; // Ready if VPN is OFF
                title = t('connect_ui.vpn_off_title', { defaultValue: 'Turn off VPN' });
                desc = t('connect_ui.vpn_off_desc', { defaultValue: 'VPN may block WiFi Direct connection. Please turn it off manually.' });
                icon = 'vpn-key';
                action = handleTurnOffVpn;
                btnText = t('connect_ui.open_settings', { defaultValue: 'Open Settings' });
                break;
            case 'wifi':
                isReady = status.wifi;
                title = t('connect_ui.turn_on_wifi', { defaultValue: 'Turn on WiFi' });
                desc = t('connect_ui.turn_on_wifi_desc', { defaultValue: 'WiFi must be enabled for file sharing.' });
                icon = 'wifi';
                action = handleTurnonWifi;
                break;
            case 'bluetooth':
                isReady = status.bluetooth;
                title = t('connect_ui.turn_on_bt', { defaultValue: 'Turn on Bluetooth' });
                desc = t('connect_ui.turn_on_bt_desc', { defaultValue: 'Bluetooth is required for device discovery.' });
                icon = 'bluetooth';
                action = async () => {
                    await PermissionsManager.ensureBluetoothEnabled();
                    checkAll();
                };
                break;
        }

        if (isReady) return null;

        return (
            <View style={styles.permissionItem} key={type}>
                <View style={styles.permissionIconBg}>
                    <Icon name={icon} size={24} color="#4DACFF" />
                </View>
                <View style={{ flex: 1, paddingHorizontal: 10 }}>
                    <Text style={styles.permTitle}>{title}</Text>
                    <Text style={styles.permDesc}>{desc}</Text>
                </View>
                <TouchableOpacity style={[styles.turnOnBtn, type === 'vpn' && { borderColor: '#FF5252' }]} onPress={action}>
                    <Text style={[styles.turnOnText, type === 'vpn' && { color: '#FF5252' }]}>{btnText}</Text>
                </TouchableOpacity>
            </View>
        );
    };

    if (!visible) return null;

    // If everything is ready and not loading, we anticipate the auto-close/proceed
    // But we avoid returning null to prevent flickering during the layout transition if possible
    // However, for modal, returning null means it won't render
    if (allReady && !loading) return null;

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {/* Header Icon */}
                    <View style={styles.headerIconContainer}>
                        <Icon name="assignment-turned-in" size={40} color="#FFF" />
                    </View>

                    <Text style={styles.title}>
                        {t('connect_ui.prepare_transfer')}
                    </Text>
                    <Text style={styles.subtitle}>
                        {t('connect_ui.prepare_transfer_desc')}
                    </Text>

                    {/* Dynamic Permission Items */}
                    {renderItem('vpn')}
                    {renderItem('storage')}
                    {renderItem('permissions')}
                    {renderItem('wifi')}
                    {renderItem('bluetooth')}
                    {renderItem('gps')}

                    {/* Footer Buttons */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.nextBtn, !allReady && styles.disabledBtn]}
                            onPress={handleNext}
                            disabled={!allReady}
                        >
                            <Text style={styles.nextText}>{t('common.next')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: width * 0.85,
        backgroundColor: '#FFF',
        borderRadius: 20,
        paddingTop: 40,
        alignItems: 'center',
        overflow: 'hidden',
    },
    headerIconContainer: {
        position: 'absolute',
        top: -20,
        backgroundColor: '#00D4FF', // Cyan color
        width: 80,
        height: 60,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 10,
    },
    title: {
        ...FONTS.h3,
        color: '#000',
        marginTop: 10,
        marginBottom: 5,
    },
    subtitle: {
        ...FONTS.body3,
        color: '#777',
        marginBottom: 20,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    permissionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    permissionIconBg: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E3F2FD',
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeIconBg: {
        backgroundColor: COLORS.success,
    },
    permTitle: {
        ...FONTS.body2,
        color: '#333',
        fontWeight: 'bold',
    },
    permDesc: {
        ...FONTS.caption,
        color: '#999',
        fontSize: 10,
        marginTop: 2,
    },
    turnOnBtn: {
        borderWidth: 1,
        borderColor: '#00D4FF',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 5,
    },
    turnOnText: {
        color: '#00D4FF',
        fontWeight: 'bold',
        fontSize: 12,
    },
    footer: {
        flexDirection: 'row',
        width: '100%',
        height: 50,
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        marginTop: 10,
    },
    cancelBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: '#EEE',
    },
    cancelText: {
        ...FONTS.body3,
        color: '#777',
    },
    nextBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0091EA', // Darker blue for action
    },
    disabledBtn: {
        backgroundColor: '#B0BEC5',
    },
    nextText: {
        ...FONTS.body3,
        color: '#FFF',
        fontWeight: 'bold',
    }
});

export default PermissionCheckModal;

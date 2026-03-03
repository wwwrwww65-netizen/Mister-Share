import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS, FONTS } from '../theme';
import PermissionsManager from '../services/PermissionsManager';

import PermissionCheckModal from '../components/modern/PermissionCheckModal';

const { width } = Dimensions.get('window');

const Connect = ({ navigation, route }: any) => {
    const { t } = useTranslation();
    const [showPermissionModal, setShowPermissionModal] = React.useState(false);
    const [targetScreen, setTargetScreen] = React.useState<string | null>(null);

    // Get files if passed from FileBrowser
    const filesToTransfer = route.params?.files;

    const handleActionPress = async (screen: string) => {
        setTargetScreen(screen);

        // Strict Gate: Check everything before showing modal
        const status = await PermissionsManager.checkConnectionPermissionStatus();
        const gpsEnabled = await PermissionsManager.isGPSEnabled();

        if (status.allGranted && gpsEnabled) {
            // All good, go directly, passing files if they exist
            navigation.navigate(screen, { files: filesToTransfer });
        } else {
            // Something missing, show modal to fix
            setShowPermissionModal(true);
        }
    };

    const handlePermissionsGranted = () => {
        setShowPermissionModal(false);
        if (targetScreen) {
            navigation.navigate(targetScreen, { files: filesToTransfer });
        }
    };

    // Secondary Actions Grid
    const actions = [
        { id: 'clone', label: 'connect_ui.phone_clone', icon: 'phonelink-setup' },
        { id: 'qr', label: 'connect_ui.share_via_qr', icon: 'qr-code' },
        { id: 'shake', label: 'connect_ui.shake_to_connect', icon: 'vibration' },
        { id: 'invite', label: 'connect_ui.invite_friends', icon: 'share' },
        { id: 'wifi', label: 'connect_ui.wifi_settings', icon: 'wifi' },
        { id: 'help', label: 'connect_ui.help', icon: 'help-outline' },
    ];

    return (
        <LinearGradient
            colors={['#05103A', '#0A1E5E']}
            style={styles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={{ width: 40 }} />
                <Text style={styles.headerTitle}>{t('connect_ui.sharing_with_friend', { defaultValue: 'Sharing with a friend' })}</Text>
                <View style={styles.headerIcons}>
                    <TouchableOpacity><Icon name="cloud-queue" size={28} color="#FFF" style={styles.headerIcon} /></TouchableOpacity>
                    <TouchableOpacity><Icon name="history" size={28} color="#FFF" /></TouchableOpacity>
                </View>
            </View>

            <View style={styles.mainContent}>
                {/* Main Action Buttons */}
                <View style={styles.heroRow}>
                    {/* Create Group (Send) */}
                    <TouchableOpacity style={styles.heroBtnContainer} onPress={() => handleActionPress('ReceiveScreen')}>
                        <View style={styles.heroBubble}>
                            <LinearGradient
                                colors={['rgba(80, 100, 255, 0.3)', 'rgba(80, 100, 255, 0.1)']}
                                style={styles.heroGradient}
                            >
                                <Icon name="group-add" size={50} color="#4DACFF" />
                                <View style={styles.badge}><Icon name="check" size={12} color="#FFF" /></View>
                            </LinearGradient>
                        </View>
                        <Text style={styles.heroLabel}>{t('connect_ui.create_group')}</Text>
                    </TouchableOpacity>

                    {/* Join Group (Receive) */}
                    <TouchableOpacity style={styles.heroBtnContainer} onPress={() => handleActionPress('JoinScreen')}>
                        <View style={styles.heroBubble}>
                            <LinearGradient
                                colors={['rgba(80, 100, 255, 0.3)', 'rgba(80, 100, 255, 0.1)']}
                                style={styles.heroGradient}
                            >
                                <Icon name="person-add" size={50} color="#4DACFF" />
                                <View style={styles.badge}><Icon name="add" size={12} color="#FFF" /></View>
                            </LinearGradient>
                        </View>
                        <Text style={styles.heroLabel}>{t('connect_ui.join_group')}</Text>
                    </TouchableOpacity>
                </View>

                <PermissionCheckModal
                    visible={showPermissionModal}
                    onClose={() => setShowPermissionModal(false)}
                    onAllGranted={handlePermissionsGranted}
                />

                {/* Toggle (Visual) */}
                <View style={styles.toggleContainer}>
                    <TouchableOpacity style={styles.toggleBtn}>
                        <Icon name="sync-alt" size={24} color="#FF7F50" />
                    </TouchableOpacity>
                </View>

                {/* Grid Actions */}
                <View style={styles.gridContainer}>
                    {actions.map((action) => (
                        <TouchableOpacity key={action.id} style={styles.gridItem}>
                            <Icon name={action.icon} size={28} color="#FFF" style={{ marginBottom: 8 }} />
                            <Text style={styles.gridLabel}>{t(action.label)}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Bottom Close */}
            <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
                <Icon name="close" size={24} color="#FFF" />
            </TouchableOpacity>

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
        marginBottom: 40,
    },
    headerTitle: {
        ...FONTS.h3,
        color: '#FFF',
    },
    headerIcons: {
        flexDirection: 'row',
    },
    headerIcon: {
        marginRight: 15,
    },
    mainContent: {
        flex: 1,
        alignItems: 'center',
    },
    heroRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 40,
        marginBottom: 30,
    },
    heroBtnContainer: {
        alignItems: 'center',
    },
    heroBubble: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    heroGradient: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroLabel: {
        ...FONTS.h3,
        color: '#FFF',
        fontSize: 16,
    },
    badge: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FFF',
    },
    toggleContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    toggleBtn: {
        width: 60,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: width * 0.9,
        justifyContent: 'space-between',
    },
    gridItem: {
        width: '33%', // 3 columns
        alignItems: 'center',
        marginBottom: 30,
    },
    gridLabel: {
        ...FONTS.body2,
        color: COLORS.textDim,
        fontSize: 12,
        textAlign: 'center',
    },
    closeBtn: {
        position: 'absolute',
        bottom: 40,
        alignSelf: 'center',
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    }
});

export default Connect;

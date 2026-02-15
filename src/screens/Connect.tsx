import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS, FONTS } from '../theme';
import PermissionsManager from '../services/PermissionsManager';

import PermissionCheckModal from '../components/modern/PermissionCheckModal';
import AppBackground from '../components/modern/AppBackground';

const { width } = Dimensions.get('window');

const Connect = ({ navigation, route }: any) => {
    // ... (rest of the component logic remains unchanged)
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

    return (
        <AppBackground style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={{ width: 40 }} />
                <Text style={styles.headerTitle}>{t('connect_ui.sharing_with_friend', { defaultValue: 'Sharing with a friend' })}</Text>
                
                {/* History Button (Restored & Functional) */}
                <View style={{ width: 40, alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => navigation.navigate('HistoryTab')}>
                        <Icon name="history" size={28} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.mainContent}>
                {/* Main Action Buttons - Centered and Focused */}
                <View style={styles.heroRow}>
                    {/* Create Group (Send) */}
                    <TouchableOpacity style={styles.heroBtnContainer} onPress={() => handleActionPress('ReceiveScreen')}>
                        <View style={[styles.heroBubble, { borderColor: '#4DACFF' }]}>
                            <LinearGradient
                                colors={['rgba(77, 172, 255, 0.2)', 'rgba(77, 172, 255, 0.05)']}
                                style={styles.heroGradient}
                            >
                                <Icon name="group-add" size={60} color="#4DACFF" />
                            </LinearGradient>
                        </View>
                        <Text style={styles.heroLabel}>{t('connect_ui.create_group')}</Text>
                        <Text style={styles.heroSubLabel}>{t('connect_ui.send_files', { defaultValue: 'Send Files' })}</Text>
                    </TouchableOpacity>

                    {/* Join Group (Receive) */}
                    <TouchableOpacity style={styles.heroBtnContainer} onPress={() => handleActionPress('JoinScreen')}>
                        <View style={[styles.heroBubble, { borderColor: '#00E676' }]}>
                            <LinearGradient
                                colors={['rgba(0, 230, 118, 0.2)', 'rgba(0, 230, 118, 0.05)']}
                                style={styles.heroGradient}
                            >
                                <Icon name="person-add" size={60} color="#00E676" />
                            </LinearGradient>
                        </View>
                        <Text style={styles.heroLabel}>{t('connect_ui.join_group')}</Text>
                        <Text style={styles.heroSubLabel}>{t('connect_ui.receive_files', { defaultValue: 'Receive Files' })}</Text>
                    </TouchableOpacity>
                </View>

                <PermissionCheckModal
                    visible={showPermissionModal}
                    onClose={() => setShowPermissionModal(false)}
                    onAllGranted={handlePermissionsGranted}
                />

                {/* App Features / Instructions */}
                <View style={styles.featuresContainer}>
                    <FeatureItem icon="wifi-off" text={t('connect.no_internet', { defaultValue: 'No Internet Required' })} />
                    <FeatureItem icon="speed" text={t('connect.fast_speed', { defaultValue: 'Ultra Fast Speed' })} />
                    <FeatureItem icon="security" text={t('connect.secure', { defaultValue: 'End-to-End Secure' })} />
                </View>
            </View>

            {/* Bottom Close */}
            <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
                <Icon name="close" size={24} color="#FFF" />
            </TouchableOpacity>

        </AppBackground>
    );
};

// Helper Component for Features
const FeatureItem = ({ icon, text }: { icon: string, text: string }) => (
    <View style={styles.featureItem}>
        <View style={styles.featureIconBubble}>
            <Icon name={icon} size={20} color={COLORS.secondary} />
        </View>
        <Text style={styles.featureText}>{text}</Text>
    </View>
);

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
        marginBottom: 60, // Increased spacing
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
        justifyContent: 'flex-start', // Align to top
        paddingTop: 60, // Shift up slightly from center
    },
    heroRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 40,
        marginBottom: 50, // More space below buttons
    },
    heroBtnContainer: {
        alignItems: 'center',
    },
    heroBubble: {
        width: 140, // Larger
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        borderWidth: 2, // Thicker border
        // borderColor set dynamically
    },
    heroGradient: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroLabel: {
        ...FONTS.h3,
        color: '#FFF',
        fontSize: 18, // Larger
        marginBottom: 5,
    },
    heroSubLabel: { // Added style
        ...FONTS.body3,
        color: COLORS.textDim,
        fontSize: 14,
    },
    // New Feature Styles
    featuresContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        marginTop: 20,
    },
    featureItem: {
        alignItems: 'center',
        width: 100,
    },
    featureIconBubble: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    featureText: {
        ...FONTS.caption,
        color: COLORS.textDim,
        textAlign: 'center',
        opacity: 0.8,
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

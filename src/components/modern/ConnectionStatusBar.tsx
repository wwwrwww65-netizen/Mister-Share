import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useConnectionStore } from '../../store/connectionStore';
import { COLORS, FONTS } from '../../theme';

interface ConnectionStatusBarProps {
    onPress?: () => void;
}

/**
 * Persistent connection status bar shown in main navigation
 * Displays P2P connection status, peer count, and network info
 */
const { width } = Dimensions.get('window');

const ConnectionStatusBar: React.FC<ConnectionStatusBarProps> = ({ onPress }) => {
    const { t } = useTranslation();

    // Animation Values
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const {
        isConnected,
        isConnecting,
        connectedPeers,
        ssid,
        targetSsid,
        isGroupOwner,
        disconnect // Import disconnect action
    } = useConnectionStore();

    // Pulse animation
    useEffect(() => {
        if (isConnecting || (isGroupOwner && connectedPeers.length === 0)) {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isConnecting, isGroupOwner, connectedPeers.length]);

    // Determine target name
    const targetName = isConnecting ? (targetSsid || 'Peer').replace(/^(AndroidShare_|MisterShare_)/i, '') :
        (isConnected && connectedPeers.length > 0 ? connectedPeers[0].deviceName : 'Device');

    const handleDisconnect = () => {
        // Confirm first? Or just disconnect? Zapya usually just disconnects or asks.
        // For sticky bar, a direct press might be too easy to hit, but the X is specific.
        disconnect();
    };

    // Default Avatar Emojis
    const getAvatar = (name: string) => {
        const avatars = ['🦊', '🐼', '🐨', '🐯', '🦁', '🐷', '🐸'];
        return avatars[name.length % avatars.length];
    };

    return (
        <TouchableOpacity
            style={styles.container}
            activeOpacity={0.9}
            onPress={onPress}
        >
            <LinearGradient
                colors={['#0A1E5E', '#162b75']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.gradientBg}
            >
                {/* Close/Disconnect Button (Always visible or only when connected?)
                    User image shows it in Connected state.
                    In Zapya connecting state, can you cancel? Yes.
                */}
                <TouchableOpacity style={styles.closeButton} onPress={handleDisconnect}>
                    <Icon name="close" size={20} color="#FF6B6B" />
                </TouchableOpacity>

                <View style={styles.contentRow}>

                    {/* Left Side: Avatars */}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {/* ME Avatar */}
                        <View style={styles.avatarWrapper}>
                            <LinearGradient colors={['#eee', '#ccc']} style={styles.avatarCircle}>
                                <MaterialCommunityIcons name="cellphone-sound" size={24} color="#555" />
                            </LinearGradient>
                            <Text style={styles.avatarName}>{t('connect_ui.me', { defaultValue: 'Me' })}</Text>
                        </View>

                        {/* Connection Line / Indicator */}
                        {isConnecting || (isGroupOwner && connectedPeers.length === 0) ? (
                            <View style={styles.connectingLine}>
                                <Animated.View style={{ transform: [{ scale: pulseAnim }], flexDirection: 'row' }}>
                                    <View style={styles.dot} />
                                    <View style={[styles.dot, { opacity: 0.7 }]} />
                                    <View style={[styles.dot, { opacity: 0.4 }]} />
                                </Animated.View>
                            </View>
                        ) : (
                            // Connected State: Closer avatars, maybe overlapping or close by
                            <View style={{ width: 10 }} />
                        )}

                        {/* Target Avatar */}
                        <View style={styles.avatarWrapper}>
                            <LinearGradient colors={['#eee', '#ccc']} style={styles.avatarCircle}>
                                {isConnecting ? (
                                    <Text style={{ fontSize: 20 }}>⏳</Text>
                                ) : isGroupOwner && connectedPeers.length === 0 ? (
                                    <Text style={{ fontSize: 20 }}>👀</Text>
                                ) : (
                                    <MaterialCommunityIcons name="cellphone" size={24} color="#007AFF" />
                                )}
                            </LinearGradient>
                            <Text style={styles.avatarName} numberOfLines={1}>
                                {isGroupOwner && connectedPeers.length === 0 ? '...' : targetName.substring(0, 8)}
                            </Text>
                        </View>
                    </View>

                    {/* Middle / Right Text Info */}
                    <View style={styles.statusRight}>
                        {isConnecting ? (
                            <Text style={styles.statusText}>{t('connect_ui.connecting', { defaultValue: 'Connecting...' })}</Text>
                        ) : isGroupOwner && connectedPeers.length === 0 ? (
                            // Host Waiting State
                            <View>
                                <Text style={styles.statusText}>{t('connect_ui.waiting_for_friends', { defaultValue: 'Waiting for friends...' })}</Text>
                                <Text style={[styles.avatarName, { color: COLORS.warning, marginTop: 0 }]}>{ssid?.replace('AndroidShare_', '')}</Text>
                            </View>
                        ) : (
                            // Connected Actions / Info
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {/* Only basic text for now, maybe speed later */}
                                <Text style={[styles.statusText, { color: COLORS.success, marginRight: 20 }]}>
                                    {t('common.connected', { defaultValue: 'Connected' })}
                                </Text>

                                {/* Chat Icon (Visual only for now per request) */}
                                {/* <Icon name="chat" size={20} color="#FFF" style={{marginRight: 10}} /> */}
                            </View>
                        )}
                    </View>

                </View>

            </LinearGradient>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 15,
        marginBottom: 10,
        borderRadius: 30, // Zapya style pill
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        height: 70, // Fixed height for consistency
    },
    gradientBg: {
        flex: 1,
        paddingHorizontal: 15,
        justifyContent: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 25, // Centered vertically roughly
        right: 15,
        zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 12,
        padding: 4,
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start', // Align everything to left
    },
    avatarWrapper: {
        alignItems: 'center',
        width: 46,
    },
    avatarCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    avatarName: {
        color: '#FFF',
        fontSize: 9,
        marginTop: 2,
        fontWeight: 'bold',
    },
    connectingLine: {
        width: 40,
        alignItems: 'center',
    },
    statusRight: {
        flex: 1,
        alignItems: 'center', // Center text globally in remaining space? Or left?
        // User image shows text in middle/right
        paddingLeft: 10,
    },
    statusText: {
        color: '#FFF',
        fontSize: 12,
        marginBottom: 4,
    },
    lineConnector: {
        height: 2,
        width: '80%',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 1,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.warning,
        marginHorizontal: 2,
        marginBottom: 4,
    }
});

export default ConnectionStatusBar;

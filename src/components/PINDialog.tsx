import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Modal,
    TouchableOpacity,
    Clipboard,
    Alert,
    Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SIZES } from '../theme';
import { showToast } from '../services/ToastManager';

// Modern
import GlassCard from './modern/GlassCard';
import NeoButton from './modern/NeoButton';

interface PINDialogProps {
    visible: boolean;
    mode: 'display' | 'input';
    pin?: string;
    deviceName?: string;
    onPINEntered?: (pin: string) => void;
    onCancel: () => void;
}

const { width } = Dimensions.get('window');

const PINDialog: React.FC<PINDialogProps> = ({
    visible,
    mode,
    pin,
    deviceName,
    onPINEntered,
    onCancel
}) => {
    const { t } = useTranslation();
    const [inputPIN, setInputPIN] = useState('');
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

    useEffect(() => {
        if (!visible) {
            setInputPIN('');
            setTimeLeft(300);
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    onCancel();
                    Alert.alert(t('pin.session_expired'), t('pin.session_expired_msg'));
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [visible]);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSubmit = () => {
        if (inputPIN.length === 6 && onPINEntered) {
            onPINEntered(inputPIN);
        }
    };

    const copyPINToClipboard = () => {
        if (pin) {
            Clipboard.setString(pin);
            showToast('Copied', 'success');
        }
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <GlassCard style={styles.dialog} variant="heavy">
                    {mode === 'display' ? (
                        <>
                            {/* Display Mode */}
                            <View style={styles.iconContainer}>
                                <Icon name="lock" size={50} color={COLORS.primary} />
                            </View>

                            <Text style={styles.title}>{t('pin.title_display')}</Text>
                            <Text style={styles.subtitle}>{t('pin.subtitle_display')}</Text>

                            <TouchableOpacity
                                style={styles.pinContainer}
                                onPress={copyPINToClipboard}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.pin}>{pin}</Text>
                                <Icon name="content-copy" size={20} color={COLORS.primary} style={styles.copyIcon} />
                            </TouchableOpacity>

                            {deviceName && (
                                <Text style={styles.deviceName}>
                                    {t('pin.waiting', { name: deviceName })}
                                </Text>
                            )}

                            <View style={styles.timerContainer}>
                                <Icon name="timer" size={16} color={COLORS.error} />
                                <Text style={styles.timer}>
                                    {t('pin.expires', { time: formatTime(timeLeft) })}
                                </Text>
                            </View>

                            <View style={styles.securityInfo}>
                                <Icon name="security" size={16} color={COLORS.success} />
                                <Text style={styles.securityText}>{t('pin.security_msg')}</Text>
                            </View>
                        </>
                    ) : (
                        <>
                            {/* Input Mode */}
                            <View style={styles.iconContainer}>
                                <Icon name="dialpad" size={50} color={COLORS.primary} />
                            </View>

                            <Text style={styles.title}>{t('pin.title_input')}</Text>
                            <Text style={styles.subtitle}>{t('pin.subtitle_input')}</Text>

                            <TextInput
                                style={styles.input}
                                value={inputPIN}
                                onChangeText={(text) => {
                                    const digits = text.replace(/[^0-9]/g, '');
                                    setInputPIN(digits);
                                    if (digits.length === 6) {
                                        setTimeout(() => handleSubmit(), 300);
                                    }
                                }}
                                keyboardType="number-pad"
                                maxLength={6}
                                placeholder="000000"
                                placeholderTextColor={COLORS.textDim}
                                autoFocus
                                returnKeyType="done"
                                onSubmitEditing={handleSubmit}
                            />

                            <NeoButton
                                label={t('pin.button_connect')}
                                onPress={handleSubmit}
                                icon={<Icon name="arrow-forward" size={20} color={COLORS.white} />}
                                style={{ marginBottom: 16, width: '100%' }}
                            />

                            <View style={styles.securityInfo}>
                                <Icon name="security" size={16} color={COLORS.success} />
                                <Text style={styles.securityText}>{t('pin.security_msg')}</Text>
                            </View>
                        </>
                    )}

                    <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                        <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                </GlassCard>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dialog: {
        width: width * 0.85,
        maxWidth: 400,
        padding: 32,
        alignItems: 'center',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(108, 99, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.white,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.textDim,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    pinContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(108, 99, 255, 0.1)',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 24,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    pin: {
        fontSize: 40,
        fontWeight: 'bold',
        color: COLORS.primary,
        letterSpacing: 8,
    },
    copyIcon: {
        marginLeft: 16,
    },
    deviceName: {
        fontSize: 13,
        color: COLORS.white,
        marginBottom: 12,
    },
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    timer: {
        fontSize: 13,
        color: COLORS.error,
        marginLeft: 6,
        fontWeight: '500',
    },
    input: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 16,
        fontSize: 32,
        color: COLORS.white,
        textAlign: 'center',
        letterSpacing: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    securityInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    securityText: {
        fontSize: 12,
        color: COLORS.success,
        marginLeft: 6,
    },
    cancelButton: {
        padding: 12,
    },
    cancelText: {
        color: COLORS.textDim,
        fontSize: 15,
        fontWeight: '500',
    },
});

export default PINDialog;

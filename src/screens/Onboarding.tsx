import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, Alert, AppState, Platform, Linking } from 'react-native';
import { COLORS, FONTS, SIZES } from '../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';

// Modern Components
import AppBackground from '../components/modern/AppBackground';
import NeoButton from '../components/modern/NeoButton';
import GlassCard from '../components/modern/GlassCard';
import PermissionsManager from '../services/PermissionsManager';
import { hasAllFilesPermission } from '../services/FileSystem';

const { width } = Dimensions.get('window');

const Onboarding = ({ navigation }: any) => {
    const { t, i18n } = useTranslation();
    const [step, setStep] = useState(0);
    const [waitingForPermission, setWaitingForPermission] = useState(false);
    const appState = useRef(AppState.currentState);

    // Monitor app state to detect when user returns from settings
    useEffect(() => {
        const subscription = AppState.addEventListener('change', async (nextAppState) => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active' &&
                waitingForPermission
            ) {
                // User returned from settings, check if permission was granted
                console.log('[Onboarding] User returned from settings, checking permissions...');

                // Check if MANAGE_EXTERNAL_STORAGE was granted
                const hasManage = await hasAllFilesPermission();

                if (hasManage) {
                    console.log('[Onboarding] Permission granted! Continuing to app...');
                    setWaitingForPermission(false);
                    navigation.replace('Main');
                } else {
                    console.log('[Onboarding] Permission still not granted');
                    setWaitingForPermission(false);
                }
            }

            appState.current = nextAppState;
        });

        return () => {
            subscription.remove();
        };
    }, [waitingForPermission, navigation]);

    const handleNext = async () => {
        if (step === 0) {
            setStep(1);
        } else {
            // Request permissions now using the new status-returning function
            setWaitingForPermission(true);
            const status = await PermissionsManager.requestMediaPermissionsOnly();

            if (status === 'granted') {
                navigation.replace('Main');
            } else if (status === 'blocked') {
                Alert.alert(
                    t('permissions.required_title', { defaultValue: 'Permissions Required' }),
                    t('permissions.settings_msg', { defaultValue: 'Please enable permissions in settings to use the app.' }),
                    [
                        { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
                        { text: t('permissions.open_settings', { defaultValue: 'Settings' }), onPress: () => Linking.openSettings() }
                    ]
                );
                setWaitingForPermission(false);
            } else {
                // Denied or waiting for manage storage
                if (typeof Platform.Version === 'number' && Platform.Version >= 30) {
                    // Check manage storage...
                    // If we are here, it means basic media might be granted but manage storage might be pending/denied logic inside PermissionsManager
                    // To keep it simple, if status is 'denied', show message
                }

                Alert.alert(
                    t('permissions.required_title', { defaultValue: 'Permissions Required' }),
                    t('permissions.msg', { defaultValue: 'Please grant permissions to continue.' }),
                    [
                        { text: t('common.ok', { defaultValue: 'OK' }) }
                    ]
                );
                setWaitingForPermission(false);
            }
        }
    };

    return (
        <AppBackground hideStatusBar>
            <View style={styles.container}>

                {/* Illustration Area */}
                <View style={styles.artArea}>
                    <View style={styles.glowCircle} />
                    <Icon name={step === 0 ? "rocket-launch" : "security"} size={100} color="#FFF" />
                </View>

                {/* Text Content */}
                <View style={styles.content}>
                    <Text style={styles.title}>
                        {step === 0 ? t('onboarding.title_1') : t('onboarding.title_2')}
                    </Text>
                    <Text style={styles.desc}>
                        {step === 0
                            ? t('onboarding.desc_1')
                            : t('onboarding.desc_2')}
                    </Text>

                    {/* Step Indicator */}
                    <View style={styles.dots}>
                        <View style={[styles.dot, step === 0 && styles.activeDot]} />
                        <View style={[styles.dot, step === 1 && styles.activeDot]} />
                    </View>
                </View>

                {/* Footer Action */}
                <View style={styles.footer}>
                    <NeoButton
                        label={step === 0 ? t('onboarding.get_started') : t('onboarding.grant_access')}
                        onPress={handleNext}
                        width={width - 40}
                        icon={<Icon name={i18n.language === 'ar' ? "arrow-back" : "arrow-forward"} size={20} color="#FFF" />}
                    />
                </View>

            </View>
        </AppBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'space-between',
        paddingVertical: 50,
    },
    artArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    glowCircle: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: COLORS.primary,
        opacity: 0.1,
    },
    content: {
        paddingHorizontal: 40,
        alignItems: 'center',
    },
    title: {
        ...FONTS.h1,
        color: COLORS.white,
        textAlign: 'center',
        marginBottom: 16,
    },
    desc: {
        ...FONTS.body1,
        color: COLORS.textDim,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 30,
    },
    dots: {
        flexDirection: 'row',
        gap: 10,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    activeDot: {
        backgroundColor: COLORS.secondary,
        width: 30,
    },
    footer: {
        paddingHorizontal: 20,
        alignItems: 'center',
    }
});

export default Onboarding;

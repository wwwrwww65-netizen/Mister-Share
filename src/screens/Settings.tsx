import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Image, Linking, NativeModules } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, FONTS, SIZES } from '../theme';

// Modern Components
import AppBackground from '../components/modern/AppBackground';
import ModernHeader from '../components/modern/ModernHeader';
import GlassCard from '../components/modern/GlassCard';
import NeoButton from '../components/modern/NeoButton';
import { AdService } from '../services/AdService';

import { useThemeStore } from '../store/themeStore';

const { NotificationControl } = NativeModules;

const Settings = ({ navigation }: any) => {
    const { t, i18n } = useTranslation();
    const { isDark, toggleTheme } = useThemeStore();
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    useEffect(() => {
        if (NotificationControl) {
            NotificationControl.isDailyNotificationsEnabled()
                .then((enabled: boolean) => setNotificationsEnabled(enabled))
                .catch((err: any) => console.log('Error loading notification pref', err));
        }
    }, []);

    const toggleNotifications = () => {
        const newValue = !notificationsEnabled;
        setNotificationsEnabled(newValue);
        if (NotificationControl) {
            NotificationControl.setDailyNotificationsEnabled(newValue);
        }
    };

    const changeLanguage = (lang: string) => {
        i18n.changeLanguage(lang);
        setShowLanguageModal(false);
    };

    const SettingRow = ({ icon, label, right, onPress }: any) => (
        <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress}>
            <View style={styles.rowLeft}>
                <Icon name={icon} size={24} color={isDark ? COLORS.textDim : COLORS.black} />
                <Text style={[styles.rowLabel, !isDark && { color: COLORS.black }]}>{label}</Text>
            </View>
            {right || <Icon name={i18n.language === 'ar' ? "chevron-left" : "chevron-right"} size={24} color={COLORS.textDim} />}
        </TouchableOpacity>
    );

    const LanguageOption = ({ lang, label, flag }: { lang: string, label: string, flag: string }) => {
        const isSelected = i18n.language === lang;
        return (
            <TouchableOpacity onPress={() => changeLanguage(lang)} style={[styles.langOption, isSelected && styles.langOptionSelected]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                     <Text style={{ fontSize: 24 }}>{flag}</Text>
                     <Text style={[styles.langLabel, isSelected && { color: COLORS.primary, fontWeight: 'bold' }]}>{label}</Text>
                </View>
                {isSelected && <Icon name="check-circle" size={24} color={COLORS.primary} />}
            </TouchableOpacity>
        );
    };

    return (
        <AppBackground>
            <ModernHeader title={t('common.settings')} centerTitle />

            <ScrollView contentContainerStyle={styles.scroll}>

                <Text style={styles.sectionTitle}>{t('settings.general')}</Text>
                <GlassCard style={styles.group}>
                    <SettingRow
                        icon="language"
                        label={t('common.language')}
                        right={<Text style={{ color: COLORS.primary }}>{i18n.language === 'en' ? 'English' : 'العربية'}</Text>}
                        onPress={() => setShowLanguageModal(true)}
                    />

                    <View style={styles.divider} />
                    <SettingRow
                        icon="notifications"
                        label={t('settings.notifications')}
                        right={<Switch value={notificationsEnabled} onValueChange={toggleNotifications} trackColor={{ false: '#767577', true: COLORS.primary }} />}
                    />
                </GlassCard>

                <Text style={styles.sectionTitle}>{t('settings.support')}</Text>
                <GlassCard style={styles.group}>
                    <SettingRow
                        icon="privacy-tip"
                        label={t('settings.privacy_policy')}
                        onPress={() => {
                            Linking.openURL('https://docs.google.com/document/d/1EfoYUERK3kVRxTYTiPLQeVbvmN-bS82Y1hoI7Kgh0Fc/edit?tab=t.0#heading=h.cseg0jw6u9i9').catch(err => console.error("Couldn't load page", err));
                        }}
                    />
                    <View style={styles.divider} />
                    <SettingRow 
                        icon="help" 
                        label={t('settings.help_center', { defaultValue: 'Help Center' })} 
                        onPress={() => navigation.navigate('HelpCenterScreen')} 
                    />
                    <View style={styles.divider} />
                    <SettingRow 
                        icon="support-agent" 
                        label={t('settings.contact_support', { defaultValue: 'Contact Support' })} 
                        onPress={() => { 
                            Linking.openURL('mailto:wwerooe@gmail.com?subject=Mister Share Support').catch(err => console.error("Couldn't open email", err));
                        }} 
                    />
                    <View style={styles.divider} />
                    <SettingRow icon="info" label={t('common.about')} right={<Text style={{ color: COLORS.textDim }}>v1.0.0</Text>} />
                </GlassCard>

                <Text style={styles.footer}>Mister Share by jeeey</Text>

            </ScrollView>

            {/* Language Modal */}
            {showLanguageModal && (
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowLanguageModal(false)} />
                    <GlassCard style={styles.modalContent} variant="heavy">
                        <Text style={styles.modalTitle}>{t('common.language')}</Text>
                        
                        <View style={styles.langList}>
                            <LanguageOption lang="en" label="English" flag="🇺🇸" />
                            <View style={styles.divider} />
                            <LanguageOption lang="ar" label="العربية" flag="🇸🇦" />
                        </View>
                        
                        <TouchableOpacity onPress={() => setShowLanguageModal(false)} style={styles.cancelButton}>
                            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                        </TouchableOpacity>
                    </GlassCard>
                </View>
            )}
        </AppBackground>
    );
};

const styles = StyleSheet.create({
    scroll: {
        padding: SIZES.padding,
        paddingBottom: 100,
    },
    // New Modal Styles
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1000,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    modalContent: {
        width: '90%',
        padding: 24,
        zIndex: 1001,
        alignItems: 'center',
        backgroundColor: '#1A1A2E', // Solid Dark Background
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 24,
    },
    modalTitle: {
        ...FONTS.h2,
        color: COLORS.white,
        marginBottom: 20,
        textAlign: 'center',
    },
    langList: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        overflow: 'hidden',
        width: '100%',
    },
    langOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    langOptionSelected: {
        backgroundColor: 'rgba(108, 99, 255, 0.1)', // Primary tint
    },
    langLabel: {
        fontSize: 16,
        color: COLORS.white,
        marginLeft: 10,
    },
    cancelButton: {
        marginTop: 20,
        padding: 12,
        alignItems: 'center',
    },
    cancelText: {
        color: COLORS.textDim,
        fontSize: 14,
    },
    sectionTitle: {
        color: COLORS.textDim,
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 10,
        marginLeft: 4,
        textTransform: 'uppercase',
    },
    group: {
        padding: 0,
        marginBottom: 24,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    rowLabel: {
        color: COLORS.white,
        fontSize: 16,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginLeft: 50,
    },
    footer: {
        textAlign: 'center',
        color: COLORS.textDim,
        marginTop: 40,
        fontSize: 12,
    }
});

export default Settings;

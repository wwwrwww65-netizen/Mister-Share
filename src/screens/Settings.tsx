import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Image, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, FONTS, SIZES } from '../theme';

// Modern Components
import AppBackground from '../components/modern/AppBackground';
import ModernHeader from '../components/modern/ModernHeader';
import GlassCard from '../components/modern/GlassCard';
import NeoButton from '../components/modern/NeoButton';
import { AdService } from '../services/AdService';

const Settings = ({ navigation }: any) => {
    const { t, i18n } = useTranslation();
    const [isDark, setIsDark] = useState(true);

    const toggleLanguage = () => {
        const nextLang = i18n.language === 'en' ? 'ar' : 'en';
        i18n.changeLanguage(nextLang);
    };

    const SettingRow = ({ icon, label, right, onPress }: any) => (
        <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress}>
            <View style={styles.rowLeft}>
                <Icon name={icon} size={24} color={COLORS.textDim} />
                <Text style={styles.rowLabel}>{label}</Text>
            </View>
            {right || <Icon name={i18n.language === 'ar' ? "chevron-left" : "chevron-right"} size={24} color={COLORS.textDim} />}
        </TouchableOpacity>
    );

    return (
        <AppBackground>
            <ModernHeader title={t('common.settings')} />

            <ScrollView contentContainerStyle={styles.scroll}>



                <Text style={styles.sectionTitle}>{t('settings.general')}</Text>
                <GlassCard style={styles.group}>
                    <SettingRow
                        icon="language"
                        label={t('common.language')}
                        right={<Text style={{ color: COLORS.primary }}>{i18n.language.toUpperCase()}</Text>}
                        onPress={toggleLanguage}
                    />
                    <View style={styles.divider} />
                    <SettingRow
                        icon="dark-mode"
                        label={t('common.dark_mode')}
                        right={<Switch value={isDark} onValueChange={setIsDark} trackColor={{ false: '#767577', true: COLORS.primary }} />}
                    />
                    <View style={styles.divider} />
                    <SettingRow
                        icon="notifications"
                        label={t('settings.notifications')}
                        right={<Switch value={true} trackColor={{ false: '#767577', true: COLORS.primary }} />}
                    />
                </GlassCard>

                <Text style={styles.sectionTitle}>{t('settings.support')}</Text>
                <GlassCard style={styles.group}>
                    <SettingRow icon="help" label={t('settings.help_center')} onPress={() => { }} />
                    <View style={styles.divider} />
                    <SettingRow
                        icon="privacy-tip"
                        label={t('settings.privacy_policy')}
                        onPress={() => {
                            Linking.openURL('https://docs.google.com/document/d/1EfoYUERK3kVRxTYTiPLQeVbvmN-bS82Y1hoI7Kgh0Fc/edit?tab=t.0#heading=h.cseg0jw6u9i9').catch(err => console.error("Couldn't load page", err));
                        }}
                    />
                    <View style={styles.divider} />
                    <SettingRow icon="info" label={t('common.about')} right={<Text style={{ color: COLORS.textDim }}>v1.0.0</Text>} />
                </GlassCard>





                <Text style={styles.footer}>MisterShare Ultimate Build</Text>

            </ScrollView>
        </AppBackground>
    );
};

const styles = StyleSheet.create({
    scroll: {
        padding: SIZES.padding,
        paddingBottom: 100,
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

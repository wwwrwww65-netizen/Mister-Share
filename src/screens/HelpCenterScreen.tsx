import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, FONTS, SIZES } from '../theme';
import AppBackground from '../components/modern/AppBackground';
import ModernHeader from '../components/modern/ModernHeader';
import GlassCard from '../components/modern/GlassCard';
import NeoButton from '../components/modern/NeoButton';

const HelpCenterScreen = ({ navigation }: any) => {
    const { t } = useTranslation();

    const openSupportEmail = () => {
        Linking.openURL('mailto:wwerooe@gmail.com?subject=Mister Share Support')
            .catch(err => console.error("Couldn't open email", err));
    };

    const FeatureItem = ({ icon, title, desc }: any) => (
        <View style={styles.featureItem}>
            <View style={styles.featureIconBg}>
                <Icon name={icon} size={24} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{title}</Text>
                <Text style={styles.featureDesc}>{desc}</Text>
            </View>
        </View>
    );

    const StepItem = ({ num, title, desc }: any) => (
        <GlassCard style={styles.stepCard} variant="light">
            <View style={styles.stepHeader}>
                <View style={styles.stepBadge}>
                    <Text style={styles.stepNum}>{num}</Text>
                </View>
                <Text style={styles.stepTitle}>{title}</Text>
            </View>
            <Text style={styles.stepDesc}>{desc}</Text>
        </GlassCard>
    );

    return (
        <AppBackground>
            <ModernHeader title={t('settings.help_center', { defaultValue: 'Help Center' })} showBack centerTitle />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                
                {/* Hero Section */}
                <GlassCard style={styles.heroCard} variant="heavy">
                    <Icon name="support-agent" size={48} color={COLORS.secondary} style={{ marginBottom: 10 }} />
                    <Text style={styles.heroTitle}>{t('help.welcome', { defaultValue: 'How can we help you?' })}</Text>
                    <Text style={styles.heroSubtitle}>{t('help.subtitle', { defaultValue: 'Find guides, features, and support below.' })}</Text>
                    
                    <NeoButton 
                        label={t('settings.contact_support', { defaultValue: 'Contact Support' })}
                        onPress={openSupportEmail}
                        style={{ marginTop: 20, width: '100%' }}
                        icon={<Icon name="mail" size={20} color={COLORS.white} />}
                    />
                </GlassCard>

                {/* Features Section */}
                <Text style={styles.sectionHeader}>{t('help.features', { defaultValue: 'Key Features' })}</Text>
                <GlassCard style={styles.featuresCard}>
                    <FeatureItem 
                        icon="rocket-launch" 
                        title={t('help.feat_speed_title', { defaultValue: 'Hyper Speed' })} 
                        desc={t('help.feat_speed_desc', { defaultValue: 'Transfer files at lightning speeds without internet.' })} 
                    />
                    <View style={styles.divider} />
                    <FeatureItem 
                        icon="security" 
                        title={t('help.feat_secure_title', { defaultValue: 'Secure Transfer' })} 
                        desc={t('help.feat_secure_desc', { defaultValue: 'Your data is encrypted and transferred directly between devices.' })} 
                    />
                    <View style={styles.divider} />
                    <FeatureItem 
                        icon="signal-wifi-off" 
                        title={t('help.feat_offline_title', { defaultValue: 'No Internet Needed' })} 
                        desc={t('help.feat_offline_desc', { defaultValue: 'Share anywhere, anytime, completely offline.' })} 
                    />
                </GlassCard>

                {/* How to Use Section */}
                <Text style={styles.sectionHeader}>{t('help.how_to', { defaultValue: 'How to Use' })}</Text>
                
                <StepItem 
                    num="1" 
                    title={t('help.step1_title', { defaultValue: 'Select Files' })} 
                    desc={t('help.step1_desc', { defaultValue: 'Choose apps, photos, videos, or files from the main screen.' })} 
                />
                
                <StepItem 
                    num="2" 
                    title={t('help.step2_title', { defaultValue: 'Connect Device' })} 
                    desc={t('help.step2_desc', { defaultValue: 'Tap "Send" or "Receive". Scan the QR code on the other device.' })} 
                />
                
                <StepItem 
                    num="3" 
                    title={t('help.step3_title', { defaultValue: 'Fast Transfer' })} 
                    desc={t('help.step3_desc', { defaultValue: 'Watch the magic happen! Files transfer instantly.' })} 
                />

                <View style={{ height: 40 }} />
                <Text style={styles.footer}>Mister Share by jeeey</Text>

            </ScrollView>
        </AppBackground>
    );
};

const styles = StyleSheet.create({
    content: {
        padding: SIZES.padding,
        paddingBottom: 50,
    },
    heroCard: {
        alignItems: 'center',
        padding: 30,
        marginBottom: 30,
    },
    heroTitle: {
        ...FONTS.h2,
        color: COLORS.white,
        marginTop: 10,
        textAlign: 'center',
    },
    heroSubtitle: {
        ...FONTS.body3,
        color: COLORS.textDim,
        marginTop: 5,
        textAlign: 'center',
        marginBottom: 10,
    },
    sectionHeader: {
        color: COLORS.textDim,
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 15,
        marginLeft: 4,
        textTransform: 'uppercase',
        marginTop: 10,
    },
    featuresCard: {
        marginBottom: 30,
        padding: 0,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
    },
    featureIconBg: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(108, 99, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 15,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.white,
        marginBottom: 4,
    },
    featureDesc: {
        fontSize: 13,
        color: COLORS.textDim,
        lineHeight: 18,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginLeft: 85,
    },
    stepCard: {
        marginBottom: 15,
        padding: 20,
    },
    stepHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    stepBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    stepNum: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 14,
    },
    stepTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    stepDesc: {
        fontSize: 14,
        color: COLORS.textDim,
        lineHeight: 20,
        paddingLeft: 38, // Align with title
    },
    footer: {
        textAlign: 'center',
        color: COLORS.textDim,
        fontSize: 12,
        opacity: 0.5,
    }
});

export default HelpCenterScreen;

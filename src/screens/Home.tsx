import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, FONTS, SIZES, SHADOWS } from '../theme';
import PermissionsManager from '../services/PermissionsManager';

// Modern Components
import AppBackground from '../components/modern/AppBackground';
import ModernHeader from '../components/modern/ModernHeader';
import GlassCard from '../components/modern/GlassCard';
import CategoryGrid from '../components/modern/CategoryGrid';
import NeoButton from '../components/modern/NeoButton';

import FileSystem from '../services/FileSystem';
import { useTransferStore, type TransferHistory } from '../store/transferStore';
import TransferMiniStatus from '../components/TransferMiniStatus';
import mobileAds, { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

const Home = ({ navigation }: any) => {
    const { t } = useTranslation();
    const [permissionsGranted, setPermissionsGranted] = React.useState(true);
    const [showPermissionModal, setShowPermissionModal] = React.useState(false);
    const [storage, setStorage] = React.useState({ used: 0, total: 0, percent: 0 });
    const [isBannerLoaded, setIsBannerLoaded] = React.useState(false);

    // Get transfer history from store (real transfer data!)
    const { history, loadHistory } = useTransferStore();
    const recentTransfers = history.slice(0, 5); // Show last 5 transfers

    useEffect(() => {
        checkInitialPermissions();
        loadHomeData();
        loadHistory(); // Load transfer history
    }, []);

    const loadHomeData = async () => {
        // 1. Storage
        const stats = await FileSystem.getStorageStats();
        const percent = stats.total > 0 ? Math.round((stats.used / stats.total) * 100) : 0;
        setStorage({
            used: stats.used,
            total: stats.total,
            percent
        });

        // 2. Recent Files - Now from Transfer History (real transfer data!)
        // This is loaded reactively from transferStore below
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const checkInitialPermissions = async () => {
        // Permission handling is now done in Onboarding and FileBrowser screens
        // No need to show modal here
        const status = await PermissionsManager.checkPermissionStatus();
        setPermissionsGranted(status.storage || status.readImages || status.readVideo);
        // Don't show modal - let FileBrowser handle it when user navigates there
        // setShowPermissionModal(!status.storage);
    };

    const handleGrantPermissions = async () => {
        const granted = await PermissionsManager.requestAllPermissions();
        if (granted.allGranted) {
            setPermissionsGranted(true);
            setShowPermissionModal(false);
            loadHomeData(); // Reload after permission
        } else {
            Alert.alert(
                t('permissions.required_title', { defaultValue: 'Permissions Required' }),
                t('permissions.msg', { defaultValue: 'Some permissions were denied. The app may not function correctly.' }),
                [{ text: 'OK' }]
            );
        }
    };

    return (
        <AppBackground>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 10 }}>
                {/* ... (Header Content) ... */}
                <View>
                    <Text style={{ ...FONTS.h2, color: COLORS.white }}>Mister Share</Text>
                    <Text style={{ ...FONTS.body3, color: COLORS.textDim }}>{t('home.welcome')}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 15 }}>
                    <TouchableOpacity onPress={() => navigation.navigate('ScanScreen')} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 }}>
                        <Icon name="qr-code-scanner" size={24} color={COLORS.secondary} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => navigation.navigate('NotificationsScreen')} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 }}>
                        <Icon name="notifications-none" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Smart Banner Ad: Only takes space when loaded */}
            <View style={{ 
                alignItems: 'center', 
                marginVertical: isBannerLoaded ? 10 : 0,
                height: isBannerLoaded ? 'auto' : 0,
                overflow: 'hidden' // Ensure hidden when 0
            }}>
                <BannerAd
                    unitId={'ca-app-pub-8298073076766088/2978008663'}
                    size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                    onAdLoaded={() => {
                        console.log('Home Banner Loaded');
                        setIsBannerLoaded(true);
                    }}
                    onAdFailedToLoad={(error) => {
                        console.log('Home Banner Failed', error);
                        setIsBannerLoaded(false);
                    }}
                />
            </View>

            <Modal
                visible={showPermissionModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => { }}
            >
                <View style={styles.modalOverlay}>
                    <GlassCard style={styles.modalContent} variant="heavy">
                        <View style={styles.modalIconBg}>
                            <Icon name="security" size={40} color={COLORS.primary} />
                        </View>
                        <Text style={styles.modalTitle}>{t('permissions.title', { defaultValue: 'Welcome to Mister Share' })}</Text>
                        <Text style={styles.modalBody}>
                            {t('permissions.onboarding_msg', { defaultValue: 'To share files and connect with friends, Mister Share needs access to your Photos, Media, and Location (for finding devices).' })}
                        </Text>

                        <View style={styles.permissionList}>
                            <PermissionItem icon="folder" label={t('common.storage', { defaultValue: 'Storage & Media' })} />
                            <PermissionItem icon="location-on" label={t('common.location', { defaultValue: 'Location & WiFi' })} />
                        </View>

                        <NeoButton
                            label={t('common.allow_all', { defaultValue: 'Grant Permissions' })}
                            onPress={handleGrantPermissions}
                            style={{ width: '100%', marginTop: 20 }}
                        />
                        <TouchableOpacity onPress={() => setShowPermissionModal(false)} style={{ marginTop: 15 }}>
                            <Text style={styles.skipText}>{t('common.skip', { defaultValue: 'Skip for now (Features will be limited)' })}</Text>
                        </TouchableOpacity>
                    </GlassCard>
                </View>
            </Modal>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* 1. Storage Overview (Real Data) */}
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionHeader}>{t('home.storage')}</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('FilesTab')}>
                        <Text style={styles.seeAll}>{t('common.view_all')}</Text>
                    </TouchableOpacity>
                </View>

                <GlassCard style={styles.storageCard}>
                    <View style={styles.storageRow}>
                        <View style={styles.storageInfo}>
                            <Text style={styles.storagePercentage}>{storage.percent}%</Text>
                            <Text style={styles.storageLabel}>{t('common.used')}</Text>
                        </View>
                        <View style={styles.storageBarContainer}>
                            <View style={[styles.storageBar, { width: `${storage.percent}%`, backgroundColor: COLORS.primary }]} />
                        </View>
                    </View>
                    <Text style={styles.storageDetail}>{formatSize(storage.total - storage.used)} Free / {formatSize(storage.total)} Total</Text>
                </GlassCard>

                {/* 2. Categories Grid */}
                <Text style={styles.sectionHeader}>{t('home.browse')}</Text>
                <CategoryGrid
                    onPressCategory={(id) => {
                        const tabName = id === 'Files' ? 'Dashboard' : id;
                        // Navigate with params - the params will be in route.params of FileBrowser
                        navigation.navigate('FilesTab', {
                            initialTab: tabName,
                            t: Date.now()
                        });
                    }}
                />

                {/* 3. Recent Files (Real Data) */}
                <View style={[styles.sectionHeaderRow, { marginTop: 20 }]}>
                    <Text style={styles.sectionHeader}>{t('home.recent')}</Text>
                </View>

                {recentTransfers.length === 0 ? (
                    <Text style={{ color: COLORS.textDim, fontStyle: 'italic' }}>{t('common.no_recent')}</Text>
                ) : (
                    recentTransfers.map((item: TransferHistory, index: number) => {
                        const isSent = item.type === 'sent';
                        const isSuccess = item.status === 'success';
                        // Fix for duplicate key: combine ID with index to ensure uniqueness
                        return (
                            <GlassCard key={`${item.id || 'transfer'}-${index}`} style={styles.recentFileCard} variant="light">
                                <View style={[styles.fileIcon, { backgroundColor: isSent ? 'rgba(108, 99, 255, 0.2)' : 'rgba(0, 212, 255, 0.2)' }]}>
                                    <Icon name={isSent ? 'arrow-upward' : 'arrow-downward'} size={24} color={isSent ? COLORS.primary : COLORS.secondary} />
                                </View>
                                <View style={styles.fileInfo}>
                                    <Text style={styles.fileName} numberOfLines={1}>{item.filename}</Text>
                                    <Text style={styles.fileMeta}>{formatSize(item.size)} • {new Date(item.timestamp).toLocaleDateString()}</Text>
                                </View>
                                <Icon name={isSuccess ? 'check-circle' : 'error'} size={20} color={isSuccess ? COLORS.success : COLORS.error} />
                            </GlassCard>
                        );
                    })
                )}

                {/* Extra Space for Tab Bar */}
                <View style={{ height: 100 }} />

            </ScrollView>
        </AppBackground>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        padding: SIZES.padding,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionHeader: {
        ...FONTS.h3,
        color: COLORS.white,
    },
    seeAll: {
        ...FONTS.body2,
        color: COLORS.secondary,
    },
    storageCard: {
        padding: 20,
        marginBottom: 24,
    },
    storageRow: {
        marginBottom: 12,
    },
    storageInfo: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
        marginBottom: 8,
    },
    storagePercentage: {
        ...FONTS.h1,
        color: COLORS.white,
    },
    storageLabel: {
        ...FONTS.body2,
        color: COLORS.textDim,
    },
    storageBarContainer: {
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 4,
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
    },
    storageBar: {
        height: '100%',
    },
    storageDetail: {
        ...FONTS.caption,
        color: COLORS.textMuted,
        textAlign: 'right',
    },
    recentFileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: SIZES.radiusSm,
        marginBottom: 8,
    },
    fileIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    fileInfo: {
        flex: 1,
    },
    fileName: {
        ...FONTS.body2,
        color: COLORS.white,
        fontWeight: '500',
    },
    fileMeta: {
        ...FONTS.caption,
        color: COLORS.textMuted,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        alignItems: 'center',
        padding: 30,
    },
    modalIconBg: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
    },
    modalTitle: {
        ...FONTS.h2,
        color: COLORS.white,
        textAlign: 'center',
        marginBottom: 10,
    },
    modalBody: {
        ...FONTS.body3,
        color: COLORS.textDim,
        textAlign: 'center',
        marginBottom: 25,
    },
    permissionList: {
        width: '100%',
        marginBottom: 10,
    },
    permissionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 12,
        borderRadius: SIZES.radiusSm,
    },
    permissionIconSmall: {
        marginRight: 10,
    },
    permissionLabel: {
        flex: 1,
        ...FONTS.body3,
        color: COLORS.white,
    },
    skipText: {
        ...FONTS.body3,
        color: COLORS.textMuted,
        textDecorationLine: 'underline',
    }
});

const PermissionItem = ({ icon, label }: { icon: string, label: string }) => (
    <View style={styles.permissionItem}>
        <View style={styles.permissionIconSmall}>
            <Icon name={icon} size={20} color={COLORS.white} />
        </View>
        <Text style={styles.permissionLabel}>{label}</Text>
        <Icon name="check" size={18} color={COLORS.success} />
    </View>
);

export default Home;

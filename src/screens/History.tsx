import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Linking, Platform, Share, Vibration, Image, Modal, NativeModules, BackHandler, InteractionManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, FONTS, SIZES } from '../theme';
import { useTransferStore, type TransferHistory } from '../store/transferStore';
import { useConnectionStore } from '../store/connectionStore';
import TransferEngine from '../services/TransferEngine';
import SoundService from '../services/SoundService';
import AppBackground from '../components/modern/AppBackground';
import ModernHeader from '../components/modern/ModernHeader';
import GlassCard from '../components/modern/GlassCard';
import WarpCore from '../components/modern/WarpCore';
import GameRestoreHelp from '../components/GameRestoreHelp';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { useFocusEffect } from '@react-navigation/native';
import { showToast } from '../services/ToastManager';

const getFileIcon = (filename: string): { name: string; color: string } => {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic'].includes(ext)) return { name: 'image', color: '#4CAF50' };
    else if (['mp4', 'mkv', 'avi', 'mov', 'wmv', '3gp', 'webm'].includes(ext)) return { name: 'play-circle-filled', color: '#FF5722' };
    else if (['apk', 'xapk'].includes(ext)) return { name: 'android', color: '#8BC34A' };
    else if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(ext)) return { name: 'music-note', color: '#E91E63' };
    else if (['pdf'].includes(ext)) return { name: 'picture-as-pdf', color: '#F44336' };
    else if (['doc', 'docx'].includes(ext)) return { name: 'description', color: '#2196F3' };
    else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return { name: 'folder-zip', color: '#FFC107' };
    return { name: 'insert-drive-file', color: COLORS.textDim };
};

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
};

const History = ({ navigation, route }: any) => {
    const { t } = useTranslation();
    const { 
        history, loadHistory, clearHistory, removeFromHistory,
        queue, currentSessionId, status: transferStatus, 
        addToQueue, startQueueProcessing, startReceiverListening
    } = useTransferStore();
    
    // Stats for History
    const [stats, setStats] = useState({ totalSent: 0, totalReceived: 0, totalSize: 0 });
    const [restoreModalVisible, setRestoreModalVisible] = useState(false);
    const [selectedGameForRestore, setSelectedGameForRestore] = useState<{ path: string, package: string } | null>(null);

    // active transfer state
    const stagedFiles = useTransferStore(state => state.outgoingFiles);
    
    // Compute if there is an active session
    const hasActiveTransfers = queue.some(i => i.status === 'pending' || i.status === 'transferring');

    // Filter queue to show active session items
    const activeQueue = useMemo(() => {
        return queue.filter(item => 
            !item.sessionId || item.sessionId === currentSessionId || item.status === 'transferring' || item.status === 'pending'
        );
    }, [queue, currentSessionId]);

    const displayActiveQueue = useMemo(() => {
        const activeItems = activeQueue.filter(i => i.status === 'pending' || i.status === 'transferring');
        const completedItems = activeQueue.filter(i => i.status === 'completed');
        const lastCompleted = completedItems.length > 0 ? completedItems[completedItems.length - 1] : null;
        if (activeItems.length > 0) return lastCompleted ? [...activeItems, lastCompleted] : activeItems;
        return lastCompleted ? [lastCompleted] : [];
    }, [activeQueue]);

    const currentItem = useMemo(() => {
        // Only return actively transferring or pending item — NEVER a completed one.
        // Returning a completed item causes stale progress (e.g. 24%) to show on next transfer.
        const transferringItem = activeQueue.find(i => i.status === 'transferring');
        if (transferringItem) return transferringItem;
        const pendingItem = activeQueue.find(i => i.status === 'pending');
        if (pendingItem) return pendingItem;
        // Nothing active — return null so progress bar resets to 0
        return null;
    }, [activeQueue]);

    useEffect(() => {
        loadHistory();
    }, []);

    useEffect(() => {
        const sent = history.filter(x => x.type === 'sent').length;
        const recv = history.filter(x => x.type === 'received').length;
        const size = history.reduce((acc, curr) => acc + curr.size, 0);
        setStats({ totalSent: sent, totalReceived: recv, totalSize: size });
    }, [history]);

    // Background file processor hook
    useEffect(() => {
        if (stagedFiles.length === 0) return;

        // We use setTimeout here because continuous animations block InteractionManager
        const task = setTimeout(async () => {
            console.log('[History/Transfer] ⚡ Detected', stagedFiles.length, 'staged files to send');
            const newSessionId = useTransferStore.getState().startNewSession('send');

            const serverIP = useConnectionStore.getState().serverIP;
            if (serverIP) TransferEngine.setDestination(serverIP);

            if (!useTransferStore.getState().isReceiving()) {
                startReceiverListening();
            }

            const { processFilesForQueue } = require('../store/transferStore');
            try {
                const items = await processFilesForQueue(stagedFiles, newSessionId);
                addToQueue(items);
                useTransferStore.getState().clearOutgoingFiles();

                const { serverIP: storeServerIP, peerIP: storePeerIP, isGroupOwner } = useConnectionStore.getState();
                const targetIP = isGroupOwner ? storePeerIP : storeServerIP;
                if (targetIP) {
                    startQueueProcessing(targetIP);
                } else {
                    console.warn('[History/Transfer] No server IP found, waiting for connection');
                }
            } catch (e: any) {
                console.error('[History/Transfer] File processing error:', e);
            }
        }, 150);

        return () => clearTimeout(task);
    }, [stagedFiles]);

    useEffect(() => {
        startReceiverListening();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            const onBackPress = () => {
                navigation.navigate('HomeTab');
                return true;
            };

            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

            return () => {
                subscription.remove();
            };
        }, [])
    );

    // ... History functions ...
    const handleClear = () => {
        Alert.alert(
            t('history.confirm_clear'),
            t('history.clear_desc'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('common.done'), style: 'destructive', onPress: clearHistory }
            ]
        );
    };

    const getMimeType = (filename: string): string => {
        const ext = (filename.split('.').pop() || '').toLowerCase();
        switch (ext) {
            case 'jpg': case 'jpeg': return 'image/jpeg';
            case 'png': return 'image/png';
            case 'mp4': return 'video/mp4';
            case 'apk': return 'application/vnd.android.package-archive';
            default: return '*/*';
        }
    };

    const handleOpenFile = async (item: TransferHistory) => {
        if (!item.path) { showFileLocation(item); return; }
        try {
            if (Platform.OS === 'android') {
                const mime = getMimeType(item.filename);
                const ext = (item.filename.split('.').pop() || '').toLowerCase();
                const fileProvider = NativeModules.FileProviderModule;
                if (ext === 'apk' && fileProvider?.installApk) { await fileProvider.installApk(item.path); return; }
                if ((ext === 'apks' || ext === 'xapk') && fileProvider?.installApksBundle) { await fileProvider.installApksBundle(item.path); return; }
                await ReactNativeBlobUtil.android.actionViewIntent(item.path, mime);
            } else {
                const canOpen = await Linking.canOpenURL(item.path);
                if (canOpen) await Linking.openURL(item.path);
                else showFileLocation(item);
            }
        } catch (error) {
            showFileLocation(item);
        }
    };

    const showFileLocation = (item: TransferHistory) => {
        Alert.alert(t('common.info'), `📁 Downloads/MisterShare/Files/${item.filename}`, [{ text: t('common.ok') }]);
    };

    const handleDeleteItem = (item: TransferHistory) => {
        removeFromHistory(item.id);
    };

    const handleShareFile = async (item: TransferHistory) => {
        if (!item.path) return;
        try {
            await Share.share({ url: `file://${item.path}`, message: item.filename });
        } catch(e){}
    };

    const handleResend = (item: TransferHistory) => {
        if (item.type !== 'sent' || !item.path) {
            showToast(t('common.error', { defaultValue: 'Can only resend sent files' }), 'error');
            return;
        }

        const { isConnected, isGroupOwner, peerIP } = useConnectionStore.getState();

        if (!isConnected) {
            showToast(t('errors.no_peer_connected', { defaultValue: 'Not connected to any device' }), 'error');
            return;
        }

        if (isGroupOwner && !peerIP) {
            showToast(t('errors.no_peer_connected', { defaultValue: 'No device connected' }), 'error');
            return;
        }

        const fileToResend = [{
            path: item.path,
            name: item.filename,
            size: item.size,
            mimeType: getMimeType(item.filename),
        }];

        useTransferStore.getState().setOutgoingFiles(fileToResend);
        navigation.navigate('HistoryTab');
        showToast(t('common.resend', { defaultValue: 'Resending...' }), 'info');
    };

    const handleLongPress = (item: TransferHistory) => {
        Vibration.vibrate(50);
        Alert.alert(
            item.filename,
            formatFileSize(item.size),
            [
                { text: t('common.open', { defaultValue: 'Open' }), onPress: () => handleOpenFile(item) },
                { text: t('common.share', { defaultValue: 'Share' }), onPress: () => handleShareFile(item) },
                ...(item.type === 'sent' && item.path ? [{ text: t('common.resend', { defaultValue: 'Resend' }), onPress: () => handleResend(item) }] : []),
                { text: t('common.delete', { defaultValue: 'Delete' }), style: 'destructive' as const, onPress: () => handleDeleteItem(item) },
                { text: t('common.cancel'), style: 'cancel' as const },
            ]
        );
    };

    const getGamePackage = (filename: string): string | null => {
        const lower = filename.toLowerCase();
        if (lower.includes('pubg') || lower.includes('tencent')) return 'com.tencent.ig';
        if (lower.includes('free') && lower.includes('fire')) return 'com.dts.freefireth';
        return null;
    };

    const handleRestoreGame = (item: TransferHistory) => {
        const pkg = getGamePackage(item.filename);
        if (pkg && item.path) {
            setSelectedGameForRestore({ path: item.path, package: pkg });
            setRestoreModalVisible(true);
        }
    };

    // Render logic for different sections
    
    const renderActiveTransferHeader = () => {
        const speedMBps = (currentItem?.speed || 0) / (1024 * 1024);
        const speedStr = speedMBps < 1 ? `${((currentItem?.speed || 0) / 1024).toFixed(0)} KB/s` : `${speedMBps.toFixed(1)} MB/s`;
        
        const totalSize = activeQueue.reduce((acc, item) => acc + item.size, 0);
        const completedSize = activeQueue.filter(i => i.status === 'completed').reduce((acc, i) => acc + i.size, 0);
        const currentItemTransfer = (currentItem?.size || 0) * (currentItem?.progress || 0);
        const totalTransferred = completedSize + (currentItem?.status === 'transferring' ? currentItemTransfer : 0);
        const isZippingData = currentItem?.preprocess?.kind === 'zipDirectory' && currentItem.preprocess.stage === 'zipping';
        const zipBytes = isZippingData ? (currentItem?.preprocess?.bytesZipped || 0) : 0;
        const progressStr = isZippingData ? `${(zipBytes / (1024 * 1024)).toFixed(1)} MB` : `${(totalTransferred / (1024 * 1024)).toFixed(1)} / ${(totalSize / (1024 * 1024)).toFixed(1)} MB`;

        return (
            <View style={styles.activeHeaderContainer}>
                <View style={styles.heroSection}>
                    <WarpCore 
                        totalProgress={totalSize > 0 ? (totalTransferred / totalSize) : 0}
                        fileProgress={isZippingData ? 0 : (currentItem?.progress || 0)}
                        speed={isZippingData ? 0 : (currentItem?.speed || 0)}
                        status={
                            hasActiveTransfers
                                ? (isZippingData
                                    ? t('transfer.status_compressing_data', 'Compressing app data...')
                                    : (currentItem?.name || t('common.loading')))
                                : t('connect.status_ready')
                        } 
                    />
                </View>

                {hasActiveTransfers && (
                    <GlassCard style={styles.activeDetailsContainer}>
                        <View style={styles.dashboard}>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>{speedStr}</Text>
                                <Text style={styles.statLabel}>{t('common.speed', 'Speed')}</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>{progressStr}</Text>
                                <Text style={styles.statLabel}>{t('common.progress', 'Progress')}</Text>
                            </View>
                        </View>
                    </GlassCard>
                )}
            </View>
        );
    };

    const renderActiveQueueItem = ({ item }: { item: any }) => {
        const isCurrent = item.id === currentItem?.id;
        const isCompleted = item.status === 'completed';
        
        return (
            <GlassCard variant={isCurrent ? "heavy" : "light"} style={[ styles.queueItem, isCurrent && styles.activeQueueItemBorder ]}>
                <View style={[styles.queueIconBox, { backgroundColor: isCurrent ? COLORS.primary + '20' : COLORS.surface }]}>
                    <Icon name={isCompleted ? 'check-circle' : 'insert-drive-file'} size={24} color={isCompleted ? COLORS.success : COLORS.white} />
                </View>
                <View style={styles.queueItemInfo}>
                    <Text style={styles.queueItemName} numberOfLines={1}>{item.filename}</Text>
                    <Text style={styles.queueItemSize}>{formatFileSize(item.size)}</Text>
                    {isCurrent && (
                        <View style={styles.miniProgressContainer}>
                            <View style={[styles.miniProgressFill, { width: `${(item.progress || 0) * 100}%` }]} />
                        </View>
                    )}
                </View>
                {isCurrent && <Text style={styles.queueItemPercent}>{Math.round((item.progress || 0) * 100)}%</Text>}
                {!isCompleted && (
                    <TouchableOpacity 
                        style={{ marginLeft: 12, padding: 4 }} 
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        onPress={() => {
                            Alert.alert(t('transfer.cancel', "Cancel"), t('transfer.cancel_confirm', "Cancel this transfer?"), [
                                { text: t('common.no', "No"), style: "cancel" },
                                { text: t('common.yes', "Yes"), style: "destructive", onPress: () => useTransferStore.getState().cancelTransfer() }
                            ]);
                        }}
                    >
                        <Icon name="close" size={20} color={COLORS.textDim} />
                    </TouchableOpacity>
                )}
            </GlassCard>
        );
    };

    const renderHistoryItem = ({ item }: { item: TransferHistory }) => {
        const isSent = item.type === 'sent';
        const isSuccess = item.status === 'success';
        const fileIcon = getFileIcon(item.filename);
        const isGame = getGamePackage(item.filename) !== null && !isSent && isSuccess;

        return (
            <TouchableOpacity onPress={() => handleOpenFile(item)} onLongPress={() => handleLongPress(item)} activeOpacity={0.7} delayLongPress={400}>
                <GlassCard style={styles.historyItem} variant="medium">
                    <View style={[styles.iconBox, { backgroundColor: fileIcon.color + '20' }]}>
                        {item.icon ? (
                            <Image source={{ uri: item.icon }} style={{ width: '100%', height: '100%', borderRadius: 10 }} resizeMode="cover" />
                        ) : (
                            <Icon name={fileIcon.name} size={24} color={fileIcon.color} />
                        )}
                    </View>
                    <View style={styles.info}>
                        <Text style={styles.name} numberOfLines={1}>{item.filename}</Text>
                        <View style={styles.metaRow}>
                            <Icon name={isSent ? 'arrow-upward' : 'arrow-downward'} size={12} color={isSent ? COLORS.primary : COLORS.secondary} />
                            <Text style={styles.meta}>{formatFileSize(item.size)} • {formatRelativeTime(item.timestamp)}</Text>
                        </View>
                    </View>
                    <View style={styles.actions}>
                        {isGame && (
                            <TouchableOpacity onPress={() => handleRestoreGame(item)} style={styles.restoreIconBtn}>
                                <Icon name="videogame-asset" size={20} color={COLORS.primary} />
                            </TouchableOpacity>
                        )}
                        <Icon name={isSuccess ? 'check-circle' : 'error'} size={18} color={isSuccess ? COLORS.success : COLORS.error} style={{ marginLeft: 8 }} />
                        <TouchableOpacity onPress={() => handleShareFile(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Icon name="share" size={18} color={COLORS.textDim} style={{ marginLeft: 12 }} />
                        </TouchableOpacity>
                    </View>
                </GlassCard>
            </TouchableOpacity>
        );
    };

    return (
        <AppBackground>
            <ModernHeader title={t('history.title', 'Transfers')} rightIcon="delete-outline" onRightPress={handleClear} />

            <FlatList
                data={history}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                renderItem={renderHistoryItem}
                contentContainerStyle={styles.list}
                ListHeaderComponent={() => (
                    <>
                        {/* ACTIVE TRANSFERS SECTION */}
                        {hasActiveTransfers && (
                            <View style={styles.activeTransfersContainer}>
                                {renderActiveTransferHeader()}
                                <Text style={styles.sectionHeader}>{t('transfer.queue_header', "Active Queue")}</Text>
                                {displayActiveQueue.map(item => (
                                    <View key={item.id}>{renderActiveQueueItem({item})}</View>
                                ))}
                                <View style={{height: 20}} />
                            </View>
                        )}

                        {/* HISTORY STATS SECTION */}
                        {(!hasActiveTransfers && history.length > 0) && (
                            <View style={styles.statsRow}>
                                <GlassCard style={styles.statCard}><Icon name="arrow-upward" size={20} color={COLORS.primary} /><Text style={styles.statValue2}>{stats.totalSent}</Text><Text style={styles.statLabel2}>{t('history.sent')}</Text></GlassCard>
                                <GlassCard style={styles.statCard}><Icon name="arrow-downward" size={20} color={COLORS.secondary} /><Text style={styles.statValue2}>{stats.totalReceived}</Text><Text style={styles.statLabel2}>{t('history.received')}</Text></GlassCard>
                                <GlassCard style={styles.statCard}><Icon name="storage" size={20} color={COLORS.files} /><Text style={styles.statValue2}>{formatFileSize(stats.totalSize)}</Text><Text style={styles.statLabel2}>{t('history.total')}</Text></GlassCard>
                            </View>
                        )}
                        {!hasActiveTransfers && history.length > 0 && <Text style={styles.hint}>{t('history.long_press_hint', 'Long press for more options')}</Text>}
                        {history.length > 0 && <Text style={styles.sectionHeader}>{t('history.past_transfers', "Past Transfers")}</Text>}
                    </>
                )}
                ListEmptyComponent={
                    !hasActiveTransfers ? (
                        <View style={styles.empty}>
                            <Icon name="history" size={60} color={COLORS.textDim} />
                            <Text style={styles.emptyText}>{t('history.empty')}</Text>
                            <Text style={styles.emptyHint}>{t('history.empty_hint', 'Transfer files to see them here')}</Text>
                        </View>
                    ) : null
                }
            />

            <Modal visible={restoreModalVisible} transparent={true} animationType="slide" onRequestClose={() => setRestoreModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    {selectedGameForRestore && (
                        <GameRestoreHelp gamePackageName={selectedGameForRestore.package} zipFilePath={selectedGameForRestore.path} onClose={() => setRestoreModalVisible(false)} onRestoreStart={() => {}} onRestoreComplete={() => setRestoreModalVisible(false)} />
                    )}
                </View>
            </Modal>
        </AppBackground>
    );
};

const styles = StyleSheet.create({
    activeTransfersContainer: {
        marginBottom: 20,
    },
    activeHeaderContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    heroSection: {
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    activeDetailsContainer: {
        width: '100%',
        padding: 16,
        borderRadius: 16,
    },
    dashboard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    statValue: {
        ...FONTS.h3,
        color: COLORS.white,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    statLabel: {
        ...FONTS.caption,
        color: COLORS.textDim,
        fontSize: 10,
        textTransform: 'uppercase',
    },
    stopButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,0,0,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    queueItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginBottom: 8,
        borderRadius: 16,
    },
    activeQueueItemBorder: {
        borderWidth: 1,
        borderColor: COLORS.primary,
        backgroundColor: 'rgba(108, 99, 255, 0.1)',
    },
    queueIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    queueItemInfo: {
        flex: 1,
    },
    queueItemName: {
        ...FONTS.body3,
        color: COLORS.white,
        fontWeight: '600',
    },
    queueItemSize: {
        ...FONTS.caption,
        color: COLORS.textDim,
    },
    queueItemPercent: {
        ...FONTS.caption,
        color: COLORS.primary,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    miniProgressContainer: {
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 1.5,
        marginTop: 5,
        width: '100%',
    },
    miniProgressFill: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: 1.5,
    },
    sectionHeader: {
        ...FONTS.h4,
        color: COLORS.textDim,
        marginBottom: 10,
        marginLeft: 5,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
    },
    statValue2: {
        ...FONTS.h3,
        color: COLORS.white,
        marginTop: 4,
    },
    statLabel2: {
        color: COLORS.textDim,
        fontSize: 11,
    },
    hint: {
        color: COLORS.textDim,
        fontSize: 11,
        textAlign: 'center',
        marginBottom: 10,
    },
    list: {
        paddingHorizontal: SIZES.padding,
        paddingBottom: 100,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        marginBottom: 8,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        overflow: 'hidden',
    },
    info: {
        flex: 1,
    },
    name: {
        ...FONTS.body1,
        color: COLORS.white,
        fontWeight: '600',
        fontSize: 14,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 3,
    },
    meta: {
        color: COLORS.textDim,
        fontSize: 11,
        marginLeft: 4,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    empty: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        color: COLORS.textDim,
        marginTop: 12,
        fontSize: 16,
    },
    emptyHint: {
        color: COLORS.textMuted,
        marginTop: 6,
        fontSize: 12,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    restoreIconBtn: {
        padding: 8,
        marginRight: 8,
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        borderRadius: 8
    }
});

export default History;

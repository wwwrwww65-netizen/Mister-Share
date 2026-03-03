import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Alert, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Svg, { Circle, G } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SIZES } from '../theme';

import TransferEngine from '../services/TransferEngine';
import { showToast } from '../services/ToastManager';
import { useTransferStore, fileToTransferItem, type TransferHistory } from '../store/transferStore';
import { useConnectionStore } from '../store/connectionStore'; // Added missing import
import SoundService from '../services/SoundService';
import { AdService } from '../services/AdService'; // Added AdService import

// Modern Components
import AppBackground from '../components/modern/AppBackground';
import ModernHeader from '../components/modern/ModernHeader';
import GlassCard from '../components/modern/GlassCard';
import NeoButton from '../components/modern/NeoButton';
import WarpCore from '../components/modern/WarpCore'; // Newly Created

const Transfer = ({ navigation, route }: any) => {
    const { t } = useTranslation();

    // Animation values
    const successScale = useRef(new Animated.Value(0)).current;
    const successOpacity = useRef(new Animated.Value(0)).current;

    // List Animation
    const scrollY = useRef(new Animated.Value(0)).current;

    // Track initialization to prevent premature success overlay (2024 Best Practice)
    const isInitialized = useRef(false);

    const [showResult, setShowResult] = useState<'success' | 'failure' | null>(null);

    // Store
    const {
        queue,
        currentIndex,
        currentSessionId,
        status: transferStatus,
        updateProgress,
        addToQueue,
        startQueueProcessing,
        startReceiverListening,
        isSending,
        isReceiving: isServerRunning
    } = useTransferStore();

    // Smart mode detection (2024 Best Practice)
    // Priority: 1. Explicit mode param  2. Store Staged Files  3. Current activity  4. Default to receive
    // 2024 BEST PRACTICE: Read from staged store state instead of nav params
    const stagedFiles = useTransferStore(state => state.outgoingFiles);
    const filesToTransfer = route.params?.files || (stagedFiles.length > 0 ? stagedFiles : null);
    const explicitMode = route.params?.mode;

    const mode = useMemo(() => {
        if (explicitMode) return explicitMode;
        if (stagedFiles.length > 0 || (filesToTransfer && filesToTransfer.length > 0)) return 'send'; // Auto-detect send mode if files are waiting

        // Auto-detect based on current activity
        const hasSendingItems = queue.some(i => i.direction !== 'receive' && (i.status === 'transferring' || i.status === 'pending'));
        const hasReceivingItems = queue.some(i => i.direction === 'receive' && (i.status === 'transferring' || i.status === 'pending'));

        if (hasSendingItems && !hasReceivingItems) return 'send';
        if (hasReceivingItems && !hasSendingItems) return 'receive';

        // Both or neither - default to receive (most common scenario)
        return 'receive';
    }, [explicitMode, filesToTransfer, queue]);

    // 2024 BEST PRACTICE: Filter queue based on mode AND session (SHAREit Architecture)
    // This ensures complete isolation between transfer sessions
    const filteredQueue = useMemo(() => {
        let filtered: typeof queue = [];

        // Step 1: Filter by direction (mode)
        switch (mode) {
            case 'send':
                // Send mode: show items that are explicitly 'send' or have no direction (legacy compatibility)
                filtered = queue.filter(item => item.direction === 'send' || !item.direction);
                break;
            case 'receive':
                // Receive mode: ONLY show items that are explicitly 'receive'
                filtered = queue.filter(item => item.direction === 'receive');
                break;
            default:
                // All other modes (auto-detect, undefined): show everything
                filtered = queue;
                break;
        }

        // Step 2: Session filtering (2024 SHAREit Best Practice)
        // Show items from current session + items without sessionId (legacy/ongoing)
        if (currentSessionId) {
            filtered = filtered.filter(item =>
                !item.sessionId || // Legacy items or items being added now
                item.sessionId === currentSessionId || // Current session items
                item.status === 'transferring' // Always show active transfers
            );
        }

        return filtered;
    }, [queue, mode, currentSessionId]);

    // 2024 FIX: Display queue shows only active items + most recent completed
    // This prevents old completed items from cluttering the UI
    const displayQueue = useMemo(() => {
        const activeItems = filteredQueue.filter(i =>
            i.status === 'pending' || i.status === 'transferring'
        );

        // Find the most recently completed item (if any)
        const completedItems = filteredQueue.filter(i => i.status === 'completed');
        const lastCompleted = completedItems.length > 0
            ? completedItems[completedItems.length - 1]
            : null;

        // If there are active items, show them first, then the last completed
        if (activeItems.length > 0) {
            return lastCompleted
                ? [...activeItems, lastCompleted]
                : activeItems;
        }

        // No active items - show only the last completed (if any)
        return lastCompleted ? [lastCompleted] : [];
    }, [filteredQueue]);

    // 2024 FIX: Get current item from filtered queue, not global index
    // This ensures we track the correct item for this mode (send vs receive)
    const currentItem = useMemo(() => {
        // Find the actively transferring item in the filtered queue
        const transferringItem = filteredQueue.find(i => i.status === 'transferring');
        if (transferringItem) return transferringItem;

        // If no transferring item, find the first pending item
        const pendingItem = filteredQueue.find(i => i.status === 'pending');
        if (pendingItem) return pendingItem;

        // Fallback: use the last item (most recently added)
        return filteredQueue[filteredQueue.length - 1] || null;
    }, [filteredQueue]);

    const isZippingData = currentItem?.preprocess?.kind === 'zipDirectory' &&
        currentItem.preprocess.stage === 'zipping';

    const hasActiveItems = filteredQueue.some(i =>
        i.status === 'pending' || i.status === 'transferring'
    );

    const speedMBps = (currentItem?.speed || 0) / (1024 * 1024);
    const speedStr = speedMBps < 1 ? `${((currentItem?.speed || 0) / 1024).toFixed(0)} KB/s` : `${speedMBps.toFixed(1)} MB/s`;

    const totalSize = filteredQueue.reduce((acc, item) => acc + item.size, 0);
    const completedSize = filteredQueue.filter(i => i.status === 'completed').reduce((acc, i) => acc + i.size, 0);
    const currentItemTransfer = (currentItem?.size || 0) * (currentItem?.progress || 0);
    const totalTransferred = completedSize + (currentItem?.status === 'transferring' ? currentItemTransfer : 0);

    const totalProgress = totalSize > 0 ? totalTransferred / totalSize : 0;

    const zipBytes = isZippingData ? (currentItem?.preprocess?.bytesZipped || 0) : 0;
    const baseProgressStr = `${(totalTransferred / (1024 * 1024)).toFixed(1)} / ${(totalSize / (1024 * 1024)).toFixed(1)} MB`;
    const zipProgressStr = `${(zipBytes / (1024 * 1024)).toFixed(1)} MB`;
    const progressStr = isZippingData ? zipProgressStr : baseProgressStr;

    // 2024 FIX: Separate effect for processing files to handle dynamic updates
    // This ensures files are processed even if the screen is already mounted
    useEffect(() => {
        const processStagedFiles = async () => {
            if (stagedFiles.length === 0) return;

            console.log('[Transfer] ⚡ Detected', stagedFiles.length, 'staged files to send');

            // 2024 BEST PRACTICE: Start a new session to cleanly isolate this transfer
            const newSessionId = useTransferStore.getState().startNewSession('send');
            console.log('[Transfer] Starting new SEND session:', newSessionId);

            // Also ensure we are in sending capability
            if (route.params?.serverIP) {
                TransferEngine.setDestination(route.params.serverIP);
            }
            // Ensure receiver is listening for bidirectional support
            if (!useTransferStore.getState().isReceiving()) {
                startReceiverListening();
            }

            const { processFilesForQueue } = require('../store/transferStore');

            try {
                // Process files asynchronously
                const items = await processFilesForQueue(stagedFiles, newSessionId);
                console.log('[Transfer] Adding', items.length, 'files to queue');

                addToQueue(items);

                // IMPORTANT: Clear staged files ONLY after successfully adding to queue
                useTransferStore.getState().clearOutgoingFiles();

                // Start processing if we have a destination
                // If we are already connected (which we likely are if we are here),
                // we should have a serverIP either from params or the store?
                // ConnectionStore might have it.

                const { serverIP: storeServerIP, isConnected } = useConnectionStore.getState();
                const targetIP = route.params?.serverIP || storeServerIP;

                if (targetIP) {
                    console.log('[Transfer] Auto-starting queue processing to:', targetIP);
                    startQueueProcessing(targetIP);
                } else {
                    console.warn('[Transfer] No server IP found, queue ready but waiting for connection');
                }
            } catch (e: any) {
                showToast(t('errors.process_files_failed', "Failed to process files"), 'error');
                console.error('[Transfer] File processing error:', e);
            }
        };

        processStagedFiles();
    }, [stagedFiles]); // Run whenever stagedFiles changes

    useEffect(() => {
        const init = async () => {
            console.log('[Transfer] Init with mode:', mode, 'status:', transferStatus);

            // CRITICAL: Mark as NOT initialized during setup
            isInitialized.current = false;

            // Reset result overlay state from previous transfers
            setShowResult(null);
            successScale.setValue(0.5);
            successOpacity.setValue(0);

            // ══════════════════════════════════════════════════════════════════
            // 2024 BEST PRACTICE: ALWAYS start receiver for BIDIRECTIONAL support
            // ══════════════════════════════════════════════════════════════════
            // Even when in SEND mode, we must listen for incoming files.
            // This enables:
            // - Host sending to Client while Client sends back to Host
            // - True SHAREit-style bidirectional transfer
            // ══════════════════════════════════════════════════════════════════
            console.log('[Transfer] 🔊 Starting bidirectional receiver...');
            startReceiverListening();

            // Logic for SEND Mode (Initial Params)
            if (mode === 'send') {
                const serverIP = route.params?.serverIP;
                if (serverIP) {
                    console.log('[Transfer] Setting Destination:', serverIP);
                    TransferEngine.setDestination(serverIP);
                }
            }

            // Mark initialization as complete
            isInitialized.current = true;
            console.log('[Transfer] Initialization complete');

            // Show Interstitial Ad if in SEND mode (User Request)
            if (mode === 'send') {
                console.log('[Transfer] 📺 Showing Interstitial Ad for Sender...');
                AdService.showInterstitial();
            }
        };
        init();
    }, []);

    // Celebration Animation
    useEffect(() => {
        // Only show success if:
        // 1. Component is initialized (not during setup phase)
        // 2. Status is 'completed'
        // 3. Queue is NOT empty
        // 4. All items in queue are actually completed (not just status flag)
        // 5. We haven't already shown the result
        // 6. No new transfer is starting

        // Skip if not initialized yet (prevents flash from previous transfer)
        if (!isInitialized.current) {
            return;
        }

        // Use filteredQueue for mode-specific completion check
        const allItemsDone = filteredQueue.length > 0 && filteredQueue.every(i => i.status === 'completed');

        // Check if this is a fresh transfer (has pending items = new transfer starting)
        const hasPendingItems = filteredQueue.some(i => i.status === 'pending');
        const hasTransferringItems = filteredQueue.some(i => i.status === 'transferring');

        console.log('[Transfer] Checking completion:', {
            transferStatus,
            queueLength: filteredQueue.length,
            allItemsDone,
            showResult,
            queueStatuses: filteredQueue.map(i => i.status)
        });

        // Only show success when ALL items are completed and no pending/transferring
        if (transferStatus === 'completed' && allItemsDone && !showResult && !hasPendingItems && !hasTransferringItems) {
            console.log('[Transfer] ✅ ALL CONDITIONS MET - Showing success overlay');
            setShowResult('success');
            SoundService.transferComplete(); // Use proper API method instead of generic play()
            Animated.parallel([
                Animated.spring(successScale, { toValue: 1, friction: 6, useNativeDriver: true }),
                Animated.timing(successOpacity, { toValue: 1, duration: 400, useNativeDriver: true })
            ]).start();
        }
    }, [transferStatus, filteredQueue, showResult]);

    const renderItem = ({ item, index }: any) => {
        const isCurrent = item.id === currentItem?.id;
        const isCompleted = item.status === 'completed';
        const isZippingItem = item.preprocess?.kind === 'zipDirectory' &&
            item.preprocess.stage === 'zipping';

        // Staggered list animation input
        const scale = scrollY.interpolate({
            inputRange: [-1, 0, index * 60, index * 60 + 20],
            outputRange: [1, 1, 1, 0.8] // Subtle shrink as scrolling out
        });

        return (
            <GlassCard
                variant={isCurrent ? "heavy" : "light"}
                style={[
                    styles.listItem,
                    isCurrent && styles.activeItemBorder,
                    { opacity: isCompleted ? 0.6 : 1 }
                ]}
            >
                <View style={[styles.iconBox, { backgroundColor: isCurrent ? COLORS.primary + '30' : COLORS.surface }]}>
                    <Icon
                        name={item.direction === 'receive' ? 'arrow-downward' : 'arrow-upward'}
                        size={24}
                        color={item.direction === 'receive' ? '#4CAF50' : '#2196F3'}
                    />
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.itemSize}>
                        {(item.size / (1024 * 1024)).toFixed(1)} MB
                    </Text>

                    {/* Mini Progress Bar for Item */}
                    {isCurrent && (
                        <View style={styles.miniProgressContainer}>
                            <View style={[styles.miniProgressFill, { width: `${(item.progress || 0) * 100}%` }]} />
                        </View>
                    )}
                </View>

                <View>
                    {isCompleted ? (
                        <Icon name="check-circle" size={22} color={COLORS.success} />
                    ) : isZippingItem ? (
                        <Text style={styles.itemPercent}>{t('transfer.status_compressing_short', 'Zipping')}</Text>
                    ) : isCurrent ? (
                        <Text style={styles.itemPercent}>{Math.round((item.progress || 0) * 100)}%</Text>
                    ) : (
                        <View style={styles.dot} />
                    )}
                </View>
            </GlassCard>
        );
    };

    return (
        <AppBackground>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <ModernHeader title={mode === 'send' ? t('transfer.title_sending') : t('transfer.title_receiving')} />

            <View style={styles.container}>

                {/* 1. WARP CORE (Hero) */}
                <View style={styles.heroSection}>
                    <WarpCore
                        totalProgress={totalProgress}
                        fileProgress={isZippingData ? 0 : (currentItem?.progress || 0)}
                        speed={isZippingData ? 0 : (currentItem?.speed || 0)}
                        status={
                            hasActiveItems
                                ? (isZippingData
                                    ? t('transfer.status_compressing_data', 'Compressing app data...')
                                    : (currentItem?.name || t('common.loading')))
                                : t('connect.status_ready')
                        }
                    />
                </View>

                {/* 2. DASHBOARD (Metrics) */}
                <View style={styles.dashboard}>
                    <GlassCard style={styles.statCard}>
                        <Icon name="speed" size={20} color={COLORS.secondary} />
                        <Text style={styles.statValue}>{speedStr}</Text>
                        <Text style={styles.statLabel}>{t('transfer.current_speed')}</Text>
                    </GlassCard>

                    <View style={styles.divider} />

                    <GlassCard style={styles.statCard}>
                        <Icon name="timer" size={20} color={COLORS.primary} />
                        <Text style={styles.statValue}>{Math.ceil(currentItem?.timeLeft || 0)}s</Text>
                        <Text style={styles.statLabel}>{t('transfer.time_left')}</Text>
                    </GlassCard>

                    <View style={styles.divider} />

                    <GlassCard style={styles.statCard}>
                        <Icon name="data-usage" size={20} color={COLORS.success} />
                        <Text style={styles.statValue}>{progressStr}</Text>
                        <Text style={styles.statLabel}>
                            {isZippingData
                                ? t('transfer.compressed', 'Compressed')
                                : t('transfer.transferred')}
                        </Text>
                    </GlassCard>
                </View>

                {/* 3. QUEUE (Stream) */}
                <View style={styles.listContainer}>
                    <Text style={styles.listHeader}>{t('transfer.queue_header')} ({displayQueue.length})</Text>
                    <FlatList
                        data={displayQueue}
                        renderItem={renderItem}
                        keyExtractor={i => i.id}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        showsVerticalScrollIndicator={false}
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                            { useNativeDriver: false }
                        )}
                    />
                </View>

                {/* CANCEL BUTTON */}
                <View style={styles.footer}>
                    <NeoButton
                        label={t('transfer.cancel')}
                        variant="outline"
                        onPress={() => navigation.goBack()}
                    />
                </View>
            </View>

            {/* SUCCESS OVERLAY */}
            {showResult === 'success' && (
                <View style={styles.overlay}>
                    <Animated.View style={{ transform: [{ scale: successScale }], opacity: successOpacity, alignItems: 'center' }}>
                        <View style={styles.successCircle}>
                            <Icon name="check" size={80} color="white" />
                        </View>
                        <Text style={styles.successTitle}>{t('transfer.complete_title')}</Text>
                        <Text style={styles.successSub}>{t('transfer.complete_desc')}</Text>

                        <NeoButton
                            label={t('transfer.done')}
                            style={{ width: 200, marginTop: 30 }}
                            onPress={() => navigation.navigate('Main')}
                        />
                    </Animated.View>
                </View>
            )}
        </AppBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: SIZES.padding,
    },
    heroSection: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 30,
    },
    dashboard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 15,
        borderRadius: 12,
    },
    divider: {
        width: 10,
    },
    statValue: {
        ...FONTS.h3,
        color: COLORS.white,
        marginTop: 5,
        fontWeight: 'bold',
    },
    statLabel: {
        ...FONTS.caption,
        color: COLORS.textDim,
        fontSize: 10,
        textTransform: 'uppercase',
    },
    listContainer: {
        flex: 1,
    },
    listHeader: {
        ...FONTS.h4,
        color: COLORS.textDim,
        marginBottom: 10,
        marginLeft: 5,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginBottom: 10,
        borderRadius: 16,
    },
    activeItemBorder: {
        borderWidth: 1,
        borderColor: COLORS.primary,
        backgroundColor: 'rgba(108, 99, 255, 0.1)',
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemName: {
        ...FONTS.body3,
        color: COLORS.white,
        fontWeight: '600',
    },
    itemSize: {
        ...FONTS.caption,
        color: COLORS.textDim,
    },
    itemPercent: {
        ...FONTS.caption,
        color: COLORS.primary,
        fontWeight: 'bold',
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
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.surface,
    },
    footer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    successCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: COLORS.success,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: COLORS.success,
        shadowRadius: 20,
        shadowOpacity: 0.5,
        elevation: 10,
    },
    successTitle: {
        ...FONTS.h1,
        color: COLORS.white,
        marginBottom: 10,
    },
    successSub: {
        ...FONTS.body3,
        color: COLORS.textDim,
    }
});

export default Transfer;

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Linking, Platform, Share, Vibration, Image, Modal, NativeModules } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, FONTS, SIZES } from '../theme';

import { useTransferStore, type TransferHistory } from '../store/transferStore';

// Modern Components
import AppBackground from '../components/modern/AppBackground';
import ModernHeader from '../components/modern/ModernHeader';
import GlassCard from '../components/modern/GlassCard';
import ReactNativeBlobUtil from 'react-native-blob-util';
import GameRestoreHelp from '../components/GameRestoreHelp'; // Import new component

// Get file icon based on extension
const getFileIcon = (filename: string): { name: string; color: string } => {
    const ext = (filename.split('.').pop() || '').toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic'].includes(ext)) {
        return { name: 'image', color: '#4CAF50' };
    } else if (['mp4', 'mkv', 'avi', 'mov', 'wmv', '3gp', 'webm'].includes(ext)) {
        return { name: 'play-circle-filled', color: '#FF5722' };
    } else if (['apk', 'xapk'].includes(ext)) {
        return { name: 'android', color: '#8BC34A' };
    } else if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(ext)) {
        return { name: 'music-note', color: '#E91E63' };
    } else if (['pdf'].includes(ext)) {
        return { name: 'picture-as-pdf', color: '#F44336' };
    } else if (['doc', 'docx'].includes(ext)) {
        return { name: 'description', color: '#2196F3' };
    } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
        return { name: 'folder-zip', color: '#FFC107' };
    }
    return { name: 'insert-drive-file', color: COLORS.textDim };
};

// Format file size
const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Format relative time
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

// Check if file can show actual thumbnail
const canShowThumbnail = (filename: string): boolean => {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'mp4', 'mkv', 'avi', 'mov', 'wmv', '3gp', 'webm'].includes(ext);
};

const History = ({ navigation }: any) => {
    const { t } = useTranslation();
    const { history, loadHistory, clearHistory, removeFromHistory } = useTransferStore();
    const [stats, setStats] = useState({ totalSent: 0, totalReceived: 0, totalSize: 0 });

    // Game Restore State
    const [restoreModalVisible, setRestoreModalVisible] = useState(false);
    const [selectedGameForRestore, setSelectedGameForRestore] = useState<{ path: string, package: string } | null>(null);

    useEffect(() => {
        loadHistory();
    }, []);

    useEffect(() => {
        const sent = history.filter(x => x.type === 'sent').length;
        const recv = history.filter(x => x.type === 'received').length;
        const size = history.reduce((acc, curr) => acc + curr.size, 0);
        setStats({ totalSent: sent, totalReceived: recv, totalSize: size });
    }, [history]);

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

    // Get MIME type based on extension
    const getMimeType = (filename: string): string => {
        const ext = (filename.split('.').pop() || '').toLowerCase();
        switch (ext) {
            case 'jpg': case 'jpeg': return 'image/jpeg';
            case 'png': return 'image/png';
            case 'gif': return 'image/gif';
            case 'webp': return 'image/webp';
            case 'mp4': return 'video/mp4';
            case 'mkv': return 'video/x-matroska';
            case 'avi': return 'video/x-msvideo';
            case 'mp3': return 'audio/mpeg';
            case 'wav': return 'audio/wav';
            case 'pdf': return 'application/pdf';
            case 'doc': return 'application/msword';
            case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            case 'xls': return 'application/vnd.ms-excel';
            case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            case 'ppt': return 'application/vnd.ms-powerpoint';
            case 'pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
            case 'zip': return 'application/zip';
            case 'rar': return 'application/x-rar-compressed';
            case 'apk': return 'application/vnd.android.package-archive';
            case 'txt': return 'text/plain';
            default: return '*/*';
        }
    };

    const handleOpenFile = async (item: TransferHistory) => {
        if (!item.path) {
            showFileLocation(item);
            return;
        }

        try {
            if (Platform.OS === 'android') {
                const mime = getMimeType(item.filename);
                const ext = (item.filename.split('.').pop() || '').toLowerCase();
                const fileProvider = NativeModules.FileProviderModule;
                if (ext === 'apk' && fileProvider?.installApk) {
                    await fileProvider.installApk(item.path);
                    return;
                }
                if ((ext === 'apks' || ext === 'xapk') && fileProvider?.installApksBundle) {
                    await fileProvider.installApksBundle(item.path);
                    return;
                }

                await ReactNativeBlobUtil.android.actionViewIntent(item.path, mime);
            } else {
                const canOpen = await Linking.canOpenURL(item.path);
                if (canOpen) {
                    await Linking.openURL(item.path);
                } else {
                    showFileLocation(item);
                }
            }
        } catch (error) {
            console.error('Error opening file:', error);
            // Fallback to showing location if opening fails
            showFileLocation(item);
        }
    };

    const showFileLocation = (item: TransferHistory) => {
        const ext = (item.filename.split('.').pop() || '').toLowerCase();
        let folder = 'Files';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic'].includes(ext)) folder = 'Images';
        else if (['mp4', 'mkv', 'avi', 'mov', 'wmv', '3gp', 'webm'].includes(ext)) folder = 'Videos';
        else if (['apk', 'xapk'].includes(ext)) folder = 'Apps';
        else if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(ext)) folder = 'Music';

        Alert.alert(
            t('common.info'),
            `📁 Downloads/MisterShare/${folder}/${item.filename}`,
            [{ text: t('common.ok') }]
        );
    };

    const handleShareFile = async (item: TransferHistory) => {
        try {
            if (item.path && Platform.OS === 'android') {
                await Share.share({
                    message: `Shared via MisterShare: ${item.filename}`,
                    url: `file://${item.path}`,
                });
            } else {
                await Share.share({
                    message: `I shared "${item.filename}" (${formatFileSize(item.size)}) via MisterShare!`,
                });
            }
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    const handleDeleteItem = (item: TransferHistory) => {
        Alert.alert(
            t('history.delete_item', { defaultValue: 'Delete from history?' }),
            item.filename,
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.done'),
                    style: 'destructive',
                    onPress: () => removeFromHistory(item.id)
                }
            ]
        );
    };

    const handleLongPress = (item: TransferHistory) => {
        Vibration.vibrate(50);
        Alert.alert(
            item.filename,
            formatFileSize(item.size),
            [
                { text: t('common.open', { defaultValue: 'Open' }), onPress: () => handleOpenFile(item) },
                { text: t('common.share', { defaultValue: 'Share' }), onPress: () => handleShareFile(item) },
                { text: t('common.delete', { defaultValue: 'Delete' }), style: 'destructive', onPress: () => handleDeleteItem(item) },
                { text: t('common.cancel'), style: 'cancel' },
            ]
        );
    };

    // Helper: Detect likely package name from filename
    // e.g., "PUBG_Mobile.xapk" -> "com.tencent.ig" check
    const getGamePackage = (filename: string): string | null => {
        const lower = filename.toLowerCase();
        if (lower.includes('pubg') || lower.includes('tencent')) return 'com.tencent.ig';
        if (lower.includes('free') && lower.includes('fire')) return 'com.dts.freefireth';
        if (lower.includes('call') && lower.includes('duty')) return 'com.activision.callofduty.shooter';
        if (lower.includes('genshin')) return 'com.miHoYo.GenshinImpact';
        if (lower.includes('minecraft')) return 'com.mojang.minecraftpe';
        return null;
    };

    const handleRestoreGame = (item: TransferHistory) => {
        const pkg = getGamePackage(item.filename);
        if (pkg && item.path) {
            setSelectedGameForRestore({ path: item.path, package: pkg });
            setRestoreModalVisible(true);
        } else {
            Alert.alert('Info', 'Could not detect game package. Please install manually.');
        }
    };

    // Render thumbnail - actual image preview or fallback to icon
    const renderThumbnail = (item: TransferHistory, fileIcon: { name: string; color: string }) => {
        const ext = (item.filename.split('.').pop() || '').toLowerCase();
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic'].includes(ext);
        const isVideo = ['mp4', 'mkv', 'avi', 'mov', 'wmv', '3gp', 'webm'].includes(ext);

        // 1. App Icon / Custom Icon
        if (item.icon) {
            return (
                <View style={styles.thumbnailContainer}>
                    <Image
                        source={{ uri: item.icon }}
                        style={styles.thumbnail}
                        resizeMode="cover"
                    />
                </View>
            );
        }

        // 2. Image/Video Thumbnail from Path
        if (item.path && (isImage || isVideo)) {
            // Sanitize path: if it already starts with file://, use it as is, otherwise prepend
            const imageUri = item.path.startsWith('file://') || item.path.startsWith('content://')
                ? item.path
                : `file://${item.path}`;

            return (
                <View style={styles.thumbnailContainer}>
                    <Image
                        source={{ uri: imageUri }}
                        style={styles.thumbnail}
                        resizeMode="cover"
                    />
                    {/* Video play overlay */}
                    {isVideo && (
                        <View style={styles.videoOverlay}>
                            <Icon name="play-circle-filled" size={20} color="#FFFFFF" />
                        </View>
                    )}
                </View>
            );
        }

        // Fallback to icon for other file types
        return (
            <View style={[styles.iconBox, { backgroundColor: fileIcon.color + '20' }]}>
                <Icon name={fileIcon.name} size={24} color={fileIcon.color} />
            </View>
        );
    };

    const renderItem = ({ item }: { item: TransferHistory }) => {
        const isSent = item.type === 'sent';
        const isSuccess = item.status === 'success';
        const fileIcon = getFileIcon(item.filename);
        const isGame = getGamePackage(item.filename) !== null && !isSent && isSuccess;

        return (
            <TouchableOpacity
                onPress={() => handleOpenFile(item)}
                onLongPress={() => handleLongPress(item)}
                activeOpacity={0.7}
                delayLongPress={400}
            >
                <GlassCard style={styles.historyItem} variant="medium">
                    {/* Thumbnail - Show actual image/video preview, or icon for other types */}
                    {renderThumbnail(item, fileIcon)}

                    {/* File Info */}
                    <View style={styles.info}>
                        <Text style={styles.name} numberOfLines={1}>{item.filename}</Text>
                        <View style={styles.metaRow}>
                            <Icon
                                name={isSent ? 'arrow-upward' : 'arrow-downward'}
                                size={12}
                                color={isSent ? COLORS.primary : COLORS.secondary}
                            />
                            <Text style={styles.meta}>
                                {formatFileSize(item.size)} • {formatRelativeTime(item.timestamp)}
                            </Text>
                        </View>
                    </View>

                    {/* Status & Actions */}
                    <View style={styles.actions}>
                        {/* Game Restore Button */}
                        {isGame && (
                            <TouchableOpacity
                                onPress={() => handleRestoreGame(item)}
                                style={styles.restoreIconBtn}
                            >
                                <Icon name="videogame-asset" size={20} color={COLORS.primary} />
                            </TouchableOpacity>
                        )}

                        <Icon
                            name={isSuccess ? 'check-circle' : 'error'}
                            size={18}
                            color={isSuccess ? COLORS.success : COLORS.error}
                            style={{ marginLeft: 8 }}
                        />
                        <TouchableOpacity
                            onPress={() => handleShareFile(item)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Icon name="share" size={18} color={COLORS.textDim} style={{ marginLeft: 12 }} />
                        </TouchableOpacity>
                    </View>
                </GlassCard>
            </TouchableOpacity>
        );
    };

    return (
        <AppBackground>
            <ModernHeader
                title={t('history.title')}
                rightIcon="delete-outline"
                onRightPress={handleClear}
            />

            {/* Stats Row */}
            <View style={styles.statsRow}>
                <GlassCard style={styles.statCard}>
                    <Icon name="arrow-upward" size={20} color={COLORS.primary} />
                    <Text style={styles.statValue}>{stats.totalSent}</Text>
                    <Text style={styles.statLabel}>{t('history.sent')}</Text>
                </GlassCard>
                <GlassCard style={styles.statCard}>
                    <Icon name="arrow-downward" size={20} color={COLORS.secondary} />
                    <Text style={styles.statValue}>{stats.totalReceived}</Text>
                    <Text style={styles.statLabel}>{t('history.received')}</Text>
                </GlassCard>
                <GlassCard style={styles.statCard}>
                    <Icon name="storage" size={20} color={COLORS.files} />
                    <Text style={styles.statValue}>{formatFileSize(stats.totalSize)}</Text>
                    <Text style={styles.statLabel}>{t('history.total')}</Text>
                </GlassCard>
            </View>

            {/* Hint */}
            <Text style={styles.hint}>{t('history.long_press_hint', { defaultValue: 'Long press for more options' })}</Text>

            <FlatList
                data={history}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Icon name="history" size={60} color={COLORS.textDim} />
                        <Text style={styles.emptyText}>{t('history.empty')}</Text>
                        <Text style={styles.emptyHint}>{t('history.empty_hint', { defaultValue: 'Transfer files to see them here' })}</Text>
                    </View>
                }
            />

            {/* Game Restore Modal */}
            <Modal
                visible={restoreModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setRestoreModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    {selectedGameForRestore && (
                        <GameRestoreHelp
                            gamePackageName={selectedGameForRestore.package}
                            zipFilePath={selectedGameForRestore.path}
                            onClose={() => setRestoreModalVisible(false)}
                            onRestoreStart={() => { }}
                            onRestoreComplete={() => setRestoreModalVisible(false)}
                        />
                    )}
                </View>
            </Modal>
        </AppBackground>
    );
};

const styles = StyleSheet.create({
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: SIZES.padding,
        gap: 10,
        marginBottom: 10,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
    },
    statValue: {
        ...FONTS.h3,
        color: COLORS.white,
        marginTop: 4,
    },
    statLabel: {
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
    thumbnailContainer: {
        width: 48,
        height: 48,
        borderRadius: 10,
        overflow: 'hidden',
        marginRight: 12,
        position: 'relative',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    videoOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
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

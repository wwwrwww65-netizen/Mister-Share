import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    Image,
    Dimensions,
    ActivityIndicator,
    Switch,
    Platform,
    Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SAFService from '../services/SAFService';
import FileSystem from '../services/FileSystem';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SIZES, SHADOWS } from '../theme';

interface GameResourceModalProps {
    visible: boolean;
    game: any;
    onClose: () => void;
    onConfirm: (files: any[]) => void;
}

const { width } = Dimensions.get('window');

const GameResourceModal: React.FC<GameResourceModalProps> = ({
    visible,
    game,
    onClose,
    onConfirm,
}) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);

    // Selection states
    const [selectedApk, setSelectedApk] = useState(true);
    const [selectedObb, setSelectedObb] = useState(true);
    const [selectedData, setSelectedData] = useState(false);

    // Resource Availability & Meta
    const [obbFiles, setObbFiles] = useState<any[]>([]);
    const [obbSize, setObbSize] = useState(0);
    const [obbStatus, setObbStatus] = useState<'checking' | 'found' | 'not_found' | 'permission_needed'>('checking');

    const [dataStatus, setDataStatus] = useState<'checking' | 'found' | 'not_found' | 'permission_needed'>('checking');

    // Reset logic on open
    useEffect(() => {
        if (visible && game) {
            initializeModal();
        }
    }, [visible, game]);

    const initializeModal = async () => {
        // Reset States
        setLoading(true);
        setSelectedApk(true);
        setSelectedObb(true);
        setSelectedData(false);
        setObbFiles([]);
        setObbSize(0);
        setDataFolder(null);
        setDataZipStage('idle');
        setDataZipBytes(0);
        setDataZipPath(null);
        setDataZipProgressBytes(0);
        setDataZipTotalBytes(0);
        setDataZipEtaSeconds(0);
        lastZipProgressRef.current = null;
        speedSamplesRef.current = [];

        // Start Checks
        await checkResources();
        setLoading(false); // Force stop loading
    };

    const checkResources = async () => {
        const pkg = game.packageName;
        console.log(`[GameResourceModal] ════════════════════════════════`);
        console.log(`[GameResourceModal] Checking resources for ${pkg}`);

        // First, call findGameFiles ONCE to get all files (OBB + DATA)
        let allGameFiles: any[] = [];

        try {
            setObbStatus('checking');
            setDataStatus('checking');

            console.log(`[GameResourceModal] Calling SAFService.findGameFiles...`);
            allGameFiles = await SAFService.findGameFiles(pkg);
            console.log(`[GameResourceModal] findGameFiles returned ${allGameFiles.length} files:`,
                allGameFiles.map((f: any) => `${f.name} (${f.type}, ${f.size}b)`));

        } catch (e: any) {
            console.error(`[GameResourceModal] findGameFiles failed:`, e?.message || e);
        }

        // Process OBB files
        const obbFiles = allGameFiles.filter((f: any) => f.type === 'obb');
        console.log(`[GameResourceModal] OBB files found: ${obbFiles.length}`);

        if (obbFiles.length > 0) {
            setObbFiles(obbFiles);
            setObbSize(obbFiles.reduce((acc: number, item: any) => acc + item.size, 0));
            setObbStatus('found');
            setSelectedObb(true);
            console.log(`[GameResourceModal] OBB status: FOUND (${obbFiles.length} files)`);
        } else {
            // Check if we need permission or if folder just doesn't exist
            try {
                const hasObbPerm = await SAFService.hasPermission(pkg, 'obb');
                if (hasObbPerm) {
                    setObbStatus('not_found');
                    console.log(`[GameResourceModal] OBB status: NOT FOUND (permission granted but no files)`);
                } else {
                    setObbStatus('permission_needed');
                    console.log(`[GameResourceModal] OBB status: PERMISSION NEEDED`);
                }
            } catch {
                setObbStatus('not_found');
            }
            setSelectedObb(false);
        }

        // Process DATA files
        const dataFiles = allGameFiles.filter((f: any) => f.type === 'data');
        console.log(`[GameResourceModal] DATA files found: ${dataFiles.length}`);

        if (dataFiles.length > 0) {
            setDataFolder(dataFiles[0]);
            setDataStatus('found');
            console.log(`[GameResourceModal] DATA status: FOUND - ${dataFiles[0].name} (${dataFiles[0].uri})`);
        } else {
            // Check if we need permission
            try {
                const hasDataPerm = await SAFService.hasPermission(pkg, 'data');
                if (hasDataPerm) {
                    setDataStatus('not_found');
                    console.log(`[GameResourceModal] DATA status: NOT FOUND (permission granted but no files)`);
                } else {
                    setDataStatus('permission_needed');
                    console.log(`[GameResourceModal] DATA status: PERMISSION NEEDED`);
                }
            } catch {
                setDataStatus('not_found');
            }
            setSelectedData(false);
            setDataFolder(null);
        }

        console.log(`[GameResourceModal] ════════════════════════════════`);
        // Ensure loading stops
        setLoading(false);
    };
    const [dataFolder, setDataFolder] = useState<any>(null);
    const [dataZipStage, setDataZipStage] = useState<'idle' | 'zipping' | 'ready' | 'failed'>('idle');
    const [dataZipBytes, setDataZipBytes] = useState(0);
    const [dataZipPath, setDataZipPath] = useState<string | null>(null);
    const [dataZipProgressBytes, setDataZipProgressBytes] = useState(0);
    const [dataZipTotalBytes, setDataZipTotalBytes] = useState(0);
    const [dataZipEtaSeconds, setDataZipEtaSeconds] = useState(0);
    const lastZipProgressRef = useRef<{ time: number; bytes: number } | null>(null);
    const speedSamplesRef = useRef<Array<{ time: number; bytes: number }>>([]);
    const zipUnsubscribeRef = useRef<null | (() => void)>(null);

    const handleRequestPermission = async (type: 'obb' | 'data') => {
        // Special Handling for Android 11+: Check All Files Access first
        if (Platform.OS === 'android' && Platform.Version >= 30) {
            const hasAllFiles = await FileSystem.hasAllFilesPermission();
            if (!hasAllFiles) {
                Alert.alert(
                    t('permissions.full_access_title', { defaultValue: 'Full File Access Required' }),
                    t('permissions.full_access_msg', { defaultValue: 'To access game data/obb files, please enable "All files access" in the next screen.' }),
                    [
                        {
                            text: t('common.cancel', { defaultValue: 'Cancel' }),
                            style: 'cancel'
                        },
                        {
                            text: t('common.open_settings', { defaultValue: 'Open Settings' }),
                            onPress: () => FileSystem.requestAllFilesPermission()
                        }
                    ]
                );
                return; // Stop here, user needs to grant this first
            }
        }

        try {
            const result = await SAFService.requestGameFolderAccess(game.packageName, type);
            if (result) {
                // Re-check specific resource without full reset
                const files = await SAFService.findGameFiles(game.packageName);

                if (type === 'obb') {
                    const obbs = files.filter((f: any) => f.type === 'obb');
                    if (obbs.length > 0) {
                        setObbFiles(obbs);
                        setObbSize(obbs.reduce((acc: number, item: any) => acc + item.size, 0));
                        setObbStatus('found');
                        setSelectedObb(true);
                    } else {
                        setObbStatus('not_found');
                    }
                } else {
                    const dataFiles = files.filter((f: any) => f.type === 'data');
                    if (dataFiles.length > 0) {
                        setDataFolder(dataFiles[0]);
                        setDataStatus('found');
                    } else {
                        setDataStatus('not_found');
                    }
                }
            } else {
                // SAF result is null -> Show workaround instructions
                Alert.alert(
                    t('permissions.required_title'),
                    t('permissions.saf_workaround_instructions'),
                    [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                            text: t('common.open_settings'),
                            onPress: () => SAFService.openSystemAppSettings("com.google.android.documentsui")
                        }
                    ]
                );
            }
        } catch (err) {
            console.error(err);
        }
    };
    const startDataZip = async () => {
        if (!dataFolder || dataZipStage === 'zipping' || dataZipStage === 'ready') return;

        try {
            const RNFS = require('@dr.pogodin/react-native-fs');
            console.log('[GameResourceModal] DATA ZIP start', {
                pkg: game.packageName,
                uri: dataFolder?.uri,
            });

            if (zipUnsubscribeRef.current) {
                zipUnsubscribeRef.current();
                zipUnsubscribeRef.current = null;
            }

            zipUnsubscribeRef.current = SAFService.onZipProgress((event: any) => {
                const totalRaw = Number(event?.totalBytes ?? 0);
                const processedRaw = Number(event?.processedBytes ?? 0);
                const totalBytes = totalRaw > 0 ? totalRaw : 0;
                const processedBytes = totalBytes > 0
                    ? Math.min(Math.max(processedRaw, 0), totalBytes)
                    : Math.max(processedRaw, 0);

                setDataZipProgressBytes(processedBytes);
                if (totalBytes > 0) setDataZipTotalBytes(totalBytes);

                const now = Date.now();
                const last = lastZipProgressRef.current;

                const percent = totalBytes > 0
                    ? Math.min(100, Math.round((processedBytes / totalBytes) * 100))
                    : 0;
                console.log('[GameResourceModal] DATA ZIP progress', {
                    filesZipped: event?.filesZipped,
                    processedBytes,
                    totalBytes,
                    percent,
                });

                if (!last || processedBytes < last.bytes) {
                    speedSamplesRef.current = [{ time: now, bytes: processedBytes }];
                    lastZipProgressRef.current = { time: now, bytes: processedBytes };
                    setDataZipEtaSeconds(0);
                    return;
                }

                speedSamplesRef.current.push({ time: now, bytes: processedBytes });
                const windowMs = 4000;
                const cutoff = now - windowMs;
                speedSamplesRef.current = speedSamplesRef.current.filter(s => s.time >= cutoff);

                const first = speedSamplesRef.current[0];
                const lastSample = speedSamplesRef.current[speedSamplesRef.current.length - 1];
                const elapsed = (lastSample.time - first.time) / 1000;
                const progressed = lastSample.bytes - first.bytes;

                if (elapsed > 0 && progressed > 0 && totalBytes > 0) {
                    const avgSpeed = progressed / elapsed;
                    const remaining = totalBytes - processedBytes;
                    if (remaining > 0 && avgSpeed > 0) {
                        setDataZipEtaSeconds(Math.ceil(remaining / avgSpeed));
                    } else {
                        setDataZipEtaSeconds(0);
                    }
                }

                lastZipProgressRef.current = { time: now, bytes: processedBytes };
            });

            const outputZipPath = `${RNFS.CachesDirectoryPath}/${game.packageName}_data.zip`;

            setDataZipStage('zipping');
            setDataZipProgressBytes(0);
            setDataZipTotalBytes(0);
            setDataZipEtaSeconds(0);
            lastZipProgressRef.current = null;
            speedSamplesRef.current = [];

            const result = await SAFService.createZipFromDirectory(dataFolder.uri, outputZipPath);
            if (!result?.zipPath) {
                throw new Error('ZIP_CREATE_FAILED');
            }

            const stat = await RNFS.stat(result.zipPath);
            const zipSize = stat?.size || result.totalBytes || 0;

            setDataZipStage('ready');
            setDataZipPath(result.zipPath);
            setDataZipBytes(zipSize);
            setDataZipProgressBytes(result.totalBytes || zipSize);
            console.log('[GameResourceModal] DATA ZIP done', {
                pkg: game.packageName,
                zipPath: result.zipPath,
                filesZipped: result.filesZipped,
                totalBytes: result.totalBytes,
                zipSize,
            });
        } catch (e) {
            console.error('[GameResourceModal] DATA ZIP failed:', e);
            setDataZipStage('failed');
        } finally {
            if (zipUnsubscribeRef.current) {
                zipUnsubscribeRef.current();
                zipUnsubscribeRef.current = null;
            }
        }
    };

    useEffect(() => {
        return () => {
            if (zipUnsubscribeRef.current) {
                zipUnsubscribeRef.current();
                zipUnsubscribeRef.current = null;
            }
        };
    }, []);

    const handleConfirm = () => {
        const finalFiles: any[] = [];

        // 1. APK
        if (selectedApk) {
            finalFiles.push(game);
        }

        // 2. OBB (Real files from SAFService)
        if (selectedObb && obbFiles.length > 0) {
            finalFiles.push(
                ...obbFiles.map((f: any) => ({
                    ...f,
                    path: f.path || f.uri,
                    isDirectory: false
                }))
            );
        }

        if (selectedData && dataFolder) {
            if (dataZipStage !== 'ready' || !dataZipPath) {
                const { Alert } = require('react-native');
                Alert.alert(
                    t('game_restore.data_zip_not_ready_title', 'App data not ready'),
                    t('game_restore.data_zip_not_ready_message', 'Please wait until data compression finishes.')
                );
                return;
            }

            finalFiles.push({
                name: `${game.packageName}_data.zip`,
                path: dataZipPath,
                uri: dataZipPath,
                size: dataZipBytes,
                mimeType: 'application/zip',
                packageName: game.packageName,
                isDirectory: false
            });
        }

        onConfirm(finalFiles);
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + ['B', 'KB', 'MB', 'GB'][i];
    };

    const formatEta = (seconds: number) => {
        const s = Math.max(0, seconds);
        const minutes = Math.floor(s / 60);
        const secs = s % 60;
        if (minutes <= 0) {
            return `${secs}s`;
        }
        return `${minutes}m ${secs.toString().padStart(2, '0')}s`;
    };

    if (!visible || !game) return null;

    return (
        <Modal
            transparent
            animationType="fade"
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

                <View style={styles.modalContent}>
                    {/* Changed GlassCard to View for solid background */}
                    <View style={styles.card}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View>
                                <Text style={styles.title}>{t('game_restore.game_resources', 'Game Resources')}</Text>
                                <Text style={styles.subtitle}>{t('game_restore.select_files_to_send', 'Select components to send')}</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Icon name="close" size={20} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Game Info (Always Selected Logic Header) */}
                        <View style={styles.gameHeader}>
                            {game.icon ? (
                                <Image
                                    source={{ uri: game.icon }}
                                    style={styles.gameIcon}
                                />
                            ) : (
                                <View style={[styles.gameIcon, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#E0F7FA' }]}>
                                    <Icon name="android" size={32} color={COLORS.primary} />
                                </View>
                            )}
                            <View style={{ flex: 1 }}>
                                <Text style={styles.gameName}>{game.name || game.label}</Text>
                                <Text style={styles.gamePkg}>{game.packageName}</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* --- OPTION 1: APK --- */}
                        <View style={styles.optionRow}>
                            <View style={[styles.iconBox, { backgroundColor: '#E0F7FA' }]}>
                                <Icon name="android" size={24} color="#00BCD4" />
                            </View>
                            <View style={styles.optionInfo}>
                                <Text style={styles.optionTitle}>{t('game_restore.base_apk', 'Base APK')}</Text>
                                <Text style={styles.optionSub}>{formatSize(game.size)}</Text>
                            </View>
                            <Switch
                                value={selectedApk}
                                onValueChange={setSelectedApk}
                                trackColor={{ false: "#767577", true: COLORS.primary }}
                                thumbColor={"#f4f3f4"}
                            />
                        </View>

                        {/* --- OPTION 2: OBB --- */}
                        <View style={[styles.optionRow, { opacity: obbStatus === 'not_found' ? 0.6 : 1 }]}>
                            <View style={[styles.iconBox, { backgroundColor: '#FFF3E0' }]}>
                                {/* FIXED ICON: folder-zip is visually heavier and semantically correct for OBB */}
                                <Icon name="folder-zip" size={24} color="#FF9800" />
                            </View>
                            <View style={styles.optionInfo}>
                                <Text style={styles.optionTitle}>OBB Files</Text>
                                <View style={styles.statusRow}>
                                    {obbStatus === 'checking' && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 5 }} />}
                                    <View>
                                        <Text style={[styles.optionSub, {
                                            color: obbStatus === 'found' ? COLORS.success :
                                                obbStatus === 'permission_needed' ? COLORS.error : COLORS.textDim
                                        }]}>
                                            {obbStatus === 'checking' ? t('game_restore.scanning', 'Scanning...') :
                                                obbStatus === 'found' ? `${formatSize(obbSize)}` :
                                                    obbStatus === 'permission_needed' ? t('game_restore.permission_required', 'Permission Required') :
                                                        t('game_restore.not_found', 'Not Found')}
                                        </Text>
                                        {obbStatus === 'found' && obbFiles.length > 0 && (
                                            <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
                                                {obbFiles[0].name}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            </View>

                            {obbStatus === 'permission_needed' ? (
                                <TouchableOpacity style={styles.grantBtn} onPress={() => handleRequestPermission('obb')}>
                                    <Text style={styles.grantText}>{t('game_restore.grant', 'GRANT')}</Text>
                                </TouchableOpacity>
                            ) : (
                                <Switch
                                    value={selectedObb}
                                    onValueChange={setSelectedObb}
                                    disabled={obbStatus !== 'found'}
                                    trackColor={{ false: "#767577", true: COLORS.primary }}
                                    thumbColor={"#f4f3f4"}
                                />
                            )}
                        </View>

                        {/* --- OPTION 3: DATA --- */}
                        <View style={styles.optionRow}>
                            <View style={[styles.iconBox, { backgroundColor: '#E1BEE7' }]}>
                                <Icon name="database" size={24} color="#9C27B0" />
                            </View>
                            <View style={styles.optionInfo}>
                                <Text style={styles.optionTitle}>{t('game_restore.app_data', 'App Data')}</Text>
                                <Text style={[styles.optionSub, { color: dataStatus === 'permission_needed' ? COLORS.error : COLORS.textDim }]}>
                                    {dataStatus === 'checking'
                                        ? t('game_restore.scanning', 'Scanning...')
                                        : dataStatus === 'permission_needed'
                                            ? t('game_restore.permission_required', 'Permission Required')
                                            : dataStatus === 'not_found'
                                                ? t('game_restore.not_found', 'Not Found')
                                                : selectedData && dataZipStage === 'zipping'
                                                    ? (() => {
                                                        return t('game_restore.compressing_data', 'Compressing data...');
                                                    })()
                                                    : selectedData && dataZipStage === 'ready'
                                                        ? `${t('game_restore.zip_ready', 'ZIP ready')} ${dataZipBytes > 0 ? `(${formatSize(dataZipBytes)})` : ''}`
                                                        : t('game_restore.ready_to_backup', 'Ready to backup')}
                                </Text>
                                {selectedData && dataZipStage === 'zipping' && (() => {
                                    let percent = 0;
                                    if (dataZipTotalBytes > 0) {
                                        const raw = (Math.min(dataZipProgressBytes, dataZipTotalBytes) / dataZipTotalBytes) * 100;
                                        percent = Math.floor(raw);
                                        if (percent >= 100 && dataZipProgressBytes < dataZipTotalBytes) {
                                            percent = 99;
                                        }
                                    }
                                    const etaLabel = dataZipEtaSeconds > 0
                                        ? t('game_restore.zip_eta', 'Remaining {{time}}', { time: formatEta(dataZipEtaSeconds) })
                                        : '';
                                    const sizePart = formatSize(dataZipProgressBytes);
                                    const percentPart = percent > 0 ? ` - ${percent}%` : '';
                                    const metrics = etaLabel
                                        ? `${etaLabel} - ${sizePart}${percentPart}`
                                        : `${sizePart}${percentPart}`;
                                    return (
                                        <Text style={[styles.optionSub, { color: COLORS.textDim }]}>{metrics}</Text>
                                    );
                                })()}
                            </View>

                            {dataStatus === 'permission_needed' ? (
                                <TouchableOpacity style={styles.grantBtn} onPress={() => handleRequestPermission('data')}>
                                    <Text style={styles.grantText}>{t('game_restore.grant', 'GRANT')}</Text>
                                </TouchableOpacity>
                            ) : (
                                <Switch
                                    value={selectedData}
                                    onValueChange={(value) => {
                                        setSelectedData(value);
                                        if (value && dataStatus === 'found') {
                                            startDataZip();
                                        }
                                    }}
                                    disabled={dataStatus !== 'found'}
                                    trackColor={{ false: "#767577", true: COLORS.primary }}
                                    thumbColor={"#f4f3f4"}
                                />
                            )}
                        </View>

                        {/* Footer Action */}
                        <TouchableOpacity
                            style={[
                                styles.confirmBtn,
                                { opacity: (!selectedApk && !selectedObb && !selectedData) || loading ? 0.5 : 1 }
                            ]}
                            onPress={handleConfirm}
                            disabled={(!selectedApk && !selectedObb && !selectedData) || loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.confirmText}>
                                    {t('game_restore.confirm_send', 'Send Selected')} ({[selectedApk, selectedObb, selectedData].filter(Boolean).length})
                                </Text>
                            )}
                        </TouchableOpacity>

                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: COLORS.black,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
        width: width * 0.9,
    },
    card: {
        padding: 24,
        borderRadius: 28,
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.textDim,
    },
    closeBtn: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: COLORS.surfaceHigh,
    },
    gameHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: COLORS.surfaceHigh,
        borderRadius: 16,
        marginBottom: 16,
    },
    gameIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        marginRight: 12,
        backgroundColor: COLORS.glassBorder,
    },
    gameName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    gamePkg: {
        fontSize: 12,
        color: COLORS.textDim,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.glassBorder,
        marginBottom: 16,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        backgroundColor: COLORS.deepSpace,
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    optionInfo: {
        flex: 1,
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    optionSub: {
        fontSize: 13,
        color: COLORS.textDim,
        marginTop: 2,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    grantBtn: {
        backgroundColor: COLORS.error,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    grantText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    fileName: {
        fontSize: 11,
        color: COLORS.textDim,
        marginTop: 2,
        maxWidth: 200,
    },
    confirmBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 18,
        borderRadius: 20,
        alignItems: 'center',
        marginTop: 10,
        ...SHADOWS.glow,
    },
    confirmText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
});

export default GameResourceModal;

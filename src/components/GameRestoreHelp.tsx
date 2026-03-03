import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
    Linking,
    Platform
} from 'react-native';
import SAFService, { SAFRequestResult } from '../services/SAFService';
import { useTranslation } from 'react-i18next'; // Ensure you have i18n setup

// Game Definition Interface
interface GameConfig {
    name: string;
    packageName: string;
    icon: string; // Changed from any to string (icon name)
}

// Popular Games Config
const SUPPORTED_GAMES: GameConfig[] = [
    { name: 'PUBG Mobile', packageName: 'com.tencent.ig', icon: 'gamepad' },
    { name: 'Free Fire', packageName: 'com.dts.freefireth', icon: 'local-fire-department' },
    { name: 'Call of Duty', packageName: 'com.activision.callofduty.shooter', icon: 'security' },
    { name: 'Genshin Impact', packageName: 'com.miHoYo.GenshinImpact', icon: 'auto-fix-high' },
    { name: 'Minecraft', packageName: 'com.mojang.minecraftpe', icon: 'construction' },
];

interface Props {
    gamePackageName: string;
    onClose: () => void;
    onRestoreStart: () => void;
    onRestoreComplete: () => void;
    zipFilePath: string; // The received file path
}

export const GameRestoreHelp: React.FC<Props> = ({
    gamePackageName,
    onClose,
    onRestoreStart,
    onRestoreComplete,
    zipFilePath
}) => {
    const { t } = useTranslation();
    const [step, setStep] = useState(1);
    const [permissions, setPermissions] = useState<{ data: boolean; obb: boolean }>({ data: false, obb: false });
    const [isChecking, setIsChecking] = useState(false);
    const [restoreProgress, setRestoreProgress] = useState({ count: 0, total: 0, current: '' });
    const [isRestoring, setIsRestoring] = useState(false);

    const game = SUPPORTED_GAMES.find(g => g.packageName === gamePackageName) || {
        name: gamePackageName,
        packageName: gamePackageName,
        icon: null
    };

    useEffect(() => {
        checkPermissions();

        // Listen for progress
        const unsubscribe = SAFService.onExtractProgress((event) => {
            setRestoreProgress({
                count: event.extractedFiles,
                total: event.totalBytes, // Note: This is mostly informational as total files might be unknown before zip scan
                current: event.currentFile
            });
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const checkPermissions = async () => {
        setIsChecking(true);
        const hasData = await SAFService.hasPermission(gamePackageName, 'data');
        const hasObb = await SAFService.hasPermission(gamePackageName, 'obb');
        setPermissions({ data: hasData, obb: hasObb });
        setIsChecking(false);
    };

    const handleRequestPermission = async (type: 'data' | 'obb') => {
        Alert.alert(
            t('game_restore.step3_title'),
            t('game_restore.step3_msg'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.ok'),
                    onPress: async () => {
                        try {
                            const result = await SAFService.requestGameFolderAccess(gamePackageName, type);
                            if (result) {
                                if (result.isCorrectFolder) {
                                    checkPermissions();
                                } else {
                                    // User selected wrong folder? logic.
                                    // For now, if we get a result but it's "wrong", typically implies they selected parent
                                    // but we can't easily detect "wrongness" perfectly without strict checks.
                                    // If strict check fails, maybe warn but allow re-check?
                                    // The Native module checks path.
                                    checkPermissions(); // Try anyway, maybe native logic was strict but it works
                                    // Alert.alert(t('common.error'), t('game_restore.perm_msg'));
                                }
                            } else {
                                // Result is null -> Cancelled or Failed
                                console.log('[GameRestore] Permission cancelled/failed - showing workaround');
                                Alert.alert(
                                    t('permissions.required_title', "Permission Required"),
                                    t('permissions.saf_workaround_instructions',
                                        "If you cannot select the folder, your Android version might be restricting access.\n\n" +
                                        "Solution:\n" +
                                        "1. Go to Settings > Apps > Files (Google)\n" +
                                        "2. Tap '3 dots' > Uninstall Updates\n" +
                                        "3. Try again\n\n" +
                                        "Do you want to open Files app settings?"
                                    ),
                                    [
                                        { text: t('common.cancel', "Cancel"), style: "cancel" },
                                        {
                                            text: t('common.open_settings', "Open Settings"),
                                            onPress: () => SAFService.openSystemAppSettings("com.google.android.documentsui")
                                        }
                                    ]
                                );
                            }
                        } catch (e) {
                            console.error("Error requesting permission", e);
                        }
                    }
                }
            ]
        );
    };

    const handleRestore = async () => {
        // Validation Logic
        if (!permissions.data && !permissions.obb) {
            Alert.alert(t('game_restore.perm_required'), t('game_restore.perm_msg'));
            return;
        }

        setIsRestoring(true);
        onRestoreStart();

        try {
            // Determine target folder based on file type
            const fileName = zipFilePath.split('/').pop() || '';
            const ext = fileName.split('.').pop()?.toLowerCase() || '';

            // OBB files go to obb folder, other data goes to data folder
            const targetType = ext === 'obb' ? 'obb' : (permissions.obb ? 'obb' : 'data');
            const targetUri = await SAFService.getStoredUri(gamePackageName, targetType);

            if (!targetUri) {
                Alert.alert(t('common.error'), t('game_restore.perm_missing', { defaultValue: 'Permission lost. Please grant again.' }));
                setIsRestoring(false);
                return;
            }


            let success = false;

            // Check file type and handle accordingly
            if (ext === 'zip' || ext === 'xapk') {
                // Determine if this is a DATA zip or regular OBB zip
                const isDataZip = fileName.includes('_data.zip');
                const extractTargetType = isDataZip ? 'data' : 'obb';

                // Get the correct target URI
                const extractUri = await SAFService.getStoredUri(gamePackageName, extractTargetType);

                if (!extractUri) {
                    // Need permission for this folder type
                    Alert.alert(
                        t('game_restore.perm_required'),
                        t('game_restore.perm_folder_needed', {
                            defaultValue: `Please grant access to ${isDataZip ? 'DATA' : 'OBB'} folder`
                        })
                    );
                    setIsRestoring(false);
                    return;
                }

                // ZIP/XAPK: Extract contents
                console.log(`[GameRestore] Extracting ${isDataZip ? 'DATA' : 'OBB'} ZIP to:`, extractUri);
                const result = await SAFService.extractZip(extractUri, zipFilePath, !isDataZip); // flatten only for OBB
                success = result !== null;
            } else {
                // Regular file (OBB, etc): Copy directly
                console.log('[GameRestore] Copying file to:', targetUri);
                const result = await SAFService.writeFile(targetUri, fileName, zipFilePath);
                success = result !== null;
            }

            setIsRestoring(false);

            if (success) {
                Alert.alert(
                    t('common.success'),
                    t('game_restore.restore_success', { defaultValue: '✅ Files restored successfully! You can now open the game.' }),
                    [{ text: t('common.ok'), onPress: onRestoreComplete }]
                );
            } else {
                Alert.alert(
                    t('common.error'),
                    t('game_restore.restore_failed', { defaultValue: 'Failed to restore files. Please try again.' })
                );
            }
        } catch (error: any) {
            console.error('[GameRestore] Error:', error);
            setIsRestoring(false);
            Alert.alert(t('common.error'), error.message || 'Unknown error occurred');
        }
    };

    // Render Steps
    const renderStep1_Install = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>1️⃣ {t('game_restore.install_first', { defaultValue: 'Install Game First' })}</Text>
            <Text style={styles.stepDesc}>
                {t('game_restore.install_desc', { defaultValue: 'Ensure the game is installed from Play Store or the APK you just received.' })}
            </Text>
            <View style={styles.statusRow}>
                <Text style={styles.statusText}>Status: </Text>
                {/* We can integrate an "IsInstalled" check here later */}
                <Text style={{ color: '#F1C40F' }}>Checked Manually</Text>
            </View>
            <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(2)}>
                <Text style={styles.btnText}>{t('common.next', { defaultValue: 'Next' })}</Text>
            </TouchableOpacity>
        </View>
    );

    const renderStep2_Open = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>2️⃣ {t('game_restore.open_game', { defaultValue: 'Open Game Once' })}</Text>
            <Text style={styles.stepDesc}>
                {t('game_restore.open_desc', { defaultValue: 'Open the game and wait 5-10 seconds until it reaches the loading screen, then close it. This creates the necessary folders.' })}
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => {
                // Try to open the app
                const link = `android-app://${gamePackageName}`;
                Linking.canOpenURL(link).then(supported => {
                    if (supported) Linking.openURL(link);
                    else Alert.alert('Info', 'Could not open automatically. Please open manually from home screen.');
                }).catch(() => { });
            }}>
                <Text style={styles.btnText}>{t('game_restore.open_app', { defaultValue: 'Open Game Now' })}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(3)}>
                <Text style={styles.btnText}>{t('common.confirmed_next', { defaultValue: 'I did it, Next' })}</Text>
            </TouchableOpacity>
        </View>
    );

    const renderStep3_Permissions = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>3️⃣ {t('game_restore.grant_access', { defaultValue: 'Grant Access' })}</Text>
            <Text style={styles.stepDesc}>
                {t('game_restore.grant_desc', { defaultValue: 'We need permission to write the game files to the specific secure folder.' })}
            </Text>

            <View style={styles.permRow}>
                <Text style={styles.permLabel}>OBB Folder (Main Data)</Text>
                <TouchableOpacity
                    style={[styles.permBtn, permissions.obb ? styles.permGranted : styles.permMissing]}
                    onPress={() => handleRequestPermission('obb')}
                    disabled={permissions.obb}
                >
                    <Text style={styles.btnText}>{permissions.obb ? '✅ Granted' : 'Grant OBB'}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.permRow}>
                <Text style={styles.permLabel}>Data Folder (Updates)</Text>
                <TouchableOpacity
                    style={[styles.permBtn, permissions.data ? styles.permGranted : styles.permMissing]}
                    onPress={() => handleRequestPermission('data')}
                    disabled={permissions.data}
                >
                    <Text style={styles.btnText}>{permissions.data ? '✅ Granted' : 'Grant Data'}</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={[styles.restoreBtn, (!permissions.data && !permissions.obb) && styles.disabledBtn]}
                onPress={handleRestore}
                disabled={(!permissions.data && !permissions.obb) || isRestoring}
            >
                {isRestoring ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <Text style={styles.restoreBtnText}>{t('game_restore.start', { defaultValue: 'Start Restore' })}</Text>
                )}
            </TouchableOpacity>

            {isRestoring && (
                <View style={styles.progressContainer}>
                    <Text style={styles.progressText}>Extracted: {restoreProgress.count} files</Text>
                    <Text style={styles.progressSub}>{restoreProgress.current}</Text>
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{game.name} Restore</Text>
                <TouchableOpacity onPress={onClose}><Text style={styles.closeText}>✕</Text></TouchableOpacity>
            </View>

            {step === 1 && renderStep1_Install()}
            {step === 2 && renderStep2_Open()}
            {step === 3 && renderStep3_Permissions()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1A1A2E',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        maxWidth: 400,
        borderWidth: 1,
        borderColor: '#333'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold'
    },
    closeText: {
        color: '#888',
        fontSize: 20
    },
    stepContainer: {
        gap: 15
    },
    stepTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold'
    },
    stepDesc: {
        color: '#CCC',
        fontSize: 14,
        lineHeight: 20
    },
    statusRow: {
        flexDirection: 'row',
        marginBottom: 10
    },
    statusText: {
        color: '#888'
    },
    nextBtn: {
        backgroundColor: '#3498DB',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center'
    },
    primaryBtn: {
        backgroundColor: '#2ECC71',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10
    },
    btnText: {
        color: '#FFF',
        fontWeight: '600'
    },
    permRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#252540',
        padding: 12,
        borderRadius: 8
    },
    permLabel: {
        color: '#FFF'
    },
    permBtn: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 6
    },
    permGranted: {
        backgroundColor: '#27AE60'
    },
    permMissing: {
        backgroundColor: '#E67E22'
    },
    restoreBtn: {
        backgroundColor: '#9B59B6',
        padding: 16,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10
    },
    disabledBtn: {
        backgroundColor: '#555',
        opacity: 0.7
    },
    restoreBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold'
    },
    progressContainer: {
        marginTop: 15,
        alignItems: 'center'
    },
    progressText: {
        color: '#FFF',
        fontSize: 14
    },
    progressSub: {
        color: '#888',
        fontSize: 12
    }
});

export default GameRestoreHelp;

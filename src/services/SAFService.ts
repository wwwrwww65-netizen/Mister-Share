/**
 * SAF Service - Storage Access Framework for Game Data Transfer
 * 
 * 2024 Android Best Practice for Android 11+ (API 30+):
 * - Uses SAF to access Android/data and Android/obb folders
 * - Supports SPECIFIC game folder access (Android 13+ requirement)
 * - Google Play compliant - no dangerous permissions needed
 * 
 * Usage:
 * 1. Request permission: SAFService.requestGameFolderAccess('com.tencent.ig', 'obb')
 * 2. User selects folder in system picker
 * 3. Write files: SAFService.writeFile(uri, 'file.obb', '/path/to/source')
 * 4. Extract ZIP: SAFService.extractZip(uri, '/path/to/game.zip', true)
 */

import { NativeModules, DeviceEventEmitter, EmitterSubscription, Platform, PermissionsAndroid } from 'react-native';
import * as RNFS from '@dr.pogodin/react-native-fs';

const { SAFModule } = NativeModules;

export interface SAFPermission {
    uri: string;
    read: boolean;
    write: boolean;
}

export interface SAFRequestResult {
    uri: string;
    packageName: string;
    folderType: 'data' | 'obb';
    isCorrectFolder: boolean;
}

export interface SAFFileInfo {
    name: string;
    uri: string;
    isDirectory: boolean;
    size: number;
    lastModified: number;
}

export interface SAFWriteResult {
    uri: string;
    name: string;
    size: number;
}

export interface SAFExtractResult {
    extractedFiles: number;
    totalBytes: number;
    success: boolean;
}

export interface ExtractProgressEvent {
    extractedFiles: number;
    totalBytes: number;
    currentFile: string;
}

export interface ZipProgressEvent {
    filesZipped: number;
    processedBytes?: number;
    totalBytes: number;
}

class SAFServiceClass {
    private extractProgressListeners: ((event: ExtractProgressEvent) => void)[] = [];
    private zipProgressListeners: ((event: ZipProgressEvent) => void)[] = [];
    private extractSubscription: EmitterSubscription | null = null;
    private zipSubscription: EmitterSubscription | null = null;

    constructor() {
        this.initEventListener();
    }

    private initEventListener() {
        if (!SAFModule) return;

        this.extractSubscription = DeviceEventEmitter.addListener(
            'onExtractProgress',
            (event: ExtractProgressEvent) => {
                this.extractProgressListeners.forEach(cb => cb(event));
            }
        );

        this.zipSubscription = DeviceEventEmitter.addListener(
            'onZipProgress',
            (event: ZipProgressEvent) => {
                this.zipProgressListeners.forEach(cb => cb(event));
            }
        );
    }

    // ==================== All Files Access (Android 11+) ====================

    /**
     * Check if All Files Access (MANAGE_EXTERNAL_STORAGE) is granted
     * Required on Android 11+ to access Android/data and Android/obb
     */
    async hasAllFilesAccess(): Promise<boolean> {
        if (Platform.OS !== 'android') return true;
        if (!SAFModule) return false;

        try {
            return await SAFModule.hasAllFilesAccess();
        } catch (error: any) {
            console.error('[SAFService] hasAllFilesAccess error:', error.message);
            return false;
        }
    }

    /**
     * Request All Files Access permission
     * Opens system settings where user must manually enable permission
     * @returns boolean - true if permission granted after returning from settings
     */
    async requestAllFilesAccess(): Promise<boolean> {
        if (Platform.OS !== 'android') return true;
        if (!SAFModule) return false;

        try {
            console.log('[SAFService] Requesting All Files Access...');
            const granted = await SAFModule.requestAllFilesAccess();
            console.log('[SAFService] All Files Access result:', granted);
            return granted;
        } catch (error: any) {
            console.error('[SAFService] requestAllFilesAccess error:', error.message);
            return false;
        }
    }

    // ==================== Permission Management ====================

    /**
     * Check if we already have permission for a game folder
     * @param packageName - Game package name (e.g., 'com.tencent.ig')
     * @param folderType - 'data' or 'obb'
     * 
     * SIMPLIFIED: On Android 10 and below, just check if folder exists
     */
    async hasPermission(packageName: string, folderType: 'data' | 'obb'): Promise<boolean> {
        const RNFS = require('@dr.pogodin/react-native-fs');
        const { Platform } = require('react-native');

        // Legacy Mode: Just check if folder exists (READ_EXTERNAL_STORAGE is enough)
        if (Platform.Version < 30) {
            const folderPath = `${RNFS.ExternalStorageDirectoryPath}/Android/${folderType}/${packageName}`;
            try {
                const exists = await RNFS.exists(folderPath);
                console.log(`[SAFService.hasPermission] LEGACY: ${folderPath} exists=${exists}`);
                return exists;
            } catch (e: any) {
                console.error(`[SAFService.hasPermission] LEGACY error:`, e.message);
                return false;
            }
        }

        // Modern Mode: Use SAF
        if (!SAFModule) {
            console.warn('[SAFService] Not available on this platform');
            return false;
        }

        try {
            return await SAFModule.hasPermission(packageName, folderType);
        } catch (error: any) {
            console.error('[SAFService] Permission check failed:', error.message);
            return false;
        }
    }

    /**
     * Get stored URI for a game folder (if permission was granted before)
     */
    async getStoredUri(packageName: string, folderType: 'data' | 'obb'): Promise<string | null> {
        if (!SAFModule) return null;

        try {
            return await SAFModule.getStoredUri(packageName, folderType);
        } catch (error: any) {
            console.error('[SAFService] Get URI failed:', error.message);
            return null;
        }
    }

    /**
     * Get all persisted URI permissions
     */
    async getAllPermissions(): Promise<SAFPermission[]> {
        if (!SAFModule) return [];

        try {
            return await SAFModule.getAllPermissions();
        } catch (error: any) {
            console.error('[SAFService] Get permissions failed:', error.message);
            return [];
        }
    }

    /**
     * Release a specific URI permission
     */
    async releasePermission(uri: string): Promise<boolean> {
        if (!SAFModule) return false;

        try {
            return await SAFModule.releasePermission(uri);
        } catch (error: any) {
            console.error('[SAFService] Release permission failed:', error.message);
            return false;
        }
    }

    // ==================== Request Access ====================

    /**
     * Request access to a specific game's data or obb folder
     * 
     * IMPORTANT FOR ANDROID 13+:
     * - User MUST select the SPECIFIC game folder (e.g., com.tencent.ig)
     * - Cannot select parent Android/data or Android/obb folder
     * - Game must be installed and launched once before folder exists!
     * 
     * @param packageName - Game package name (e.g., 'com.tencent.ig' for PUBG)
     * @param folderType - 'data' or 'obb'
     */
    async requestGameFolderAccess(
        packageName: string,
        folderType: 'data' | 'obb'
    ): Promise<SAFRequestResult | null> {
        if (!SAFModule) {
            console.warn('[SAFService] Not available on this platform');
            return null;
        }

        try {
            console.log(`[SAFService] Requesting ${folderType} access for: ${packageName}`);
            const result = await SAFModule.requestGameFolderAccess(packageName, folderType);
            console.log('[SAFService] Access granted:', result);
            return result;
        } catch (error: any) {
            if (error.code === 'CANCELLED') {
                console.log('[SAFService] User cancelled folder selection');
            } else {
                console.error('[SAFService] Request failed:', error.message);
            }
            return null;
        }
    }

    /**
     * Request access to both data AND obb folders for a game
     * Returns URIs for both folders
     */
    async requestFullGameAccess(packageName: string): Promise<{
        dataUri: string | null;
        obbUri: string | null;
    }> {
        let dataUri: string | null = null;
        let obbUri: string | null = null;

        // Request DATA folder first
        const dataResult = await this.requestGameFolderAccess(packageName, 'data');
        if (dataResult) {
            dataUri = dataResult.uri;
        }

        // Then request OBB folder
        const obbResult = await this.requestGameFolderAccess(packageName, 'obb');
        if (obbResult) {
            obbUri = obbResult.uri;
        }

        return { dataUri, obbUri };
    }

    // ==================== File Operations ====================

    /**
     * Write a file to SAF-managed directory
     * @param directoryUri - URI obtained from requestGameFolderAccess
     * @param fileName - Name of file to create
     * @param sourceFilePath - Path to source file on device
     */
    async writeFile(
        directoryUri: string,
        fileName: string,
        sourceFilePath: string
    ): Promise<SAFWriteResult | null> {
        if (!SAFModule) return null;

        try {
            console.log(`[SAFService] Writing file: ${fileName}`);
            return await SAFModule.writeFile(directoryUri, fileName, sourceFilePath);
        } catch (error: any) {
            console.error('[SAFService] Write failed:', error.message);
            return null;
        }
    }

    /**
     * Extract ZIP file to SAF-managed game folder
     * 
     * @param directoryUri - URI for the game folder (data or obb)
     * @param zipFilePath - Path to ZIP file on device
     * @param flattenRoot - If true, skips first folder level in ZIP
     *                     (Use when ZIP contains com.package/files... structure)
     * 
     * IMPORTANT: Set flattenRoot=true to avoid double-nesting!
     * Example: If ZIP contains "com.tencent.ig/main.obb" and user selected
     * "Android/obb/com.tencent.ig", set flattenRoot=true to extract
     * just "main.obb" directly into the folder.
     */
    async extractZip(
        directoryUri: string,
        zipFilePath: string,
        flattenRoot: boolean = false
    ): Promise<SAFExtractResult | null> {
        if (!SAFModule) return null;

        try {
            console.log(`[SAFService] Extracting ZIP: ${zipFilePath} (flatten: ${flattenRoot})`);
            return await SAFModule.extractZipToDirectory(directoryUri, zipFilePath, flattenRoot);
        } catch (error: any) {
            console.error('[SAFService] Extract failed:', error.message);
            return null;
        }
    }

    /**
     * Create ZIP from a directory (for packaging DATA folder before transfer)
     * 
     * @param directoryUri - Source directory (SAF URI or file path)
     * @param outputZipPath - Where to save the ZIP file
     * @returns Object with zipPath, filesZipped, totalBytes
     */
    async createZipFromDirectory(
        directoryUri: string,
        outputZipPath: string
    ): Promise<{ zipPath: string; filesZipped: number; totalBytes: number } | null> {
        if (!SAFModule) return null;

        try {
            console.log(`[SAFService] Creating ZIP from: ${directoryUri}`);
            return await SAFModule.createZipFromDirectory(directoryUri, outputZipPath);
        } catch (error: any) {
            console.error('[SAFService] Create ZIP failed:', error.message);
            return null;
        }
    }

    /**
     * List files in SAF-managed directory
     */
    async listFiles(directoryUri: string): Promise<SAFFileInfo[]> {
        if (!SAFModule) return [];

        try {
            return await SAFModule.listFiles(directoryUri);
        } catch (error: any) {
            console.error('[SAFService] List files failed:', error.message);
            return [];
        }
    }

    /**
     * Delete file or directory in SAF-managed location
     */
    async deleteFile(fileUri: string): Promise<boolean> {
        if (!SAFModule) return false;

        try {
            return await SAFModule.deleteFile(fileUri);
        } catch (error: any) {
            console.error('[SAFService] Delete failed:', error.message);
            return false;
        }
    }

    // ==================== Event Listeners ====================

    /**
     * Listen for ZIP extraction progress
     */
    onExtractProgress(callback: (event: ExtractProgressEvent) => void): () => void {
        this.extractProgressListeners.push(callback);
        return () => {
            const index = this.extractProgressListeners.indexOf(callback);
            if (index > -1) this.extractProgressListeners.splice(index, 1);
        };
    }

    onZipProgress(callback: (event: ZipProgressEvent) => void): () => void {
        this.zipProgressListeners.push(callback);
        return () => {
            const index = this.zipProgressListeners.indexOf(callback);
            if (index > -1) this.zipProgressListeners.splice(index, 1);
        };
    }

    // ==================== Helpers ====================

    /**
     * Get common game package names
     */
    getPopularGames(): { name: string; packageName: string }[] {
        return [
            { name: 'PUBG Mobile', packageName: 'com.tencent.ig' },
            { name: 'PUBG Mobile Lite', packageName: 'com.tencent.iglite' },
            { name: 'Free Fire', packageName: 'com.dts.freefireth' },
            { name: 'Free Fire MAX', packageName: 'com.dts.freefiremax' },
            { name: 'Call of Duty Mobile', packageName: 'com.activision.callofduty.shooter' },
            { name: 'Genshin Impact', packageName: 'com.miHoYo.GenshinImpact' },
            { name: 'Mobile Legends', packageName: 'com.mobile.legends' },
            { name: 'Clash of Clans', packageName: 'com.supercell.clashofclans' },
            { name: 'Clash Royale', packageName: 'com.supercell.clashroyale' },
            { name: 'Minecraft', packageName: 'com.mojang.minecraftpe' },
        ];
    }

    /**
     * Check if game folder might exist (game was installed and launched)
     * Note: This is just a hint - actual folder check happens via SAF
     */
    getGameFolderHint(packageName: string, folderType: 'data' | 'obb'): string {
        const baseFolder = folderType === 'obb' ? 'Android/obb' : 'Android/data';
        return `${baseFolder}/${packageName}`;
    }

    /**
     * Helper: Find ALL game files (OBB + DATA) for a game
     * 
     * SIMPLIFIED APPROACH:
     * - Android 10 and below: Use RNFS directly (READ_EXTERNAL_STORAGE is enough)
     * - Android 11+: Use SAF Module
     */
    async findGameFiles(packageName: string): Promise<Array<{ name: string, uri: string, size: number, type: 'obb' | 'data' }>> {
        const allFiles: Array<{ name: string, uri: string, size: number, type: 'obb' | 'data' }> = [];
        const RNFS = require('@dr.pogodin/react-native-fs');
        const { Platform } = require('react-native');

        console.log(`[SAFService.findGameFiles] ═══════════════════════════════════════`);
        console.log(`[SAFService.findGameFiles] Starting search for: ${packageName}`);
        console.log(`[SAFService.findGameFiles] Android Version: ${Platform.Version}`);

        // ════════════════════════════════════════════════════════════════
        // LEGACY MODE (Android 10 and below) - Direct RNFS access
        // This is SIMPLE and RELIABLE if READ_EXTERNAL_STORAGE is granted
        // ════════════════════════════════════════════════════════════════
        if (Platform.Version < 30) {
            console.log(`[SAFService.findGameFiles] Using LEGACY MODE (Direct RNFS)`);
            console.log(`[SAFService.findGameFiles] RNFS.ExternalStorageDirectoryPath = ${RNFS.ExternalStorageDirectoryPath}`);

            // Import PermissionsAndroid for explicit check
            const { PermissionsAndroid } = require('react-native');

            // Step 1: Verify READ_EXTERNAL_STORAGE permission
            try {
                const hasReadPerm = await PermissionsAndroid.check(
                    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
                );
                console.log(`[SAFService.findGameFiles] READ_EXTERNAL_STORAGE granted: ${hasReadPerm}`);

                if (!hasReadPerm) {
                    console.log(`[SAFService.findGameFiles] Requesting permission...`);
                    const result = await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
                    );
                    console.log(`[SAFService.findGameFiles] Permission request result: ${result}`);
                    if (result !== PermissionsAndroid.RESULTS.GRANTED) {
                        console.log(`[SAFService.findGameFiles] ❌ Permission DENIED - cannot access files`);
                        return allFiles;
                    }
                }
            } catch (permError: any) {
                console.error(`[SAFService.findGameFiles] Permission error:`, permError.message);
            }

            // Step 2: Try MULTIPLE possible base paths for maximum compatibility
            const possibleBasePaths = [
                '/storage/emulated/0',
                '/sdcard',
                RNFS.ExternalStorageDirectoryPath,
            ].filter((p, i, arr) => p && arr.indexOf(p) === i); // Remove duplicates and nulls

            console.log(`[SAFService.findGameFiles] Base paths to try:`, possibleBasePaths);

            // ==== FIND OBB FILES ====
            let obbFound = false;
            for (const basePath of possibleBasePaths) {
                if (obbFound) break;

                const obbPath = `${basePath}/Android/obb/${packageName}`;
                console.log(`[SAFService.findGameFiles] [OBB] Trying: ${obbPath}`);

                try {
                    const exists = await RNFS.exists(obbPath);
                    console.log(`[SAFService.findGameFiles] [OBB]   exists: ${exists}`);

                    if (exists) {
                        const contents = await RNFS.readDir(obbPath);
                        const files = contents.filter((f: any) => f.isFile());
                        console.log(`[SAFService.findGameFiles] [OBB]   files: ${files.length}`);

                        for (const file of files) {
                            console.log(`[SAFService.findGameFiles] [OBB]   ✓ ${file.name} (${file.size} bytes)`);
                            allFiles.push({
                                name: file.name,
                                uri: file.path,
                                size: file.size,
                                type: 'obb'
                            });
                            obbFound = true;
                        }
                    }
                } catch (err: any) {
                    console.log(`[SAFService.findGameFiles] [OBB]   error: ${err.message}`);
                }
            }

            // ==== FIND DATA FOLDER AND CREATE ZIP ====
            let dataFound = false;
            for (const basePath of possibleBasePaths) {
                if (dataFound) break;

                const dataPath = `${basePath}/Android/data/${packageName}`;
                console.log(`[SAFService.findGameFiles] [DATA] Trying: ${dataPath}`);

                try {
                    const exists = await RNFS.exists(dataPath);
                    console.log(`[SAFService.findGameFiles] [DATA]   exists: ${exists}`);

                    if (exists) {
                        const contents = await RNFS.readDir(dataPath);
                        console.log(`[SAFService.findGameFiles] [DATA]   items: ${contents.length}`);

                        if (contents.length > 0) {
                            allFiles.push({
                                name: `${packageName}_data`,
                                uri: dataPath,
                                size: 0,
                                type: 'data'
                            });
                            dataFound = true;
                        }
                    }
                } catch (err: any) {
                    console.log(`[SAFService.findGameFiles] [DATA]   error: ${err.message}`);
                }
            }

            console.log(`[SAFService.findGameFiles] LEGACY RESULT: ${allFiles.length} files`);
            console.log(`[SAFService.findGameFiles] ═══════════════════════════════════════`);
            return allFiles;
        }

        // ════════════════════════════════════════════════════════════════
        // MODERN MODE (Android 11+) - Use SAF Module
        // ════════════════════════════════════════════════════════════════
        // NOTE: Even with MANAGE_EXTERNAL_STORAGE (All Files Access),
        // Android 13/14 restrictions often block direct File access (RNFS)
        // to Android/data and Android/obb.
        // Therefore, we MUST use SAF (DocumentFile/ContentResolver) on A11+.
        // ════════════════════════════════════════════════════════════════
        console.log(`[SAFService.findGameFiles] Using MODERN MODE (SAF) - Enforcing SAF for reliability`);

        try {
            // === Search OBB folder ===
            const hasObbPerm = await this.hasPermission(packageName, 'obb');
            console.log(`[SAFService.findGameFiles] OBB permission: ${hasObbPerm}`);

            if (hasObbPerm) {
                const obbUri = await this.getStoredUri(packageName, 'obb');
                console.log(`[SAFService.findGameFiles] OBB URI: ${obbUri}`);

                if (obbUri) {
                    try {
                        const obbFiles = await this.listFiles(obbUri);
                        console.log(`[SAFService.findGameFiles] OBB files found: ${obbFiles.length}`);

                        obbFiles
                            .filter(f => !f.isDirectory)
                            .forEach(f => {
                                console.log(`[SAFService.findGameFiles] + OBB: ${f.name} (${f.size} bytes)`);
                                allFiles.push({
                                    name: f.name,
                                    uri: f.uri,
                                    size: f.size,
                                    type: 'obb'
                                });
                            });
                    } catch (listError: any) {
                        console.error(`[SAFService.findGameFiles] OBB list error:`, listError.message);
                    }
                }
            }

            // === Search DATA folder ===
            const hasDataPerm = await this.hasPermission(packageName, 'data');
            console.log(`[SAFService.findGameFiles] DATA permission: ${hasDataPerm}`);

            if (hasDataPerm) {
                const dataUri = await this.getStoredUri(packageName, 'data');
                console.log(`[SAFService.findGameFiles] DATA URI: ${dataUri}`);

                if (dataUri) {
                    try {
                        const children = await this.listFiles(dataUri);
                        if (children.length > 0) {
                            allFiles.push({
                                name: `${packageName}_data`,
                                uri: dataUri,
                                size: 0,
                                type: 'data'
                            });
                            console.log(`[SAFService.findGameFiles] + DATA folder: ${children.length} items`);
                        }
                    } catch (zipError: any) {
                        console.error(`[SAFService.findGameFiles] DATA folder check error:`, zipError.message);
                    }
                }
            }

            console.log(`[SAFService.findGameFiles] Total files: ${allFiles.length}`);
            console.log(`[SAFService.findGameFiles] ═══════════════════════════════════════`);
            return allFiles;

        } catch (error) {
            console.error('[SAFService.findGameFiles] Critical error:', error);
            return allFiles;
        }
    }

    /**
     * Cleanup
     */
    cleanup() {
        this.extractSubscription?.remove();
        this.zipSubscription?.remove();
        this.extractProgressListeners = [];
        this.zipProgressListeners = [];
    }

    async openSystemAppSettings(packageName: string): Promise<boolean> {
        if (Platform.OS !== 'android') return false;
        if (!SAFModule) return false;
        try {
            return await SAFModule.openSystemAppInfo(packageName);
        } catch (error) {
            console.error('[SAFService] openSystemAppSettings error:', error);
            return false;
        }
    }
}

export const SAFService = new SAFServiceClass();
export default new SAFServiceClass();

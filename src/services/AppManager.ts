import { Platform } from 'react-native';
import * as RNFS from '@dr.pogodin/react-native-fs';
import ReactNativeBlobUtil from 'react-native-blob-util';
import ScopedStorageService from './ScopedStorage';
import Filesystem from './FileSystem';
// import { SimpleIconCache } from './SimpleIconCache';
import { InstalledApps } from 'react-native-launcher-kit';

// Interface for an App Item
export interface AppItem {
    name: string;
    packageName: string;
    icon: string; // Base64 or URI
    apkPath: string;
    size: number;
    isGame: boolean;
    hasObb: boolean;
    hasData: boolean;
    obbPath?: string | null;
    dataPath?: string | null;
    totalSize?: number; // APK + OBB + Data
}

// Known game package patterns
const GAME_PATTERNS = [
    'com.playrix',
    'com.supercell',
    'com.king',
    'com.rovio',
    'com.mojang',
    'com.miHoYo',
    'com.gameloft',
    'com.ea',
    'com.activision',
    'com.tencent.ig',
    'com.pubg',
    'com.garena',
    'com.epicgames'
];

class AppManager {

    // Cache for instant subsequent loads
    private cachedApps: AppItem[] | null = null;
    private cacheTimestamp: number = 0;
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    async getAllApps(limit: number = -1, offset: number = 0): Promise<AppItem[]> {
        const fetchStartTime = Date.now();
        console.log('[AppManager] ⏱️ getAllApps() START, limit:', limit, 'offset:', offset);

        if (Platform.OS !== 'android') {
            return [];
        }

        try {
            // The following lines using `useFileStore` are React Hooks and cannot be called inside a class method.
            // They are commented out to maintain syntactical correctness of the file.
            // // Subscribe to apps and selectedItems to ensure re-renders
            // const apps = useFileStore(state => state.apps);
            // const selectedItems = useFileStore(state => state.selectedItems);
            // Check cache first for instant response
            const now = Date.now();
            if (this.cachedApps && (now - this.cacheTimestamp) < this.CACHE_TTL) {
                console.log('[AppManager] ⏱️ Returning from CACHE in', (Date.now() - fetchStartTime) + 'ms');
                let result = this.cachedApps;
                if (offset > 0) result = result.slice(offset);
                if (limit > 0) result = result.slice(0, limit);
                return result;
            }

            // Get non-system apps using LauncherKit
            console.log('[AppManager] ⏱️ Fetching fresh from LauncherKit...');
            const apps = await InstalledApps.getApps();
            console.log('[AppManager] ⏱️ LauncherKit returned', apps.length, 'apps in', (Date.now() - fetchStartTime) + 'ms');

            // Parse all apps and cache them
            const parsedApps: AppItem[] = [];
            for (const item of apps) {
                const app = item as any;
                // Try every possible field for path
                const apkPath = app.sourceDir || app.apkDir || app.publicSourceDir || "";
                // Try every possible field for name
                const label = app.appName || app.label || app.name || "Unknown";
                // Try every possible field for icon
                const rawIcon = app.icon || app.appIcon;
                const packageName = app.packageName;

                // Determine if this is a game
                const isGame = this.detectIfGame(packageName, label);

                // Size: Strongest method (Native PackageManager)
                let size = 0;
                if (app.size && Number(app.size) > 0) {
                    size = Number(app.size);
                } else {
                    // Fallback to Native Method
                    try {
                        const nativeSize = await Filesystem.getAppSize(packageName);
                        console.log(`[AppManager] Native size for ${packageName}: ${nativeSize}`);
                        size = nativeSize;
                    } catch (e) {
                        console.warn(`[AppManager] Native size failed for ${packageName}`, e);
                    }
                }

                // If still 0, try RNFS as last resort (though native should have caught it)
                if (size === 0 && apkPath) {
                    try {
                        const stat = await RNFS.stat(apkPath);
                        size = Number(stat.size);
                    } catch (e) { }
                }

                // Icon logic - handle both base64 and file URIs
                let icon = "";
                if (rawIcon) {
                    if (rawIcon.startsWith('data:') || rawIcon.startsWith('file://') || rawIcon.startsWith('content://')) {
                        icon = rawIcon;
                    } else {
                        icon = `data:image/png;base64,${rawIcon}`;
                    }
                }

                parsedApps.push({
                    name: label,
                    packageName: packageName,
                    icon: icon,
                    apkPath: apkPath,
                    size: size,
                    isGame: isGame,
                    hasObb: false,
                    hasData: false,
                    obbPath: null,
                    dataPath: null,
                    totalSize: size
                });
            }

            // Update cache (OUTSIDE the loop)
            this.cachedApps = parsedApps;
            this.cacheTimestamp = Date.now();
            console.log('[AppManager] ⏱️ Cache updated with', parsedApps.length, 'apps');

            // Apply pagination for return
            let result = parsedApps;
            if (offset > 0) result = result.slice(offset);
            if (limit > 0) result = result.slice(0, limit);

            console.log('[AppManager] ⏱️ Returning', result.length, 'apps');
            return result;

        } catch (e) {
            console.error("[AppManager] Fatal error getting apps:", e);
            return [];
        }
    }

    /**
     * Detect if an app is a game based on package name patterns
     */
    private detectIfGame(packageName: string, name: string): boolean {
        // Check against known game publishers
        for (const pattern of GAME_PATTERNS) {
            if (packageName.includes(pattern)) {
                return true;
            }
        }

        // Check for game-related keywords in name
        const gameKeywords = ['game', 'play', 'racing', 'adventure', 'action', 'puzzle', 'rpg', 'strategy'];
        const lowerName = name.toLowerCase();
        for (const keyword of gameKeywords) {
            if (lowerName.includes(keyword)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check for OBB and Data files for a specific package
     */
    private async checkForGameData(packageName: string): Promise<{
        hasObb: boolean;
        hasData: boolean;
        obbPath: string | null;
        dataPath: string | null;
        totalSize: number;
    }> {
        let hasObb = false;
        let hasData = false;
        let obbPath: string | null = null;
        let dataPath: string | null = null;
        let totalSize = 0;

        try {
            // Check OBB directory
            const obbDir = `/storage/emulated/0/Android/obb/${packageName}`;
            try {
                const obbExists = await ReactNativeBlobUtil.fs.exists(obbDir);
                if (obbExists) {
                    const obbFiles = await ReactNativeBlobUtil.fs.ls(obbDir);
                    if (obbFiles.length > 0) {
                        hasObb = true;
                        obbPath = obbDir;

                        // Calculate total OBB size
                        for (const file of obbFiles) {
                            const filePath = `${obbDir}/${file}`;
                            try {
                                const stat = await ReactNativeBlobUtil.fs.stat(filePath);
                                totalSize += parseInt(stat.size.toString());
                            } catch (e) {
                                // ignore
                            }
                        }
                    }
                }
            } catch (e) {
                // OBB directory doesn't exist or no permission
            }

            // Check Data directory
            const dataDir = `/storage/emulated/0/Android/data/${packageName}`;
            try {
                const dataExists = await ReactNativeBlobUtil.fs.exists(dataDir);
                if (dataExists) {
                    hasData = true;
                    dataPath = dataDir;

                    // Calculate total data size (this might take time for large directories)
                    // We'll do a quick check on main files
                    const dataFiles = await ReactNativeBlobUtil.fs.ls(dataDir);
                    if (dataFiles.length > 0) {
                        // Just add a rough estimate for performance
                        // Full calculation would require recursive directory scanning
                        totalSize += 10 * 1024 * 1024; // Estimate 10MB for data
                    }
                }
            } catch (e) {
                // Data directory doesn't exist or no permission
            }

        } catch (error) {
            console.error(`[AppManager] Error checking game data for ${packageName}:`, error);
        }

        return {
            hasObb,
            hasData,
            obbPath,
            dataPath,
            totalSize
        };
    }

    /**
     * Extract APK and optionally OBB/Data to destination
     */
    async extractApp(app: AppItem, destination: string): Promise<string[]> {
        const extractedPaths: string[] = [];

        try {
            // 1. Copy APK
            const apkDest = `${destination}/${app.name}.apk`;
            await ReactNativeBlobUtil.fs.cp(app.apkPath, apkDest);
            extractedPaths.push(apkDest);
            console.log(`[AppManager] Extracted APK: ${apkDest}`);

            // 2. Copy OBB if exists
            if (app.hasObb && app.obbPath) {
                const obbFiles = await ReactNativeBlobUtil.fs.ls(app.obbPath);
                for (const file of obbFiles) {
                    const srcPath = `${app.obbPath}/${file}`;
                    const destPath = `${destination}/${file}`;
                    await ReactNativeBlobUtil.fs.cp(srcPath, destPath);
                    extractedPaths.push(destPath);
                    console.log(`[AppManager] Extracted OBB: ${destPath}`);
                }
            }

            // 3. TODO: Copy Data directory (complex - requires recursive copy)
            // For now, we skip data directory due to complexity

        } catch (error) {
            console.error(`[AppManager] Error extracting app ${app.name}:`, error);
            throw error;
        }

        return extractedPaths;
    }
}

export default new AppManager();

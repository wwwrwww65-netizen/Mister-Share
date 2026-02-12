import { Platform, PermissionsAndroid, NativeModules } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import * as RNFS from '@dr.pogodin/react-native-fs';

const { MediaStore } = NativeModules;

export interface FileItem {
    id?: number;
    name: string;
    filename: string;
    path: string;
    uri?: string;
    size: number;
    mime?: string;
    dateModified?: number;
    duration?: number;
    artist?: string;
    album?: string;
    relativePath?: string; // For folder transfers
}

/**
 * Get all photos from device
 */
export async function getAllPhotos(limit: number = -1, offset: number = 0): Promise<FileItem[]> {
    try {
        if (Platform.OS !== 'android' || !MediaStore) {
            return [];
        }
        const photos = await MediaStore.getAllPhotos(limit, offset);
        return photos || [];
    } catch (error) {
        console.error('[FileSystem] Failed to get photos:', error);
        return [];
    }
}

/**
 * Get all videos from device
 */
export async function getAllVideos(limit: number = -1, offset: number = 0): Promise<FileItem[]> {
    try {
        if (Platform.OS !== 'android' || !MediaStore) {
            return [];
        }
        const videos = await MediaStore.getAllVideos(limit, offset);
        return videos || [];
    } catch (error) {
        console.error('Failed to get videos:', error);
        return [];
    }
}

/**
 * Get all music/audio files
 */
export async function getAllMusic(limit: number = -1, offset: number = 0): Promise<FileItem[]> {
    try {
        if (Platform.OS !== 'android' || !MediaStore) {
            return [];
        }
        const music = await MediaStore.getAllMusic(limit, offset);
        return music || [];
    } catch (error) {
        console.error('Failed to get music:', error);
        return [];
    }
}

/**
 * Get all files (documents, archives, etc.)
 */
export async function getAllFiles(): Promise<FileItem[]> {
    try {
        if (Platform.OS !== 'android' || !MediaStore) {
            console.warn('MediaStore module not available');
            return [];
        }

        const files = await MediaStore.getAllFiles();
        return files || [];
    } catch (error) {
        console.error('Failed to get files:', error);
        return [];
    }
}

/**
 * Get file info
 */
export async function getFileInfo(path: string): Promise<FileItem | null> {
    try {
        const stat = await ReactNativeBlobUtil.fs.stat(path);
        return {
            name: stat.filename,
            filename: stat.filename,
            path: path,
            size: parseInt(stat.size.toString()),
            dateModified: stat.lastModified,
        };
    } catch (e) {
        console.error('Failed to get file info:', e);
        return null;
    }
}

/**
 * Check if app has All Files Access (Android 11+)
 */
export async function hasAllFilesPermission(): Promise<boolean> {
    try {
        if (Platform.OS !== 'android' || !MediaStore) return true;
        return await MediaStore.hasAllFilesPermission();
    } catch (error) {
        console.error('Failed to check all files permission:', error);
        return false;
    }
}

/**
 * Request All Files Access (Android 11+)
 */
export async function requestAllFilesPermission(): Promise<boolean> {
    try {
        if (Platform.OS !== 'android' || !MediaStore) return true;
        return await MediaStore.requestAllFilesPermission();
    } catch (error) {
        console.error('Failed to request all files permission:', error);
        return false;
    }
}

/**
 * Check if app can install unknown packages (Android 8+)
 */
export async function canInstallPackages(): Promise<boolean> {
    try {
        if (Platform.OS !== 'android' || !MediaStore) return true;
        return await MediaStore.canInstallPackages();
    } catch (error) {
        console.error('Failed to check install permission:', error);
        return false;
    }
}

/**
 * Request permission to install unknown packages (Android 8+)
 */
export async function requestInstallPackages(): Promise<boolean> {
    try {
        if (Platform.OS !== 'android' || !MediaStore) return true;
        return await MediaStore.requestInstallPackagesPermission();
    } catch (error) {
        console.error('Failed to request install permission:', error);
        return false;
    }
}

export interface DashboardCounts {
    photos: number;
    videos: number;
    music: number;
    docs: number;
    ebooks: number;
    archives: number;
    apks: number;
    bigfiles: number;
}

/**
 * Get instant dashboard counts
 */
export async function getDashboardCounts(): Promise<DashboardCounts> {
    try {
        if (Platform.OS !== 'android' || !MediaStore) {
            return { photos: 0, videos: 0, music: 0, docs: 0, ebooks: 0, archives: 0, apks: 0, bigfiles: 0 };
        }
        const counts = await MediaStore.getDashboardCounts();
        // Ensure ebooks is present if native module doesn't return it yet
        if (counts && typeof counts.ebooks === 'undefined') {
            counts.ebooks = 0;
        }
        return counts;
    } catch (error) {
        console.error('Failed to get dashboard counts:', error);
        return { photos: 0, videos: 0, music: 0, docs: 0, ebooks: 0, archives: 0, apks: 0, bigfiles: 0 };
    }
}


/**
 * Get directory listing
 */
export async function getDirectoryListing(path: string, showHidden: boolean = false): Promise<FileItem[]> {
    try {
        if (Platform.OS !== 'android' || !MediaStore) return [];
        const files = await MediaStore.getDirectoryListing(path, showHidden);
        // Sort: Folders first, then files. Alphabetical.
        return files.sort((a: any, b: any) => {
            if (a.isDirectory === b.isDirectory) {
                return a.name.localeCompare(b.name);
            }
            return a.isDirectory ? -1 : 1;
        });
    } catch (error) {
        console.error('Failed to get directory listing:', error);
        return [];
    }
}

/**
 * Get available storage volumes
 */
export async function getStorageVolumes(): Promise<any[]> {
    try {
        if (Platform.OS !== 'android' || !MediaStore) return [];
        return await MediaStore.getStorageVolumes();
    } catch (error) {
        console.error('Failed to get volumes:', error);
        return [];
    }
}

/**
 * Get Storage Statistics (Free/Total)
 */
export async function getStorageStats() {
    try {
        const info = await RNFS.getFSInfo();
        return {
            total: info.totalSpace, // Bytes
            free: info.freeSpace,   // Bytes
            used: info.totalSpace - info.freeSpace
        };
    } catch (e) {
        console.error('Failed to get storage stats', e);
        return { total: 0, free: 0, used: 0 };
    }
}

/**
 * Recursively expand a directory into a flat list of files
 * @param rootPath Absolute path of the folder being sent
 * @param currentPath Current path being scanned (starts as rootPath)
 * @param relativeBase Relative path base (e.g. "MyFolder")
 */
export async function expandDirectory(
    rootPath: string,
    currentPath: string = '',
    relativeBase: string = ''
): Promise<FileItem[]> {
    try {
        const targetPath = currentPath || rootPath;
        // If it's the first call, determine base folder name for relative paths
        // e.g. Sending /storage/0/DCIM/Camera -> base is "Camera"
        // files inside will be "Camera/IMG_01.jpg"
        if (!relativeBase) {
            relativeBase = rootPath.split('/').pop() || 'Folder';
        }

        const items = await MediaStore.getDirectoryListing(targetPath);
        let results: FileItem[] = [];

        for (const item of items) {
            // Calculate relative path for this item
            // item.path is absolute. 
            // We want relative path from parent of rootPath.
            // But simpler: just append item.name to current relativeBase path
            // If currentPath is root, relPath = relativeBase + "/" + item.name

            // Actually, we need to handle recursion carefully.
            // Let's rely on building the relative string as we go.

            // Current relative path for the folder we are IN
            // On first call (root), it is relativeBase (e.g. "Camera")

            if (item.isDirectory) {
                // Recursively scan subfolder
                // Sub-relative base: "Camera/SubFolder"
                const subResults = await expandDirectory(
                    rootPath,
                    item.path,
                    `${relativeBase}/${item.name}`
                );
                results = [...results, ...subResults];
            } else {
                // It's a file
                results.push({
                    ...item,
                    // Store the relative path identifying where it belongs
                    // e.g. "Camera/IMG_1.jpg" or "Camera/Sub/IMG_2.jpg"
                    relativePath: `${relativeBase}/${item.name}`
                } as any); // Type assertion for extended FileItem
            }
        }
        return results;
    } catch (e) {
        console.error('Failed to expand directory:', rootPath, e);
        return [];
    }
}

const FileSystem = {
    getAllPhotos,
    getAllVideos,
    getAllMusic,
    getAllFiles,
    getFileInfo,
    hasAllFilesPermission,
    requestAllFilesPermission,
    canInstallPackages,
    requestInstallPackages,
    getDirectoryListing,
    getStorageVolumes,
    getStorageStats,
    expandDirectory,
    getDashboardCounts,
    getAppMetadata: (packageName: string) => MediaStore?.getAppMetadata(packageName),
    getFileThumbnail: (path: string) => MediaStore?.getFileThumbnail(path),
    getAppSize: (packageName: string) => MediaStore?.getAppSize(packageName),
};

export default FileSystem;

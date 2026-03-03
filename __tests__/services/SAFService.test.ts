
import { SAFService, SAFFileInfo } from '../../src/services/SAFService';
import { NativeModules } from 'react-native';

// Mock NativeModules
jest.mock('react-native', () => {
    return {
        NativeModules: {
            SAFModule: {
                hasPermission: jest.fn(),
                getStoredUri: jest.fn(),
                requestGameFolderAccess: jest.fn(),
                listFiles: jest.fn(),
                writeFile: jest.fn(),
                extractZipToDirectory: jest.fn(),
                releasePermission: jest.fn(),
            },
        },
        DeviceEventEmitter: {
            addListener: jest.fn(),
        },
        Platform: {
            OS: 'android',
            Version: 30, // Default to Android 11
        },
    };
});

describe('SAFService', () => {
    const mockSAFModule = NativeModules.SAFModule;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('findGameFiles', () => {
        it('should return OBB files when permission exists', async () => {
            // Setup Mocks
            mockSAFModule.hasPermission.mockResolvedValue(true);
            mockSAFModule.getStoredUri.mockResolvedValue('content://fake/uri');

            const mockFiles = [
                { name: 'main.obb', uri: 'content://file1', isDirectory: false, size: 1000, lastModified: 0 },
                { name: 'patch.obb', uri: 'content://file2', isDirectory: false, size: 500, lastModified: 0 },
                { name: 'other.txt', uri: 'content://file3', isDirectory: false, size: 100, lastModified: 0 },
                { name: 'folder', uri: 'content://folder', isDirectory: true, size: 0, lastModified: 0 },
            ];
            mockSAFModule.listFiles.mockResolvedValue(mockFiles);

            // Execute
            const result = await SAFService.findGameFiles('com.game');

            // Verify
            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('main.obb');
            expect(result[1].name).toBe('patch.obb');

            expect(mockSAFModule.hasPermission).toHaveBeenCalledWith('com.game', 'obb');
            expect(mockSAFModule.getStoredUri).toHaveBeenCalledWith('com.game', 'obb');
            expect(mockSAFModule.listFiles).toHaveBeenCalledWith('content://fake/uri');
        });

        it('should return empty array if no permission', async () => {
            mockSAFModule.hasPermission.mockResolvedValue(false);
            const result = await SAFService.findGameFiles('com.game');
            expect(result).toEqual([]);
            expect(mockSAFModule.getStoredUri).not.toHaveBeenCalled();
        });
    });

    describe('requestGameFolderAccess', () => {
        it('should return result on success', async () => {
            const mockResult = {
                uri: 'content://new/uri',
                packageName: 'com.game',
                folderType: 'obb',
                isCorrectFolder: true
            };
            mockSAFModule.requestGameFolderAccess.mockResolvedValue(mockResult);

            const result = await SAFService.requestGameFolderAccess('com.game', 'obb');
            expect(result).toEqual(mockResult);
        });

        it('should handle cancellation gracefully', async () => {
            const error = new Error('User cancelled');
            (error as any).code = 'CANCELLED';
            mockSAFModule.requestGameFolderAccess.mockRejectedValue(error);

            const result = await SAFService.requestGameFolderAccess('com.game', 'obb');
            expect(result).toBeNull();
        });
    });

    describe('extractZip', () => {
        it('should call extractZipToDirectory with correct params', async () => {
            const mockResult = { extractedFiles: 5, totalBytes: 1000, success: true };
            mockSAFModule.extractZipToDirectory.mockResolvedValue(mockResult);

            const result = await SAFService.extractZip('uri', 'path/to/zip', true);
            expect(result).toEqual(mockResult);
            expect(mockSAFModule.extractZipToDirectory).toHaveBeenCalledWith('uri', 'path/to/zip', true);
        });
    });
});

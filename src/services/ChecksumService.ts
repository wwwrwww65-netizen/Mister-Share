/**
 * Checksum Service - File Integrity Verification
 * 
 * 2024 Best Practice:
 * Verifies file integrity after transfer using MD5 (fast) or SHA-256 (secure).
 * This ensures transferred files are not corrupted.
 * 
 * Usage:
 * - Before sending: const checksum = await ChecksumService.calculateMD5(filePath);
 * - After receiving: const result = await ChecksumService.verify(filePath, expectedChecksum);
 */

import { NativeModules } from 'react-native';

const { ChecksumModule } = NativeModules;

export interface ChecksumResult {
    checksum: string;
    algorithm: string;
    fileSize: number;
}

export interface VerifyResult {
    valid: boolean;
    expected: string;
    actual: string;
}

class ChecksumServiceClass {
    /**
     * Calculate MD5 checksum (fast, good for transfer verification)
     */
    async calculateMD5(filePath: string): Promise<string | null> {
        if (!ChecksumModule) {
            console.warn('[ChecksumService] Not available on this platform');
            return null;
        }

        try {
            return await ChecksumModule.calculateMD5(filePath);
        } catch (error: any) {
            console.error('[ChecksumService] Failed to calculate MD5:', error.message);
            return null;
        }
    }

    /**
     * Calculate SHA-256 checksum (more secure, slower)
     */
    async calculateSHA256(filePath: string): Promise<string | null> {
        if (!ChecksumModule) {
            console.warn('[ChecksumService] Not available on this platform');
            return null;
        }

        try {
            return await ChecksumModule.calculateSHA256(filePath);
        } catch (error: any) {
            console.error('[ChecksumService] Failed to calculate SHA-256:', error.message);
            return null;
        }
    }

    /**
     * Calculate checksum with full result (includes file size)
     */
    async calculate(filePath: string, algorithm: 'md5' | 'sha256' = 'md5'): Promise<ChecksumResult | null> {
        if (!ChecksumModule) {
            console.warn('[ChecksumService] Not available on this platform');
            return null;
        }

        try {
            return await ChecksumModule.calculateWithProgress(filePath, algorithm);
        } catch (error: any) {
            console.error('[ChecksumService] Failed to calculate checksum:', error.message);
            return null;
        }
    }

    /**
     * Verify file integrity against expected checksum
     */
    async verify(
        filePath: string,
        expectedChecksum: string,
        algorithm: 'md5' | 'sha256' = 'md5'
    ): Promise<VerifyResult | null> {
        if (!ChecksumModule) {
            console.warn('[ChecksumService] Not available on this platform');
            return null;
        }

        try {
            return await ChecksumModule.verifyChecksum(filePath, expectedChecksum, algorithm);
        } catch (error: any) {
            console.error('[ChecksumService] Failed to verify checksum:', error.message);
            return null;
        }
    }

    /**
     * Quick integrity check - returns true if file is valid
     */
    async isValid(
        filePath: string,
        expectedChecksum: string,
        algorithm: 'md5' | 'sha256' = 'md5'
    ): Promise<boolean> {
        const result = await this.verify(filePath, expectedChecksum, algorithm);
        return result?.valid ?? false;
    }
}

export const ChecksumService = new ChecksumServiceClass();
export default ChecksumService;

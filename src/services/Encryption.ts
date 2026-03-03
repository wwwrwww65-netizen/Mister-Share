import Aes from 'react-native-aes-crypto';
import { randomBytes } from 'react-native-randombytes';
import { Buffer } from 'buffer';

/**
 * EncryptionService
 * 
 * Provides AES-256-CBC encryption/decryption for secure file transfers.
 * Generates cryptographically secure random keys and IVs.
 */
class EncryptionService {
    /**
     * Generate a random 256-bit (32 bytes) encryption key
     * @returns Hex string of 64 characters
     */
    async generateKey(): Promise<string> {
        return new Promise((resolve, reject) => {
            randomBytes(32, (err: Error | null, bytes: Uint8Array) => {
                if (err) {
                    console.error('[Encryption] Key generation failed:', err);
                    reject(err);
                } else {
                    const key = Buffer.from(bytes).toString('hex');
                    console.log('[Encryption] Generated 256-bit key');
                    resolve(key);
                }
            });
        });
    }

    /**
     * Generate a random IV (16 bytes for AES)
     * @returns Hex string of 32 characters
     */
    async generateIV(): Promise<string> {
        return new Promise((resolve, reject) => {
            randomBytes(16, (err: Error | null, bytes: Uint8Array) => {
                if (err) {
                    console.error('[Encryption] IV generation failed:', err);
                    reject(err);
                } else {
                    const iv = Buffer.from(bytes).toString('hex');
                    console.log('[Encryption] Generated IV');
                    resolve(iv);
                }
            });
        });
    }

    /**
     * Encrypt data using AES-256-CBC
     * @param data - Plain text data to encrypt
     * @param key - 256-bit encryption key (hex string)
     * @param iv - Initialization vector (hex string)
     * @returns Base64 encoded encrypted data
     */
    async encrypt(
        data: string,
        key: string,
        iv: string
    ): Promise<string> {
        try {
            const encrypted = await Aes.encrypt(data, key, iv, 'aes-256-cbc');
            return encrypted;
        } catch (error) {
            console.error('[Encryption] Encrypt failed:', error);
            throw error;
        }
    }

    /**
     * Decrypt data using AES-256-CBC
     * @param encryptedData - Base64 encoded encrypted data
     * @param key - 256-bit encryption key (hex string)
     * @param iv - Initialization vector (hex string)
     * @returns Decrypted plain text
     */
    async decrypt(
        encryptedData: string,
        key: string,
        iv: string
    ): Promise<string> {
        try {
            const decrypted = await Aes.decrypt(encryptedData, key, iv, 'aes-256-cbc');
            return decrypted;
        } catch (error) {
            console.error('[Encryption] Decrypt failed:', error);
            throw error;
        }
    }

    /**
     * Encrypt a buffer (for file chunks during transfer)
     * @param buffer - Data buffer to encrypt
     * @param key - 256-bit encryption key (hex string)
     * @param iv - Initialization vector (hex string)
     * @returns Encrypted buffer
     */
    async encryptBuffer(
        buffer: Buffer,
        key: string,
        iv: string
    ): Promise<Buffer> {
        try {
            const base64Data = buffer.toString('base64');
            const encrypted = await this.encrypt(base64Data, key, iv);
            return Buffer.from(encrypted, 'base64');
        } catch (error) {
            console.error('[Encryption] Buffer encryption failed:', error);
            throw error;
        }
    }

    /**
     * Decrypt a buffer (for file chunks during transfer)
     * @param encryptedBuffer - Encrypted data buffer
     * @param key - 256-bit encryption key (hex string)
     * @param iv - Initialization vector (hex string)
     * @returns Decrypted buffer
     */
    async decryptBuffer(
        encryptedBuffer: Buffer,
        key: string,
        iv: string
    ): Promise<Buffer> {
        try {
            const base64Encrypted = encryptedBuffer.toString('base64');
            const decrypted = await this.decrypt(base64Encrypted, key, iv);
            return Buffer.from(decrypted, 'base64');
        } catch (error) {
            console.error('[Encryption] Buffer decryption failed:', error);
            throw error;
        }
    }

    /**
     * Encrypt text data with automatically generated key and IV
     * @param data - Plain text to encrypt
     * @returns Object containing encrypted data, key, and IV
     */
    async encryptWithNewKey(data: string): Promise<{
        encrypted: string;
        key: string;
        iv: string;
    }> {
        const key = await this.generateKey();
        const iv = await this.generateIV();
        const encrypted = await this.encrypt(data, key, iv);

        return { encrypted, key, iv };
    }

    /**
     * Test encryption/decryption with sample data
     * @returns true if test passes
     */
    async testEncryption(): Promise<boolean> {
        try {
            const testData = 'Hello, this is a test message!';
            const key = await this.generateKey();
            const iv = await this.generateIV();

            console.log('[Encryption] Running test...');

            const encrypted = await this.encrypt(testData, key, iv);
            const decrypted = await this.decrypt(encrypted, key, iv);

            const success = decrypted === testData;

            if (success) {
                console.log('[Encryption] ✅ Test passed');
            } else {
                console.error('[Encryption] ❌ Test failed');
                console.error('Expected:', testData);
                console.error('Got:', decrypted);
            }

            return success;
        } catch (error) {
            console.error('[Encryption] Test error:', error);
            return false;
        }
    }
}

export default new EncryptionService();

import { Buffer } from 'buffer';
import EncryptionService from '../../src/services/Encryption';

describe('EncryptionService', () => {
    describe('Key Generation', () => {
        it('should generate a 256-bit key (64 hex characters)', async () => {
            const key = await EncryptionService.generateKey();
            expect(key).toHaveLength(64);
            expect(key).toMatch(/^[0-9a-f]{64}$/);
        });

        it('should generate unique keys', async () => {
            const key1 = await EncryptionService.generateKey();
            const key2 = await EncryptionService.generateKey();
            expect(key1).not.toBe(key2);
        });

        it('should generate a 128-bit IV (32 hex characters)', async () => {
            const iv = await EncryptionService.generateIV();
            expect(iv).toHaveLength(32);
            expect(iv).toMatch(/^[0-9a-f]{32}$/);
        });

        it('should generate unique IVs', async () => {
            const iv1 = await EncryptionService.generateIV();
            const iv2 = await EncryptionService.generateIV();
            expect(iv1).not.toBe(iv2);
        });
    });

    describe('Encryption/Decryption', () => {
        it('should encrypt and decrypt text correctly', async () => {
            const originalText = 'Hello, this is a test message!';
            const key = await EncryptionService.generateKey();
            const iv = await EncryptionService.generateIV();

            const encrypted = await EncryptionService.encrypt(originalText, key, iv);
            expect(encrypted).not.toBe(originalText);
            expect(encrypted.length).toBeGreaterThan(0);

            const decrypted = await EncryptionService.decrypt(encrypted, key, iv);
            expect(decrypted).toBe(originalText);
        });

        it('should fail to decrypt with wrong key', async () => {
            const originalText = 'Secret message';
            const key1 = await EncryptionService.generateKey();
            const key2 = await EncryptionService.generateKey();
            const iv = await EncryptionService.generateIV();

            const encrypted = await EncryptionService.encrypt(originalText, key1, iv);

            await expect(
                EncryptionService.decrypt(encrypted, key2, iv)
            ).rejects.toThrow();
        });

        it('should fail to decrypt with wrong IV', async () => {
            const originalText = 'Secret message';
            const key = await EncryptionService.generateKey();
            const iv1 = await EncryptionService.generateIV();
            const iv2 = await EncryptionService.generateIV();

            const encrypted = await EncryptionService.encrypt(originalText, key, iv1);

            await expect(
                EncryptionService.decrypt(encrypted, key, iv2)
            ).rejects.toThrow();
        });
    });

    describe('Buffer Operations', () => {
        it('should encrypt and decrypt buffer correctly', async () => {
            const originalData = Buffer.from('This is test data for buffer encryption');
            const key = await EncryptionService.generateKey();
            const iv = await EncryptionService.generateIV();

            const encryptedBuffer = await EncryptionService.encryptBuffer(originalData, key, iv);
            expect(encryptedBuffer).toBeInstanceOf(Buffer);
            expect(encryptedBuffer).not.toEqual(originalData);

            const decryptedBuffer = await EncryptionService.decryptBuffer(encryptedBuffer, key, iv);
            expect(decryptedBuffer).toEqual(originalData);
        });
    });

    describe('Self Test', () => {
        it('should pass self-test', async () => {
            const result = await EncryptionService.testEncryption();
            expect(result).toBe(true);
        });
    });

    describe('encryptWithNewKey', () => {
        it('should encrypt data with auto-generated key and IV', async () => {
            const originalText = 'Test data';
            const result = await EncryptionService.encryptWithNewKey(originalText);

            expect(result.encrypted).toBeDefined();
            expect(result.key).toHaveLength(64);
            expect(result.iv).toHaveLength(32);

            // Verify we can decrypt with the returned key and IV
            const decrypted = await EncryptionService.decrypt(
                result.encrypted,
                result.key,
                result.iv
            );
            expect(decrypted).toBe(originalText);
        });
    });
});

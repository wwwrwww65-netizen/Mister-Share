import AuthenticationService from '../../src/services/Authentication';

describe('AuthenticationService', () => {
    beforeEach(() => {
        // Clear any existing session before each test
        AuthenticationService.clearSession();
    });

    describe('PIN Generation', () => {
        it('should generate a 6-digit PIN', () => {
            const pin = AuthenticationService.generatePIN();
            expect(pin).toHaveLength(6);
            expect(pin).toMatch(/^\d{6}$/);
        });

        it('should generate unique PINs', () => {
            const pin1 = AuthenticationService.generatePIN();
            const pin2 = AuthenticationService.generatePIN();
            // They might be the same by chance, but very unlikely
            // Test multiple times to be sure
            const pins = new Set();
            for (let i = 0; i < 100; i++) {
                pins.add(AuthenticationService.generatePIN());
            }
            expect(pins.size).toBeGreaterThan(90); // At least 90% unique
        });
    });

    describe('Session Management', () => {
        it('should create a session with all required fields', async () => {
            const session = await AuthenticationService.createSession('Test Device');

            expect(session.pin).toHaveLength(6);
            expect(session.encryptionKey).toHaveLength(64);
            expect(session.iv).toHaveLength(32);
            expect(session.deviceName).toBe('Test Device');
            expect(session.timestamp).toBeDefined();
            expect(session.expiresAt).toBeGreaterThan(session.timestamp);
        });

        it('should return current session', async () => {
            const created = await AuthenticationService.createSession('Device1');
            const current = AuthenticationService.getCurrentSession();

            expect(current).not.toBeNull();
            expect(current?.pin).toBe(created.pin);
        });

        it('should clear session', async () => {
            await AuthenticationService.createSession('Device1');
            AuthenticationService.clearSession();

            const session = AuthenticationService.getCurrentSession();
            expect(session).toBeNull();
        });
    });

    describe('PIN Verification', () => {
        it('should verify correct PIN', async () => {
            const session = await AuthenticationService.createSession('Device1');
            const isValid = await AuthenticationService.verifyPIN(session.pin);

            expect(isValid).toBe(true);
        });

        it('should reject incorrect PIN', async () => {
            await AuthenticationService.createSession('Device1');
            const isValid = await AuthenticationService.verifyPIN('000000');

            expect(isValid).toBe(false);
        });

        it('should return false when no session exists', async () => {
            const isValid = await AuthenticationService.verifyPIN('123456');
            expect(isValid).toBe(false);
        });
    });

    describe('Encryption Info', () => {
        it('should return encryption info when session is active', async () => {
            const session = await AuthenticationService.createSession('Device1');
            const encInfo = AuthenticationService.getEncryptionInfo();

            expect(encInfo).not.toBeNull();
            expect(encInfo?.key).toBe(session.encryptionKey);
            expect(encInfo?.iv).toBe(session.iv);
        });

        it('should return null when no session', () => {
            const encInfo = AuthenticationService.getEncryptionInfo();
            expect(encInfo).toBeNull();
        });
    });

    describe('Session Expiry', () => {
        it('should not be expired immediately after creation', async () => {
            await AuthenticationService.createSession('Device1');
            const isExpired = AuthenticationService.isSessionExpired();

            expect(isExpired).toBe(false);
        });

        it('should return correct time remaining', async () => {
            await AuthenticationService.createSession('Device1');
            const timeRemaining = AuthenticationService.getSessionTimeRemaining();

            expect(timeRemaining).toBeGreaterThan(0);
            expect(timeRemaining).toBeLessThanOrEqual(30 * 60); // 30 minutes max
        });

        it('should extend session', async () => {
            await AuthenticationService.createSession('Device1');
            const initialTime = AuthenticationService.getSessionTimeRemaining();

            const extended = AuthenticationService.extendSession(10);

            expect(extended).toBe(true);
            const newTime = AuthenticationService.getSessionTimeRemaining();
            expect(newTime).toBeGreaterThan(initialTime);
        });

        it('should not extend when no session', () => {
            const extended = AuthenticationService.extendSession(10);
            expect(extended).toBe(false);
        });
    });

    describe('setEncryptionInfo', () => {
        it('should set encryption info for sender', () => {
            const key = 'a'.repeat(64);
            const iv = 'b'.repeat(32);

            AuthenticationService.setEncryptionInfo(key, iv, 'Receiver Device');

            const session = AuthenticationService.getCurrentSession();
            expect(session).not.toBeNull();
            expect(session?.encryptionKey).toBe(key);
            expect(session?.iv).toBe(iv);
            expect(session?.deviceName).toBe('Receiver Device');
        });
    });
});

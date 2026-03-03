import EncryptionService from './Encryption';

/**
 * Session information for secure transfer
 */
interface SessionInfo {
    pin: string;
    encryptionKey: string;
    iv: string;
    deviceName: string;
    timestamp: number;
    expiresAt: number;
}

/**
 * AuthenticationService
 * 
 * Manages PIN-based authentication and secure session management.
 * Creates cryptographically secure sessions for device-to-device transfers.
 */
class AuthenticationService {
    private currentSession: SessionInfo | null = null;
    private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in ms

    /**
     * Generate a random 6-digit PIN
     * @returns String of 6 digits
     */
    generatePIN(): string {
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        console.log('[Auth] Generated PIN:', pin);
        return pin;
    }

    /**
     * Create a new secure session (typically called by receiver)
     * @param deviceName - Name of the device creating the session
     * @returns Session information including PIN and encryption details
     */
    async createSession(deviceName: string): Promise<SessionInfo> {
        const pin = this.generatePIN();
        const encryptionKey = await EncryptionService.generateKey();
        const iv = await EncryptionService.generateIV();
        const timestamp = Date.now();

        this.currentSession = {
            pin,
            encryptionKey,
            iv,
            deviceName,
            timestamp,
            expiresAt: timestamp + this.SESSION_TIMEOUT,
        };

        console.log('[Auth] Session created for device:', deviceName);
        console.log('[Auth] PIN:', pin);
        console.log('[Auth] Expires at:', new Date(this.currentSession.expiresAt).toLocaleTimeString());

        return this.currentSession;
    }

    /**
     * Verify PIN entered by sender
     * @param inputPIN - PIN entered by user
     * @returns true if PIN is valid and session is not expired
     */
    async verifyPIN(inputPIN: string): Promise<boolean> {
        if (!this.currentSession) {
            console.error('[Auth] No active session');
            return false;
        }

        if (this.isSessionExpired()) {
            console.error('[Auth] Session expired');
            this.clearSession();
            return false;
        }

        const isValid = inputPIN === this.currentSession.pin;

        if (isValid) {
            console.log('[Auth] ✅ PIN verified successfully');
        } else {
            console.error('[Auth] ❌ Invalid PIN attempt');
        }

        return isValid;
    }

    /**
     * Get current session encryption details
     * @returns Encryption key and IV, or null if no session
     */
    getEncryptionInfo(): { key: string; iv: string } | null {
        if (!this.currentSession) {
            console.warn('[Auth] No active session');
            return null;
        }

        if (this.isSessionExpired()) {
            console.warn('[Auth] Session expired');
            this.clearSession();
            return null;
        }

        return {
            key: this.currentSession.encryptionKey,
            iv: this.currentSession.iv,
        };
    }

    /**
     * Get current session information
     * @returns Complete session info or null
     */
    getCurrentSession(): SessionInfo | null {
        if (this.isSessionExpired()) {
            this.clearSession();
            return null;
        }
        return this.currentSession;
    }

    /**
     * Clear current session and invalidate encryption keys
     */
    clearSession(): void {
        if (this.currentSession) {
            console.log('[Auth] Clearing session for:', this.currentSession.deviceName);
        }
        this.currentSession = null;
    }

    /**
     * Check if current session is expired
     * @returns true if no session or session has expired
     */
    isSessionExpired(): boolean {
        if (!this.currentSession) {
            return true;
        }

        const now = Date.now();
        const isExpired = now >= this.currentSession.expiresAt;

        if (isExpired) {
            console.log('[Auth] Session expired');
        }

        return isExpired;
    }

    /**
     * Get remaining time for current session in seconds
     * @returns Seconds remaining, or 0 if no session/expired
     */
    getSessionTimeRemaining(): number {
        if (!this.currentSession) {
            return 0;
        }

        const now = Date.now();
        const remaining = Math.max(0, this.currentSession.expiresAt - now);

        return Math.floor(remaining / 1000); // Convert to seconds
    }

    /**
     * Extend current session by additional time
     * @param additionalMinutes - Minutes to add to session
     * @returns true if extended, false if no session
     */
    extendSession(additionalMinutes: number = 10): boolean {
        if (!this.currentSession) {
            return false;
        }

        const additionalMs = additionalMinutes * 60 * 1000;
        this.currentSession.expiresAt += additionalMs;

        console.log('[Auth] Session extended by', additionalMinutes, 'minutes');
        console.log('[Auth] New expiry:', new Date(this.currentSession.expiresAt).toLocaleTimeString());

        return true;
    }

    /**
     * Set encryption info for sender (when PIN is verified externally)
     * Used when sender successfully verifies PIN and receives encryption details
     * @param key - Encryption key
     * @param iv - Initialization vector
     * @param deviceName - Name of receiver device
     */
    setEncryptionInfo(key: string, iv: string, deviceName: string): void {
        this.currentSession = {
            pin: '', // Not needed on sender side
            encryptionKey: key,
            iv: iv,
            deviceName,
            timestamp: Date.now(),
            expiresAt: Date.now() + this.SESSION_TIMEOUT,
        };

        console.log('[Auth] Encryption info set for connection to:', deviceName);
    }
}

export default new AuthenticationService();

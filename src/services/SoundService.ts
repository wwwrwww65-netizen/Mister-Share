/**
 * SoundService - Audio feedback for app events
 * Uses system sounds for reliability (no external dependencies)
 */

import { Platform, Vibration } from 'react-native';

// On Android, we can use system notification sounds
// For a production app, you'd integrate react-native-sound or expo-av

interface SoundPattern {
    vibration: number[];
    description: string;
}

// Sound patterns using vibration as fallback
const SoundPatterns: Record<string, SoundPattern> = {
    // Transfer complete - short celebration
    TRANSFER_COMPLETE: {
        vibration: [0, 100, 50, 100],
        description: 'Transfer completed successfully'
    },
    // Connection established
    CONNECTED: {
        vibration: [0, 200],
        description: 'Device connected'
    },
    // Peer joined
    PEER_JOINED: {
        vibration: [0, 100],
        description: 'A device joined'
    },
    // Disconnected
    DISCONNECTED: {
        vibration: [0, 300, 100, 300],
        description: 'Connection lost'
    },
    // Error occurred
    ERROR: {
        vibration: [0, 100, 100, 100, 100, 100],
        description: 'An error occurred'
    },
    // File received
    FILE_RECEIVED: {
        vibration: [0, 50, 50, 150],
        description: 'File received'
    },
    // Notification
    NOTIFICATION: {
        vibration: [0, 150],
        description: 'Notification'
    }
};

class SoundService {
    private enabled: boolean = true;
    private vibrationEnabled: boolean = true;

    /**
     * Enable or disable sound effects
     */
    setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }

    /**
     * Enable or disable vibration feedback
     */
    setVibrationEnabled(enabled: boolean) {
        this.vibrationEnabled = enabled;
    }

    /**
     * Play a sound pattern
     */
    play(sound: keyof typeof SoundPatterns) {
        if (!this.enabled) return;

        const pattern = SoundPatterns[sound];
        if (!pattern) {
            console.warn(`[SoundService] Unknown sound: ${sound}`);
            return;
        }

        // Use vibration as audio feedback
        if (this.vibrationEnabled) {
            try {
                Vibration.vibrate(pattern.vibration);
            } catch (error) {
                console.warn('[SoundService] Vibration failed:', error);
            }
        }

        console.log(`[SoundService] Playing: ${pattern.description}`);
    }

    /**
     * Play transfer complete sound
     */
    transferComplete() {
        this.play('TRANSFER_COMPLETE');
    }

    /**
     * Play connected sound
     */
    connected() {
        this.play('CONNECTED');
    }

    /**
     * Play peer joined sound
     */
    peerJoined() {
        this.play('PEER_JOINED');
    }

    /**
     * Play disconnected sound
     */
    disconnected() {
        this.play('DISCONNECTED');
    }

    /**
     * Play error sound
     */
    error() {
        this.play('ERROR');
    }

    /**
     * Play file received sound
     */
    fileReceived() {
        this.play('FILE_RECEIVED');
    }

    /**
     * Play notification sound
     */
    notification() {
        this.play('NOTIFICATION');
    }
}

export default new SoundService();
export { SoundPatterns };

/**
 * NotificationService - Android notifications for transfer events
 * Uses React Native's built-in PushNotificationIOS for iOS
 * and a simple Toast-based approach for Android
 */

import { Platform, ToastAndroid, Alert } from 'react-native';
import { showToast } from './ToastManager';

interface TransferNotification {
    title: string;
    body: string;
    type: 'success' | 'error' | 'info' | 'progress';
}

class NotificationService {
    private enabled: boolean = true;

    /**
     * Enable or disable notifications
     */
    setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }

    /**
     * Show a notification
     */
    show(notification: TransferNotification) {
        if (!this.enabled) return;

        console.log(`[NotificationService] ${notification.title}: ${notification.body}`);

        // Use Toast on Android for quick feedback
        if (Platform.OS === 'android') {
            this.showAndroidNotification(notification);
        } else {
            // iOS - use Alert for now
            this.showIOSNotification(notification);
        }
    }

    private showAndroidNotification(notification: TransferNotification) {
        // For a production app, use @notifee/react-native or react-native-push-notification
        // For now, we use ToastAndroid for simple notifications
        const message = `${notification.title}\n${notification.body}`;

        if (notification.type === 'success' || notification.type === 'error') {
            // Longer duration for important notifications
            ToastAndroid.showWithGravity(
                message,
                ToastAndroid.LONG,
                ToastAndroid.BOTTOM
            );
        } else {
            ToastAndroid.show(message, ToastAndroid.SHORT);
        }

        // Also show in-app toast for consistency
        showToast(notification.body, notification.type === 'error' ? 'error' : 'success');
    }

    private showIOSNotification(notification: TransferNotification) {
        // Simple alert for iOS
        // For production, implement proper local notifications
        Alert.alert(notification.title, notification.body);
    }

    /**
     * Notify when transfer starts
     */
    transferStarted(filename: string) {
        this.show({
            title: '📤 Transfer Started',
            body: `Sending: ${filename}`,
            type: 'info'
        });
    }

    /**
     * Notify when transfer completes
     */
    transferComplete(filename: string, isReceived: boolean) {
        this.show({
            title: isReceived ? '📥 File Received' : '📤 File Sent',
            body: filename,
            type: 'success'
        });
    }

    /**
     * Notify when transfer fails
     */
    transferFailed(filename: string, error?: string) {
        this.show({
            title: '❌ Transfer Failed',
            body: error || filename,
            type: 'error'
        });
    }

    /**
     * Notify when device connects
     */
    deviceConnected(deviceName?: string) {
        this.show({
            title: '🔗 Connected',
            body: deviceName || 'Device connected successfully',
            type: 'success'
        });
    }

    /**
     * Notify when device disconnects
     */
    deviceDisconnected() {
        this.show({
            title: '🔌 Disconnected',
            body: 'Connection lost',
            type: 'info'
        });
    }

    /**
     * Notify when all transfers complete
     */
    allTransfersComplete(count: number) {
        this.show({
            title: '✅ All Transfers Complete',
            body: `${count} file${count > 1 ? 's' : ''} transferred successfully`,
            type: 'success'
        });
    }
}

export default new NotificationService();

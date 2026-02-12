import { NativeModules, DeviceEventEmitter, NativeEventEmitter, Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';

const { TransferSocketModule, MediaStore } = NativeModules;
// Use NativeEventEmitter if your module supports it standardly, 
// but we implemented a custom event emitter via DeviceEventManagerModule in Kotlin.
// So we can use DeviceEventEmitter directly or wrap it.
// Ideally, we should use the standard NativeEventEmitter pattern if we subclassed ReactContextBaseJavaModule correctly.
// Let's use DeviceEventEmitter which listens to the global events we emitted.

interface FileMetadata {
    filename: string;
    size: number;
    type: 'FILE' | 'APK';
    checksum: string;
    relativePath?: string;
}

class TransferEngine {
    private onReceiveStart: ((meta: FileMetadata) => void) | null = null;
    private onProgress: ((progress: number, speed: number, timeLeft: number) => void) | null = null;
    private onComplete: ((path: string, meta: FileMetadata) => void) | null = null;
    private onError: ((error: string) => void) | null = null;

    private currentMeta: FileMetadata | null = null;
    private serverAddress: string = '';

    constructor() {
        this.setupListeners();
    }

    private setupListeners() {
        DeviceEventEmitter.addListener('onMeta', (event: any) => {
            const metaJson = event.data || event;
            console.log('[TransferEngine] Native received meta:', metaJson);
            try {
                const meta = JSON.parse(metaJson) as any;
                // Map to our interface
                this.currentMeta = {
                    filename: meta.name,
                    size: meta.size,
                    type: meta.name.toLowerCase().endsWith('.apk') ? 'APK' : 'FILE',
                    checksum: '',
                    relativePath: ''
                };

                if (this.onReceiveStart && this.currentMeta) {
                    this.onReceiveStart(this.currentMeta);
                }

                // Check for HyperSpeed parallel mode
                if (meta.parallel === true && meta.streams > 1) {
                    console.log(`[TransferEngine] ⚡ HyperSpeed mode detected! ${meta.streams} parallel streams`);

                    // Determine save path
                    const ext = meta.name.split('.').pop()?.toLowerCase() || '';
                    let typeFolder = 'Files';
                    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) typeFolder = 'Images';
                    else if (['mp4', 'mkv', 'avi', 'mov'].includes(ext)) typeFolder = 'Videos';
                    else if (['apk'].includes(ext)) typeFolder = 'Apps';
                    else if (['mp3', 'wav'].includes(ext)) typeFolder = 'Music';

                    const savePath = `/storage/emulated/0/Download/MisterShare/${typeFolder}/${meta.name}`;

                    // Start parallel receivers
                    TransferSocketModule.startParallelReceiver(meta.name, meta.size, savePath);
                }
                // Normal (non-parallel) mode is handled by native as before

            } catch (e) {
                console.error('[TransferEngine] Failed to parse meta', e);
            }
        });

        DeviceEventEmitter.addListener('onProgress', (data: any) => {
            // data: { bytes, total, speed }
            if (this.onProgress && this.currentMeta) {
                const progress = data.bytes / data.total;
                const timeLeft = (data.total - data.bytes) / (data.speed || 1); // Avoid div by zero
                this.onProgress(progress, data.speed, timeLeft);
            }
        });

        // Listener for ACK-confirmed progress from receiver (for sender synchronization)
        let confirmedStartTime: number | null = null;
        DeviceEventEmitter.addListener('onConfirmedProgress', (data: any) => {
            // data: { bytes, total } - confirmed bytes received by the other device
            if (!confirmedStartTime) {
                confirmedStartTime = Date.now();
            }

            if (this.onProgress && this.currentMeta) {
                const progress = data.bytes / data.total;

                // Calculate speed based on confirmed bytes over elapsed time
                const elapsedSeconds = (Date.now() - confirmedStartTime) / 1000;
                const confirmedSpeed = elapsedSeconds > 0 ? data.bytes / elapsedSeconds : 0;

                // Calculate time remaining based on confirmed speed
                const remaining = data.total - data.bytes;
                const timeLeft = confirmedSpeed > 0 ? remaining / confirmedSpeed : 0;

                console.log('[TransferEngine] Confirmed progress:',
                    Math.round(progress * 100) + '%',
                    'Speed:', Math.round(confirmedSpeed / 1024 / 1024 * 10) / 10, 'MB/s');

                // Update sender's display with receiver's confirmed progress
                this.onProgress(progress, confirmedSpeed, timeLeft);
            }

            // Reset start time when transfer is complete
            if (data.bytes >= data.total) {
                confirmedStartTime = null;
            }
        });

        DeviceEventEmitter.addListener('onReceiveComplete', async (event: any) => {
            const path = event.data || event;
            console.log('[TransferEngine] Native RECEIVE complete:', path);
            if (this.onComplete && this.currentMeta) {
                // File is already saved to public Downloads/MisterShare by native code.
                // No need to call MediaStore.saveToMediaStore() as that was for copying
                // from app-private to public, which is no longer necessary.
                this.onComplete(path, this.currentMeta);
            }
        });

        DeviceEventEmitter.addListener('onSendComplete', (event: any) => {
            const path = event.data || event;
            console.log('[TransferEngine] Native SEND complete:', path);

            // CRITICAL: Resolve the pending sendFile Promise
            // This allows the transferStore to know the send is actually complete
            this._resolveSend(path);

            // Also call onComplete callback if set
            if (this.onComplete && this.currentMeta) {
                this.onComplete(path, this.currentMeta);
            }
        });

        DeviceEventEmitter.addListener('onError', (event: any) => {
            const error = event.data || event;
            console.error('[TransferEngine] Native Error:', error);

            // Reject the pending sendFile Promise if there is one
            this._rejectSend(error);

            if (this.onError) this.onError(error);
        });

        DeviceEventEmitter.addListener('onLog', (event: any) => {
            const msg = event.data || event;
            console.log('[NativeTransfer]', msg);
        });

        DeviceEventEmitter.addListener('onClientConnected', (event: any) => {
            const ip = event.data || event;
            console.log('[TransferEngine] Client Connected:', ip);
            // If we are Host, this is our destination
            // If we blindly overwrite, it might be fine because typically we only have one active peer in this app version
            // But let's only overwrite if we haven't set a manual specific destination or if we are default

            // Actually, for Host <-> Joiner, the Host ALWAYS needs to know the Joiner's IP.
            // And the Joiner connects to the Host.
            // So capturing this is always good for the Host.
            this.serverAddress = ip;

            // === NEW: Add peer to global connection store ===
            try {
                const { useConnectionStore } = require('../store/connectionStore');
                const store = useConnectionStore.getState();

                // Only add if we are the group owner (host)
                if (store.isGroupOwner) {
                    store.addPeer({
                        deviceAddress: ip,
                        deviceName: `Device (${ip.split('.').pop()})`, // Last octet as identifier
                        connectedAt: Date.now()
                    });
                    // CRITICAL: Set peerIP so host can send files back to client
                    store.setPeerIP(ip);
                    console.log('[TransferEngine] ✅ Added peer and set peerIP:', ip);
                }
            } catch (e) {
                console.warn('[TransferEngine] Could not update connection store:', e);
            }
        });
    }

    private async determineSavePath(meta: FileMetadata): Promise<string> {
        const dirs = ReactNativeBlobUtil.fs.dirs;
        const baseDir = Platform.OS === 'android' ? dirs.DownloadDir : dirs.DocumentDir;

        const ext = (meta.filename.split('.').pop() || '').toLowerCase();
        let typeFolder = 'Files';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) typeFolder = 'Images';
        else if (['mp4', 'mkv', 'avi'].includes(ext)) typeFolder = 'Videos';
        else if (['apk'].includes(ext)) typeFolder = 'Apps';
        else if (['mp3', 'wav'].includes(ext)) typeFolder = 'Music';

        const misterShareDir = `${baseDir}/MisterShare`;
        const targetDir = `${misterShareDir}/${typeFolder}`;

        await ReactNativeBlobUtil.fs.mkdir(misterShareDir).catch(() => { });
        await ReactNativeBlobUtil.fs.mkdir(targetDir).catch(() => { });

        return `${targetDir}/${meta.filename}`;
    }

    setDestination(address: string) {
        this.serverAddress = address;
    }

    startServer(
        onReceiveStart: (meta: FileMetadata) => void,
        onProgress: (progress: number, speed: number, timeLeft: number) => void,
        onComplete: (path: string, meta: FileMetadata) => void,
        onError?: (error: string) => void
    ) {
        this.onReceiveStart = onReceiveStart;
        this.onProgress = onProgress;
        this.onComplete = onComplete;
        this.onError = onError || null;

        TransferSocketModule.startServer(12345);
    }

    stopServer() {
        TransferSocketModule.stop();
    }

    private pendingSendResolve: ((value: string) => void) | null = null;
    private pendingSendReject: ((error: Error) => void) | null = null;

    async sendFile(
        filePath: string,
        size: number,
        filename: string,
        onProgress: (progress: number, speed: number, timeLeft: number) => void,
        isGroupOwner: boolean = false // 2024 Best Practice: Explicit role for proper socket binding
    ): Promise<string> {
        this.currentMeta = { filename, size, type: 'FILE', checksum: '' };
        this.onProgress = onProgress;

        // Return a Promise that will be resolved by the onSendComplete event
        // This is necessary because the native connectAndSend() returns immediately
        // (it launches a coroutine) before the actual transfer is complete.
        return new Promise((resolve, reject) => {
            this.pendingSendResolve = resolve;
            this.pendingSendReject = reject;

            try {
                // Pass the display name (e.g., "Telegram.apk") to native so receiver sees correct name
                // Use connectAndSendWithRole to specify host/client mode for proper socket binding
                console.log(`[TransferEngine] Sending file with isGroupOwner=${isGroupOwner}`);
                TransferSocketModule.connectAndSendWithRole(
                    this.serverAddress,
                    12345,
                    filePath,
                    filename,
                    isGroupOwner
                );
            } catch (e: any) {
                this.pendingSendResolve = null;
                this.pendingSendReject = null;
                reject(e);
            }
        });
    }

    // Called by onSendComplete event listener
    _resolveSend(path: string) {
        if (this.pendingSendResolve) {
            this.pendingSendResolve(path);
            this.pendingSendResolve = null;
            this.pendingSendReject = null;
        }
    }

    // Called by onError event listener for send errors
    _rejectSend(error: string) {
        if (this.pendingSendReject) {
            this.pendingSendReject(new Error(error));
            this.pendingSendResolve = null;
            this.pendingSendReject = null;
        }
    }

    // ═══════════════ HYPERSPEED PARALLEL TRANSFER ═══════════════

    /**
     * HyperSpeed mode threshold: files larger than 10MB use parallel transfer
     */
    private static readonly HYPERSPEED_THRESHOLD = 10 * 1024 * 1024; // 10MB

    /**
     * Send file using HyperSpeed parallel streams for maximum speed.
     * Uses 8 concurrent TCP connections for files > 10MB.
     */
    async sendFileHyperSpeed(
        filePath: string,
        size: number,
        filename: string,
        onProgress: (progress: number, speed: number, timeLeft: number) => void
    ): Promise<string> {
        this.currentMeta = { filename, size, type: 'FILE', checksum: '' };
        this.onProgress = onProgress;

        const useHyperSpeed = size > TransferEngine.HYPERSPEED_THRESHOLD;

        console.log(`[TransferEngine] ${useHyperSpeed ? '⚡ HyperSpeed' : 'Normal'} mode for ${filename} (${(size / 1024 / 1024).toFixed(1)} MB)`);

        return new Promise((resolve, reject) => {
            this.pendingSendResolve = resolve;
            this.pendingSendReject = reject;

            try {
                if (useHyperSpeed) {
                    // Use 8 parallel TCP streams for maximum speed
                    TransferSocketModule.parallelSend(this.serverAddress, filePath, filename);
                } else {
                    // Use single stream for small files
                    TransferSocketModule.connectAndSend(this.serverAddress, 12345, filePath, filename);
                }
            } catch (e: any) {
                this.pendingSendResolve = null;
                this.pendingSendReject = null;
                reject(e);
            }
        });
    }
}

export default new TransferEngine();

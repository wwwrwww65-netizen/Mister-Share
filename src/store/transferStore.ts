import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TransferEngine from '../services/TransferEngine';
import { useConnectionStore } from './connectionStore';

export interface TransferItem {
    id: string;
    name: string;
    path: string;
    size: number;
    type: 'file' | 'apk' | 'image' | 'video' | 'audio';
    status: 'pending' | 'transferring' | 'completed' | 'failed' | 'paused';
    progress: number;
    speed: number;
    timeLeft: number;
    error?: string;
    checksum?: string;
    relativePath?: string;
    icon?: string;
    direction: 'send' | 'receive'; // SHAREit-style visual distinction
    sessionId?: string; // 2024 BEST PRACTICE: Session-based queue isolation
    preprocess?: {
        kind: 'zipDirectory';
        directoryUri: string;
        outputName: string;
        stage?: 'waiting' | 'zipping' | 'ready' | 'failed';
        filesZipped?: number;
        bytesZipped?: number;
    };
}

export interface TransferHistory {
    id: string;
    filename: string;
    size: number;
    timestamp: number;
    type: 'sent' | 'received';
    status: 'success' | 'failed';
    duration?: number; // seconds
    averageSpeed?: number; // bytes/sec
    error?: string;
    path?: string; // File path for opening
    icon?: string; // Base64 or URI for app icon
}

interface TransferState {
    // Queue
    queue: TransferItem[];
    currentIndex: number;
    status: 'idle' | 'running' | 'paused' | 'completed'; // Legacy - for backward compatibility

    // BIDIRECTIONAL SUPPORT (2024 Best Practice)
    // Separate status for send and receive operations
    sendStatus: 'idle' | 'running' | 'paused' | 'completed';
    receiveStatus: 'idle' | 'running' | 'paused' | 'completed';

    // Track if receiver server is actually running (separate from receiveStatus which can be 'completed')
    isServerRunning: boolean;

    // Session Management (2024 Best Practice)
    // Each transfer session has a unique ID to prevent queue pollution
    currentSessionId: string | null;

    // 2024 BEST PRACTICE: Staging Area for Outgoing Files
    // Holds files selected in FileBrowser until Transfer logic picks them up
    // Decouples Navigation State from Data State
    outgoingFiles: any[]; // Raw files from FileBrowser (before processing)
    setOutgoingFiles: (files: any[]) => void;
    clearOutgoingFiles: () => void;

    // History
    history: TransferHistory[];

    // Actions
    addToQueue: (items: TransferItem[]) => void;
    removeFromQueue: (id: string) => void;
    clearQueue: () => void;
    reorderQueue: (fromIndex: number, toIndex: number) => void;

    // Transfer control
    startTransfer: () => void;
    pauseTransfer: () => void;
    resumeTransfer: () => void;
    cancelTransfer: () => void;

    // Progress updates
    updateProgress: (id: string, progress: number, speed: number, timeLeft: number) => void;
    setItemStatus: (id: string, status: TransferItem['status']) => void;
    setItemError: (id: string, error: string) => void;

    // Navigation
    moveToNext: () => void;
    getCurrentItem: () => TransferItem | null;

    // Session & Queue Helpers (2024 Best Practices)
    getSendQueue: () => TransferItem[];
    getReceiveQueue: () => TransferItem[];
    startNewSession: (mode: 'send' | 'receive') => string;
    clearSessionItems: (sessionId: string) => void;

    // Bidirectional helpers
    isSending: () => boolean;
    isReceiving: () => boolean;
    setSendStatus: (status: 'idle' | 'running' | 'paused' | 'completed') => void;
    setReceiveStatus: (status: 'idle' | 'running' | 'paused' | 'completed') => void;

    // History
    addToHistory: (item: TransferHistory) => void;
    removeFromHistory: (id: string) => void;
    clearHistory: () => void;
    loadHistory: () => Promise<void>;
    saveHistory: () => Promise<void>;

    // Background Processing
    startQueueProcessing: (serverIP: string) => Promise<void>;
    startReceiverListening: () => void;
}

const HISTORY_KEY = '@mistershare_history';
const MAX_HISTORY_ITEMS = 100;

// Throttle helper for progress updates (prevents UI jank)
let lastProgressUpdate = 0;
const PROGRESS_THROTTLE_MS = 200; // Max 5 updates per second

export const useTransferStore = create<TransferState>((set, get) => ({
    queue: [],
    currentIndex: 0,
    status: 'idle',
    sendStatus: 'idle',
    receiveStatus: 'idle',
    isServerRunning: false,
    currentSessionId: null,
    outgoingFiles: [],
    history: [],

    addToQueue: (items) => {
        set((state) => ({
            queue: [...state.queue, ...items],
        }));
    },

    removeFromQueue: (id) => {
        set((state) => ({
            queue: state.queue.filter(item => item.id !== id),
        }));
    },

    clearQueue: () => {
        set({ queue: [], currentIndex: 0, status: 'idle' });
    },

    reorderQueue: (fromIndex, toIndex) => {
        set((state) => {
            const newQueue = [...state.queue];
            const [removed] = newQueue.splice(fromIndex, 1);
            newQueue.splice(toIndex, 0, removed);
            return { queue: newQueue };
        });
    },

    startTransfer: () => {
        set({ status: 'running' });
    },

    pauseTransfer: () => {
        set({ status: 'paused' });
    },

    resumeTransfer: () => {
        set({ status: 'running' });
    },

    cancelTransfer: () => {
        set({ status: 'idle', currentIndex: 0 });
    },

    updateProgress: (id, progress, speed, timeLeft) => {
        // THROTTLED UPDATES (2024 Best Practice)
        // Prevents excessive re-renders that can cause UI jank
        const now = Date.now();
        if (now - lastProgressUpdate < PROGRESS_THROTTLE_MS && progress < 1) {
            return; // Skip this update, too soon
        }
        lastProgressUpdate = now;

        set((state) => ({
            queue: state.queue.map(item =>
                item.id === id
                    ? { ...item, progress, speed, timeLeft, status: 'transferring' }
                    : item
            ),
        }));
    },

    setItemStatus: (id, status) => {
        set((state) => ({
            queue: state.queue.map(item =>
                item.id === id ? { ...item, status } : item
            ),
        }));
    },

    setItemError: (id, error) => {
        set((state) => ({
            queue: state.queue.map(item =>
                item.id === id ? { ...item, status: 'failed', error } : item
            ),
        }));
    },

    moveToNext: () => {
        set((state) => {
            const nextIndex = state.currentIndex + 1;
            if (nextIndex >= state.queue.length) {
                return { status: 'completed', currentIndex: nextIndex };
            }
            return { currentIndex: nextIndex };
        });
    },

    getCurrentItem: () => {
        const state = get();
        return state.queue[state.currentIndex] || null;
    },

    // ═══════════════ SESSION & QUEUE HELPERS (2024 Best Practices) ═══════════════

    getSendQueue: () => {
        return get().queue.filter(item => item.direction === 'send');
    },

    getReceiveQueue: () => {
        return get().queue.filter(item => item.direction === 'receive');
    },

    startNewSession: (mode: 'send' | 'receive') => {
        const sessionId = `session_${Date.now()}_${mode}`;
        const currentQueue = get().queue;

        // 2024 BEST PRACTICE: Session-based queue management (SHAREit Architecture)
        // - Clear completed/failed items from THIS mode only
        // - Keep ALL items from the OTHER mode (bidirectional support)
        // - Keep active items from this mode
        const otherDirection = mode === 'send' ? 'receive' : 'send';

        const preservedItems = currentQueue.filter(item => {
            // Keep all items from other direction (bidirectional)
            if (item.direction === otherDirection) return true;

            // From this mode: keep only active items
            return item.status === 'pending' || item.status === 'transferring';
        });

        console.log(`[TransferStore] Starting new ${mode} session:`, sessionId);
        console.log(`[TransferStore] Preserved ${preservedItems.length} items (cleaned ${currentQueue.length - preservedItems.length} stale ${mode} items)`);

        set({
            currentSessionId: sessionId,
            queue: preservedItems,
            currentIndex: 0,
            status: 'idle'
        });

        return sessionId;
    },

    clearSessionItems: (sessionId: string) => {
        const currentQueue = get().queue;
        const filteredQueue = currentQueue.filter(item =>
            item.sessionId !== sessionId ||
            item.status === 'transferring' // Keep active transfers
        );

        console.log(`[TransferStore] Cleared ${currentQueue.length - filteredQueue.length} items from session:`, sessionId);
        set({ queue: filteredQueue });
    },

    // ═══════════════ BIDIRECTIONAL HELPERS ═══════════════

    isSending: () => {
        return get().sendStatus === 'running';
    },

    isReceiving: () => {
        // Check if server is actually running (not just receiveStatus)
        // This allows bidirectional transfer even after a receive completes
        return get().isServerRunning;
    },

    setSendStatus: (status) => {
        console.log('[TransferStore] Send status:', status);
        set({ sendStatus: status, status: status }); // Also update legacy status
    },

    setReceiveStatus: (status) => {
        console.log('[TransferStore] Receive status:', status);
        set({ receiveStatus: status });
        // Only update legacy status if not currently sending
        if (!get().isSending()) {
            set({ status: status });
        }
    },

    addToHistory: (item) => {
        set((state) => {
            const newHistory = [item, ...state.history].slice(0, MAX_HISTORY_ITEMS);
            return { history: newHistory };
        });

        // Auto-save to AsyncStorage
        get().saveHistory();
    },

    clearHistory: () => {
        set({ history: [] });
        AsyncStorage.removeItem(HISTORY_KEY);
    },

    loadHistory: async () => {
        try {
            const data = await AsyncStorage.getItem(HISTORY_KEY);
            if (data) {
                const history = JSON.parse(data);
                set({ history });
            }
        } catch (error) {
            console.error('[TransferStore] Failed to load history:', error);
        }
    },

    saveHistory: async () => {
        try {
            const { history } = get();
            await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        } catch (error) {
            console.error('[TransferStore] Failed to save history:', error);
        }
    },

    removeFromHistory: (id: string) => {
        set((state) => ({
            history: state.history.filter(item => item.id !== id)
        }));
        // Persist the change
        get().saveHistory();
    },

    startQueueProcessing: async (serverIP: string) => {
        const { queue, currentIndex, status } = get();

        // Find pending items that need to be sent
        const pendingItems = queue.filter(item => item.status === 'pending' && item.direction === 'send');

        // Don't start if no pending send items
        if (pendingItems.length === 0) {
            console.log('[TransferStore] No pending send items, skipping queue processing');
            return;
        }

        console.log('[TransferStore] Starting queue processing with', pendingItems.length, 'pending items');

        // Use separate sendStatus for bidirectional support
        get().setSendStatus('running');
        TransferEngine.setDestination(serverIP);

        const RNFS = require('@dr.pogodin/react-native-fs');
        const SAFService = require('../services/SAFService').default;

        const zipPromisesByItemId = new Map<string, Promise<void>>();
        let zipProgressUnsubscribe: null | (() => void) = null;
        let activeZipItemId: string | null = null;

        const startZipForItem = (target: TransferItem) => {
            if (!target.preprocess || target.preprocess.kind !== 'zipDirectory') return;
            if (zipPromisesByItemId.has(target.id)) return;

            const directoryUri = target.preprocess.directoryUri;
            const outputName = target.preprocess.outputName || target.name;
            const outputZipPath = `${RNFS.CachesDirectoryPath}/${outputName}`;

            console.log('[TransferStore] Starting DATA ZIP for item:', target.name, 'from', directoryUri, 'to', outputZipPath);

            set(s => ({
                queue: s.queue.map(i => i.id === target.id
                    ? {
                        ...i,
                        preprocess: {
                            ...i.preprocess!,
                            stage: 'zipping',
                            filesZipped: 0,
                            bytesZipped: 0
                        }
                    }
                    : i)
            }));

            if (!zipProgressUnsubscribe) {
                zipProgressUnsubscribe = SAFService.onZipProgress((event: any) => {
                    const filesZipped = typeof event?.filesZipped === 'number' ? event.filesZipped : 0;
                    const bytesZipped = typeof event?.processedBytes === 'number'
                        ? event.processedBytes
                        : (typeof event?.totalBytes === 'number' ? event.totalBytes : 0);
                    if (!activeZipItemId) return;

                    set(s => ({
                        queue: s.queue.map(i => i.id === activeZipItemId
                            ? {
                                ...i,
                                preprocess: {
                                    ...i.preprocess!,
                                    stage: 'zipping',
                                    filesZipped,
                                    bytesZipped
                                }
                            }
                            : i)
                    }));
                });
            }

            activeZipItemId = target.id;

            const zipPromise = (async () => {
                const result = await SAFService.createZipFromDirectory(directoryUri, outputZipPath);
                if (!result?.zipPath) {
                    throw new Error('ZIP_CREATE_FAILED');
                }

                const stat = await RNFS.stat(result.zipPath);
                const zipSize = stat?.size || result.totalBytes || 0;

                console.log('[TransferStore] DATA ZIP ready for item:', target.name, 'zipPath:', result.zipPath, 'bytes:', zipSize);

                set(s => ({
                    queue: s.queue.map(i => i.id === target.id
                        ? {
                            ...i,
                            path: result.zipPath,
                            size: zipSize,
                            preprocess: {
                                ...i.preprocess!,
                                stage: 'ready',
                                filesZipped: result.filesZipped || i.preprocess?.filesZipped || 0,
                                bytesZipped: result.totalBytes || i.preprocess?.bytesZipped || 0
                            }
                        }
                        : i)
                }));
            })().catch((error: any) => {
                set(s => ({
                    queue: s.queue.map(i => i.id === target.id
                        ? {
                            ...i,
                            status: 'failed',
                            error: error?.message || 'ZIP_CREATE_FAILED',
                            preprocess: {
                                ...i.preprocess!,
                                stage: 'failed'
                            }
                        }
                        : i)
                }));
            }).finally(() => {
                if (activeZipItemId === target.id) {
                    activeZipItemId = null;
                }
            });

            zipPromisesByItemId.set(target.id, zipPromise);
        };

        get().queue
            .filter(i => i.direction === 'send' && i.status === 'pending' && i.preprocess?.kind === 'zipDirectory')
            .forEach(startZipForItem);

        // Process function loop
        const processNext = async () => {
            const state = get();

            // Find next pending send item (skip completed/failed/receiving items)
            let nextItem: TransferItem | null = null;
            for (const item of state.queue) {
                if (item.status === 'pending' && item.direction === 'send') {
                    nextItem = item;
                    break;
                }
            }

            // Stop condition: no more pending send items
            if (!nextItem) {
                // Check if all send items are completed
                const allSendComplete = state.queue
                    .filter(i => i.direction === 'send')
                    .every(i => i.status === 'completed' || i.status === 'failed');

                if (allSendComplete && state.queue.filter(i => i.direction === 'send').length > 0) {
                    get().setSendStatus('completed');
                }
                console.log('[TransferStore] Queue processing complete');
                zipProgressUnsubscribe?.();
                return;
            }

            // Use the found nextItem (renamed from item for clarity)
            const safeNextItem = nextItem as TransferItem;

            if (safeNextItem.preprocess?.kind === 'zipDirectory') {
                startZipForItem(safeNextItem);
                const zipPromise = zipPromisesByItemId.get(safeNextItem.id);
                if (zipPromise) {
                    console.log('[TransferStore] Waiting for DATA ZIP to finish for item:', safeNextItem.name);
                    await zipPromise;
                }
            }

            const refreshed = get().queue.find(i => i.id === safeNextItem.id);
            if (!refreshed) {
                setTimeout(() => processNext(), 100);
                return;
            }

            if (refreshed.status === 'failed') {
                setTimeout(() => processNext(), 100);
                return;
            }

            if (refreshed.preprocess?.kind === 'zipDirectory' && refreshed.preprocess.stage !== 'ready') {
                console.log('[TransferStore] DATA ZIP not ready yet, delaying send for item:', refreshed.name, 'stage:', refreshed.preprocess.stage);
                setTimeout(() => processNext(), 200);
                return;
            }

            const item = refreshed;

            set((s) => ({
                queue: s.queue.map(i => i.id === item.id ? { ...i, status: 'transferring' } : i)
            }));

            try {
                console.log('[TransferStore] Sending file:', item.name, 'path:', item.path);

                // Get isGroupOwner from connection state for proper socket binding
                const { isGroupOwner } = useConnectionStore.getState();
                console.log('[TransferStore] isGroupOwner:', isGroupOwner);

                // Use optimized single-stream transfer 
                // (HyperSpeed parallel mode adds overhead on limited Wi-Fi Direct bandwidth)
                await TransferEngine.sendFile(
                    item.path,
                    item.size,
                    item.name,
                    (p, speed, timeLeft) => {
                        get().updateProgress(item.id, p, speed, timeLeft);
                    },
                    isGroupOwner // Pass role for correct socket binding
                );

                // Success
                set((s) => ({
                    queue: s.queue.map(i => i.id === item.id ? { ...i, status: 'completed', progress: 1 } : i)
                }));

                console.log('[TransferStore] ✅ File sent successfully:', item.name);

                // Cleanup: Delete temp APK file if it was copied to cache
                if (item.path && item.path.includes('/apk_transfer/')) {
                    try {
                        const RNFS = require('@dr.pogodin/react-native-fs');
                        await RNFS.unlink(item.path);
                        console.log('[TransferStore] 🗑️ Cleaned up temp APK:', item.path);
                    } catch (cleanupError) {
                        console.warn('[TransferStore] Failed to cleanup temp APK:', cleanupError);
                    }
                }

                const historyItem: TransferHistory = {
                    id: item.id,
                    filename: item.name,
                    size: item.size,
                    timestamp: Date.now(),
                    type: 'sent',
                    status: 'success',
                    duration: 0, // could calc
                    averageSpeed: 0, // could calc
                    path: item.path,
                    icon: item.icon // Persist icon to history
                };
                get().addToHistory(historyItem);

                // Next
                processNext();

            } catch (error: any) {
                console.error('[TransferStore] ❌ Transfer failed for item:', item.name, error);
                set((s) => ({
                    queue: s.queue.map(i => i.id === item.id ? { ...i, status: 'failed', error: error.message } : i)
                }));
                // Wait a bit before next
                setTimeout(() => processNext(), 500);
            }
        };

        processNext();
    },

    startReceiverListening: () => {
        // Check if server is already running (avoid restart)
        if (get().isServerRunning) {
            console.log('[TransferStore] Server already running, skipping restart');
            return;
        }

        // 2024 BEST PRACTICE: Start a new receive session
        // This ensures clean separation between receive operations
        const sessionId = get().startNewSession('receive');
        console.log('[TransferStore] Started receive session:', sessionId);

        // Mark server as running BEFORE starting (prevents race condition)
        set({ isServerRunning: true });

        // Use separate receiveStatus for bidirectional support
        get().setReceiveStatus('running');

        TransferEngine.startServer(
            (meta) => {
                // On Receive Start
                console.log('[TransferStore] Receiving file:', meta.filename);
                // Create a generic item for the queue to show progress
                const item: TransferItem = {
                    id: `recv_${Date.now()}`,
                    name: meta.filename,
                    path: '',
                    size: meta.size,
                    type: 'file',
                    status: 'transferring',
                    progress: 0,
                    speed: 0,
                    timeLeft: 0,
                    direction: 'receive',
                    sessionId: get().currentSessionId || undefined // 2024: Link to current session
                };

                // FIXED: Append to queue instead of replacing for multi-file support
                const currentQueue = get().queue;
                const newIndex = currentQueue.length; // New item will be at end

                set({
                    queue: [...currentQueue, item],
                    currentIndex: newIndex,
                    status: 'running'
                });

                console.log('[TransferStore] Queue updated, total items:', newIndex + 1);
            },
            (p, speed, timeLeft) => {
                const { queue, currentIndex } = get();
                const item = queue[currentIndex];
                if (item) {
                    get().updateProgress(item.id, p, speed, timeLeft);
                }
            },
            (path, meta) => {
                const { queue, currentIndex } = get();
                const item = queue[currentIndex];
                if (item) {
                    set(s => ({
                        queue: s.queue.map(i => i.id === item.id ? { ...i, status: 'completed', progress: 1, path: path } : i),
                        status: 'completed'
                    }));

                    const historyItem: TransferHistory = {
                        id: item.id,
                        filename: meta.filename,
                        size: meta.size,
                        timestamp: Date.now(),
                        type: 'received',
                        status: 'success',
                        path: path
                    };
                    get().addToHistory(historyItem);
                }
            },
            (error) => {
                const { queue, currentIndex } = get();
                const item = queue[currentIndex];
                if (item) {
                    set(s => ({
                        queue: s.queue.map(i => i.id === item.id ? { ...i, status: 'failed', error } : i),
                        status: 'idle'
                    }));
                }
            }
        );
    },

    setOutgoingFiles: (files) => {
        console.log('[TransferStore] Staging', files.length, 'outgoing files');
        set({ outgoingFiles: files });
    },

    clearOutgoingFiles: () => {
        set({ outgoingFiles: [] });
    }
}));

// Helper to generate unique ID
export function generateTransferId(): string {
    // Combine timestamp, random, and a counter-like component
    return `transfer_${Date.now()}_${Math.floor(Math.random() * 1000000).toString(36)}`;
}

// Helper to convert file to TransferItem
export function fileToTransferItem(file: any): TransferItem {
    const type = detectFileType(file);
    let name = file.name || file.filename || 'unknown';

    // For APKs: Use app label (e.g., "Telegram") instead of path-derived name (e.g., "base.apk")
    if (type === 'apk') {
        const lower = name.toLowerCase();
        const alreadyPackaged = lower.endsWith('.apk') || lower.endsWith('.apks') || lower.endsWith('.xapk');
        if (!alreadyPackaged) {
            const appLabel = file.label || file.appLabel || file.appName;
            if (appLabel) {
                name = appLabel.endsWith('.apk') ? appLabel : `${appLabel}.apk`;
            } else {
                name += '.apk';
            }
        }
    }

    const item: TransferItem = {
        id: generateTransferId(),
        name: name,
        // Prefer URI (Content URI) if available for better Android 10+ compatibility
        // But for APKs (which use apkPath) or if uri is missing, use path.
        path: file.uri || file.path || file.apkPath || '',
        size: file.size || file.totalSize || 0,
        type: type,
        status: 'pending',
        progress: 0,
        speed: 0,
        timeLeft: 0,
        // Preserve relative path for folder transfers
        relativePath: file.relativePath,
        // Preserve app icon if available
        icon: file.icon,
        direction: 'send', // Default to send when processing local files
        sessionId: file.sessionId, // 2024: Link to session for filtering
        preprocess: file.preprocess
            ? {
                ...file.preprocess,
                stage: file.preprocess.stage || 'waiting'
            }
            : undefined
    };
    return item;
}

// Helper to expand folders into flat list
// This MUST be async so we can't use it directly in synchronous addToQueue easily
// effectively, addToQueue needs to handle this. But store actions are sync? 
// No, Zustand actions can be async.
// However, addToQueue in component is likely expected to be fast.
// We will update addToQueue to be async or handle async internal.
export async function processFilesForQueue(files: any[], sessionId?: string): Promise<TransferItem[]> {
    let finalItems: TransferItem[] = [];
    const FileSystem = require('../services/FileSystem').default; // Circular dep workaround?
    const { NativeModules } = require('react-native');
    const FileProviderModule = NativeModules.FileProviderModule;

    for (const file of files) {
        // Add sessionId to every file before processing
        const fileWithSession = { ...file, sessionId };

        if (file.isDirectory) {
            // It's a folder, expand it
            const ExpandedFiles = await FileSystem.expandDirectory(file.path);
            if (ExpandedFiles.length > 0) {
                // Convert each file to TransferItem with sessionId
                finalItems.push(...ExpandedFiles.map((f: any) => fileToTransferItem({ ...f, sessionId })));
            }
        } else {
            // Check if this is an APK from /data/app/ (protected directory)
            const isApk = fileWithSession.packageName || fileWithSession.apkPath || (fileWithSession.path && fileWithSession.path.includes('/data/app/'));

            if (isApk && FileProviderModule) {
                // 2024 BEST PRACTICE: Use native FileProvider for efficient APK handling
                // This uses streaming copy with 256KB buffer (vs React Native's slower approach)
                try {
                    const appLabel = fileWithSession.label || fileWithSession.appLabel || fileWithSession.appName || fileWithSession.name || 'unknown';

                    const result = fileWithSession.packageName
                        ? await FileProviderModule.exportInstalledAppToCache(fileWithSession.packageName, appLabel)
                        : await FileProviderModule.copyApkToCache(fileWithSession.apkPath || fileWithSession.path, appLabel);

                    console.log('[TransferStore] APK cached via FileProvider:', result.path, 'size:', result.size, 'isSplit:', result.isSplit);

                    // Create TransferItem with the cached path
                    const item = fileToTransferItem({
                        ...fileWithSession,
                        name: result.filename || fileWithSession.name,
                        path: result.path, // Use the cached path
                        size: result.size,
                    });
                    finalItems.push(item);
                } catch (error) {
                    console.error('[TransferStore] FileProvider failed, using fallback:', error);
                    // Fallback: try with original path anyway
                    finalItems.push(fileToTransferItem(fileWithSession));
                }
            } else if (isApk) {
                // Fallback: Original RNFS copy method (if FileProvider not available)
                try {
                    const RNFS = require('@dr.pogodin/react-native-fs');
                    const apkPath = fileWithSession.apkPath || fileWithSession.path;
                    const appLabel = fileWithSession.label || fileWithSession.appLabel || fileWithSession.appName || fileWithSession.name || 'unknown';
                    const safeName = appLabel.replace(/[^a-zA-Z0-9\u0600-\u06FF\s._-]/g, '_');
                    const tempDir = `${RNFS.CachesDirectoryPath}/apk_transfer`;
                    const tempPath = `${tempDir}/${safeName}.apk`;

                    await RNFS.mkdir(tempDir).catch(() => { });
                    await RNFS.copyFile(apkPath, tempPath);
                    const stat = await RNFS.stat(tempPath);

                    const item = fileToTransferItem({
                        ...fileWithSession,
                        path: tempPath,
                        size: parseInt(stat.size.toString()),
                    });
                    finalItems.push(item);
                } catch (error) {
                    console.error('[TransferStore] Failed to copy APK:', error);
                    finalItems.push(fileToTransferItem(fileWithSession));
                }
            } else {
                finalItems.push(fileToTransferItem(fileWithSession));
            }
        }
    }
    return finalItems;
}

function detectFileType(file: any): TransferItem['type'] {
    const rawName = file.name || file.filename || '';
    const name = rawName.toLowerCase();
    const mime = (file.mime || file.mimeType || '').toLowerCase();

    if (file.apkPath) return 'apk';

    if (name.endsWith('.apk')) return 'apk';
    if (name.endsWith('.apks')) return 'apk';
    if (name.endsWith('.xapk')) return 'apk';
    if (mime === 'application/vnd.android.package-archive') return 'apk';

    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';

    if (name.match(/\.(jpg|jpeg|png|gif|webp)$/)) return 'image';
    if (name.match(/\.(mp4|avi|mkv|mov)$/)) return 'video';
    if (name.match(/\.(mp3|wav|flac|m4a)$/)) return 'audio';

    if (file.packageName && !name.endsWith('.zip')) return 'apk';

    return 'file';
}

export default useTransferStore;

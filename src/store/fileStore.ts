import { create } from 'zustand';
import FileSystem, { DashboardCounts } from '../services/FileSystem';
import AppManager from '../services/AppManager';

// Define status types for robust UI handling
export type LoadingStatus = 'idle' | 'loading' | 'success' | 'error';

interface FileState<T> {
    data: T[];
    status: LoadingStatus;
    error: string | null;
    lastUpdated: number;
}

interface FileStoreState {
    // Data Categories
    apps: FileState<any>;
    photos: FileState<any>;
    videos: FileState<any>;
    music: FileState<any>;

    // Dashboard Counts
    dashboardCounts: DashboardCounts;
    countsStatus: LoadingStatus;

    // Actions
    initialize: () => Promise<void>;
    fetchApps: (force?: boolean) => Promise<void>;
    fetchPhotos: (force?: boolean) => Promise<void>;
    fetchVideos: (force?: boolean) => Promise<void>;
    fetchMusic: (force?: boolean) => Promise<void>;
    fetchDashboardCounts: () => Promise<void>;

    // Permissions
    isPermissionGranted: boolean;
    setPermissionGranted: (granted: boolean) => void;

    // Selection
    selectedItems: any[];
    toggleSelection: (item: any) => void;
    clearSelection: () => void;

    // Helpers
    refreshAll: [] | (() => Promise<void>);
}

// Helper to create initial empty state
const initialCategoryState = {
    data: [],
    status: 'idle' as LoadingStatus,
    error: null,
    lastUpdated: 0
};

export const useFileStore = create<FileStoreState>((set, get) => ({
    apps: { ...initialCategoryState },
    photos: { ...initialCategoryState },
    videos: { ...initialCategoryState },
    music: { ...initialCategoryState },

    dashboardCounts: {
        photos: 0, videos: 0, music: 0, docs: 0, ebooks: 0, archives: 0, apks: 0, bigfiles: 0
    },
    countsStatus: 'idle',

    isPermissionGranted: false,
    setPermissionGranted: (granted: boolean) => set({ isPermissionGranted: granted }),

    // Selection Implementation
    selectedItems: [],
    toggleSelection: (item: any) => {
        const id = item.packageName || item.path || item.id;
        set(state => {
            const index = state.selectedItems.findIndex(i => (i.packageName || i.path || i.id) === id);
            if (index > -1) {
                return { selectedItems: state.selectedItems.filter((_, i) => i !== index) };
            } else {
                return { selectedItems: [...state.selectedItems, item] };
            }
        });
    },
    clearSelection: () => set({ selectedItems: [] }),

    initialize: async () => {
        const initStartTime = Date.now();
        console.log('[FileStore] ⏱️ initialize() START');
        // Fire and forget - background loading
        get().fetchDashboardCounts();
        get().fetchApps();
        get().fetchPhotos();
        get().fetchVideos();
        get().fetchMusic();
        console.log('[FileStore] ⏱️ initialize() all fetches dispatched in', (Date.now() - initStartTime) + 'ms');
    },

    fetchDashboardCounts: async () => {
        set({ countsStatus: 'loading' });
        try {
            const counts = await FileSystem.getDashboardCounts();
            set({ dashboardCounts: counts, countsStatus: 'success' });
        } catch (error) {
            console.error('[FileStore] Failed to load counts:', error);
            set({ countsStatus: 'error' });
        }
    },

    fetchApps: async (force = false) => {
        const fetchStartTime = Date.now();
        console.log('[FileStore] ⏱️ fetchApps() START');
        const current = get().apps;
        if (!force && current.status === 'success' && current.data.length > 0) return;

        set(state => ({ apps: { ...state.apps, status: 'loading' } }));
        try {
            // Phase 1: Fast initial load (50 apps)
            console.log('[FileStore] ⏱️ fetchApps Phase 1 calling...');
            const initialData = await AppManager.getAllApps(50, 0);
            console.log('[FileStore] ⏱️ fetchApps Phase 1 got', initialData.length, 'apps in', (Date.now() - fetchStartTime) + 'ms');
            set({
                apps: {
                    data: initialData,
                    status: 'success',
                    error: null,
                    lastUpdated: Date.now()
                }
            });

            // Phase 2: Background load rest
            const restData = await AppManager.getAllApps(-1, 50);
            if (restData.length > 0) {
                set(state => ({
                    apps: {
                        ...state.apps,
                        data: [...state.apps.data, ...restData],
                        lastUpdated: Date.now()
                    }
                }));
            }
        } catch (error: any) {
            console.error('[FileStore] Failed to load apps:', error);
            set(state => ({
                apps: { ...state.apps, status: 'error', error: error.message }
            }));
        }
    },

    fetchPhotos: async (force = false) => {
        const fetchStartTime = Date.now();
        console.log('[FileStore] ⏱️ fetchPhotos() START');
        const current = get().photos;
        if (!force && current.status === 'success' && current.data.length > 0) return;

        set(state => ({ photos: { ...state.photos, status: 'loading' } }));
        try {
            // Phase 1: Fast initial load (100 items)
            console.log('[FileStore] ⏱️ fetchPhotos Phase 1 calling...');
            const initialData = await FileSystem.getAllPhotos(100, 0);
            console.log('[FileStore] ⏱️ fetchPhotos Phase 1 got', initialData.length, 'photos in', (Date.now() - fetchStartTime) + 'ms');
            set({
                photos: {
                    data: initialData,
                    status: 'success',
                    error: null,
                    lastUpdated: Date.now()
                }
            });

            // Phase 2: Background load rest (user can already browse)
            const restData = await FileSystem.getAllPhotos(-1, 100);
            if (restData.length > 0) {
                set(state => ({
                    photos: {
                        ...state.photos,
                        data: [...state.photos.data, ...restData],
                        lastUpdated: Date.now()
                    }
                }));
            }
        } catch (error: any) {
            console.error('[FileStore] Failed to load photos:', error);
            set(state => ({
                photos: { ...state.photos, status: 'error', error: error.message }
            }));
        }
    },

    fetchVideos: async (force = false) => {
        const current = get().videos;
        if (!force && current.status === 'success' && current.data.length > 0) return;

        set(state => ({ videos: { ...state.videos, status: 'loading' } }));
        try {
            // Phase 1: Fast initial load
            const initialData = await FileSystem.getAllVideos(50, 0);
            set({
                videos: {
                    data: initialData,
                    status: 'success',
                    error: null,
                    lastUpdated: Date.now()
                }
            });

            // Phase 2: Background load rest
            const restData = await FileSystem.getAllVideos(-1, 50);
            if (restData.length > 0) {
                set(state => ({
                    videos: {
                        ...state.videos,
                        data: [...state.videos.data, ...restData],
                        lastUpdated: Date.now()
                    }
                }));
            }
        } catch (error: any) {
            console.error('[FileStore] Failed to load videos:', error);
            set(state => ({
                videos: { ...state.videos, status: 'error', error: error.message }
            }));
        }
    },

    fetchMusic: async (force = false) => {
        const current = get().music;
        if (!force && current.status === 'success' && current.data.length > 0) return;

        set(state => ({ music: { ...state.music, status: 'loading' } }));
        try {
            // Phase 1: Fast initial load
            const initialData = await FileSystem.getAllMusic(50, 0);
            set({
                music: {
                    data: initialData,
                    status: 'success',
                    error: null,
                    lastUpdated: Date.now()
                }
            });

            // Phase 2: Background load rest
            const restData = await FileSystem.getAllMusic(-1, 50);
            if (restData.length > 0) {
                set(state => ({
                    music: {
                        ...state.music,
                        data: [...state.music.data, ...restData],
                        lastUpdated: Date.now()
                    }
                }));
            }
        } catch (error: any) {
            console.error('[FileStore] Failed to load music:', error);
            set(state => ({
                music: { ...state.music, status: 'error', error: error.message }
            }));
        }
    },

    refreshAll: async () => {
        const { fetchApps, fetchPhotos, fetchVideos, fetchMusic, fetchDashboardCounts } = get();
        await Promise.all([
            fetchDashboardCounts(),
            fetchApps(true),
            fetchPhotos(true),
            fetchVideos(true),
            fetchMusic(true)
        ]);
    }
}));

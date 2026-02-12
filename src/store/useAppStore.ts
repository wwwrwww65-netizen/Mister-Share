import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Transfer Item Interface
export interface TransferItem {
    id: string;
    fileName: string;
    fileSize: number;
    timestamp: number;
    success: boolean;
    isReceived: boolean; // true if received, false if sent
    error?: string;
}

// Active Transfer State
export interface ActiveTransferState {
    fileName: string;
    progress: number;
    speed: string;
    timeLeft: string;
    mode: 'send' | 'receive';
}

// App Store Interface
interface AppStore {
    // Transfer History
    history: TransferItem[];
    addToHistory: (item: Omit<TransferItem, 'id' | 'timestamp'>) => void;
    clearHistory: () => void;
    getRecentTransfers: (limit?: number) => TransferItem[];

    // Settings
    language: 'en' | 'ar';
    darkMode: boolean;
    setLanguage: (lang: 'en' | 'ar') => void;
    toggleDarkMode: () => void;

    // Active Transfer
    activeTransfer: ActiveTransferState | null;
    setActiveTransfer: (transfer: ActiveTransferState | null) => void;
    updateProgress: (progress: number) => void;
}

// Create the store
export const useAppStore = create(
    persist<AppStore>(
        (set, get) => ({
            // Transfer History State
            history: [],

            addToHistory: (item) => set((state) => {
                const newItem: TransferItem = {
                    ...item,
                    id: `${Date.now()}-${Math.random()}`,
                    timestamp: Date.now(),
                };
                return {
                    history: [newItem, ...state.history],
                };
            }),

            clearHistory: () => set({ history: [] }),

            getRecentTransfers: (limit = 10) => {
                const { history } = get();
                return history.slice(0, limit);
            },

            // Settings State
            language: 'en',
            darkMode: true,

            setLanguage: (lang) => set({ language: lang }),

            toggleDarkMode: () => set((state) => ({
                darkMode: !state.darkMode
            })),

            // Active Transfer State
            activeTransfer: null,

            setActiveTransfer: (transfer) => set({
                activeTransfer: transfer
            }),

            updateProgress: (progress) => set((state) => {
                if (state.activeTransfer) {
                    return {
                        activeTransfer: {
                            ...state.activeTransfer,
                            progress,
                        },
                    };
                }
                return state;
            }),
        }),
        {
            name: 'mistershare-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

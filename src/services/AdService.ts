import {
    InterstitialAd,
    AdEventType
} from 'react-native-google-mobile-ads';
import NetInfo from '@react-native-community/netinfo';
import { useConnectionStore } from '../store/connectionStore';

// USE TEST IDS FOR DEVELOPMENT TO AVOID POLICY VIOLATIONS
// Replace these with your real Ad Unit IDs from AdMob Dashboard for Production
const INTERSTITIAL_ID = __DEV__
    ? 'ca-app-pub-3940256099942544/1033173712' // Test ID
    : 'ca-app-pub-8298073076766088/4851063770'; // Production Interstitial ID

let interstitial: InterstitialAd | null = null;
let lastAdTime = 0;
const AD_COOLDOWN_MS = 60 * 1000; // 60 Seconds Cooldown

export const AdService = {
    loadInterstitial: async () => {
        // --- SAFEGUARD 1: Check Internet ---
        const netState = await NetInfo.fetch();
        if (!netState.isConnected || !netState.isInternetReachable) {
            console.log('🔇 AdService: No internet. Skipping ad load to protect local P2P network.');
            return;
        }

        // --- SAFEGUARD 2: Protect P2P Connections ---
        const { isConnected, isGroupOwner, isConnecting } = useConnectionStore.getState();
        if (isConnected || isGroupOwner || isConnecting) {
            console.log('🔇 AdService: P2P Connection active. Skipping ad load to prevent socket disruption.');
            return;
        }

        if (interstitial) return; // Already loaded or loading

        console.log('📡 AdService: Loading Interstitial Ad...');
        interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_ID, {
            requestNonPersonalizedAdsOnly: true,
        });

        interstitial.addAdEventListener(AdEventType.LOADED, () => {
            console.log('✅ Interstitial Ad Loaded');
        });

        interstitial.addAdEventListener(AdEventType.CLOSED, () => {
            console.log('❌ Interstitial Ad Closed');
            interstitial = null;
            lastAdTime = Date.now();

            // Wait briefly before reloading to let the UI settle
            setTimeout(() => {
                AdService.loadInterstitial();
            }, 2000);
        });

        interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
            console.log('⚠️ Interstitial Ad Error:', error);
            interstitial = null;
        });

        try {
            interstitial.load();
        } catch (e) {
            console.error('Failed to load ad', e);
        }
    },

    showInterstitial: (force = false) => {
        const { isConnected, isGroupOwner } = useConnectionStore.getState();

        // --- SAFEGUARD 3: Never interrupt active transfers ---
        if (isConnected || isGroupOwner) {
            console.log('🔇 AdService: Skipping Ad Show. P2P is Active.');
            return;
        }

        const now = Date.now();
        const timeSinceLastAd = now - lastAdTime;

        if (!force && timeSinceLastAd < AD_COOLDOWN_MS) {
            console.log(`⏳ Ad Cooldown active. Try again in ${Math.ceil((AD_COOLDOWN_MS - timeSinceLastAd) / 1000)}s`);
            return;
        }

        if (interstitial && interstitial.loaded) {
            interstitial.show();
        } else {
            console.log('⚠️ Interstitial not ready yet');
            AdService.loadInterstitial();
        }
    },
};

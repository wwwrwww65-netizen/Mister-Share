import {
    InterstitialAd,
    TestIds,
    AdEventType
} from 'react-native-google-mobile-ads';

// USE TEST IDS FOR DEVELOPMENT TO AVOID POLICY VIOLATIONS
// Replace these with your real Ad Unit IDs from AdMob Dashboard for Production
// Banner ID is handled in the Component directly.
const INTERSTITIAL_ID = 'ca-app-pub-8298073076766088/4851063770'; // Production Interstitial ID

let interstitial: InterstitialAd | null = null;

let lastAdTime = 0;
const AD_COOLDOWN_MS = 60 * 1000; // 60 Seconds Cooldown (Standard best practice)

export const AdService = {

    loadInterstitial: () => {
        if (interstitial) return; // Already loaded or loading

        interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_ID, {
            requestNonPersonalizedAdsOnly: true,
        });

        interstitial.addAdEventListener(AdEventType.LOADED, () => {
            console.log('✅ Interstitial Ad Loaded');
        });

        interstitial.addAdEventListener(AdEventType.CLOSED, () => {
            console.log('❌ Interstitial Ad Closed');
            interstitial = null;
            // Record time to enforce cooldown
            lastAdTime = Date.now();
            // Reload for next time
            AdService.loadInterstitial();
        });

        interstitial.load();
    },

    showInterstitial: (force = false) => {
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
            // Try to load one for next time
            AdService.loadInterstitial();
        }
    },

};

import {
    InterstitialAd,
    AdEventType,
    BannerAd,
    BannerAdSize,
    TestIds,
} from 'react-native-google-mobile-ads';

// ─────────────────────────────────────────────
// Ad Unit IDs
// ─────────────────────────────────────────────
export const BANNER_AD_UNIT_ID = __DEV__
    ? TestIds.BANNER                             // Test Banner ID
    : 'ca-app-pub-8298073076766088/XXXXXXXXXX';  // ← ضع ID البانر الحقيقي هنا

const INTERSTITIAL_ID = __DEV__
    ? TestIds.INTERSTITIAL                       // Test Interstitial ID
    : 'ca-app-pub-8298073076766088/4851063770';  // Production Interstitial ID

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────
let interstitial: InterstitialAd | null = null;
let isAdLoaded = false;
let isAdLoading = false;
let lastAdTime = 0;
const AD_COOLDOWN_MS = 60 * 1000; // 60 ثانية — وفق توصية AdMob الرسمية (مثل SHAREit وXender)

// ─────────────────────────────────────────────
// AdService
// ─────────────────────────────────────────────
export const AdService = {

    /**
     * يُحمَّل الإعلان مسبقاً في الخلفية —
     * يُستدعى عند بدء التطبيق فقط، لا علاقة له بـ P2P
     * الإعلان يُخزَّن جاهزاً حتى بدون إنترنت لاحقاً
     */
    preloadInterstitial: () => {
        if (isAdLoaded || isAdLoading) {
            console.log('[AdService] Already loaded/loading, skipping.');
            return;
        }

        console.log('[AdService] 📡 Pre-loading Interstitial Ad...');
        isAdLoading = true;

        interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_ID, {
            requestNonPersonalizedAdsOnly: true,
        });

        interstitial.addAdEventListener(AdEventType.LOADED, () => {
            console.log('[AdService] ✅ Interstitial Ad pre-loaded and ready');
            isAdLoaded = true;
            isAdLoading = false;
        });

        interstitial.addAdEventListener(AdEventType.CLOSED, () => {
            console.log('[AdService] Ad closed by user');
            isAdLoaded = false;
            isAdLoading = false;
            interstitial = null;
            lastAdTime = Date.now();

            // أعد التحميل تلقائياً بعد إغلاق الإعلان (جاهز للمرة القادمة)
            setTimeout(() => {
                AdService.preloadInterstitial();
            }, 3000);
        });

        interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
            console.log('[AdService] ⚠️ Ad load error:', error?.message || error);
            isAdLoaded = false;
            isAdLoading = false;
            interstitial = null;

            // أعد المحاولة بعد 30 ثانية عند فشل التحميل
            setTimeout(() => {
                AdService.preloadInterstitial();
            }, 30000);
        });

        try {
            interstitial.load();
        } catch (e) {
            console.error('[AdService] Failed to call load():', e);
            isAdLoading = false;
        }
    },

    /**
     * يعرض الإعلان بعد اكتمال النقل (للمرسل والمستقبل)
     * - لا يعرض إذا لم يكن محملاً
     * - لا يعرض إذا كان الكولداون نشطاً
     */
    showAfterTransfer: () => {
        const now = Date.now();
        const timeSinceLastAd = now - lastAdTime;

        if (timeSinceLastAd < AD_COOLDOWN_MS && lastAdTime !== 0) {
            const remainingSec = Math.ceil((AD_COOLDOWN_MS - timeSinceLastAd) / 1000);
            console.log(`[AdService] ⏳ Cooldown active. ${remainingSec}s remaining.`);
            return;
        }

        if (!interstitial || !isAdLoaded) {
            console.log('[AdService] ⚠️ Ad not ready yet. Loading for next time...');
            AdService.preloadInterstitial();
            return;
        }

        console.log('[AdService] 📺 Showing Interstitial Ad after transfer completion');
        try {
            interstitial.show();
        } catch (e) {
            console.error('[AdService] Failed to show ad:', e);
        }
    },

    /**
     * للاستخدام الاختياري — يُعيد تحميل الإعلان يدوياً
     */
    reload: () => {
        isAdLoaded = false;
        isAdLoading = false;
        interstitial = null;
        AdService.preloadInterstitial();
    },

    /**
     * للتحقق من حالة الإعلان (debugging)
     */
    isReady: () => isAdLoaded,
};

// ─────────────────────────────────────────────
// Export BannerAdSize for use in components
// ─────────────────────────────────────────────
export { BannerAd, BannerAdSize };

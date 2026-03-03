import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';
import { I18nManager } from 'react-native';

import en from './translations/en.json';
import ar from './translations/ar.json';

const RESOURCES = {
    en: { translation: en },
    ar: { translation: ar },
};

const fallback = { languageTag: 'en', isRTL: false };

const { languageTag, isRTL } =
    RNLocalize.findBestLanguageTag(Object.keys(RESOURCES)) || fallback;

// Force RTL if Arabic
if (languageTag === 'ar' && !I18nManager.isRTL) {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(true);
} else if (languageTag !== 'ar' && I18nManager.isRTL) {
    I18nManager.forceRTL(false);
    I18nManager.allowRTL(false);
}

i18n
    .use(initReactI18next)
    .init({
        resources: RESOURCES,
        lng: languageTag,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
        compatibilityJSON: 'v3' as any // For Android
    });

export default i18n;

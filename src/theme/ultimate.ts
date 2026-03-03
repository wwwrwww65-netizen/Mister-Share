import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Premium Dark "Cyber-Glass" Palette
const PALETTE = {
    // Backgrounds
    deepSpace: '#050511',
    midnight: '#0A0A1E',
    void: '#000000',

    // Accents (Neon/Vibrant)
    neonPurple: '#6C63FF',
    electricBlue: '#00D4FF',
    hotPink: '#FF00E5',
    successGreen: '#00FF94',
    warningYellow: '#FFD600',
    dangerRed: '#FF2E55', // Zapya Red-ish
    brightOrange: '#FF6B00',

    // Category Specific (Competitive Analysis)
    catApps: '#FF4757',   // Red/Pink like apps
    catPhotos: '#2ED573', // Green or Blue
    catVideos: '#FFA502', // Orange
    catMusic: '#1E90FF',  // Blue
    catFiles: '#5352ED',  // Purple

    // Glass / Surface
    glassLow: 'rgba(255, 255, 255, 0.05)',
    glassMedium: 'rgba(255, 255, 255, 0.10)',
    glassHigh: 'rgba(255, 255, 255, 0.15)',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    glassShine: 'rgba(255, 255, 255, 0.02)',

    // Text
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.75)',
    textTertiary: 'rgba(255, 255, 255, 0.45)',
};

export const COLORS = {
    background: PALETTE.midnight,
    surface: PALETTE.glassLow,
    surfaceHigh: PALETTE.glassMedium,

    primary: PALETTE.neonPurple,
    secondary: PALETTE.electricBlue,
    tertiary: PALETTE.hotPink,

    // Category Colors
    apps: PALETTE.catApps,
    photos: PALETTE.catPhotos,
    videos: PALETTE.catVideos,
    music: PALETTE.catMusic,
    files: PALETTE.catFiles,

    success: PALETTE.successGreen,
    error: PALETTE.dangerRed,
    warning: PALETTE.warningYellow,
    info: PALETTE.electricBlue,

    white: '#FFFFFF',
    black: '#000000',

    // Component specific
    cardBg: PALETTE.glassLow,
    cardBorder: PALETTE.glassBorder,
    inputBg: 'rgba(0,0,0,0.3)',

    text: PALETTE.textPrimary,
    textDim: PALETTE.textSecondary,
    textMuted: PALETTE.textTertiary,

    // Glass
    glassLow: PALETTE.glassLow,
    glassMedium: PALETTE.glassMedium,
    glassHigh: PALETTE.glassHigh,
    glassBorder: PALETTE.glassBorder,
    glassShine: PALETTE.glassShine,

    // Raw Colors (for specific needs)
    midnight: PALETTE.midnight,
    deepSpace: PALETTE.deepSpace,

    // Gradients
    gradientPrimary: [PALETTE.neonPurple, '#8E84FF'],
    gradientSecondary: [PALETTE.electricBlue, '#5EEDFF'],
    gradientApps: [PALETTE.catApps, '#FF6B81'],
    gradientMusic: [PALETTE.catMusic, '#70A1FF'],
    gradientDark: ['#1A1A2E', '#0A0A1E'],
    gradientOverlay: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.8)'],
};

export const SIZES = {
    // Global
    base: 8,
    font: 14,
    radius: 20,
    radiusSm: 12,
    radiusMd: 16,
    radiusLg: 24,
    padding: 20,
    margin: 20,

    // Font Sizes
    h1: 32,
    h2: 24,
    h3: 18,
    h4: 16,
    body1: 16,
    body2: 14,
    caption: 12,
    small: 10,

    // Dimensions
    width,
    height,
};

export const FONTS = {
    h1: { fontSize: SIZES.h1, fontWeight: '700' as '700', letterSpacing: 0.5, color: COLORS.text },
    h2: { fontSize: SIZES.h2, fontWeight: '700' as '700', letterSpacing: 0.5, color: COLORS.text },
    h3: { fontSize: SIZES.h3, fontWeight: '600' as '600', letterSpacing: 0.5, color: COLORS.text },
    h4: { fontSize: SIZES.h4, fontWeight: '600' as '600', letterSpacing: 0.2, color: COLORS.text },
    body1: { fontSize: SIZES.body1, fontWeight: '400' as '400', color: COLORS.textDim },
    body2: { fontSize: SIZES.body2, fontWeight: '400' as '400', color: COLORS.textDim },
    body3: { fontSize: 12, fontWeight: '400' as '400', color: COLORS.textDim },
    body4: { fontSize: 11, fontWeight: '400' as '400', color: COLORS.textDim },
    caption: { fontSize: SIZES.caption, fontWeight: '400' as '400', color: COLORS.textDim },
    small: { fontSize: SIZES.small, fontWeight: '400' as '400', color: COLORS.textMuted },
};

export const SHADOWS = {
    none: {
        shadowColor: 'transparent',
        shadowOpacity: 0,
        elevation: 0,
    },
    glow: {
        shadowColor: PALETTE.neonPurple,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 15,
        elevation: 8,
    },
    card: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    text: {
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    }
};

const appTheme = { COLORS, SIZES, FONTS, SHADOWS };
export default appTheme;

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../theme/ultimate';

interface CategoryItem {
    id: string;
    labelKey: string;
    icon: string;
    color: string;
    gradient: string[];
    count?: number;
    onPress: () => void;
}

interface CategoryGridProps {
    items?: CategoryItem[];
    onPressCategory?: (id: string) => void;
    style?: ViewStyle;
}

// Default categories if none provided
const DEFAULT_CATEGORIES: CategoryItem[] = [
    { id: 'Apps', labelKey: 'common.apps', icon: 'android', color: COLORS.apps, gradient: COLORS.gradientApps, onPress: () => { } },
    { id: 'Photos', labelKey: 'common.photos', icon: 'image', color: COLORS.photos, gradient: [COLORS.photos, '#7BED9F'], onPress: () => { } },
    { id: 'Videos', labelKey: 'common.videos', icon: 'play-circle-filled', color: COLORS.videos, gradient: [COLORS.videos, '#FFC312'], onPress: () => { } },
    { id: 'Music', labelKey: 'common.music', icon: 'music-note', color: '#E91E63', gradient: ['#E91E63', '#FF80AB'], onPress: () => { } },
    { id: 'Files', labelKey: 'common.files', icon: 'folder', color: COLORS.files, gradient: [COLORS.files, '#A3CB38'], onPress: () => { } },
];

const CategoryGrid: React.FC<CategoryGridProps> = ({ items = DEFAULT_CATEGORIES, style, onPressCategory }) => {
    const { t } = useTranslation();

    return (
        <View style={[styles.gridContainer, style]}>
            {items.map((item, index) => {
                const isLarge = index === 0; // First item is larger/prominent

                return (
                    <TouchableOpacity
                        key={item.id}
                        style={[styles.cardWrapper, isLarge ? styles.cardLarge : styles.cardNormal]}
                        activeOpacity={0.8}
                        onPress={() => onPressCategory ? onPressCategory(item.id) : item.onPress()}
                    >
                        <View style={styles.glassContainer}>
                            <LinearGradient
                                colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.03)']}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />

                            <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                                <Icon name={item.icon} size={isLarge ? 32 : 24} color={item.color} />
                            </View>

                            <View style={styles.textContainer}>
                                <Text style={styles.label}>{t(item.labelKey)}</Text>
                                {item.count !== undefined && (
                                    <Text style={styles.count}>{item.count} {t('common.items', { defaultValue: 'items' })}</Text>
                                )}
                            </View>

                            {/* Decorative gradient orb */}
                            <LinearGradient
                                colors={item.gradient}
                                style={styles.orb}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                        </View>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    cardWrapper: {
        borderRadius: SIZES.radiusMd,
        overflow: 'hidden',
        ...SHADOWS.card,
    },
    cardLarge: {
        width: '100%',
        height: 100,
        marginBottom: 8,
    },
    cardNormal: {
        width: (SIZES.width - 40 - 12) / 2, // (Screen width - padding - gap) / 2
        height: 100,
        marginBottom: 8,
    },
    glassContainer: {
        flex: 1,
        backgroundColor: COLORS.glassLow,
        borderColor: COLORS.glassBorder,
        borderWidth: 1,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
        zIndex: 2,
    },
    label: {
        ...FONTS.h3,
        color: COLORS.white,
        marginBottom: 4,
    },
    count: {
        ...FONTS.caption,
        color: COLORS.textDim,
    },
    orb: {
        position: 'absolute',
        right: -20,
        bottom: -20,
        width: 80,
        height: 80,
        borderRadius: 40,
        opacity: 0.2,
        zIndex: 1,
    }
});

export default CategoryGrid;

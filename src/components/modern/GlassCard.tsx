import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { COLORS, SIZES, SHADOWS } from '../../theme';

interface GlassCardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    variant?: 'light' | 'medium' | 'dark' | 'heavy';
}

const GlassCard: React.FC<GlassCardProps> = ({ children, style, variant = 'medium' }) => {

    const getVariantStyle = () => {
        switch (variant) {
            case 'light':
                return styles.light;
            case 'dark':
                return styles.dark;
            case 'heavy':
                return styles.heavy;
            case 'medium':
            default:
                return {};
        }
    };

    return (
        <View style={[styles.card, getVariantStyle(), style]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.cardBg,
        borderColor: COLORS.cardBorder,
        borderWidth: 1.5,
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        ...SHADOWS.card,
    },
    light: {
        backgroundColor: COLORS.glassHigh,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    dark: {
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderColor: COLORS.glassBorder,
    },
    heavy: {
        backgroundColor: COLORS.glassMedium,
        borderWidth: 2,
    }
});

export default GlassCard;

import React, { useRef } from 'react';
import { Text, Pressable, StyleSheet, Animated, ViewStyle, TextStyle, StyleProp, DimensionValue } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS, SIZES, SHADOWS } from '../../theme';

interface NeoButtonProps {
    label: string;
    onPress: () => void;
    icon?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    variant?: 'primary' | 'secondary' | 'outline';
    width?: DimensionValue;
}

const NeoButton: React.FC<NeoButtonProps> = ({
    label,
    onPress,
    icon,
    style,
    textStyle,
    variant = 'primary',
    width
}) => {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scale, {
            toValue: 0.96,
            useNativeDriver: true,
            friction: 5,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            friction: 5,
        }).start();
    };

    const getColors = () => {
        if (variant === 'secondary') return COLORS.gradientSecondary;
        return COLORS.gradientPrimary;
    };

    if (variant === 'outline') {
        return (
            <Pressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={[styles.outlineContainer, { width }, style]}
            >
                <Animated.View style={{ transform: [{ scale }] }}>
                    <Text style={[styles.label, { color: COLORS.primary }, textStyle]}>{label}</Text>
                </Animated.View>
            </Pressable>
        );
    }

    return (
        <Pressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
        >
            <Animated.View style={[{ transform: [{ scale }], width }, style]}>
                <LinearGradient
                    colors={getColors()}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradient}
                >
                    {icon && <Animated.View style={{ marginRight: 8 }}>{icon}</Animated.View>}
                    <Text style={[styles.label, textStyle]}>{label}</Text>
                </LinearGradient>
            </Animated.View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    gradient: {
        flexDirection: 'row',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: SIZES.radius,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.glow, // Neon glow effect
    },
    outlineContainer: {
        paddingVertical: 15,
        paddingHorizontal: 23, // -1 for border
        borderRadius: SIZES.radius,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        backgroundColor: 'transparent',
    },
    label: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.white,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
});

export default NeoButton;

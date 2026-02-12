import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { COLORS, FONTS } from '../../theme';

interface WarpCoreProps {
    totalProgress: number; // 0 to 1
    fileProgress: number; // 0 to 1
    speed: number; // Bytes per second
    status: string;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

const WarpCore: React.FC<WarpCoreProps> = ({ totalProgress, fileProgress, speed, status }) => {
    const size = 220;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;

    // Animations
    const innerRotation = useRef(new Animated.Value(0)).current;
    const outerRotation = useRef(new Animated.Value(0)).current;
    const pulseScale = useRef(new Animated.Value(1)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Animate progress smoothly
        Animated.timing(progressAnim, {
            toValue: totalProgress,
            duration: 500,
            useNativeDriver: true, // Use false for SVG props usually, but we might control rotation? No, strokeDashoffset needs setNativeProps or state
        }).start();

        // Spin loops
        Animated.loop(
            Animated.timing(innerRotation, {
                toValue: 1,
                duration: 3000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();

        Animated.loop(
            Animated.timing(outerRotation, {
                toValue: 1,
                duration: 8000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    }, [totalProgress]);

    // Speed-based Pulse
    useEffect(() => {
        const isTransferring = status.includes('sending') || status.includes('receiving') || speed > 0;

        if (isTransferring) {
            // Faster pulse for higher speed
            const duration = speed > 5 * 1024 * 1024 ? 500 : 1500;

            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseScale, {
                        toValue: 1.05 + (speed / (50 * 1024 * 1024)), // Subtle scale up based on speed
                        duration: duration,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseScale, {
                        toValue: 1,
                        duration: duration,
                        useNativeDriver: true,
                    })
                ])
            ).start();
        } else {
            pulseScale.setValue(1);
        }
    }, [speed, status]);

    const innerSpin = innerRotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    const outerSpin = outerRotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['360deg', '0deg'] // Counter rotate
    });

    // Calculate strokeDashoffset derived from prop directly for simplicity in this version, 
    // or use a Reanimated value for smoothness. For now simple JS math is okay for 60fps UI.
    const strokeDashoffset = circumference - (totalProgress * circumference);
    const fileStrokeDashoffset = circumference - (fileProgress * circumference);

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            {/* Background Glow */}
            <Animated.View style={[styles.glow, { transform: [{ scale: pulseScale }] }]} />

            <Svg width={size} height={size}>
                <Defs>
                    <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0" stopColor={COLORS.primary} stopOpacity="1" />
                        <Stop offset="1" stopColor={COLORS.secondary} stopOpacity="1" />
                    </LinearGradient>
                </Defs>

                {/* Outer Ring (Total Progress) - Static Background */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth={strokeWidth}
                />

                {/* Outer Ring - Progress */}
                <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
                    <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="url(#grad)"
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                    />
                </G>

                {/* Decorative Rotating Elements */}
                {/* We create a transparent view overlay for rotation using Native Driver usually, 
                    but SVG rotation is separate. */}
            </Svg>

            {/* Inner Rotating Ring UI (Overlay) */}
            <Animated.View style={[styles.ringContainer, { transform: [{ rotate: outerSpin }] }]}>
                <View style={[styles.dash, { top: 0 }]} />
                <View style={[styles.dash, { bottom: 0 }]} />
            </Animated.View>

            <Animated.View style={[styles.ringContainer, { width: size - 40, height: size - 40, transform: [{ rotate: innerSpin }] }]}>
                <View style={[styles.dot, { top: 10, left: '50%' }]} />
                <View style={[styles.dot, { bottom: 10, left: '50%' }]} />
                <View style={[styles.dot, { left: 10, top: '50%' }]} />
                <View style={[styles.dot, { right: 10, top: '50%' }]} />
            </Animated.View>

            {/* Center Text */}
            <View style={styles.centerText}>
                <Text style={styles.percentage}>
                    {Math.round(totalProgress * 100)}<Text style={styles.percentSymbol}>%</Text>
                </Text>
                <Text style={styles.status} numberOfLines={1}>{status}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    glow: {
        position: 'absolute',
        width: '80%',
        height: '80%',
        borderRadius: 100,
        backgroundColor: COLORS.primary,
        opacity: 0.15,
        zIndex: -1,
    },
    centerText: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    percentage: {
        ...FONTS.h1,
        fontSize: 48,
        color: COLORS.white,
        fontWeight: 'bold',
        textShadowColor: COLORS.primary,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    percentSymbol: {
        fontSize: 24,
        color: COLORS.secondary,
    },
    status: {
        ...FONTS.caption,
        color: COLORS.textDim,
        marginTop: 5,
        maxWidth: 140,
        textAlign: 'center',
    },
    ringContainer: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderRadius: 200,
    },
    dash: {
        position: 'absolute',
        width: 4,
        height: 15,
        backgroundColor: COLORS.secondary,
        borderRadius: 2,
    },
    dot: {
        position: 'absolute',
        width: 6,
        height: 6,
        backgroundColor: COLORS.primary,
        borderRadius: 3,
    }
});

export default WarpCore;

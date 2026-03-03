import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { COLORS, SIZES } from '../../theme/ultimate';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Pulse Circle Component
const PulseCircle = ({ delay, size, color }: { delay: number; size: number; color: string }) => {
    const scale = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.parallel([
                Animated.timing(scale, {
                    toValue: 2,
                    duration: 2000,
                    delay: delay,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.ease),
                }),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 2000,
                    delay: delay,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.ease),
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    return (
        <Animated.View
            style={[
                styles.circle,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    borderColor: color,
                    backgroundColor: color + '10', // 10% opacity
                    transform: [{ scale }],
                    opacity,
                },
            ]}
        />
    );
};

const RadarScan = () => {
    return (
        <View style={styles.container}>
            <View style={styles.centerNode}>
                {/* Static center or user avatar */}
                <View style={styles.avatar}>
                    <Icon name="person" size={40} color="#FFF" />
                </View>
            </View>

            <PulseCircle delay={0} size={150} color={COLORS.primary} />
            <PulseCircle delay={600} size={150} color={COLORS.primary} />
            <PulseCircle delay={1200} size={150} color={COLORS.primary} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 300,
        width: '100%',
    },
    centerNode: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.midnight,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        borderWidth: 2,
        borderColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
        elevation: 10,
    },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: COLORS.gradientPrimary[0],
        alignItems: 'center',
        justifyContent: 'center',
    },
    circle: {
        position: 'absolute',
        borderWidth: 1,
    }
});

export default RadarScan;

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, useWindowDimensions, StatusBar, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, FONTS, SHADOWS } from '../theme';

const SplashScreen = () => {
    const { width, height } = useWindowDimensions();
    
    // Animation Values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.7)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const barWidth = useRef(new Animated.Value(0)).current;
    const orbAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Main Entrance Animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1200,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 3.5,
                tension: 40,
                useNativeDriver: true,
            }),
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 2500,
                useNativeDriver: true,
            }),
            Animated.timing(orbAnim, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: true,
            })
        ]).start();

        // Loading Bar Animation
        Animated.timing(barWidth, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: false,
        }).start();
    }, []);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    const progressWidth = barWidth.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%']
    });

    return (
        <View style={styles.container}>
            <StatusBar hidden />
            
            {/* Background Gradient */}
            <LinearGradient
                colors={['#1A1A2E', '#050511']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            {/* Glowing Orbs (Abstract Design) */}
            <Animated.View style={[styles.orb, { 
                top: height * 0.2, 
                left: -50, 
                backgroundColor: COLORS.primary,
                opacity: Animated.multiply(orbAnim, 0.15),
                transform: [{ scale: orbAnim }]
            }]} />
            <Animated.View style={[styles.orb, { 
                bottom: height * 0.1, 
                right: -50, 
                backgroundColor: COLORS.secondary,
                opacity: Animated.multiply(orbAnim, 0.15),
                transform: [{ scale: orbAnim }]
            }]} />

            <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                {/* App Logo */}
                <View style={styles.logoContainer}>
                    <Animated.View style={[styles.glowRing, { transform: [{ rotate: spin }] }]} />
                    <View style={styles.iconCircle}>
                        <Image 
                            source={require('../../android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png')} 
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                    </View>
                </View>

                {/* Text Elements */}
                <View style={styles.textContainer}>
                    <Text style={styles.brandName}>MISTER <Text style={{ color: COLORS.secondary }}>SHARE</Text></Text>
                    <Text style={styles.tagline}>Hyper-Speed File Transfer</Text>
                </View>

                {/* Modern Loading Bar */}
                <View style={styles.loadingTrack}>
                    <Animated.View style={[styles.loadingProgress, { width: progressWidth }]}>
                        <LinearGradient
                            colors={[COLORS.primary, COLORS.secondary]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={StyleSheet.absoluteFill}
                        />
                    </Animated.View>
                </View>
            </Animated.View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>Powered by 5GHz Technology</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#050511',
    },
    orb: {
        position: 'absolute',
        width: 250,
        height: 250,
        borderRadius: 125,
        opacity: 0.15,
        filter: 'blur(60px)', // Note: blur doesn't work exact same on all RN versions, usually requires additional lib or specific prop
    },
    content: {
        alignItems: 'center',
        width: '100%',
    },
    logoContainer: {
        width: 150,
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.1)',
        ...SHADOWS.glow,
    },
    logoImage: {
        width: 80,
        height: 80,
        borderRadius: 20,
    },
    glowRing: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 2,
        borderColor: COLORS.primary,
        borderStyle: 'dashed',
        opacity: 0.5,
    },
    textContainer: {
        alignItems: 'center',
    },
    brandName: {
        ...FONTS.h1,
        fontSize: 38,
        color: COLORS.white,
        letterSpacing: 4,
        textAlign: 'center',
        ...SHADOWS.text,
    },
    tagline: {
        ...FONTS.body2,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 10,
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    loadingTrack: {
        width: '60%',
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 2,
        marginTop: 50,
        overflow: 'hidden',
    },
    loadingProgress: {
        height: '100%',
        borderRadius: 2,
    },
    footer: {
        position: 'absolute',
        bottom: 50,
    },
    footerText: {
        ...FONTS.small,
        color: 'rgba(255,255,255,0.3)',
        letterSpacing: 1,
    }
});

export default SplashScreen;

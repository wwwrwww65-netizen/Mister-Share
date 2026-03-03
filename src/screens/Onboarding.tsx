import React, { useRef, useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, useWindowDimensions, InteractionManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PagerView from 'react-native-pager-view';
import { COLORS, FONTS, SIZES, SHADOWS } from '../theme';
import AppBackground from '../components/modern/AppBackground';
import GlassCard from '../components/modern/GlassCard';
import NeoButton from '../components/modern/NeoButton';
import PermissionsManager from '../services/PermissionsManager';
import { useFileStore } from '../store/fileStore';

const Paginator = ({ data, scrollX, width }: any) => {
    return (
        <View style={styles.paginator}>
            {data.map((_: any, i: number) => {
                const inputRange = [(i - 1), i, (i + 1)];
                const dotWidth = scrollX.interpolate({
                    inputRange,
                    outputRange: [8, 24, 8],
                    extrapolate: 'clamp',
                });
                const opacity = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.3, 1, 0.3],
                    extrapolate: 'clamp',
                });

                return (
                    <Animated.View
                        key={i.toString()}
                        style={[
                            styles.dot,
                            { width: dotWidth, opacity }
                        ]}
                    />
                );
            })}
        </View>
    );
};

const Onboarding = ({ navigation }: any) => {
    const { t } = useTranslation();
    const { width } = useWindowDimensions();
    const pagerRef = useRef<PagerView>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Animation values
    const scrollX = useRef(new Animated.Value(0)).current; // Keeps track of page position for Paginator
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideUpAnim = useRef(new Animated.Value(50)).current;

    useEffect(() => {
        // Simple entrance animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.spring(slideUpAnim, {
                toValue: 0,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();
    }, [currentIndex]); 

    const slides = useMemo(() => [
        {
            id: '1',
            title: t('onboarding.title_1', { defaultValue: 'Hyper Speed Transfer' }),
            description: t('onboarding.desc_1', { defaultValue: 'Share apps, videos, and music instantly with nearby devices using 5GHz technology.' }),
            icon: 'rocket-launch',
            color: COLORS.primary
        },
        {
            id: '2',
            title: t('onboarding.title_2', { defaultValue: 'Secure & Offline' }),
            description: t('onboarding.desc_2', { defaultValue: 'Your data stays safe. No internet required. Completely private peer-to-peer sharing.' }),
            icon: 'security',
            color: COLORS.secondary
        }
    ], [t]);

    const handlePageScroll = (e: any) => {
        const { position, offset } = e.nativeEvent;
        // Update the Animated Value directly to drive the Paginator
        scrollX.setValue(position + offset);
    };

    const handlePageSelected = (e: any) => {
        const newIndex = e.nativeEvent.position;
        if (newIndex !== currentIndex) {
            setCurrentIndex(newIndex);
            
            // Re-trigger entrance animations
            fadeAnim.setValue(0);
            slideUpAnim.setValue(30);
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
                Animated.spring(slideUpAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
            ]).start();
        }
    };

    const scrollToNext = async () => {
        if (currentIndex < slides.length - 1) {
            const nextIndex = currentIndex + 1;
            pagerRef.current?.setPage(nextIndex);
        } else {
            try {
                // Request permissions AFTER slides
                const status = await PermissionsManager.requestMediaPermissionsOnly();
                await PermissionsManager.requestNotificationPermission();

                if (status === 'granted') {
                    useFileStore.getState().setPermissionGranted(true);
                    useFileStore.getState().initialize();
                } else {
                    useFileStore.getState().setPermissionGranted(false);
                    useFileStore.getState().fetchApps();
                }

                await AsyncStorage.setItem('hasLaunched', 'true');
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'Main' }],
                });
            } catch (error) {
                navigation.replace('Main');
            }
        }
    };

    return (
        <AppBackground hideStatusBar>
            <View style={styles.container}>
                <PagerView
                    ref={pagerRef}
                    style={styles.pagerView}
                    initialPage={0}
                    onPageScroll={handlePageScroll}
                    onPageSelected={handlePageSelected}
                >
                    {slides.map((item) => (
                        <View key={item.id} style={styles.page}>
                            <View style={[styles.itemContainer, { width }]}>
                                <View style={styles.iconContainer}>
                                    <Animated.View style={[styles.glowBackground, { backgroundColor: item.color, transform: [{ scale: fadeAnim }] }]} />
                                    <View style={[styles.iconCircle, { borderColor: 'rgba(255,255,255,0.2)' }]}>
                                        <Icon name={item.icon} size={100} color={item.color} />
                                    </View>
                                </View>
                                
                                <Animated.View style={{ width: '100%', opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }}>
                                    <GlassCard style={styles.textCard} variant="heavy">
                                        <Text style={styles.title}>{item.title}</Text>
                                        <Text style={styles.description}>{item.description}</Text>
                                    </GlassCard>
                                </Animated.View>
                            </View>
                        </View>
                    ))}
                </PagerView>

                <View style={styles.bottomContainer}>
                    <Paginator data={slides} scrollX={scrollX} width={width} />
                    
                    <NeoButton
                        label={currentIndex === slides.length - 1 ? t('onboarding.get_started', { defaultValue: 'Get Started' }) : t('common.next', { defaultValue: 'Next' })}
                        onPress={scrollToNext}
                        width="85%"
                        style={{ marginBottom: 40 }}
                        icon={<Icon name={currentIndex === slides.length - 1 ? "check" : "arrow-forward"} size={22} color={COLORS.white} />}
                    />
                </View>
            </View>
        </AppBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    pagerView: {
        flex: 1,
    },
    page: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        paddingBottom: 150,
    },
    iconContainer: {
        flex: 0.45,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 60,
    },
    glowBackground: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        opacity: 0.25,
    },
    iconCircle: {
        width: 180,
        height: 180,
        borderRadius: 90,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        backgroundColor: 'rgba(255,255,255,0.05)',
        ...SHADOWS.card,
    },
    textCard: {
        width: '100%',
        padding: 32,
        alignItems: 'center',
        borderRadius: 32,
    },
    title: {
        ...FONTS.h1,
        color: COLORS.white,
        textAlign: 'center',
        marginBottom: 16,
        fontSize: 34,
    },
    description: {
        ...FONTS.body1,
        color: COLORS.textDim,
        textAlign: 'center',
        lineHeight: 26,
    },
    bottomContainer: {
        paddingHorizontal: 24,
        paddingBottom: 24,
        width: '100%',
        alignItems: 'center',
        position: 'absolute',
        bottom: 0,
        zIndex: 10,
        elevation: 10,
    },
    paginator: {
        flexDirection: 'row',
        height: 40,
        alignItems: 'center',
        marginBottom: 20,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.primary,
        marginHorizontal: 4,
    },
});

export default Onboarding;

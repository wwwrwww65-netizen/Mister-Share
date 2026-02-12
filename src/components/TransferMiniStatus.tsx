import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTransferStore } from '../store/transferStore';
import { COLORS, FONTS, SIZES } from '../theme';
import GlassCard from './modern/GlassCard';

const TransferMiniStatus = () => {
    const navigation = useNavigation<any>();
    const { t } = useTranslation();
    const { status, queue, currentIndex, getCurrentItem } = useTransferStore();

    const translateY = useRef(new Animated.Value(-100)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const spinValue = useRef(new Animated.Value(0)).current;

    const currentItem = getCurrentItem();
    const isVisible = status === 'running' || status === 'paused';

    useEffect(() => {
        if (isVisible) {
            // Enter animation
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 0,
                    friction: 6,
                    tension: 50,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                })
            ]).start();

            // Continuous spin animation for the icon
            Animated.loop(
                Animated.timing(spinValue, {
                    toValue: 1,
                    duration: 2000, // 2 seconds per rotation
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();
        } else {
            // Exit animation
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: -100,
                    duration: 300,
                    easing: Easing.in(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                })
            ]).start();

            spinValue.setValue(0);
        }
    }, [isVisible]);

    if (!isVisible && !currentItem) return null;

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    const getStatusText = () => {
        if (status === 'paused') return t('common.paused', { defaultValue: 'Paused' });
        if (!currentItem) return t('common.preparing', { defaultValue: 'Preparing...' });

        // Check if sending or receiving based on item type or history inference? 
        // Actually store doesn't explicitly talk about global mode, but item has details.
        // We can just show "Transferring: Filename"
        return currentItem.name;
    };

    const getStatusSubtext = () => {
        // Show progress if possible, e.g. "3/10 files"
        if (queue.length > 1) {
            return `${currentIndex + 1}/${queue.length} • ${Math.round(currentItem?.progress || 0) * 100}%`;
        }
        return `${Math.round(currentItem?.progress || 0) * 100}%`;
    };

    return (
        <Animated.View
            style={[styles.container, { transform: [{ translateY }], opacity }]}
            pointerEvents="box-none"
        >
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => navigation.navigate('Transfer', { mode: 'auto-detect' })} // We will fix Transfer to handle this
            >
                <GlassCard variant="heavy" style={styles.card}>
                    <View style={styles.content}>
                        {/* Animated Icon */}
                        <View style={styles.iconContainer}>
                            <Animated.View style={{ transform: [{ rotate: spin }] }}>
                                <Icon name="sync" size={20} color={COLORS.primary} />
                            </Animated.View>
                        </View>

                        {/* Text Info */}
                        <View style={styles.textContainer}>
                            <Text style={styles.title} numberOfLines={1}>
                                {getStatusText()}
                            </Text>
                            <Text style={styles.subtitle}>
                                {getStatusSubtext()}
                            </Text>
                        </View>

                        {/* Chevron/Action */}
                        <Icon name="chevron-right" size={24} color={COLORS.textDim} />
                    </View>

                    {/* Progress Bar Line */}
                    {currentItem && (
                        <View style={styles.progressBarBg}>
                            <View
                                style={[
                                    styles.progressBarFill,
                                    { width: `${(currentItem.progress || 0) * 100}%` }
                                ]}
                            />
                        </View>
                    )}
                </GlassCard>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0, // Adjust based on header needs
        left: 20,
        right: 20,
        zIndex: 100,
        // We might want to position this inside the header structure or floating
    },
    card: {
        padding: 12,
        borderRadius: 16,
        paddingBottom: 14, // Extra space for progress bar
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(108, 99, 255, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        ...FONTS.h4,
        color: COLORS.white,
        fontSize: 14,
        fontWeight: '600',
    },
    subtitle: {
        ...FONTS.caption,
        color: COLORS.secondary,
        fontSize: 12,
        marginTop: 2,
    },
    progressBarBg: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: COLORS.primary,
    }
});

export default TransferMiniStatus;

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useTransferStore } from '../store/transferStore';
import { COLORS, FONTS, SHADOWS } from '../theme';

const TransferMiniStatus = () => {
    const navigation = useNavigation<any>();
    const { status, getCurrentItem } = useTransferStore();
    
    // Animation Values
    const scale = useRef(new Animated.Value(0)).current;
    const spinValue = useRef(new Animated.Value(0)).current;

    const isVisible = status === 'running' || status === 'paused';

    useEffect(() => {
        if (isVisible) {
            // Enter Animation (Pop up)
            Animated.spring(scale, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }).start();

            // Continuous Spin Animation
            Animated.loop(
                Animated.timing(spinValue, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();
        } else {
            // Exit Animation (Shrink)
            Animated.timing(scale, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
            
            spinValue.setValue(0);
        }
    }, [isVisible]);

    if (!isVisible) return null;

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    const currentItem = getCurrentItem();
    // Use item progress if available, otherwise just show spinner without % if starting
    const currentProgress = currentItem ? Math.round((currentItem.progress || 0) * 100) : 0;

    return (
        <Animated.View style={[styles.container, { transform: [{ scale }] }]} pointerEvents="box-none">
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Transfer')}
                style={styles.fab}
            >
                {/* Background Ring to show progress could be added here later */}
                
                {/* Spinning Icon */}
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                    <Icon name="sync" size={30} color="#FFF" />
                </Animated.View>

                {/* Progress Badge */}
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{currentProgress}%</Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 90, // Above the Tab Bar (usually ~60-80px)
        right: 20,
        zIndex: 9999, // Ensure it's on top of everything
    },
    fab: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        // Shadow manual since SHADOWS.medium might not exist
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.27,
        shadowRadius: 4.65,
        elevation: 6,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    badge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: COLORS.secondary,
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: COLORS.black,
    },
    badgeText: {
        ...FONTS.caption,
        color: COLORS.black,
        fontSize: 10,
        fontWeight: 'bold',
    }
});

export default TransferMiniStatus;

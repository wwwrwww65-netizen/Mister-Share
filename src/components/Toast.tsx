import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { COLORS } from '../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import GlassCard from './modern/GlassCard';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
    message: string;
    type?: ToastType;
    duration?: number;
    onHide?: () => void;
}

const Toast: React.FC<ToastProps> = ({
    message,
    type = 'info',
    duration = 3000,
    onHide
}) => {
    const translateY = useRef(new Animated.Value(-100)).current;

    useEffect(() => {
        // Show animation
        Animated.spring(translateY, {
            toValue: 0,
            friction: 6,
            tension: 40,
            useNativeDriver: true,
        }).start();

        // Auto hide
        const timer = setTimeout(() => {
            hide();
        }, duration);

        return () => clearTimeout(timer);
    }, []);

    const hide = () => {
        Animated.timing(translateY, {
            toValue: -120,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            onHide?.();
        });
    };

    const getIcon = () => {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'error';
            case 'warning': return 'warning';
            default: return 'info';
        }
    };

    const getColor = () => {
        switch (type) {
            case 'success': return COLORS.success;
            case 'error': return COLORS.error;
            case 'warning': return '#F59E0B';
            default: return COLORS.primary;
        }
    };

    return (
        <Animated.View style={[styles.wrapper, { transform: [{ translateY }] }]}>
            <GlassCard style={[styles.container, { borderLeftWidth: 4, borderLeftColor: getColor() }]} variant="heavy">
                <Icon name={getIcon()} size={24} color={getColor()} />
                <Text style={styles.message} numberOfLines={2}>
                    {message}
                </Text>
                <TouchableOpacity onPress={hide} style={styles.closeButton}>
                    <Icon name="close" size={20} color={COLORS.textDim} />
                </TouchableOpacity>
            </GlassCard>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        zIndex: 9999,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingVertical: 12,
    },
    message: {
        flex: 1,
        color: COLORS.white,
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 12,
        marginRight: 8,
    },
    closeButton: {
        padding: 4,
    },
});

export default Toast;

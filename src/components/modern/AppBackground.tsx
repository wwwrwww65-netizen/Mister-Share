import React from 'react';
import { StyleSheet, View, ImageBackground, StatusBar, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS } from '../../theme';

interface AppBackgroundProps {
    children: React.ReactNode;
    style?: ViewStyle;
    hideStatusBar?: boolean;
}

const AppBackground: React.FC<AppBackgroundProps> = ({ children, style, hideStatusBar = false }) => {
    return (
        <View style={[styles.container, style]}>
            {!hideStatusBar && (
                <StatusBar
                    barStyle="light-content"
                    backgroundColor="transparent"
                    translucent={true}
                />
            )}

            {/* Base Background Layer */}
            <LinearGradient
                colors={COLORS.gradientDark}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            {/* Ambient Glows (Simulated Mesh Gradient) */}
            <View style={styles.topGlow} />
            <View style={styles.bottomGlow} />

            {/* Content Layer */}
            <View style={styles.content}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        flex: 1,
        zIndex: 1,
    },
    topGlow: {
        position: 'absolute',
        top: -100,
        left: -50,
        width: 400,
        height: 400,
        borderRadius: 200,
        backgroundColor: COLORS.primary,
        opacity: 0.08,
        transform: [{ scaleX: 1.5 }],
    },
    bottomGlow: {
        position: 'absolute',
        bottom: -100,
        right: -50,
        width: 350,
        height: 350,
        borderRadius: 175,
        backgroundColor: COLORS.secondary,
        opacity: 0.08,
        transform: [{ scaleX: 1.5 }],
    }
});

export default AppBackground;

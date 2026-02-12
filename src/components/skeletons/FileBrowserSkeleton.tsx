import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { COLORS, SIZES } from '../../theme';

const { width } = Dimensions.get('window');

const SkeletonItem = ({ style }: { style: any }) => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    return (
        <Animated.View
            style={[
                {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    opacity,
                    borderRadius: 8,
                },
                style,
            ]}
        />
    );
};

export const FileBrowserSkeleton = () => {
    return (
        <View style={styles.container}>
            {/* Folder / List Skeleton Items */}
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <View key={i} style={styles.row}>
                    <SkeletonItem style={styles.icon} />
                    <View style={styles.info}>
                        <SkeletonItem style={styles.title} />
                        <SkeletonItem style={styles.subtitle} />
                        <View style={styles.divider} />
                    </View>
                </View>
            ))}
        </View>
    );
};

export const GridSkeleton = () => {
    return (
        <View style={styles.gridContainer}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                <View key={i} style={styles.gridItem}>
                    <SkeletonItem style={{ width: '100%', height: '100%' }} />
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: SIZES.padding,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        height: 50,
    },
    icon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 16,
    },
    info: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        width: '60%',
        height: 14,
        marginBottom: 8,
    },
    subtitle: {
        width: '30%',
        height: 10,
    },
    divider: {
        position: 'absolute',
        bottom: -8,
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    gridContainer: {
        padding: SIZES.padding,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    gridItem: {
        width: (width - SIZES.padding * 2 - 20) / 3, // 3 columns
        height: 100,
        marginBottom: 10,
        borderRadius: 8,
        overflow: 'hidden',
    }
});

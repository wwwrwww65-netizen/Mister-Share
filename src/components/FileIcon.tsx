import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../theme';

// In a real app, use SVG icons. For now, using styled text/shapes.
interface FileIconProps {
    type: 'folder' | 'video' | 'image' | 'audio' | 'apk' | 'file';
    size?: number;
}

const getIconColor = (type: string) => {
    switch (type) {
        case 'folder': return '#FFC107';
        case 'video': return '#F44336';
        case 'image': return '#2196F3';
        case 'audio': return '#E91E63';
        case 'apk': return '#4CAF50';
        default: return '#9E9E9E';
    }
};

const FileIcon = ({ type, size = 40 }: FileIconProps) => {
    const color = getIconColor(type);

    return (
        <View style={[styles.container, { width: size, height: size, backgroundColor: color + '20' }]}>
            <View style={[styles.inner, { borderColor: color }]}>
                <Text style={[styles.text, { color: color, fontSize: size * 0.4 }]}>
                    {type.substring(0, 1).toUpperCase()}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inner: {
        width: '60%',
        height: '60%',
        borderWidth: 2,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontWeight: 'bold',
    }
});

export default FileIcon;

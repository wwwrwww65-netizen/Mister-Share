import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SIZES, FONTS } from '../../theme';
import { useNavigation } from '@react-navigation/native';

interface ModernHeaderProps {
    title: string;
    subtitle?: string;
    showBack?: boolean;
    centerTitle?: boolean;
    rightIcon?: string;
    onRightPress?: () => void;
}

const ModernHeader: React.FC<ModernHeaderProps> = ({
    title,
    subtitle,
    showBack = false,
    centerTitle = false,
    rightIcon,
    onRightPress
}) => {
    const navigation = useNavigation();

    return (
        <View style={styles.container}>
            {/* Absolute Centered Title (Only if centerTitle is true) */}
            {centerTitle && (
                <View style={styles.centerContainer}>
                    <Text style={styles.title}>{title}</Text>
                    {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                </View>
            )}

            <View style={styles.left}>
                {showBack && (
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Icon name="arrow-back" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                )}
                {/* Standard Title (Only if centerTitle is false) */}
                {!centerTitle && (
                    <View>
                        <Text style={styles.title}>{title}</Text>
                        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                    </View>
                )}
            </View>

            {rightIcon && (
                <TouchableOpacity onPress={onRightPress} style={styles.rightButton}>
                    <Icon name={rightIcon} size={24} color={COLORS.white} />
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SIZES.padding,
        paddingVertical: SIZES.padding,
        marginTop: 25,
        minHeight: 60,
    },
    centerContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: -1, // Ensure it doesn't block buttons
        marginTop: 25, // Match container margin
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    title: {
        ...FONTS.h2,
        color: COLORS.white,
    },
    subtitle: {
        ...FONTS.caption,
        color: COLORS.textDim,
        marginTop: 2,
    },
    rightButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    }
});

export default ModernHeader;

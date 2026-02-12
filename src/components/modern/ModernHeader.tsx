import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SIZES, FONTS } from '../../theme';
import { useNavigation } from '@react-navigation/native';

interface ModernHeaderProps {
    title: string;
    subtitle?: string;
    showBack?: boolean;
    rightIcon?: string;
    onRightPress?: () => void;
}

const ModernHeader: React.FC<ModernHeaderProps> = ({
    title,
    subtitle,
    showBack = false,
    rightIcon,
    onRightPress
}) => {
    const navigation = useNavigation();

    return (
        <View style={styles.container}>
            <View style={styles.left}>
                {showBack && (
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Icon name="arrow-back" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                )}
                <View>
                    <Text style={styles.title}>{title}</Text>
                    {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                </View>
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
        marginTop: 10,
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

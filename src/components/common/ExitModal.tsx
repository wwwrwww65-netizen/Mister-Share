import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, FONTS, SIZES } from '../../theme';
import NeoButton from '../modern/NeoButton';

interface ExitModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const ExitModal: React.FC<ExitModalProps> = ({ visible, onClose, onConfirm }) => {
    const { t } = useTranslation();
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 6,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            scaleAnim.setValue(0.8);
            opacityAnim.setValue(0);
        }
    }, [visible]);

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
                
                <Animated.View style={[styles.modalContent, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
                    <View style={styles.iconCircle}>
                        <Icon name="exit-to-app" size={60} color="white" />
                    </View>
                    
                    <Text style={styles.title}>{t('common.exit_app', 'Exit from app')}</Text>
                    <Text style={styles.subtitle}>{t('common.exit_app_desc', 'Do you want to exit the app?')}</Text>

                    <View style={styles.buttonContainer}>
                        <NeoButton
                            label={t('common.cancel', 'Cancel')}
                            variant="outline"
                            onPress={onClose}
                            style={styles.cancelButton}
                        />
                        <NeoButton
                            label={t('common.ok', 'OK')}
                            onPress={onConfirm}
                            style={styles.confirmButton}
                        />
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(5, 16, 58, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
        width: '85%',
        backgroundColor: 'rgba(20, 25, 45, 0.95)',
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 15,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.error || '#F44336',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: COLORS.error || '#F44336',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
    },
    title: {
        ...FONTS.h2,
        color: COLORS.white,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        ...FONTS.body3,
        color: COLORS.textDim,
        textAlign: 'center',
        marginBottom: 30,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 15,
    },
    cancelButton: {
        flex: 1,
    },
    confirmButton: {
        flex: 1,
    }
});

export default ExitModal;

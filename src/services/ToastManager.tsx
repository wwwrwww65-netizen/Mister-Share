import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Toast, { ToastType } from '../components/Toast';

let showToastFunction: ((message: string, type?: ToastType) => void) | null = null;

export const ToastManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    showToastFunction = (message: string, type: ToastType = 'info') => {
        setToast({ message, type });
    };

    return (
        <View style={styles.container}>
            {children}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onHide={() => setToast(null)}
                />
            )}
        </View>
    );
};

export const showToast = (message: string, type: ToastType = 'info') => {
    if (showToastFunction) {
        showToastFunction(message, type);
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

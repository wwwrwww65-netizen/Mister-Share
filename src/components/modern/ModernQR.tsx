import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import QRCodeStyled from 'react-native-qrcode-styled';
import LinearGradient from 'react-native-linear-gradient';

interface ModernQRProps {
    value: string;
    size?: number;
    logo?: any;
    color?: string;
    backgroundColor?: string;
    style?: ViewStyle;
}

const ModernQR = ({
    value,
    size = 200,
    logo,
    color = '#000',
    backgroundColor = '#FFF',
    style
}: ModernQRProps) => {
    // Determine dot size based on container size to prevent overcrowding or gaps
    // This is approximate; QRCodeStyled handles scaling, but explicit piece sizing helps control aesthetic.

    return (
        <View style={[styles.container, style]}>
            {/* Outer Gradient Ring */}
            <LinearGradient
                colors={['#00C6FF', '#0072FF']}
                style={[
                    styles.gradientBorder,
                    {
                        width: size + 20,
                        height: size + 20,
                        borderRadius: (size + 20) / 2
                    }
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                {/* Inner White Circle */}
                <View style={[
                    styles.innerContainer,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        backgroundColor: backgroundColor
                    }
                ]}>
                    <QRCodeStyled
                        data={value}
                        style={{ backgroundColor: 'white' }}
                        padding={15}
                        pieceSize={6} // Larger pieces for better scanning
                        pieceScale={1} // No spacing - solid QR for scanning
                        pieceCornerType={'square'} // Square dots scan better
                        pieceBorderRadius={0} // No rounding for maximum contrast
                        color={'#000000'} // Pure black for best contrast
                        // Remove gradient for better scannability
                        logo={logo ? {
                            href: logo,
                            scale: 0.15,
                            hidePieces: true
                        } : undefined}
                    />
                </View>
            </LinearGradient>

            {/* Pulsing Ring Effect */}
            <View style={[
                styles.pulseRing,
                {
                    width: size + 50,
                    height: size + 50,
                    borderRadius: (size + 50) / 2,
                }
            ]} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    gradientBorder: {
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#0072FF",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 10,
    },
    innerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    pulseRing: {
        position: 'absolute',
        borderWidth: 1,
        borderColor: 'rgba(0, 114, 255, 0.2)',
        zIndex: -1,
    }
});

export default ModernQR;

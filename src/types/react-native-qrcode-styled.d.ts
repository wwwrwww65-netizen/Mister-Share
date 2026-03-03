declare module 'react-native-qrcode-styled' {
    import React from 'react';
    import { ViewStyle } from 'react-native';

    export interface QRCodeStyledProps {
        data?: string;
        style?: ViewStyle;
        pieceSize?: number;
        pieceScale?: number;
        pieceCornerType?: 'rounded' | 'cut' | 'square';
        pieceBorderRadius?: number;
        padding?: number;
        color?: string;
        backgroundColor?: string;
        gradient?: {
            type: 'linear' | 'radial';
            options: {
                start?: [number, number];
                end?: [number, number];
                colors: string[];
            };
        };
        outerEyesOptions?: {
            topLeft?: { borderRadius?: number | number[] };
            topRight?: { borderRadius?: number | number[] };
            bottomLeft?: { borderRadius?: number | number[] };
            bottomRight?: { borderRadius?: number | number[] };
        };
        innerEyesOptions?: {
            borderRadius?: number;
            space?: number;
        };
        logo?: {
            href: any;
            scale?: number;
            hidePieces?: boolean;
        };
        children?: React.ReactNode;
    }

    export default class QRCodeStyled extends React.Component<QRCodeStyledProps> { }
}

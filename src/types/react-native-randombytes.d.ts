declare module 'react-native-randombytes' {
    export function randomBytes(
        length: number,
        callback: (error: Error | null, bytes: Uint8Array) => void
    ): void;
}

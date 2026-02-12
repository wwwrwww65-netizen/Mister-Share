declare module 'react-native-aes-crypto' {
    interface AesCrypto {
        encrypt(
            text: string,
            key: string,
            iv: string,
            algorithm: string
        ): Promise<string>;

        decrypt(
            ciphertext: string,
            key: string,
            iv: string,
            algorithm: string
        ): Promise<string>;

        pbkdf2(
            password: string,
            salt: string,
            cost: number,
            length: number
        ): Promise<string>;

        hmac256(
            text: string,
            key: string
        ): Promise<string>;

        hmac512(
            text: string,
            key: string
        ): Promise<string>;

        sha1(text: string): Promise<string>;
        sha256(text: string): Promise<string>;
        sha512(text: string): Promise<string>;

        randomKey(length: number): Promise<string>;
    }

    const Aes: AesCrypto;
    export default Aes;
}

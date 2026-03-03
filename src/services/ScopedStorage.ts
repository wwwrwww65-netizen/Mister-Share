import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';

// NOTE: Accessing Android/obb and Android/data on Android 11+ is restricted.
// The standard way is to ask the user to grant access to these specific folders via SAF.
// Since we don't have a dedicated SAF library installed in this initial setup (like react-native-saf-x),
// we will structure this service to handle the logic and prepare for the native integration or Intent launching.

class ScopedStorageService {

    // URIs for the restricted folders
    private OBB_URI = 'content://com.android.externalstorage.documents/tree/primary%3AAndroid%2Fobb';
    private DATA_URI = 'content://com.android.externalstorage.documents/tree/primary%3AAndroid%2Fdata';

    async requestAccessToObb() {
        if (Platform.OS !== 'android') return true;

        // In a real app, we would use a Native Module to launch the ACTION_OPEN_DOCUMENT_TREE intent
        // pointing specifically to the Android/obb address.
        // For now, we simulate this flow or guide the user.
        console.log('Requesting access to Android/obb');

        // Example of how we might try to open settings or files app if we can't launch SAF directly via JS
        // Linking.openSettings(); 

        return true; // Mock success
    }

    async requestAccessToData() {
        if (Platform.OS !== 'android') return true;
        console.log('Requesting access to Android/data');
        return true; // Mock success
    }

    async listFiles(uri: string) {
        // This would use the granted URI to list files via ContentResolver
        console.log(`Listing files in ${uri}`);
        return [];
    }

    async checkForGameData(packageName: string) {
        // Check if /Android/obb/<packageName> exists
        const obbPath = `${ReactNativeBlobUtil.fs.dirs.SDCardDir}/Android/obb/${packageName}`;
        const hasObb = await ReactNativeBlobUtil.fs.exists(obbPath);

        // Check if /Android/data/<packageName> exists
        const dataPath = `${ReactNativeBlobUtil.fs.dirs.SDCardDir}/Android/data/${packageName}`;
        // Note: 'exists' might return false on Android 11+ for 'data' without permissions
        const hasData = await ReactNativeBlobUtil.fs.exists(dataPath);

        return {
            hasObb,
            hasData,
            obbPath: hasObb ? obbPath : null,
            dataPath: hasData ? dataPath : null
        };
    }
}

export default new ScopedStorageService();

// Test setup file - Simplified for React Native
// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
    setItem: jest.fn(() => Promise.resolve()),
    getItem: jest.fn(() => Promise.resolve(null)),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
}));

// Mock DeviceInfo
jest.mock('react-native-device-info', () => ({
    getDeviceName: jest.fn(() => Promise.resolve('TestDevice')),
    getUniqueId: jest.fn(() => Promise.resolve('test-unique-id-123')),
    getBundleId: jest.fn(() => 'com.mistershare'),
}));

// Mock Sound
jest.mock('../src/services/SoundService', () => ({
    default: {
        notification: jest.fn(),
        success: jest.fn(),
        error: jest.fn(),
    }
}));

// Mock Toast
jest.mock('../src/services/ToastManager', () => ({
    showToast: jest.fn(),
}));

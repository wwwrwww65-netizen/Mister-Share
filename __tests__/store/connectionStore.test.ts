import { act } from '@testing-library/react-native';
import { useConnectionStore, ConnectionHaptics, getTransferTargetIP, isP2PConnected } from '../../src/store/connectionStore';
import { Vibration } from 'react-native';

// Mock Vibration
jest.mock('react-native', () => ({
    Vibration: {
        vibrate: jest.fn(),
    },
    Platform: {
        OS: 'android',
    },
}));

describe('connectionStore', () => {
    beforeEach(() => {
        // Reset store before each test
        act(() => {
            useConnectionStore.getState().reset();
        });
        jest.clearAllMocks();
    });

    describe('initial state', () => {
        it('should have correct initial values', () => {
            const state = useConnectionStore.getState();

            expect(state.isConnected).toBe(false);
            expect(state.isConnecting).toBe(false);
            expect(state.isGroupOwner).toBe(false);
            expect(state.ssid).toBeNull();
            expect(state.passphrase).toBeNull();
            expect(state.connectedPeers).toHaveLength(0);
            expect(state.serverIP).toBe('192.168.49.1');
            expect(state.error).toBeNull();
        });
    });

    describe('setConnecting', () => {
        it('should update connecting state', () => {
            act(() => {
                useConnectionStore.getState().setConnecting(true);
            });

            expect(useConnectionStore.getState().isConnecting).toBe(true);
            expect(useConnectionStore.getState().error).toBeNull();
        });
    });

    describe('setGroupInfo', () => {
        it('should set group info and mark as connected', () => {
            act(() => {
                useConnectionStore.getState().setGroupInfo({
                    isGroupOwner: true,
                    ssid: 'DIRECT-Test',
                    passphrase: 'password123',
                    groupOwnerAddress: '192.168.49.1',
                });
            });

            const state = useConnectionStore.getState();
            expect(state.isConnected).toBe(true);
            expect(state.isGroupOwner).toBe(true);
            expect(state.ssid).toBe('DIRECT-Test');
            expect(state.passphrase).toBe('password123');
        });

        it('should trigger haptic feedback', () => {
            act(() => {
                useConnectionStore.getState().setGroupInfo({
                    isGroupOwner: true,
                    ssid: 'DIRECT-Test',
                    passphrase: 'password123',
                });
            });

            expect(Vibration.vibrate).toHaveBeenCalledWith([0, 100, 50, 100]);
        });
    });

    describe('addPeer', () => {
        it('should add a peer to connectedPeers', () => {
            const peer = {
                deviceAddress: 'aa:bb:cc:dd:ee:ff',
                deviceName: 'Test Device',
                connectedAt: Date.now(),
            };

            act(() => {
                useConnectionStore.getState().addPeer(peer);
            });

            const state = useConnectionStore.getState();
            expect(state.connectedPeers).toHaveLength(1);
            expect(state.connectedPeers[0].deviceName).toBe('Test Device');
            expect(state.isConnected).toBe(true);
        });

        it('should not add duplicate peers', () => {
            const peer = {
                deviceAddress: 'aa:bb:cc:dd:ee:ff',
                deviceName: 'Test Device',
                connectedAt: Date.now(),
            };

            act(() => {
                useConnectionStore.getState().addPeer(peer);
                useConnectionStore.getState().addPeer(peer);
            });

            expect(useConnectionStore.getState().connectedPeers).toHaveLength(1);
        });

        it('should trigger haptic feedback', () => {
            act(() => {
                useConnectionStore.getState().addPeer({
                    deviceAddress: 'aa:bb:cc:dd:ee:ff',
                    deviceName: 'Test Device',
                    connectedAt: Date.now(),
                });
            });

            expect(Vibration.vibrate).toHaveBeenCalledWith(100);
        });
    });

    describe('removePeer', () => {
        it('should remove a peer by address', () => {
            const peer1 = {
                deviceAddress: 'aa:bb:cc:dd:ee:ff',
                deviceName: 'Device 1',
                connectedAt: Date.now(),
            };
            const peer2 = {
                deviceAddress: '11:22:33:44:55:66',
                deviceName: 'Device 2',
                connectedAt: Date.now(),
            };

            act(() => {
                useConnectionStore.getState().addPeer(peer1);
                useConnectionStore.getState().addPeer(peer2);
            });

            expect(useConnectionStore.getState().connectedPeers).toHaveLength(2);

            act(() => {
                useConnectionStore.getState().removePeer('aa:bb:cc:dd:ee:ff');
            });

            const state = useConnectionStore.getState();
            expect(state.connectedPeers).toHaveLength(1);
            expect(state.connectedPeers[0].deviceName).toBe('Device 2');
        });
    });

    describe('disconnect', () => {
        it('should reset connection state', () => {
            act(() => {
                useConnectionStore.getState().setGroupInfo({
                    isGroupOwner: true,
                    ssid: 'DIRECT-Test',
                    passphrase: 'password123',
                });
                useConnectionStore.getState().addPeer({
                    deviceAddress: 'aa:bb:cc:dd:ee:ff',
                    deviceName: 'Test Device',
                    connectedAt: Date.now(),
                });
            });

            expect(useConnectionStore.getState().isConnected).toBe(true);

            act(() => {
                useConnectionStore.getState().disconnect();
            });

            const state = useConnectionStore.getState();
            expect(state.isConnected).toBe(false);
            expect(state.connectedPeers).toHaveLength(0);
        });

        it('should trigger haptic feedback', () => {
            jest.clearAllMocks();

            act(() => {
                useConnectionStore.getState().disconnect();
            });

            expect(Vibration.vibrate).toHaveBeenCalledWith([0, 200, 100, 200]);
        });
    });

    describe('setError', () => {
        it('should set error and stop connecting', () => {
            act(() => {
                useConnectionStore.getState().setConnecting(true);
                useConnectionStore.getState().setError('Connection failed');
            });

            const state = useConnectionStore.getState();
            expect(state.error).toBe('Connection failed');
            expect(state.isConnecting).toBe(false);
        });
    });

    describe('helper functions', () => {
        it('getTransferTargetIP should return server IP', () => {
            expect(getTransferTargetIP()).toBe('192.168.49.1');
        });

        it('isP2PConnected should return connection status', () => {
            expect(isP2PConnected()).toBe(false);

            act(() => {
                useConnectionStore.getState().setGroupInfo({
                    isGroupOwner: true,
                    ssid: 'Test',
                    passphrase: 'pass',
                });
            });

            expect(isP2PConnected()).toBe(true);
        });
    });
});

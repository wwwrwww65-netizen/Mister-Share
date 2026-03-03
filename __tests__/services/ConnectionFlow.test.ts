/**
 * Connection Flow Integration Tests
 * 
 * Tests the complete flow from Host setup to Client connection.
 * These are integration tests that verify components work together.
 */

import { NativeModules, DeviceEventEmitter } from 'react-native';

// Mock all native modules
jest.mock('react-native', () => {
    const RN = jest.requireActual('react-native');

    RN.NativeModules.TcpHandshake = {
        startHandshakeServer: jest.fn().mockResolvedValue(true),
        stopHandshakeServer: jest.fn().mockResolvedValue(true),
        performHandshake: jest.fn(),
        approveConnection: jest.fn().mockResolvedValue(true),
        rejectConnection: jest.fn().mockResolvedValue(true),
        isServerRunning: jest.fn().mockResolvedValue(true),
        getTrustedDevicesList: jest.fn().mockResolvedValue([]),
        clearTrustedDevices: jest.fn().mockResolvedValue(true),
        removeTrustedDevice: jest.fn().mockResolvedValue(true),
    };

    RN.NativeModules.WiFiDirectAdvanced = {
        createGroup: jest.fn().mockResolvedValue({ ssid: 'MisterShare-TEST', password: 'test123', ip: '192.168.43.1' }),
        connectToNetwork: jest.fn().mockResolvedValue(true),
        removeGroup: jest.fn().mockResolvedValue(true),
    };

    RN.NativeModules.TransferSocketModule = {
        startServer: jest.fn(),
        stopServer: jest.fn(),
        sendFile: jest.fn(),
    };

    return RN;
});

jest.mock('react-native-device-info', () => ({
    getDeviceName: jest.fn().mockResolvedValue('TestDevice'),
    getUniqueId: jest.fn().mockResolvedValue('test-unique-id-123'),
}));

import TcpHandshakeService from '../../src/services/TcpHandshakeService';

describe('Connection Flow Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        TcpHandshakeService.cleanup();
    });

    afterEach(() => {
        TcpHandshakeService.cleanup();
    });

    describe('Host Flow', () => {
        it('should complete full host setup flow', async () => {
            // 1. Start handshake server
            await TcpHandshakeService.startServer('HostDevice');
            expect(NativeModules.TcpHandshake.startHandshakeServer).toHaveBeenCalledWith('HostDevice');

            // 2. Register peer connected listener
            const onPeerConnected = jest.fn();
            TcpHandshakeService.onPeerConnected(onPeerConnected);

            // 3. Simulate client connecting
            DeviceEventEmitter.emit('onPeerConnected', {
                ip: '192.168.43.2',
                name: 'ClientDevice',
                id: 'client123',
                autoApproved: true
            });

            // 4. Verify callback received
            expect(onPeerConnected).toHaveBeenCalledWith({
                ip: '192.168.43.2',
                name: 'ClientDevice',
                id: 'client123',
                autoApproved: true
            });
        });

        it('should handle first-time device approval flow', async () => {
            await TcpHandshakeService.startServer('HostDevice');

            // Register approval request listener
            const onApprovalRequest = jest.fn();
            TcpHandshakeService.onApprovalRequest(onApprovalRequest);

            // Simulate first-time device connecting
            DeviceEventEmitter.emit('onApprovalRequest', {
                clientName: 'NewDevice',
                clientId: 'newdevice123',
                clientIp: '192.168.43.3'
            });

            expect(onApprovalRequest).toHaveBeenCalledWith({
                clientName: 'NewDevice',
                clientId: 'newdevice123',
                clientIp: '192.168.43.3'
            });

            // Host approves
            await TcpHandshakeService.approveConnection('newdevice123', true);
            expect(NativeModules.TcpHandshake.approveConnection).toHaveBeenCalledWith('newdevice123', true);
        });
    });

    describe('Client Flow', () => {
        it('should complete full client connection flow', async () => {
            // Mock successful handshake
            NativeModules.TcpHandshake.performHandshake.mockResolvedValue({
                success: true,
                hostName: 'HostDevice',
                hostIp: '192.168.43.1',
                transferPort: 12345
            });

            // Perform handshake
            const result = await TcpHandshakeService.performHandshake(
                '192.168.43.1',
                'ClientDevice',
                'client123'
            );

            expect(result.success).toBe(true);
            expect(result.hostName).toBe('HostDevice');
            expect(result.transferPort).toBe(12345);
        });

        it('should handle pending approval state', async () => {
            // Mock timeout (waiting for approval)
            NativeModules.TcpHandshake.performHandshake.mockRejectedValue(
                new Error('TIMEOUT: Connection timed out - host may not have approved yet')
            );

            await expect(
                TcpHandshakeService.performHandshake('192.168.43.1', 'ClientDevice', 'client123')
            ).rejects.toThrow('TIMEOUT');
        });

        it('should handle rejection gracefully', async () => {
            NativeModules.TcpHandshake.performHandshake.mockRejectedValue(
                new Error('REJECTED: Connection was rejected by host')
            );

            await expect(
                TcpHandshakeService.performHandshake('192.168.43.1', 'ClientDevice', 'client123')
            ).rejects.toThrow('REJECTED');
        });
    });

    describe('Full Round Trip', () => {
        it('should complete host-client round trip', async () => {
            // --- HOST SIDE ---
            await TcpHandshakeService.startServer('HostDevice');

            const hostPeerCallback = jest.fn();
            TcpHandshakeService.onPeerConnected(hostPeerCallback);

            // --- CLIENT SIDE (simulated) ---
            NativeModules.TcpHandshake.performHandshake.mockResolvedValue({
                success: true,
                hostName: 'HostDevice',
                hostIp: '192.168.43.1',
                transferPort: 12345
            });

            // Client initiates handshake
            const clientResult = await TcpHandshakeService.performHandshake(
                '192.168.43.1',
                'ClientDevice',
                'client123'
            );

            // --- SIMULATE HOST RECEIVING EVENT ---
            DeviceEventEmitter.emit('onPeerConnected', {
                ip: '192.168.43.2',
                name: 'ClientDevice',
                id: 'client123',
                autoApproved: true
            });

            // --- VERIFY ---
            expect(clientResult.success).toBe(true);
            expect(hostPeerCallback).toHaveBeenCalled();
            expect(hostPeerCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'ClientDevice',
                    ip: '192.168.43.2'
                })
            );
        });
    });

    describe('Error Handling', () => {
        it('should handle server already running', async () => {
            // First start succeeds
            await TcpHandshakeService.startServer('HostDevice');

            // Second start should also succeed (no-op)
            NativeModules.TcpHandshake.startHandshakeServer.mockResolvedValue(true);
            await TcpHandshakeService.startServer('HostDevice');

            expect(NativeModules.TcpHandshake.startHandshakeServer).toHaveBeenCalledTimes(2);
        });

        it('should handle network errors', async () => {
            NativeModules.TcpHandshake.performHandshake.mockRejectedValue(
                new Error('CONNECTION_REFUSED: Could not connect to host')
            );

            await expect(
                TcpHandshakeService.performHandshake('192.168.43.1', 'ClientDevice', 'client123')
            ).rejects.toThrow('CONNECTION_REFUSED');
        });
    });
});

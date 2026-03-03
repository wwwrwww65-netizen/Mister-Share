/**
 * TcpHandshakeService Tests
 * 
 * Tests the native module wrapper for TCP handshake functionality.
 * These tests mock the native module and verify the TypeScript service layer.
 */

import { NativeModules, DeviceEventEmitter } from 'react-native';

// Mock native module before importing service
jest.mock('react-native', () => {
    const RN = jest.requireActual('react-native');
    RN.NativeModules.TcpHandshake = {
        startHandshakeServer: jest.fn(),
        stopHandshakeServer: jest.fn(),
        performHandshake: jest.fn(),
        approveConnection: jest.fn(),
        rejectConnection: jest.fn(),
        isServerRunning: jest.fn(),
        getTrustedDevicesList: jest.fn(),
        clearTrustedDevices: jest.fn(),
        removeTrustedDevice: jest.fn(),
    };
    return RN;
});

import TcpHandshakeService from '../../src/services/TcpHandshakeService';

describe('TcpHandshakeService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        TcpHandshakeService.cleanup();
    });

    describe('Host Mode - Server', () => {
        it('should start handshake server successfully', async () => {
            const mockTcpHandshake = NativeModules.TcpHandshake;
            mockTcpHandshake.startHandshakeServer.mockResolvedValue(true);

            const result = await TcpHandshakeService.startServer('TestDevice');

            expect(mockTcpHandshake.startHandshakeServer).toHaveBeenCalledWith('TestDevice');
            expect(result).toBe(true);
        });

        it('should handle server start failure', async () => {
            const mockTcpHandshake = NativeModules.TcpHandshake;
            mockTcpHandshake.startHandshakeServer.mockRejectedValue(new Error('Port in use'));

            await expect(TcpHandshakeService.startServer('TestDevice')).rejects.toThrow('Port in use');
        });

        it('should stop handshake server', async () => {
            const mockTcpHandshake = NativeModules.TcpHandshake;
            mockTcpHandshake.stopHandshakeServer.mockResolvedValue(true);

            const result = await TcpHandshakeService.stopServer();

            expect(mockTcpHandshake.stopHandshakeServer).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('should check if server is running', async () => {
            const mockTcpHandshake = NativeModules.TcpHandshake;
            mockTcpHandshake.isServerRunning.mockResolvedValue(true);

            const result = await TcpHandshakeService.isServerRunning();

            expect(result).toBe(true);
        });
    });

    describe('Host Mode - Approval', () => {
        it('should approve connection with trust flag', async () => {
            const mockTcpHandshake = NativeModules.TcpHandshake;
            mockTcpHandshake.approveConnection.mockResolvedValue(true);

            const result = await TcpHandshakeService.approveConnection('client123', true);

            expect(mockTcpHandshake.approveConnection).toHaveBeenCalledWith('client123', true);
            expect(result).toBe(true);
        });

        it('should reject connection', async () => {
            const mockTcpHandshake = NativeModules.TcpHandshake;
            mockTcpHandshake.rejectConnection.mockResolvedValue(true);

            const result = await TcpHandshakeService.rejectConnection('client123');

            expect(mockTcpHandshake.rejectConnection).toHaveBeenCalledWith('client123');
            expect(result).toBe(true);
        });
    });

    describe('Client Mode - Handshake', () => {
        it('should perform handshake successfully', async () => {
            const mockTcpHandshake = NativeModules.TcpHandshake;
            mockTcpHandshake.performHandshake.mockResolvedValue({
                success: true,
                hostName: 'HostDevice',
                hostIp: '192.168.43.1',
                transferPort: 12345
            });

            const result = await TcpHandshakeService.performHandshake(
                '192.168.43.1',
                'MyDevice',
                'device123'
            );

            expect(mockTcpHandshake.performHandshake).toHaveBeenCalledWith(
                '192.168.43.1',
                'MyDevice',
                'device123'
            );
            expect(result.success).toBe(true);
            expect(result.hostName).toBe('HostDevice');
        });

        it('should handle handshake rejection', async () => {
            const mockTcpHandshake = NativeModules.TcpHandshake;
            mockTcpHandshake.performHandshake.mockRejectedValue(new Error('REJECTED'));

            await expect(
                TcpHandshakeService.performHandshake('192.168.43.1', 'MyDevice', 'device123')
            ).rejects.toThrow('REJECTED');
        });

        it('should handle handshake timeout', async () => {
            const mockTcpHandshake = NativeModules.TcpHandshake;
            mockTcpHandshake.performHandshake.mockRejectedValue(new Error('TIMEOUT'));

            await expect(
                TcpHandshakeService.performHandshake('192.168.43.1', 'MyDevice', 'device123')
            ).rejects.toThrow('TIMEOUT');
        });
    });

    describe('Event Listeners', () => {
        it('should register onPeerConnected callback', () => {
            const callback = jest.fn();
            const unsubscribe = TcpHandshakeService.onPeerConnected(callback);

            // Simulate native event
            DeviceEventEmitter.emit('onPeerConnected', {
                ip: '192.168.43.2',
                name: 'PeerDevice',
                id: 'peer123',
                autoApproved: true
            });

            expect(callback).toHaveBeenCalledWith({
                ip: '192.168.43.2',
                name: 'PeerDevice',
                id: 'peer123',
                autoApproved: true
            });

            // Test unsubscribe
            unsubscribe();
        });

        it('should register onApprovalRequest callback', () => {
            const callback = jest.fn();
            const unsubscribe = TcpHandshakeService.onApprovalRequest(callback);

            // Simulate native event
            DeviceEventEmitter.emit('onApprovalRequest', {
                clientName: 'NewDevice',
                clientId: 'new123',
                clientIp: '192.168.43.3'
            });

            expect(callback).toHaveBeenCalledWith({
                clientName: 'NewDevice',
                clientId: 'new123',
                clientIp: '192.168.43.3'
            });

            unsubscribe();
        });
    });

    describe('Trusted Devices', () => {
        it('should get trusted devices list', async () => {
            const mockTcpHandshake = NativeModules.TcpHandshake;
            mockTcpHandshake.getTrustedDevicesList.mockResolvedValue(['device1', 'device2']);

            const result = await TcpHandshakeService.getTrustedDevices();

            expect(result).toEqual(['device1', 'device2']);
        });

        it('should clear trusted devices', async () => {
            const mockTcpHandshake = NativeModules.TcpHandshake;
            mockTcpHandshake.clearTrustedDevices.mockResolvedValue(true);

            const result = await TcpHandshakeService.clearTrustedDevices();

            expect(result).toBe(true);
        });

        it('should remove specific trusted device', async () => {
            const mockTcpHandshake = NativeModules.TcpHandshake;
            mockTcpHandshake.removeTrustedDevice.mockResolvedValue(true);

            const result = await TcpHandshakeService.removeTrustedDevice('device1');

            expect(mockTcpHandshake.removeTrustedDevice).toHaveBeenCalledWith('device1');
            expect(result).toBe(true);
        });
    });
});

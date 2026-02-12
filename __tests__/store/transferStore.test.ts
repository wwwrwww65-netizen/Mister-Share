import { useTransferStore } from '../../src/store/transferStore';

describe('TransferStore', () => {
    beforeEach(() => {
        // Reset store before each test
        const store = useTransferStore.getState();
        store.clearQueue();
        store.clearHistory();
    });

    describe('Queue Management', () => {
        it('should add items to queue', () => {
            const store = useTransferStore.getState();
            const items = [
                {
                    id: '1',
                    name: 'file1.txt',
                    path: '/path/to/file1.txt',
                    size: 1024,
                    type: 'file' as const,
                    status: 'pending' as const,
                    progress: 0,
                    speed: 0,
                    timeLeft: 0,
                    direction: 'send' as const,
                }
            ];

            store.addToQueue(items);

            expect(store.queue).toHaveLength(1);
            expect(store.queue[0].name).toBe('file1.txt');
        });

        it('should remove item from queue', () => {
            const store = useTransferStore.getState();
            const items = [
                {
                    id: '1',
                    name: 'file1.txt',
                    path: '/path/to/file1.txt',
                    size: 1024,
                    type: 'file' as const,
                    status: 'pending' as const,
                    progress: 0,
                    speed: 0,
                    timeLeft: 0,
                    direction: 'send' as const,
                }
            ];

            store.addToQueue(items);
            store.removeFromQueue('1');

            expect(store.queue).toHaveLength(0);
        });

        it('should clear queue', () => {
            const store = useTransferStore.getState();
            const items = [
                {
                    id: '1',
                    name: 'file1.txt',
                    path: '/path/1',
                    size: 1024,
                    type: 'file' as const,
                    status: 'pending' as const,
                    progress: 0,
                    speed: 0,
                    timeLeft: 0,
                    direction: 'send' as const,
                },
                {
                    id: '2',
                    name: 'file2.txt',
                    path: '/path/2',
                    size: 2048,
                    type: 'file' as const,
                    status: 'pending' as const,
                    progress: 0,
                    speed: 0,
                    timeLeft: 0,
                    direction: 'send' as const,
                }
            ];

            store.addToQueue(items);
            store.clearQueue();

            expect(store.queue).toHaveLength(0);
            expect(store.currentIndex).toBe(0);
        });
    });

    describe('Transfer Control', () => {
        it('should start transfer', () => {
            const store = useTransferStore.getState();
            store.startTransfer();

            expect(store.status).toBe('running');
        });

        it('should pause transfer', () => {
            const store = useTransferStore.getState();
            store.startTransfer();
            store.pauseTransfer();

            expect(store.status).toBe('paused');
        });

        it('should resume transfer', () => {
            const store = useTransferStore.getState();
            store.startTransfer();
            store.pauseTransfer();
            store.resumeTransfer();

            expect(store.status).toBe('running');
        });

        it('should cancel transfer', () => {
            const store = useTransferStore.getState();
            store.startTransfer();
            store.cancelTransfer();

            expect(store.status).toBe('idle');
        });
    });

    describe('Progress Tracking', () => {
        beforeEach(() => {
            const store = useTransferStore.getState();
            const items = [
                {
                    id: '1',
                    name: 'file1.txt',
                    path: '/path/1',
                    size: 1024,
                    type: 'file' as const,
                    status: 'pending' as const,
                    progress: 0,
                    speed: 0,
                    timeLeft: 0,
                    direction: 'send' as const,
                }
            ];
            store.addToQueue(items);
        });

        it('should update progress', () => {
            const store = useTransferStore.getState();
            store.updateProgress('1', 0.5, 1024000, 10);

            const item = store.queue.find(i => i.id === '1');
            expect(item?.progress).toBe(0.5);
            expect(item?.speed).toBe(1024000);
            expect(item?.timeLeft).toBe(10);
        });

        it('should set item status', () => {
            const store = useTransferStore.getState();
            store.setItemStatus('1', 'transferring');

            const item = store.queue.find(i => i.id === '1');
            expect(item?.status).toBe('transferring');
        });

        it('should set item error', () => {
            const store = useTransferStore.getState();
            store.setItemError('1', 'Connection failed');

            const item = store.queue.find(i => i.id === '1');
            expect(item?.status).toBe('failed');
            expect(item?.error).toBe('Connection failed');
        });
    });

    describe('History Management', () => {
        it('should add item to history', () => {
            const store = useTransferStore.getState();
            const historyItem = {
                id: '1',
                filename: 'test.txt',
                size: 1024,
                timestamp: Date.now(),
                type: 'sent' as const,
                status: 'success' as const,
                duration: 5,
                averageSpeed: 204.8,
            };

            store.addToHistory(historyItem);

            expect(store.history).toHaveLength(1);
            expect(store.history[0].filename).toBe('test.txt');
        });

        it('should limit history to max items', () => {
            const store = useTransferStore.getState();

            // Add more than MAX_HISTORY_ITEMS
            for (let i = 0; i < 150; i++) {
                store.addToHistory({
                    id: `${i}`,
                    filename: `file${i}.txt`,
                    size: 1024,
                    timestamp: Date.now(),
                    type: 'sent',
                    status: 'success',
                });
            }

            expect(store.history.length).toBeLessThanOrEqual(100);
        });

        it('should clear history', () => {
            const store = useTransferStore.getState();
            store.addToHistory({
                id: '1',
                filename: 'test.txt',
                size: 1024,
                timestamp: Date.now(),
                type: 'sent',
                status: 'success',
            });

            store.clearHistory();

            expect(store.history).toHaveLength(0);
        });
    });
});

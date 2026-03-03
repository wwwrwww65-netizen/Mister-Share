import WiFiDirectService from './WiFiDirect';

/**
 * Connect to a peer with timeout
 */
export async function connectWithTimeout(
    deviceAddress: string,
    timeoutMs: number = 30000
): Promise<void> {
    return Promise.race([
        WiFiDirectService.connectToPeer(deviceAddress),
        new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout')), timeoutMs)
        )
    ]);
}

/**
 * Connect with automatic retry
 */
export async function connectWithRetry(
    deviceAddress: string,
    maxRetries: number = 3,
    timeoutMs: number = 30000
): Promise<void> {
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
        try {
            console.log(`[ConnectionHelper] Attempt ${i + 1}/${maxRetries} to connect to ${deviceAddress}`);
            await connectWithTimeout(deviceAddress, timeoutMs);
            console.log('[ConnectionHelper] Connection successful!');
            return; // Success
        } catch (e) {
            lastError = e as Error;
            console.error(`[ConnectionHelper] Attempt ${i + 1} failed:`, e);

            if (i < maxRetries - 1) {
                // Wait before retry (exponential backoff)
                const waitTime = Math.min(1000 * Math.pow(2, i), 5000);
                console.log(`[ConnectionHelper] Waiting ${waitTime}ms before retry...`);
                await delay(waitTime);
            }
        }
    }

    throw lastError || new Error('Connection failed after retries');
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get connection info with timeout
 */
export async function getConnectionInfoWithTimeout(timeoutMs: number = 10000): Promise<any> {
    return Promise.race([
        WiFiDirectService.getConnectionInfo(),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Failed to get connection info')), timeoutMs)
        )
    ]);
}

const ConnectionHelper = {
    connectWithTimeout,
    connectWithRetry,
    getConnectionInfoWithTimeout,
};

export default ConnectionHelper;

/**
 * Reconnection with exponential backoff + jitter
 */
export interface ReconnectOptions {
    baseMs?: number;
    maxMs?: number;
    maxAttempts?: number;
}
export declare class ReconnectManager {
    private attempt;
    private baseMs;
    private maxMs;
    private maxAttempts;
    private timer;
    constructor(opts?: ReconnectOptions);
    schedule(fn: () => void): boolean;
    reset(): void;
    destroy(): void;
}

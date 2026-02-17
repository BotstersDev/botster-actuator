/**
 * Reconnection with exponential backoff + jitter
 */
export class ReconnectManager {
    attempt = 0;
    baseMs;
    maxMs;
    maxAttempts;
    timer = null;
    constructor(opts = {}) {
        this.baseMs = opts.baseMs ?? 1000;
        this.maxMs = opts.maxMs ?? 30_000;
        this.maxAttempts = opts.maxAttempts ?? Infinity;
    }
    schedule(fn) {
        if (this.attempt >= this.maxAttempts)
            return false;
        const delay = Math.min(this.baseMs * Math.pow(2, this.attempt) + Math.random() * 1000, this.maxMs);
        this.attempt++;
        console.log(`[reconnect] Attempt ${this.attempt} in ${Math.round(delay)}ms`);
        this.timer = setTimeout(fn, delay);
        return true;
    }
    reset() {
        this.attempt = 0;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
    destroy() {
        this.reset();
    }
}
//# sourceMappingURL=reconnect.js.map
/**
 * Shell command executor — spawns child processes and streams output
 */
import { spawn } from 'node:child_process';
const DEFAULT_TIMEOUT = 30_000;
const MAX_TIMEOUT = 300_000; // 5 minutes hard cap
export function executeShell(opts, callbacks) {
    const startTime = Date.now();
    const timeout = Math.min(opts.timeout ?? DEFAULT_TIMEOUT, MAX_TIMEOUT);
    let proc = null;
    let killed = false;
    try {
        proc = spawn('sh', ['-c', opts.command], {
            cwd: opts.cwd || process.cwd(),
            env: { ...process.env, ...opts.env },
            stdio: ['ignore', 'pipe', 'pipe'],
        });
    }
    catch (err) {
        callbacks.onError(`Failed to spawn: ${err}`);
        return () => { };
    }
    const timer = setTimeout(() => {
        if (proc && !killed) {
            killed = true;
            proc.kill('SIGKILL');
            callbacks.onError(`Command timed out after ${timeout}ms`);
        }
    }, timeout);
    proc.stdout?.on('data', (chunk) => {
        callbacks.onStdout(chunk.toString());
    });
    proc.stderr?.on('data', (chunk) => {
        callbacks.onStderr(chunk.toString());
    });
    proc.on('close', (code) => {
        clearTimeout(timer);
        if (!killed) {
            callbacks.onDone(code ?? 1, Date.now() - startTime);
        }
    });
    proc.on('error', (err) => {
        clearTimeout(timer);
        if (!killed) {
            callbacks.onError(`Process error: ${err.message}`);
        }
    });
    // Return kill function
    return () => {
        if (proc && !killed) {
            killed = true;
            proc.kill('SIGKILL');
            clearTimeout(timer);
        }
    };
}
//# sourceMappingURL=shell.js.map
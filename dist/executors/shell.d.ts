export interface ShellExecOptions {
    command: string;
    cwd?: string;
    timeout?: number;
    env?: Record<string, string>;
}
export interface ShellExecCallbacks {
    onStdout: (data: string) => void;
    onStderr: (data: string) => void;
    onDone: (exitCode: number, durationMs: number) => void;
    onError: (error: string) => void;
}
export declare function executeShell(opts: ShellExecOptions, callbacks: ShellExecCallbacks): () => void;

/**
 * Core Actuator — connects to broker via WebSocket, executes commands
 */
import WebSocket from 'ws';
import { hostname } from 'node:os';
import { ReconnectManager } from './reconnect.js';
import { executeShell } from './executors/shell.js';
export class Actuator {
    config;
    ws = null;
    reconnect;
    activeCommands = new Map(); // id → kill fn
    destroyed = false;
    id;
    capabilities;
    cwd;
    constructor(config) {
        this.config = config;
        this.id = config.actuatorId ?? hostname();
        this.capabilities = config.capabilities ?? ['actuator/shell'];
        this.cwd = config.cwd ?? process.cwd();
        this.reconnect = new ReconnectManager();
    }
    start() {
        this.connect();
    }
    stop() {
        this.destroyed = true;
        this.reconnect.destroy();
        // Kill all active commands
        for (const kill of this.activeCommands.values()) {
            kill();
        }
        this.activeCommands.clear();
        if (this.ws) {
            this.ws.close(1000, 'actuator shutting down');
            this.ws = null;
        }
    }
    connect() {
        if (this.destroyed)
            return;
        const wsUrl = this.config.brokerUrl.replace(/^http/, 'ws') + '/ws/actuator';
        console.log(`[actuator] Connecting to ${wsUrl}`);
        try {
            this.ws = new WebSocket(wsUrl);
        }
        catch (err) {
            console.error(`[actuator] Failed to create WebSocket:`, err);
            this.scheduleReconnect();
            return;
        }
        this.ws.on('open', () => {
            console.log(`[actuator] Connected. Registering as ${this.id}`);
            this.reconnect.reset();
            this.send({
                type: 'actuator.register',
                token: this.config.agentToken,
                actuatorId: this.id,
                capabilities: this.capabilities,
                metadata: {
                    hostname: hostname(),
                    os: process.platform,
                    arch: process.arch,
                },
            });
        });
        this.ws.on('message', (raw) => {
            try {
                const msg = JSON.parse(raw.toString());
                this.handleMessage(msg);
            }
            catch (err) {
                console.error(`[actuator] Invalid message:`, err);
            }
        });
        this.ws.on('close', (code, reason) => {
            console.log(`[actuator] Disconnected: ${code} ${reason}`);
            this.ws = null;
            this.scheduleReconnect();
        });
        this.ws.on('error', (err) => {
            console.error(`[actuator] WebSocket error:`, err.message);
            // 'close' event will follow
        });
    }
    handleMessage(msg) {
        switch (msg.type) {
            case 'actuator.registered':
                console.log(`[actuator] Registered as ${msg.actuatorId}`);
                break;
            case 'actuator.error':
                console.error(`[actuator] Broker error: ${msg.error}`);
                break;
            case 'command.request':
                this.handleCommand(msg);
                break;
            case 'ping':
                this.send({ type: 'pong', ts: msg.ts });
                break;
            default:
                console.warn(`[actuator] Unknown message type: ${msg.type}`);
        }
    }
    handleCommand(msg) {
        const { id, capability, payload } = msg;
        console.log(`[actuator] Command ${id}: ${capability} → ${payload.command}`);
        if (capability === 'actuator/shell') {
            const kill = executeShell({
                command: payload.command,
                cwd: payload.cwd ?? this.cwd,
                timeout: payload.timeout,
                env: payload.env,
            }, {
                onStdout: (data) => this.send({ type: 'command.stdout', id, data }),
                onStderr: (data) => this.send({ type: 'command.stderr', id, data }),
                onDone: (exitCode, durationMs) => {
                    this.activeCommands.delete(id);
                    this.send({ type: 'command.done', id, exitCode, durationMs });
                },
                onError: (error) => {
                    this.activeCommands.delete(id);
                    this.send({ type: 'command.error', id, error });
                },
            });
            this.activeCommands.set(id, kill);
        }
        else {
            this.send({
                type: 'command.error',
                id,
                error: `Unsupported capability: ${capability}`,
            });
        }
    }
    send(msg) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(msg));
        }
    }
    scheduleReconnect() {
        if (this.destroyed)
            return;
        if (!this.reconnect.schedule(() => this.connect())) {
            console.error(`[actuator] Max reconnection attempts reached`);
        }
    }
}
//# sourceMappingURL=actuator.js.map
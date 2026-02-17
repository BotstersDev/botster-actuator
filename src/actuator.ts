/**
 * Core Actuator — connects to broker via WebSocket, executes commands
 * Protocol matches seks-broker-2 (BotstersDev/botsters-broker)
 */
import WebSocket from 'ws';
import { hostname } from 'node:os';
import { ReconnectManager } from './reconnect.js';
import { executeShell } from './executors/shell.js';

export interface ActuatorConfig {
  brokerUrl: string;       // e.g. https://broker-internal.seksbot.com
  agentToken: string;
  actuatorId: string;      // must be pre-registered in broker DB
  capabilities?: string[]; // informational, broker already knows from DB
  cwd?: string;            // default working directory for commands
}

// Broker protocol types (matches protocol.ts in botsters-broker)
interface CommandDelivery {
  type: 'command_delivery';
  id: string;
  capability: string;
  payload: unknown;
}

interface PingMessage {
  type: 'ping';
  ts: number;
}

interface ErrorMessage {
  type: 'error';
  code: string;
  message: string;
  ref_id?: string;
}

type InboundMessage = CommandDelivery | PingMessage | ErrorMessage;

export class Actuator {
  private ws: WebSocket | null = null;
  private reconnect: ReconnectManager;
  private activeCommands = new Map<string, () => void>(); // id → kill fn
  private destroyed = false;
  private readonly cwd: string;

  constructor(private config: ActuatorConfig) {
    this.cwd = config.cwd ?? process.cwd();
    this.reconnect = new ReconnectManager();
  }

  start(): void {
    this.connect();
  }

  stop(): void {
    this.destroyed = true;
    this.reconnect.destroy();
    for (const kill of this.activeCommands.values()) kill();
    this.activeCommands.clear();
    if (this.ws) {
      this.ws.close(1000, 'actuator shutting down');
      this.ws = null;
    }
  }

  private connect(): void {
    if (this.destroyed) return;

    const base = this.config.brokerUrl.replace(/^http/, 'ws');
    const wsUrl = `${base}/ws?token=${encodeURIComponent(this.config.agentToken)}&role=actuator&actuator_id=${encodeURIComponent(this.config.actuatorId)}`;
    console.log(`[actuator] Connecting to ${base}/ws as ${this.config.actuatorId}`);

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (err) {
      console.error(`[actuator] Failed to create WebSocket:`, err);
      this.scheduleReconnect();
      return;
    }

    this.ws.on('open', () => {
      console.log(`[actuator] Connected and authenticated as ${this.config.actuatorId}`);
      this.reconnect.reset();
    });

    this.ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as InboundMessage;
        this.handleMessage(msg);
      } catch (err) {
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
    });
  }

  private handleMessage(msg: InboundMessage): void {
    switch (msg.type) {
      case 'command_delivery':
        this.handleCommand(msg);
        break;
      case 'ping':
        this.send({ type: 'pong', ts: msg.ts });
        break;
      case 'error':
        console.error(`[actuator] Broker error [${msg.code}]: ${msg.message}`);
        break;
      default:
        console.warn(`[actuator] Unknown message type: ${(msg as any).type}`);
    }
  }

  private handleCommand(msg: CommandDelivery): void {
    const { id, capability, payload } = msg;
    const cmd = payload as { command?: string; cwd?: string; timeout?: number; env?: Record<string, string> };

    console.log(`[actuator] Command ${id}: ${capability}`);

    if (capability === 'actuator/shell' || capability === 'shell') {
      if (!cmd.command) {
        this.send({ type: 'command_result', id, status: 'failed', result: { error: 'No command specified' } });
        return;
      }

      let stdout = '';
      let stderr = '';

      const kill = executeShell(
        {
          command: cmd.command,
          cwd: cmd.cwd ?? this.cwd,
          timeout: cmd.timeout,
          env: cmd.env,
        },
        {
          onStdout: (data) => { stdout += data; },
          onStderr: (data) => { stderr += data; },
          onDone: (exitCode, durationMs) => {
            this.activeCommands.delete(id);
            this.send({
              type: 'command_result',
              id,
              status: exitCode === 0 ? 'completed' : 'failed',
              result: { stdout, stderr, exitCode, durationMs },
            });
          },
          onError: (error) => {
            this.activeCommands.delete(id);
            this.send({
              type: 'command_result',
              id,
              status: 'failed',
              result: { error, stdout, stderr },
            });
          },
        }
      );
      this.activeCommands.set(id, kill);
    } else {
      this.send({
        type: 'command_result',
        id,
        status: 'failed',
        result: { error: `Unsupported capability: ${capability}` },
      });
    }
  }

  private send(msg: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private scheduleReconnect(): void {
    if (this.destroyed) return;
    if (!this.reconnect.schedule(() => this.connect())) {
      console.error(`[actuator] Max reconnection attempts reached`);
    }
  }
}

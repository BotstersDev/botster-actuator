/**
 * Wire protocol types for actuator ↔ broker communication
 * Must match seks-broker-2 (BotstersDev/botsters-broker) src/protocol.ts
 */

// ─── Broker → Actuator ────────────────────────────────────────────────────────

/** Broker delivers a command for the actuator to execute */
export interface CommandDelivery {
  type: 'command_delivery';
  id: string;
  capability: string;
  payload: {
    command: string;
    cwd?: string;
    timeout?: number;
    env?: Record<string, string>;
  };
}

/** Broker keepalive ping */
export interface PingMessage {
  type: 'ping';
  ts: number;
}

/** Broker error notification */
export interface ErrorMessage {
  type: 'error';
  code: string;
  message: string;
  ref_id?: string;
}

export type ActuatorInbound = CommandDelivery | PingMessage | ErrorMessage;

// ─── Actuator → Broker ────────────────────────────────────────────────────────

/** Command execution result (batched — sent after completion) */
export interface CommandResult {
  type: 'command_result';
  id: string;
  status: 'completed' | 'failed';
  result: {
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    durationMs?: number;
    error?: string;
  };
}

/** Keepalive pong */
export interface PongMessage {
  type: 'pong';
  ts: number;
}

export type ActuatorOutbound = CommandResult | PongMessage;

// ─── Future: Streaming (not yet implemented) ──────────────────────────────────
// When streaming is added, these will be sent incrementally instead of batching:
//
// export interface CommandStdout {
//   type: 'command_stdout';
//   id: string;
//   data: string;
// }
//
// export interface CommandStderr {
//   type: 'command_stderr';
//   id: string;
//   data: string;
// }
//
// export interface CommandDone {
//   type: 'command_done';
//   id: string;
//   exitCode: number;
//   durationMs: number;
// }

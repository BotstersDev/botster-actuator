/**
 * Wire protocol types for actuator ↔ broker communication
 */
export interface ActuatorRegisterMessage {
    type: 'actuator.register';
    token: string;
    actuatorId: string;
    capabilities: string[];
    metadata?: {
        hostname?: string;
        os?: string;
        arch?: string;
    };
}
export interface CommandRequestMessage {
    type: 'command.request';
    id: string;
    capability: string;
    payload: {
        command: string;
        cwd?: string;
        timeout?: number;
        env?: Record<string, string>;
    };
}
export interface CommandStdoutMessage {
    type: 'command.stdout';
    id: string;
    data: string;
}
export interface CommandStderrMessage {
    type: 'command.stderr';
    id: string;
    data: string;
}
export interface CommandDoneMessage {
    type: 'command.done';
    id: string;
    exitCode: number;
    durationMs: number;
}
export interface CommandErrorMessage {
    type: 'command.error';
    id: string;
    error: string;
}
export interface ActuatorRegisteredMessage {
    type: 'actuator.registered';
    actuatorId: string;
}
export interface ActuatorErrorMessage {
    type: 'actuator.error';
    error: string;
    code?: string;
}
export interface PingMessage {
    type: 'ping';
    ts: number;
}
export interface PongMessage {
    type: 'pong';
    ts: number;
}
export type ActuatorOutbound = ActuatorRegisterMessage | CommandStdoutMessage | CommandStderrMessage | CommandDoneMessage | CommandErrorMessage | PongMessage;
export type ActuatorInbound = CommandRequestMessage | ActuatorRegisteredMessage | ActuatorErrorMessage | PingMessage;

export interface ActuatorConfig {
    brokerUrl: string;
    agentToken: string;
    actuatorId?: string;
    capabilities?: string[];
    cwd?: string;
}
export declare class Actuator {
    private config;
    private ws;
    private reconnect;
    private activeCommands;
    private destroyed;
    private readonly id;
    private readonly capabilities;
    private readonly cwd;
    constructor(config: ActuatorConfig);
    start(): void;
    stop(): void;
    private connect;
    private handleMessage;
    private handleCommand;
    private send;
    private scheduleReconnect;
}

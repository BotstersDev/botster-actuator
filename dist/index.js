#!/usr/bin/env node
/**
 * seks-actuator — Hands+Eyes for the brain-spine-actuator model
 *
 * Usage:
 *   SEKS_BROKER_URL=https://broker-internal.seksbot.com \
 *   SEKS_BROKER_TOKEN=seks_agent_xxx \
 *   seks-actuator [--id my-actuator] [--cwd /data/workspace]
 */
import { Actuator } from './actuator.js';
function usage() {
    console.error(`
seks-actuator — Connect to the SEKS broker as an actuator (Hands+Eyes)

Environment:
  SEKS_BROKER_URL    Broker URL (required)
  SEKS_BROKER_TOKEN  Agent token (required)

Options:
  --id <name>        Actuator ID (default: hostname)
  --cwd <path>       Working directory for commands (default: cwd)
  --capabilities <c> Comma-separated capabilities (default: actuator/shell)
  --help             Show this help
`.trim());
    process.exit(1);
}
function parseArgs(args) {
    const result = {};
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--id':
                result.id = args[++i];
                break;
            case '--cwd':
                result.cwd = args[++i];
                break;
            case '--capabilities':
                result.capabilities = args[++i]?.split(',');
                break;
            case '--help':
            case '-h':
                usage();
                break;
            default:
                console.error(`Unknown option: ${args[i]}`);
                usage();
        }
    }
    return result;
}
const brokerUrl = process.env.SEKS_BROKER_URL;
const agentToken = process.env.SEKS_BROKER_TOKEN;
if (!brokerUrl || !agentToken) {
    console.error('Error: SEKS_BROKER_URL and SEKS_BROKER_TOKEN must be set');
    process.exit(1);
}
const opts = parseArgs(process.argv.slice(2));
const actuator = new Actuator({
    brokerUrl,
    agentToken,
    actuatorId: opts.id,
    capabilities: opts.capabilities,
    cwd: opts.cwd,
});
// Graceful shutdown
function shutdown() {
    console.log('\n[actuator] Shutting down...');
    actuator.stop();
    process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
console.log(`[actuator] Starting — broker: ${brokerUrl}, id: ${opts.id ?? '(hostname)'}`);
actuator.start();
//# sourceMappingURL=index.js.map
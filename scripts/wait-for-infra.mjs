import net from 'node:net';

const targets = [
  { name: 'postgres', host: process.env.WAIT_POSTGRES_HOST || '127.0.0.1', port: Number(process.env.WAIT_POSTGRES_PORT || '5433') },
  { name: 'redis', host: process.env.WAIT_REDIS_HOST || '127.0.0.1', port: Number(process.env.WAIT_REDIS_PORT || '6380') },
];

const timeoutMs = Number(process.env.WAIT_INFRA_TIMEOUT_MS || '60000');
const intervalMs = Number(process.env.WAIT_INFRA_INTERVAL_MS || '1000');

function waitForPort(target) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = new net.Socket();
      socket.setTimeout(2000);

      const fail = () => {
        socket.destroy();
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`[infra] Timed out waiting for ${target.name} at ${target.host}:${target.port}`));
          return;
        }

        setTimeout(attempt, intervalMs);
      };

      socket.once('connect', () => {
        socket.end();
        resolve();
      });
      socket.once('timeout', fail);
      socket.once('error', fail);
      socket.connect(target.port, target.host);
    };

    attempt();
  });
}

for (const target of targets) {
  console.log(`[infra] waiting for ${target.name} on ${target.host}:${target.port}`);
  await waitForPort(target);
  console.log(`[infra] ${target.name} is reachable`);
}

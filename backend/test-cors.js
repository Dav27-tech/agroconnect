import assert from 'node:assert/strict';
import { once } from 'node:events';

process.env.NODE_ENV = 'test';
process.env.CORS_ORIGIN = 'http://localhost:3000,http://localhost:3001';

const { createApp } = await import('./dist/app.js');
const server = createApp().listen(0, '127.0.0.1');
await once(server, 'listening');

try {
  const address = server.address();
  assert(address && typeof address === 'object', 'Expected the test server to bind to a port');
  const url = `http://127.0.0.1:${address.port}/api/v1/categories`;
  const preflight = (origin) => fetch(url, {
    method: 'OPTIONS',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'content-type',
    },
  });

  const allowedResponse = await preflight('http://localhost:3001');
  assert.equal(allowedResponse.headers.get('access-control-allow-origin'), 'http://localhost:3001');

  const deniedResponse = await preflight('http://localhost:3002');
  assert.equal(deniedResponse.headers.get('access-control-allow-origin'), null);

  console.log('✅ CORS allow-list accepts configured frontend origins and rejects others.');
} finally {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

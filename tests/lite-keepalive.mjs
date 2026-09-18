import assert from 'node:assert/strict';
import { Agent, request } from 'node:http';

// One explicit HTTP/1.1 connection, no retries and no paid AI or private state.
export async function checkLiteKeepAlive(base) {
  const agent = new Agent({ keepAlive: true, maxSockets: 1 });
  const sockets = new Set();
  let calls = 0;
  const probe = (
    method,
    pathname,
    body,
    expected,
    chunked = false,
    extra = {},
  ) =>
    new Promise((resolve, reject) => {
      const bytes =
        body === undefined ? undefined : Buffer.from(JSON.stringify(body));
      const req = request(
        new URL(pathname, base),
        {
          agent,
          method,
          headers: {
            ...(bytes
              ? {
                  'content-type': 'application/json',
                  ...(chunked
                    ? { 'transfer-encoding': 'chunked' }
                    : { 'content-length': String(bytes.length) }),
                }
              : {}),
            ...extra,
          },
        },
        (response) => {
          let length = 0;
          response.on('data', (chunk) => {
            length += chunk.length;
            if (length > 65536)
              req.destroy(new Error('Unexpected oversized probe response'));
          });
          response.on('error', reject);
          response.on('end', () => {
            try {
              assert.equal(
                response.statusCode,
                expected,
                `${method} ${pathname} after ${calls} requests`,
              );
              calls++;
              resolve();
            } catch (error) {
              reject(error);
            }
          });
        },
      );
      req.on('socket', (socket) => sockets.add(socket));
      req.on('error', reject);
      req.setTimeout(10000, () =>
        req.destroy(new Error('Keep-alive probe timeout')),
      );
      if (chunked && bytes) {
        req.write(bytes.subarray(0, 1));
        req.end(bytes.subarray(1));
      } else req.end(bytes);
    });
  try {
    await probe(
      'POST',
      '/api/chat',
      { message: 'Synthetic keep-alive check' },
      200,
    );
    await probe('PUT', '/api/settings', {}, 404);
    await probe(
      'POST',
      '/api/chat',
      { message: 'Synthetic keep-alive check' },
      200,
    );
    for (let round = 0; round < 3; round++) {
      for (const route of ['/api/settings', '/api/unknown-module']) {
        for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
          await probe(
            method,
            route,
            { synthetic: 'x'.repeat(round === 2 ? 32768 : 8) },
            404,
            round === 1,
          );
          await probe('GET', '/api/health', undefined, 200);
        }
      }
      await probe('PATCH', '/api/chat', { synthetic: true }, 405);
      await probe(
        'POST',
        '/api/chat',
        { message: 'Synthetic rejection' },
        403,
        false,
        { origin: 'https://untrusted.example' },
      );
      await probe(
        'POST',
        '/api/chat',
        { message: 'Synthetic keep-alive check' },
        200,
      );
    }
    assert.equal(
      sockets.size,
      1,
      'No reconnect may hide a broken request stream',
    );
    return { requests: calls, connections: sockets.size };
  } finally {
    agent.destroy();
  }
}
